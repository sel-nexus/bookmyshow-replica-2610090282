import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDatabase } from '../src/db/database';

const directories: string[] = [];
function setup() {
  const directory = mkdtempSync(join(tmpdir(), 'booking-api-')); directories.push(directory);
  const config = loadConfig({ DATABASE_PATH: join(directory, 'booking.sqlite'), JWT_SECRET: 'test-secret', JWT_ISSUER: 'issuer', JWT_AUDIENCE: 'audience', PORT: '4000', CORS_ORIGIN: 'http://localhost:3000' });
  const database = createDatabase(config.databasePath); const app = createApp(database, config);
  return { app, database };
}
async function token(app: import('express').Express): Promise<string> { return (await request(app).post('/api/auth/verify').send({ mobileNumber: '+155501', otp: '1234' })).body.data.token; }
afterEach(() => directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));
describe('booking API', () => {
  it('rejects a missing JWT and prescribed invalid booking values', async () => {
    const { app } = setup(); const body = { movieId: 'mov_paradise', theatreId: 'theatre_grand', seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', total: 450 };
    expect((await request(app).post('/api/bookings').send(body)).status).toBe(401);
    expect((await request(app).post('/api/bookings').set('Authorization', `Bearer ${await token(app)}`).send({ ...body, total: 449 })).status).toBe(400);
  });
  it('returns 404 for missing or unmapped catalogue resources', async () => {
    const { app } = setup(); const authorization = `Bearer ${await token(app)}`;
    expect((await request(app).post('/api/bookings').set('Authorization', authorization).send({ movieId: 'missing', theatreId: 'theatre_grand', seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', total: 450 })).status).toBe(404);
    expect((await request(app).post('/api/bookings').set('Authorization', authorization).send({ movieId: 'mov_paradise', theatreId: 'theatre_midtown', seats: ['A1', 'A2', 'A3'], paymentMethod: 'UPI', total: 450 })).status).toBe(404);
  });
  it('persists exactly one valid booking with the fixed fields', async () => {
    const { app, database } = setup(); const response = await request(app).post('/api/bookings').set('Authorization', `Bearer ${await token(app)}`).send({ movieId: 'mov_paradise', theatreId: 'theatre_grand', seats: ['A1', 'A2', 'A3'], paymentMethod: 'UPI', total: 450 });
    expect(response.status).toBe(201); expect(response.body.data).toMatchObject({ movie: { id: 'mov_paradise', title: 'Paradise' }, theatre: { id: 'theatre_grand', name: 'Grand Cinema' }, seats: ['A1', 'A2', 'A3'], paymentMethod: 'UPI', total: 450, currency: 'INR' });
    expect(database.prepare('SELECT seats_json, total_price, payment_method FROM bookings WHERE id = ?').get(response.body.data.confirmationId)).toEqual({ seats_json: '["A1","A2","A3"]', total_price: 450, payment_method: 'UPI' });
  });
});
