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
    CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS theatres (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS movie_theatres (
      movie_id TEXT NOT NULL,
      theatre_id TEXT NOT NULL,
      PRIMARY KEY (movie_id, theatre_id),
      FOREIGN KEY (movie_id) REFERENCES movies(id),
      FOREIGN KEY (theatre_id) REFERENCES theatres(id)
    );
  `);
  database.exec(`
    INSERT OR IGNORE INTO movies (id, title) VALUES
      ('mov_paradise', 'Paradise'),
      ('mov_bloody_romeo', 'Bloody Romeo'),
      ('mov_og2', 'OG2');
    INSERT OR IGNORE INTO theatres (id, name) VALUES
      ('theatre_grand', 'Grand Cinema'),
      ('theatre_riverview', 'Riverview Screens'),
      ('theatre_midtown', 'Midtown Picture House');
    /* Catalogue fixture: Paradise→Grand/Riverview, Bloody Romeo→Midtown, OG2→Grand. */
    INSERT OR IGNORE INTO movie_theatres (movie_id, theatre_id) VALUES
      ('mov_paradise', 'theatre_grand'),
      ('mov_paradise', 'theatre_riverview'),
      ('mov_bloody_romeo', 'theatre_midtown'),
      ('mov_og2', 'theatre_grand');
  `);
  return database;
}

/** Verify that a database connection can execute a query. */
export function checkDatabase(database: Database.Database): boolean {
  const row = database.prepare('SELECT 1 AS connected').get() as { connected: number };
  return row.connected === 1;
}
