
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const platformEnum = pgEnum('platform', ['shopee', 'tiktok_shop', 'tokopedia']);
export const sentimentEnum = pgEnum('sentiment', ['positive', 'neutral', 'negative']);
export const priorityEnum = pgEnum('priority', ['high', 'medium', 'low']);

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  platform: platformEnum('platform').notNull(),
  url: text('url').notNull(),
  average_rating: numeric('average_rating', { precision: 3, scale: 2 }),
  total_reviews: integer('total_reviews').notNull().default(0),
  scraped_at: timestamp('scraped_at').defaultNow().notNull(),
  session_id: text('session_id').notNull()
});

// Reviews table
export const reviewsTable = pgTable('reviews', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull(),
  text: text('text').notNull(),
  rating: integer('rating').notNull(),
  timestamp: timestamp('timestamp'),
  sentiment: sentimentEnum('sentiment'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Keywords table
export const keywordsTable = pgTable('keywords', {
  id: serial('id').primaryKey(),
  session_id: text('session_id').notNull(),
  keyword: text('keyword').notNull(),
  frequency: integer('frequency').notNull().default(1),
  sentiment: sentimentEnum('sentiment')
});

// Recommendations table
export const recommendationsTable = pgTable('recommendations', {
  id: serial('id').primaryKey(),
  session_id: text('session_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: priorityEnum('priority').notNull(),
  category: text('category').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const productsRelations = relations(productsTable, ({ many }) => ({
  reviews: many(reviewsTable)
}));

export const reviewsRelations = relations(reviewsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [reviewsTable.product_id],
    references: [productsTable.id]
  })
}));

// TypeScript types for the table schemas
export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;
export type Review = typeof reviewsTable.$inferSelect;
export type NewReview = typeof reviewsTable.$inferInsert;
export type Keyword = typeof keywordsTable.$inferSelect;
export type NewKeyword = typeof keywordsTable.$inferInsert;
export type Recommendation = typeof recommendationsTable.$inferSelect;
export type NewRecommendation = typeof recommendationsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  products: productsTable,
  reviews: reviewsTable,
  keywords: keywordsTable,
  recommendations: recommendationsTable
};
