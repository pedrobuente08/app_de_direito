import { boolean, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const modelRegistry = pgTable('model_registry', {
  model: text('model').primaryKey(),
  provider: text('provider').notNull(),
  inputPriceUsd: numeric('input_price_usd', { precision: 12, scale: 8 }).notNull(),
  outputPriceUsd: numeric('output_price_usd', { precision: 12, scale: 8 }).notNull(),
  cacheReadDiscount: numeric('cache_read_discount', { precision: 4, scale: 3 })
    .notNull()
    .default('0.1'),
  active: boolean('active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
