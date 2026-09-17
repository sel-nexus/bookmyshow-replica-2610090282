/** Register protected booking confirmation endpoints. */
import jwt from 'jsonwebtoken';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config';
import { HttpError } from '../http/errors';
import type { BookingService } from './booking.service';

const bookingSchema = z.object({
  movieId: z.string().trim().min(1),
  theatreId: z.string().trim().min(1),
  seats: z.tuple([z.literal('A1'), z.literal('A2'), z.literal('A3')]),
  paymentMethod: z.enum(['CARD', 'UPI']),
  total: z.literal(450)
}).strict();

/** Create routes that authenticate and confirm fixed-bundle bookings. */
export function createBookingRouter(bookingService: BookingService, appConfig: AppConfig): Router {
  const router = Router();
  router.post('/bookings', (request: Request, response: Response, next: NextFunction): void => {
    try {
      const authorization = request.header('authorization');
      if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, 'UNAUTHORIZED', 'A valid bearer token is required.');
      const token = authorization.slice('Bearer '.length);
      const claims = jwt.verify(token, appConfig.jwtSecret, { issuer: appConfig.jwtIssuer, audience: appConfig.jwtAudience });
      if (typeof claims === 'string' || !claims.sub || !/^\d+$/.test(claims.sub)) {
        throw new HttpError(401, 'UNAUTHORIZED', 'A valid bearer token is required.');
      }
      const input = bookingSchema.parse(request.body);
      response.status(201).json({ data: bookingService.createBooking(Number(claims.sub), input) });
    } catch (error: unknown) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError || error instanceof jwt.NotBeforeError) {
        next(new HttpError(401, 'UNAUTHORIZED', 'A valid bearer token is required.'));
        return;
      }
      next(error);
    }
  });
  return router;
}
