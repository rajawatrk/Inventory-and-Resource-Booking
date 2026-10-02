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

export const stockMovementsTable = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    resourceId: integer("resource_id")
      .notNull()
      .references(() => resourcesTable.id),
    locationId: integer("location_id")
      .notNull()
      .references(() => locationsTable.id),
    movementType: text("movement_type").notNull(),
    quantity: integer("quantity").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("stock_movements_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "stock_movements_valid_type",
      sql`${table.movementType} IN ('stock_in', 'stock_out', 'order_fulfilled')`,
    ),
  ],
);

export const insertStockMovementSchema = createInsertSchema(
  stockMovementsTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovementsTable.$inferSelect;