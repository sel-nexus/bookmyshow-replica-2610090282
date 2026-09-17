/** Provide the file-backed SQLite data store. */
import Database from 'better-sqlite3';

/** Describe a persisted user record. */
export interface UserRecord {
  id: number;
  mobileNumber: string;
}

/** Initialize a SQLite database and its required schema. */
export function createDatabase(databasePath: string): Database.Database {
  const database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mobile_number TEXT NOT NULL UNIQUE
    );
  `);
  return database;
}

/** Verify that a database connection can execute a query. */
export function checkDatabase(database: Database.Database): boolean {
  const row = database.prepare('SELECT 1 AS connected').get() as { connected: number };
  return row.connected === 1;
}
