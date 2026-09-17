/** Configure the Express application. */
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import type { AppConfig } from './config';
import { createAuthRouter } from './auth/auth.routes';
import { AuthService } from './auth/auth.service';
import { checkDatabase } from './db/database';
import { errorHandler } from './http/errors';

/** Build an Express app wired to the supplied dependencies. */
export function createApp(database: Database.Database, appConfig: AppConfig): express.Express {
  const app = express();
  const authService = new AuthService(database, appConfig);

  app.use(cors({ origin: appConfig.corsOrigin }));
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(authService));
  app.get('/api/health', (_request: Request, response: Response): void => {
    response.status(checkDatabase(database) ? 200 : 503).json({ status: 'ok', database: 'connected' });
  });
  app.use(errorHandler);
  return app;
}
