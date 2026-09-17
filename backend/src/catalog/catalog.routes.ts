/** Register movie and theatre catalogue endpoints. */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { CatalogService } from './catalog.service';

const theatreQuerySchema = z.object({ movieId: z.string().trim().min(1).optional() });

/** Create routes for database-backed catalogue discovery. */
export function createCatalogRouter(catalogService: CatalogService): Router {
  const router = Router();

  router.get('/movies', (_request: Request, response: Response, next: NextFunction): void => {
    try {
      response.status(200).json({ data: { movies: catalogService.listMovies() } });
    } catch (error: unknown) {
      next(error);
    }
  });

  router.get('/theatres', (request: Request, response: Response, next: NextFunction): void => {
    try {
      const { movieId } = theatreQuerySchema.parse(request.query);
      response.status(200).json({ data: { movieId: movieId ?? null, theatres: catalogService.listTheatres(movieId) } });
    } catch (error: unknown) {
      next(error);
    }
  });

  return router;
}
