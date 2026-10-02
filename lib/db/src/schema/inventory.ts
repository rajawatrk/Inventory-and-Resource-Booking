import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { locationsTable } from "./locations";
import { resourcesTable } from "./resources";

export const inventoryTable = pgTable(
  "inventory",
  {
    id: serial("id").primaryKey(),
    resourceId: integer("resource_id")
      .notNull()
      .references(() => resourcesTable.id, { onDelete: "cascade" }),
    locationId: integer("location_id")
      .notNull()
      .references(() => locationsTable.id, { onDelete: "cascade" }),
    onHand: integer("on_hand").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("inventory_resource_location_idx").on(
      table.resourceId,
      table.locationId,
    ),
    check("inventory_on_hand_nonnegative", sql`${table.onHand} >= 0`),
  ],
);

export const insertInventorySchema = createInsertSchema(inventoryTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventoryTable.$inferSelect;