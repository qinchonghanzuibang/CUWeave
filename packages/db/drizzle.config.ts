import 'dotenv/config'

import { defineConfig } from 'drizzle-kit'

const migrationUrl =
  process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL

if (!migrationUrl) {
  throw new Error(
    'DATABASE_MIGRATION_URL or DATABASE_URL is required to run Drizzle commands'
  )
}

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/schema.ts',
  dbCredentials: {
    url: migrationUrl,
  },
  strict: true,
  verbose: true,
})
