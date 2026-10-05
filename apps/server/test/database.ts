import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { inject } from 'vitest';
import { connectDatabase, type Database } from '../src/db/client';

export interface TestDatabase extends Database {
  /** Removes every row, between tests. */
  reset(): Promise<void>;
}

/** A fresh, migrated database inside the shared test MySQL. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const rootUrl = inject('mysqlRootUrl');
  const name = `test_${randomUUID().replaceAll('-', '')}`;
  const admin = await mysql.createConnection(rootUrl);
  await admin.query(`CREATE DATABASE \`${name}\``);
  await admin.end();

  const database = await connectDatabase(`${rootUrl}/${name}`, 'drizzle');
  return {
    ...database,
    async reset() {
      const connection = await mysql.createConnection(`${rootUrl}/${name}`);
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of ['scores', 'game_sessions', 'refresh_tokens', 'users']) {
        await connection.query(`TRUNCATE TABLE \`${table}\``);
      }
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      await connection.end();
    },
  };
}
