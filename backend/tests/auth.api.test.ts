/** Exercise authentication endpoints against real file-backed SQLite. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

const directories: string[] = [];

/** Create an app backed by a new temporary SQLite database file. */
async function makeTestApp(): Promise<{ app: import('express').Express; database: Database.Database }> {
  const directory = mkdtempSync(join(tmpdir(), 'demo-otp-access-'));
  directories.push(directory);
  process.env.DATABASE_PATH = join(directory, 'auth.sqlite');
  process.env.JWT_SECRET = 'test-secret-value';
  process.env.JWT_ISSUER = 'test-issuer';
  process.env.JWT_AUDIENCE = 'test-audience';
  process.env.PORT = '4000';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  const { createDatabase } = await import('../src/db/database');
  const { createApp } = await import('../src/app');
  const { loadConfig } = await import('../src/config');
  const database = createDatabase(process.env.DATABASE_PATH);
  return { app: createApp(database, loadConfig()), database };
}

afterEach((): void => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('OTP authentication API', () => {
  it('initiates OTP without creating a user and rejects malformed login input', async (): Promise<void> => {
    const { app, database } = await makeTestApp();
    const login = await request(app).post('/api/auth/login').send({ mobileNumber: '+15550000001' });
    expect(login.status).toBe(200);
    expect(login.body).toEqual({ data: { status: 'OTP_INITIATED', mobileNumber: '+15550000001' } });
    expect(database.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 0 });

    const malformed = await request(app).post('/api/auth/login').send({ mobileNumber: '' });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('persists and reuses the same user after successful verification', async (): Promise<void> => {
    const { app, database } = await makeTestApp();
    const first = await request(app).post('/api/auth/verify').send({ mobileNumber: '+15550000002', otp: '1234' });
    const second = await request(app).post('/api/auth/verify').send({ mobileNumber: '+15550000002', otp: '1234' });
    expect(first.status).toBe(200);
    expect(first.body.data.tokenType).toBe('Bearer');
    expect(first.body.data.token).toEqual(expect.any(String));
    expect(second.body.data.user.id).toBe(first.body.data.user.id);
    expect(database.prepare('SELECT id, mobile_number AS mobileNumber FROM users').all()).toEqual([
      { id: first.body.data.user.id, mobileNumber: '+15550000002' }
    ]);
  });

  it('returns 401 for invalid OTP and 400 for malformed verification', async (): Promise<void> => {
    const { app } = await makeTestApp();
    const invalid = await request(app).post('/api/auth/verify').send({ mobileNumber: '+15550000003', otp: '0000' });
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe('INVALID_OTP');

    const malformed = await request(app).post('/api/auth/verify').send({ mobileNumber: '+15550000003' });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('reports database connectivity through health', async (): Promise<void> => {
    const { app } = await makeTestApp();
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok', database: 'connected' });
  });
});
