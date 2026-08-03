import postgres from 'postgres';
import { z } from 'zod';

const databaseUrlSchema = z.string().trim().min(1);

let database: ReturnType<typeof postgres> | undefined;

/** Lazily reuses one PostgreSQL client so builds do not require a live database. */
export const getDatabase = () => {
  database ??= postgres(databaseUrlSchema.parse(process.env.DATABASE_URL), {
    idle_timeout: 20,
    max: 1,
    prepare: false,
  });

  return database;
};
