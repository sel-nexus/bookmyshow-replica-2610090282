/** Configure the Express application. */
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import type { AppConfig } from './config';
import { createAuthRouter } from './auth/auth.routes';
import { AuthService } from './auth/auth.service';
import { createCatalogRouter } from './catalog/catalog.routes';
import { CatalogService } from './catalog/catalog.service';
import { createBookingRouter } from './booking/booking.routes';
import { BookingService } from './booking/booking.service';
import { checkDatabase } from './db/database';
import { errorHandler } from './http/errors';

/** Build an Express app wired to the supplied dependencies. */
export function createApp(database: Database.Database, appConfig: AppConfig): express.Express {
  const app = express();
  const authService = new AuthService(database, appConfig);
  const catalogService = new CatalogService(database);
  const bookingService = new BookingService(database);

  app.use(cors({ origin: appConfig.corsOrigin }));
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(authService));
  app.use('/api', createCatalogRouter(catalogService));
  app.use('/api', createBookingRouter(bookingService, appConfig));
  /** Report database-backed readiness without exposing connection details. */
  app.get('/api/health', (_request: Request, response: Response): void => {
    try {
      if (!checkDatabase(database)) {
        response.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database is unreachable.' } });
        return;
      }
      response.status(200).json({ data: { status: 'ok', database: 'reachable' } });
    } catch (_error: unknown) {
      response.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database is unreachable.' } });
    }
  });
  app.use(errorHandler);
  return app;
}
