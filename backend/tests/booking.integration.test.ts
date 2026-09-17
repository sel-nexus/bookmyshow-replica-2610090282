import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDatabase } from '../src/db/database';

let directory = '';
afterEach(() => { if (directory) rmSync(directory, { recursive: true, force: true }); directory = ''; });
describe('booking integration flow', () => {
  it('chains login, verification, catalogue, theatre discovery and booking with durable state', async () => {
    directory = mkdtempSync(join(tmpdir(), 'booking-integration-'));
    const config = loadConfig({ DATABASE_PATH: join(directory, 'flow.sqlite'), JWT_SECRET: 'integration-secret', JWT_ISSUER: 'issuer', JWT_AUDIENCE: 'audience', PORT: '4000', CORS_ORIGIN: 'http://localhost:3000' });
    const database = createDatabase(config.databasePath); const app = createApp(database, config);
    expect((await request(app).post('/api/auth/login').send({ mobileNumber: '+155502' })).status).toBe(200);
    const verified = await request(app).post('/api/auth/verify').send({ mobileNumber: '+155502', otp: '1234' }); const token = verified.body.data.token;
    expect((await request(app).get('/api/movies')).body.data.movies).toContainEqual({ id: 'mov_paradise', title: 'Paradise' });
    expect((await request(app).get('/api/theatres?movieId=mov_paradise')).body.data.theatres).toContainEqual({ id: 'theatre_grand', name: 'Grand Cinema' });
    const booking = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ movieId: 'mov_paradise', theatreId: 'theatre_grand', seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', total: 450 });
    expect(booking.status).toBe(201); expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 1 });
    const stale = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ movieId: 'mov_paradise', theatreId: 'theatre_midtown', seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', total: 450 });
    expect(stale.status).toBe(404);
    expect(stale.body.error.code).toBe('MOVIE_THEATRE_NOT_FOUND');
    const unmapped = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ movieId: 'stale-movie', theatreId: 'theatre_grand', seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', total: 450 });
    expect(unmapped.status).toBe(404);
    expect(unmapped.body.error.code).toBe('MOVIE_NOT_FOUND');
    expect(database.prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 1 });
    expect((await request(app).post('/api/bookings').set('Authorization', 'Bearer invalid').send({})).status).toBe(401);
  });
});
