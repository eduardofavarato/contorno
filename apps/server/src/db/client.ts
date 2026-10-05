import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import * as schema from './schema';

export type Db = MySql2Database<typeof schema>;

export interface Database {
  readonly db: Db;
  close(): Promise<void>;
}

/** Connects (all dates in UTC), applies pending migrations and hands back the typed client. */
export async function connectDatabase(url: string, migrationsDir: string): Promise<Database> {
  const pool = mysql.createPool({ uri: url, timezone: 'Z', connectionLimit: 10 });
  const db = drizzle(pool, { schema, mode: 'default' });
  try {
    await migrate(db, { migrationsFolder: migrationsDir });
  } catch (error) {
    await pool.end();
    throw error;
  }
  return { db, close: () => pool.end() };
}
