import { pgTable, text, integer, varchar } from "drizzle-orm/pg-core";

export const itemImages = pgTable("item_images", {
  itemId: integer("item_id").primaryKey(),
  urls: text("urls").array().notNull(),
});

export const storeRegistry = pgTable("store_registry", {
  address: varchar("address", { length: 42 }).primaryKey(),
  storeName: varchar("store_name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url").notNull(),
  bannerUrl: text("banner_url").notNull(),
  neonColor: varchar("neon_color", { length: 50 }).notNull(),
  tier: integer("tier").notNull(),
  productCount: integer("product_count").notNull(),
});
