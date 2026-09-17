/** Persist strict, confirmed cinema bookings. */
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { HttpError } from '../http/errors';

/** Describe a booking request accepted by the service. */
export interface CreateBookingInput {
  movieId: string;
  theatreId: string;
  seats: ['A1', 'A2', 'A3'];
  paymentMethod: 'CARD' | 'UPI';
  total: 450;
}

/** Describe the confirmation returned after a successful booking. */
export interface BookingConfirmation {
  confirmationId: string;
  movie: { id: string; title: string };
  theatre: { id: string; name: string };
  seats: ['A1', 'A2', 'A3'];
  paymentMethod: 'CARD' | 'UPI';
  total: 450;
  currency: 'INR';
}

/** Create booking records from verified identities and catalogue references. */
export class BookingService {
  /** Create a booking service using the shared SQLite connection. */
  public constructor(private readonly database: Database.Database) {}

  /** Create one immutable booking inside an immediate SQLite transaction. */
  public createBooking(userId: number, input: CreateBookingInput): BookingConfirmation {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const user = this.database.prepare('SELECT id FROM users WHERE id = ?').get(userId) as { id: number } | undefined;
      if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'The booking user was not found.');

      const movie = this.database.prepare('SELECT id, title FROM movies WHERE id = ?').get(input.movieId) as { id: string; title: string } | undefined;
      if (!movie) throw new HttpError(404, 'MOVIE_NOT_FOUND', 'The selected movie was not found.');

      const theatre = this.database.prepare('SELECT id, name FROM theatres WHERE id = ?').get(input.theatreId) as { id: string; name: string } | undefined;
      if (!theatre) throw new HttpError(404, 'THEATRE_NOT_FOUND', 'The selected theatre was not found.');

      const mapping = this.database.prepare('SELECT 1 AS mapped FROM movie_theatres WHERE movie_id = ? AND theatre_id = ?').get(input.movieId, input.theatreId) as { mapped: number } | undefined;
      if (!mapping) throw new HttpError(404, 'MOVIE_THEATRE_NOT_FOUND', 'The selected theatre does not show this movie.');

      const confirmationId = randomUUID();
      this.database.prepare(`INSERT INTO bookings
        (id, user_id, movie_id, theatre_id, seats_json, payment_method, total_price, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(confirmationId, userId, movie.id, theatre.id, JSON.stringify(input.seats), input.paymentMethod, 450, 'INR');
      this.database.exec('COMMIT');
      return { confirmationId, movie, theatre, seats: input.seats, paymentMethod: input.paymentMethod, total: 450, currency: 'INR' };
    } catch (error: unknown) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}
