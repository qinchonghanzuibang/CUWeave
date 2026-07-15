import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const systemMetadata = pgTable('system_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
