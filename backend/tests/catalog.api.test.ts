/** Exercise catalogue endpoints against real file-backed SQLite. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

const directories: string[] = [];

/** Create a temporary application with the real persisted catalogue schema. */
async function makeTestApp(): Promise<{ app: import('express').Express; database: Database.Database; databasePath: string }> {
  const directory = mkdtempSync(join(tmpdir(), 'demo-catalog-'));
  directories.push(directory);
  const databasePath = join(directory, 'catalog.sqlite');
  process.env.DATABASE_PATH = databasePath;
  process.env.JWT_SECRET = 'test-secret-value';
  process.env.JWT_ISSUER = 'test-issuer';
  process.env.JWT_AUDIENCE = 'test-audience';
  process.env.PORT = '4000';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  const { createDatabase } = await import('../src/db/database');
  const { createApp } = await import('../src/app');
  const { loadConfig } = await import('../src/config');
  const database = createDatabase(databasePath);
  return { app: createApp(database, loadConfig()), database, databasePath };
}

afterEach((): void => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('catalogue API', () => {
  it('seeds catalogue records idempotently and returns the required movies', async (): Promise<void> => {
    const { app, database, databasePath } = await makeTestApp();
    const { createDatabase } = await import('../src/db/database');
    const repeatedDatabase = createDatabase(databasePath);
    repeatedDatabase.close();
    expect(database.prepare('SELECT COUNT(*) AS count FROM movies').get()).toEqual({ count: 3 });
    expect(database.prepare('SELECT COUNT(*) AS count FROM theatres').get()).toEqual({ count: 3 });
    expect(database.prepare('SELECT COUNT(*) AS count FROM movie_theatres').get()).toEqual({ count: 4 });

    const response = await request(app).get('/api/movies');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { movies: [
      { id: 'mov_bloody_romeo', title: 'Bloody Romeo' },
      { id: 'mov_og2', title: 'OG2' },
      { id: 'mov_paradise', title: 'Paradise' }
    ] } });
  });

  it('returns mapping-backed theatres with filtered and optional discovery behavior', async (): Promise<void> => {
    const { app } = await makeTestApp();
    const filtered = await request(app).get('/api/theatres').query({ movieId: 'mov_paradise' });
    expect(filtered.status).toBe(200);
    expect(filtered.body).toEqual({ data: { movieId: 'mov_paradise', theatres: [
      { id: 'theatre_grand', name: 'Grand Cinema' },
      { id: 'theatre_riverview', name: 'Riverview Screens' }
    ] } });

    const all = await request(app).get('/api/theatres');
    expect(all.status).toBe(200);
    expect(all.body.data.movieId).toBeNull();
    expect(all.body.data.theatres).toEqual([
      { id: 'theatre_grand', name: 'Grand Cinema' },
      { id: 'theatre_midtown', name: 'Midtown Picture House' },
      { id: 'theatre_riverview', name: 'Riverview Screens' }
    ]);

    const unknown = await request(app).get('/api/theatres').query({ movieId: 'missing' });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual({ data: { movieId: 'missing', theatres: [] } });
  });

  it('rejects a malformed movieId query value', async (): Promise<void> => {
    const { app } = await makeTestApp();
    const response = await request(app).get('/api/theatres').query({ movieId: '   ' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
