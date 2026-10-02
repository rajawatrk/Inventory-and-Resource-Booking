import { Router, type IRouter } from "express";
import {
  AdjustInventoryBody,
  AdjustInventoryResponse,
  CreateLocationBody,
  CreateLocationResponse,
  CreateResourceBody,
  CreateResourceResponse,
  GetDashboardResponse,
  ListInventoryQueryParams,
  ListInventoryResponse,
  ListLocationsResponse,
  ListMovementsResponse,
  ListResourcesResponse,
} from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

const movementSelect = `
  SELECT
    m.id,
    m.resource_id AS "resourceId",
    r.name AS "resourceName",
    m.location_id AS "locationId",
    l.name AS "locationName",
    m.movement_type AS "movementType",
    m.quantity,
    m.reason,
    m.created_at AS "createdAt"
  FROM stock_movements m
  JOIN resources r ON r.id = m.resource_id
  JOIN locations l ON l.id = m.location_id
`;

router.get("/dashboard", async (_req, res): Promise<void> => {
  const summary = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM resources) AS "resourceCount",
      (SELECT COUNT(*)::int FROM locations) AS "locationCount",
      (SELECT COALESCE(SUM(on_hand), 0)::int FROM inventory) AS "totalOnHand",
      (
        SELECT COUNT(*)::int
        FROM reservations
        WHERE status = 'confirmed' AND end_at > NOW()
      ) AS "activeReservations",
      (
        SELECT COUNT(*)::int
        FROM inventory i
        JOIN resources r ON r.id = i.resource_id
        WHERE i.on_hand <= r.reorder_point
      ) AS "lowStockCount"
  `);
  const lowStock = await pool.query(`
    SELECT
      r.id AS "resourceId",
      r.name,
      r.sku,
      l.name AS "locationName",
      i.on_hand AS "onHand",
      r.reorder_point AS "reorderPoint"
    FROM inventory i
    JOIN resources r ON r.id = i.resource_id
    JOIN locations l ON l.id = i.location_id
    WHERE i.on_hand <= r.reorder_point
    ORDER BY i.on_hand ASC, r.name ASC
    LIMIT 8
  `);

  res.json(
    GetDashboardResponse.parse({
      ...summary.rows[0],
      lowStockCount: summary.rows[0].lowStockCount,
      lowStockItems: lowStock.rows,
    }),
  );
});

router.get("/resources", async (_req, res): Promise<void> => {
  const result = await pool.query(`
    SELECT
      id, name, sku, category, unit,
      reorder_point AS "reorderPoint",
      created_at AS "createdAt"
    FROM resources
    ORDER BY name ASC
  `);
  res.json(ListResourcesResponse.parse(result.rows));
});

router.post("/resources", async (req, res): Promise<void> => {
  const parsed = CreateResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO resources (name, sku, category, unit, reorder_point)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id, name, sku, category, unit,
          reorder_point AS "reorderPoint",
          created_at AS "createdAt"
      `,
      [
        parsed.data.name.trim(),
        parsed.data.sku.trim(),
        parsed.data.category.trim(),
        parsed.data.unit.trim(),
        parsed.data.reorderPoint,
      ],
    );
    res.status(201).json(CreateResourceResponse.parse(result.rows[0]));
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      res.status(409).json({ error: "That SKU is already in the catalog." });
      return;
    }
    req.log.error({ err: error }, "Could not create resource");
    res.status(500).json({ error: "Could not create the resource." });
  }
});

router.get("/locations", async (_req, res): Promise<void> => {
  const result = await pool.query(`
    SELECT id, name, address, created_at AS "createdAt"
    FROM locations
    ORDER BY name ASC
  `);
  res.json(ListLocationsResponse.parse(result.rows));
});

router.post("/locations", async (req, res): Promise<void> => {
  const parsed = CreateLocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO locations (name, address)
        VALUES ($1, $2)
        RETURNING id, name, address, created_at AS "createdAt"
      `,
      [parsed.data.name.trim(), parsed.data.address?.trim() ?? ""],
    );
    res.status(201).json(CreateLocationResponse.parse(result.rows[0]));
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      res.status(409).json({ error: "A location with that name already exists." });
      return;
    }
    req.log.error({ err: error }, "Could not create location");
    res.status(500).json({ error: "Could not create the location." });
  }
});

router.get("/inventory", async (req, res): Promise<void> => {
  const hasStartAt = req.query.startAt !== undefined;
  const hasEndAt = req.query.endAt !== undefined;
  if (hasStartAt !== hasEndAt) {
    res.status(400).json({ error: "Provide both startAt and endAt." });
    return;
  }

  const queryInput = {
    ...req.query,
    ...(typeof req.query.startAt === "string"
      ? { startAt: new Date(req.query.startAt) }
      : {}),
    ...(typeof req.query.endAt === "string"
      ? { endAt: new Date(req.query.endAt) }
      : {}),
  };
  const parsed = ListInventoryQueryParams.safeParse(queryInput);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (
    parsed.data.startAt &&
    parsed.data.endAt &&
    parsed.data.startAt >= parsed.data.endAt
  ) {
    res.status(400).json({ error: "The end time must be after the start time." });
    return;
  }

  const values: Array<number | Date> = [];
  const filters: string[] = [];
  if (parsed.data.locationId !== undefined) {
    values.push(parsed.data.locationId);
    filters.push(`i.location_id = $${values.length}`);
  }

  let overlapCondition = "r.start_at <= NOW() AND r.end_at > NOW()";
  if (parsed.data.startAt && parsed.data.endAt) {
    values.push(parsed.data.endAt, parsed.data.startAt);
    overlapCondition = `r.start_at < $${values.length - 1} AND r.end_at > $${values.length}`;
  }

  const result = await pool.query(
    `
      SELECT
        p.id AS "resourceId",
        p.name AS "resourceName",
        p.sku,
        p.category,
        p.unit,
        l.id AS "locationId",
        l.name AS "locationName",
        i.on_hand AS "onHand",
        COALESCE(SUM(r.quantity), 0)::int AS "reserved",
        GREATEST(i.on_hand - COALESCE(SUM(r.quantity), 0)::int, 0) AS "available",
        p.reorder_point AS "reorderPoint"
      FROM inventory i
      JOIN resources p ON p.id = i.resource_id
      JOIN locations l ON l.id = i.location_id
      LEFT JOIN reservations r
        ON r.resource_id = i.resource_id
        AND r.location_id = i.location_id
        AND r.status = 'confirmed'
        AND ${overlapCondition}
      ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
      GROUP BY p.id, p.name, p.sku, p.category, p.unit, l.id, l.name, i.on_hand, p.reorder_point
      ORDER BY p.name ASC, l.name ASC
    `,
    values,
  );
  res.json(ListInventoryResponse.parse(result.rows));
});

router.post("/inventory/adjustments", async (req, res): Promise<void> => {
  const parsed = AdjustInventoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        INSERT INTO inventory (resource_id, location_id, on_hand)
        VALUES ($1, $2, 0)
        ON CONFLICT (resource_id, location_id) DO NOTHING
      `,
      [parsed.data.resourceId, parsed.data.locationId],
    );
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
      res.status(404).json({ error: "Resource or location was not found." });
      return;
    }

    const delta =
      parsed.data.direction === "in"
        ? parsed.data.quantity
        : -parsed.data.quantity;
    if (delta < 0) {
      const reserved = await client.query<{ reserved: number }>(
        `
          SELECT COALESCE(SUM(quantity), 0)::int AS reserved
          FROM reservations
          WHERE resource_id = $1
            AND location_id = $2
            AND status = 'confirmed'
            AND end_at > NOW()
        `,
        [parsed.data.resourceId, parsed.data.locationId],
      );
      if (stock.rows[0].on_hand + delta < reserved.rows[0].reserved) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "That stock change would leave confirmed reservations without enough units.",
        });
        return;
      }
    }

    await client.query(
      "UPDATE inventory SET on_hand = on_hand + $1, updated_at = NOW() WHERE id = $2",
      [delta, stock.rows[0].id],
    );
    const movementType = delta > 0 ? "stock_in" : "stock_out";
    const movement = await client.query(
      `
        INSERT INTO stock_movements (resource_id, location_id, movement_type, quantity, reason)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        parsed.data.resourceId,
        parsed.data.locationId,
        movementType,
        parsed.data.quantity,
        parsed.data.reason.trim(),
      ],
    );
    const response = await client.query(
      `${movementSelect} WHERE m.id = $1`,
      [movement.rows[0].id],
    );
    await client.query("COMMIT");
    res
      .status(201)
      .json(AdjustInventoryResponse.parse(response.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    if (isPostgresError(error, "23503")) {
      res.status(404).json({ error: "Resource or location was not found." });
      return;
    }
    req.log.error({ err: error }, "Could not adjust inventory");
    res.status(500).json({ error: "Could not adjust inventory." });
  } finally {
    client.release();
  }
});

router.get("/movements", async (_req, res): Promise<void> => {
  const result = await pool.query(
    `${movementSelect} ORDER BY m.created_at DESC, m.id DESC LIMIT 100`,
  );
  res.json(ListMovementsResponse.parse(result.rows));
});

function isPostgresError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export default router;