import { Router, type IRouter } from "express";
import {
  CancelReservationParams,
  CancelReservationResponse,
  CreateReservationBody,
  CreateReservationResponse,
  FulfillReservationParams,
  FulfillReservationResponse,
  ListReservationsResponse,
} from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

const reservationSelect = `
  SELECT
    b.id,
    b.resource_id AS "resourceId",
    p.name AS "resourceName",
    p.sku,
    b.location_id AS "locationId",
    l.name AS "locationName",
    b.quantity,
    b.requester,
    b.start_at AS "startAt",
    b.end_at AS "endAt",
    b.status,
    b.notes,
    b.created_at AS "createdAt"
  FROM reservations b
  JOIN resources p ON p.id = b.resource_id
  JOIN locations l ON l.id = b.location_id
`;

router.get("/reservations", async (_req, res): Promise<void> => {
  const result = await pool.query(
    `${reservationSelect} ORDER BY b.start_at DESC, b.id DESC`,
  );
  res.json(ListReservationsResponse.parse(result.rows));
});

router.post("/reservations", async (req, res): Promise<void> => {
  const parsed = CreateReservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.startAt >= parsed.data.endAt) {
    res.status(400).json({ error: "The end time must be after the start time." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const stock = await client.query<{ id: number; on_hand: number }>(
      `
        SELECT id, on_hand
        FROM inventory
        WHERE resource_id = $1 AND location_id = $2
        FOR UPDATE
      `,
      [parsed.data.resourceId, parsed.data.locationId],
    );
    if (!stock.rows[0]) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "There is no stock record for that resource and location." });
      return;
    }

    const reserved = await client.query<{ reserved: number }>(
      `
        SELECT COALESCE(SUM(quantity), 0)::int AS reserved
        FROM reservations
        WHERE resource_id = $1
          AND location_id = $2
          AND status = 'confirmed'
          AND start_at < $4
          AND end_at > $3
      `,
      [
        parsed.data.resourceId,
        parsed.data.locationId,
        parsed.data.startAt,
        parsed.data.endAt,
      ],
    );
    if (reserved.rows[0].reserved + parsed.data.quantity > stock.rows[0].on_hand) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "Not enough units are available for that time. Choose another time or reduce the quantity.",
      });
      return;
    }

    const created = await client.query<{ id: number }>(
      `
        INSERT INTO reservations
          (resource_id, location_id, quantity, requester, start_at, end_at, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [
        parsed.data.resourceId,
        parsed.data.locationId,
        parsed.data.quantity,
        parsed.data.requester.trim(),
        parsed.data.startAt,
        parsed.data.endAt,
        parsed.data.notes?.trim() ?? "",
      ],
    );
    const result = await client.query(
      `${reservationSelect} WHERE b.id = $1`,
      [created.rows[0].id],
    );
    await client.query("COMMIT");
    res.status(201).json(CreateReservationResponse.parse(result.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    req.log.error({ err: error }, "Could not create reservation");
    res.status(500).json({ error: "Could not create the reservation." });
  } finally {
    client.release();
  }
});

router.post("/reservations/:id/cancel", async (req, res): Promise<void> => {
  const parsed = CancelReservationParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ status: string }>(
      "SELECT status FROM reservations WHERE id = $1 FOR UPDATE",
      [parsed.data.id],
    );
    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Reservation was not found." });
      return;
    }
    if (existing.rows[0].status !== "confirmed") {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Only confirmed reservations can be cancelled." });
      return;
    }

    await client.query(
      "UPDATE reservations SET status = 'cancelled' WHERE id = $1",
      [parsed.data.id],
    );
    const result = await client.query(
      `${reservationSelect} WHERE b.id = $1`,
      [parsed.data.id],
    );
    await client.query("COMMIT");
    res.json(CancelReservationResponse.parse(result.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    req.log.error({ err: error }, "Could not cancel reservation");
    res.status(500).json({ error: "Could not cancel the reservation." });
  } finally {
    client.release();
  }
});

router.post("/reservations/:id/fulfill", async (req, res): Promise<void> => {
  const parsed = FulfillReservationParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{
      id: number;
      resource_id: number;
      location_id: number;
      quantity: number;
      status: string;
    }>(
      `
        SELECT id, resource_id, location_id, quantity, status
        FROM reservations
        WHERE id = $1
        FOR UPDATE
      `,
      [parsed.data.id],
    );
    const reservation = existing.rows[0];
    if (!reservation) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Reservation was not found." });
      return;
    }
    if (reservation.status !== "confirmed") {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Only confirmed reservations can be fulfilled." });
      return;
    }

    const stock = await client.query<{ id: number; on_hand: number }>(
      `
        SELECT id, on_hand
        FROM inventory
        WHERE resource_id = $1 AND location_id = $2
        FOR UPDATE
      `,
      [reservation.resource_id, reservation.location_id],
    );
    if (!stock.rows[0] || stock.rows[0].on_hand < reservation.quantity) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "There is not enough stock to fulfill this reservation." });
      return;
    }

    await client.query(
      "UPDATE inventory SET on_hand = on_hand - $1, updated_at = NOW() WHERE id = $2",
      [reservation.quantity, stock.rows[0].id],
    );
    await client.query(
      "UPDATE reservations SET status = 'fulfilled' WHERE id = $1",
      [reservation.id],
    );
    await client.query(
      `
        INSERT INTO stock_movements
          (resource_id, location_id, movement_type, quantity, reason)
        VALUES ($1, $2, 'order_fulfilled', $3, $4)
      `,
      [
        reservation.resource_id,
        reservation.location_id,
        reservation.quantity,
        `Reservation #${reservation.id} fulfilled`,
      ],
    );
    const result = await client.query(
      `${reservationSelect} WHERE b.id = $1`,
      [reservation.id],
    );
    await client.query("COMMIT");
    res.json(FulfillReservationResponse.parse(result.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    req.log.error({ err: error }, "Could not fulfill reservation");
    res.status(500).json({ error: "Could not fulfill the reservation." });
  } finally {
    client.release();
  }
});

export default router;