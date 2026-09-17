/** Query the persisted movie catalogue. */
import type Database from 'better-sqlite3';

/** Describe a movie available for discovery. */
export interface Movie {
  id: string;
  title: string;
}

/** Describe a theatre that is showing a movie. */
export interface Theatre {
  id: string;
  name: string;
}

/** Provide read-only access to catalogue resources. */
export class CatalogService {
  /** Construct the service with its file-backed database. */
  public constructor(private readonly database: Database.Database) {}

  /** List every seeded movie in stable catalogue order. */
  public listMovies(): Movie[] {
    return this.database.prepare('SELECT id, title FROM movies ORDER BY id').all() as Movie[];
  }

  /** List theatres from mappings, optionally for one movie. */
  public listTheatres(movieId?: string): Theatre[] {
    if (movieId) {
      return this.database.prepare(`
        SELECT theatres.id, theatres.name
        FROM movie_theatres
        INNER JOIN theatres ON theatres.id = movie_theatres.theatre_id
        WHERE movie_theatres.movie_id = ?
        ORDER BY theatres.id
      `).all(movieId) as Theatre[];
    }
    return this.database.prepare(`
      SELECT DISTINCT theatres.id, theatres.name
      FROM movie_theatres
      INNER JOIN theatres ON theatres.id = movie_theatres.theatre_id
      ORDER BY theatres.id
    `).all() as Theatre[];
  }
}
