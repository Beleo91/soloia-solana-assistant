import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const itemImages = pgTable("item_images", {
  itemId: integer("item_id").primaryKey(),
  urls: text("urls").array().notNull(),
});