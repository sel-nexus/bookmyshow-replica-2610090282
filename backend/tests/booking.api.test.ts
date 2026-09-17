/** Exercise booking API validation, authorization, and real SQLite integrity. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDatabase } from '../src/db/database';

const directories: string[] = [];
const validBody = { movieId: 'mov_paradise', theatreId: 'theatre_grand', seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', total: 450 };

/** Create an app connected to a dedicated real SQLite file. */
function setup() {
  const directory = mkdtempSync(join(tmpdir(), 'booking-api-'));
  directories.push(directory);
  const config = loadConfig({ DATABASE_PATH: join(directory, 'booking.sqlite'), JWT_SECRET: 'test-secret', JWT_ISSUER: 'issuer', JWT_AUDIENCE: 'audience', PORT: '4000', CORS_ORIGIN: 'http://localhost:3000' });
  const database = createDatabase(config.databasePath);
  return { app: createApp(database, config), database, config };
}

/** Issue a real application token by completing OTP verification. */
async function token(app: import('express').Express): Promise<string> {
  return (await request(app).post('/api/auth/verify').send({ mobileNumber: '+155501', otp: '1234' })).body.data.token;
}

/** Assert the public validation envelope without relying on correlation IDs. */
function expectValidation(response: request.Response): void {
  expect(response.status).toBe(400);
  expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Request body is invalid.' });
  expect(response.body.error.correlationId).toEqual(expect.any(String));
}

afterEach(() => directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

describe('booking API', () => {
  it('returns 401 for absent, malformed, invalid, expired, wrong-issuer, wrong-audience, string, and no-sub bearer claims without writes', async () => {
    const { app, database, config } = setup();
    const validToken = await token(app);
    const invalidTokens = [
      'not-a-jwt',
      jwt.sign({ sub: '1' }, config.jwtSecret, { issuer: config.jwtIssuer, audience: config.jwtAudience, expiresIn: -1 }),
      jwt.sign({ sub: '1' }, config.jwtSecret, { issuer: 'wrong-issuer', audience: config.jwtAudience }),
      jwt.sign({ sub: '1' }, config.jwtSecret, { issuer: config.jwtIssuer, audience: 'wrong-audience' }),
      jwt.sign('opaque-subject', config.jwtSecret),
      jwt.sign({ mobileNumber: '+155501' }, config.jwtSecret, { issuer: config.jwtIssuer, audience: config.jwtAudience })
    ];
    for (const authorization of [undefined, 'Basic abc', 'Bearer', 'Bearer ', ...invalidTokens.map((value) => `Bearer ${value}`)]) {
      const response = await request(app).post('/api/bookings').set(authorization ? { Authorization: authorization } : {}).send(validBody);
      expect(response.status).toBe(401);
      expect(response.body.error).toMatchObject({ code: 'UNAUTHORIZED', message: 'A valid bearer token is required.' });
    }
    const nonexistentSubject = jwt.sign({ sub: '999999' }, config.jwtSecret, { issuer: config.jwtIssuer, audience: config.jwtAudience });
    const missingUser = await request(app).post('/api/bookings').set('Authorization', `Bearer ${nonexistentSubject}`).send(validBody);
    expect(missingUser.status).toBe(404);
    expect(missingUser.body.error.code).toBe('USER_NOT_FOUND');
    expect(validToken).toEqual(expect.any(String));
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });

  it('rejects every missing, wrong-type, blank, strict-extra, and oversized booking field with 400', async () => {
    const { app, database } = setup();
    const authorization = `Bearer ${await token(app)}`;
    const invalidBodies = [
      { theatreId: validBody.theatreId, seats: validBody.seats, paymentMethod: validBody.paymentMethod, total: validBody.total },
      { movieId: validBody.movieId, seats: validBody.seats, paymentMethod: validBody.paymentMethod, total: validBody.total },
      { movieId: validBody.movieId, theatreId: validBody.theatreId, paymentMethod: validBody.paymentMethod, total: validBody.total },
      { movieId: validBody.movieId, theatreId: validBody.theatreId, seats: validBody.seats, total: validBody.total },
      { movieId: validBody.movieId, theatreId: validBody.theatreId, seats: validBody.seats, paymentMethod: validBody.paymentMethod },
      { ...validBody, movieId: 1 }, { ...validBody, theatreId: 1 }, { ...validBody, seats: 'A1' }, { ...validBody, paymentMethod: 1 }, { ...validBody, total: '450' },
      { ...validBody, movieId: '   ' }, { ...validBody, theatreId: '   ' }, { ...validBody, seats: [] }, { ...validBody, paymentMethod: ' ' },
      { ...validBody, extra: 'not allowed' }, { ...validBody, movieId: 'm'.repeat(256) }, { ...validBody, theatreId: 't'.repeat(256) }
    ];
    for (const body of invalidBodies) expectValidation(await request(app).post('/api/bookings').set('Authorization', authorization).send(body));
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });

  it('rolls back unmapped and attack-shaped selections after starting transactions without SQL disclosure', async () => {
    const { app, database } = setup();
    const authorization = `Bearer ${await token(app)}`;
    for (const body of [{ ...validBody, movieId: 'missing' }, { ...validBody, theatreId: 'missing' }, { ...validBody, theatreId: 'theatre_midtown' }, { ...validBody, movieId: "mov_paradise' OR 1=1 --" }, { ...validBody, theatreId: '<script>alert(1)</script>' }]) {
      const response = await request(app).post('/api/bookings').set('Authorization', authorization).send(body);
      expect(response.status).toBe(404);
      expect(response.body.error.message).not.toMatch(/sql|sqlite|syntax|\bselect\b/i);
      expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
    }
  });

  it('enforces direct SQLite foreign-key, payment, and total constraints without changing stored bookings', async () => {
    const { database } = setup();
    database.prepare('INSERT INTO users (mobile_number) VALUES (?)').run('+15550999');
    const insert = database.prepare('INSERT INTO bookings (id, user_id, movie_id, theatre_id, seats_json, payment_method, total_price, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    expect(() => insert.run('bad-user', 999, 'mov_paradise', 'theatre_grand', '["A1","A2","A3"]', 'CARD', 450, 'INR')).toThrow();
    expect(() => insert.run('bad-payment', 1, 'mov_paradise', 'theatre_grand', '["A1","A2","A3"]', 'CASH', 450, 'INR')).toThrow();
    expect(() => insert.run('bad-total', 1, 'mov_paradise', 'theatre_grand', '["A1","A2","A3"]', 'CARD', 449, 'INR')).toThrow();
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });

  it('persists exactly one valid booking with the fixed fields', async () => {
    const { app, database } = setup();
    const response = await request(app).post('/api/bookings').set('Authorization', `Bearer ${await token(app)}`).send({ ...validBody, paymentMethod: 'UPI' });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ movie: { id: 'mov_paradise', title: 'Paradise' }, theatre: { id: 'theatre_grand', name: 'Grand Cinema' }, seats: ['A1', 'A2', 'A3'], paymentMethod: 'UPI', total: 450, currency: 'INR' });
    expect(database.prepare('SELECT seats_json, total_price, payment_method FROM bookings WHERE id = ?').get(response.body.data.confirmationId)).toEqual({ seats_json: '["A1","A2","A3"]', total_price: 450, payment_method: 'UPI' });
  });
});
