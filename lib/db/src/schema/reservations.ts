import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { locationsTable } from "./locations";
import { resourcesTable } from "./resources";

export const reservationsTable = pgTable(
  "reservations",
  {
    id: serial("id").primaryKey(),
    resourceId: integer("resource_id")
      .notNull()
      .references(() => resourcesTable.id),
    locationId: integer("location_id")
      .notNull()
      .references(() => locationsTable.id),
    quantity: integer("quantity").notNull(),
    requester: text("requester").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("confirmed"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("reservations_quantity_positive", sql`${table.quantity} > 0`),
    check("reservations_valid_period", sql`${table.startAt} < ${table.endAt}`),
    check(
      "reservations_valid_status",
      sql`${table.status} IN ('confirmed', 'cancelled', 'fulfilled')`,
    ),
  ],
);

export const insertReservationSchema = createInsertSchema(
  reservationsTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservationsTable.$inferSelect;