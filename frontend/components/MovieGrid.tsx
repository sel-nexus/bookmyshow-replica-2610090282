/** Render movie discovery choices. */
'use client';

import type { Movie } from '../lib/apiClient';

/** Describe movie-grid interaction inputs. */
interface MovieGridProps {
  movies: Movie[];
  onSelect: (movie: Movie) => void;
}

/** Present movies with an explicit selection action for each title. */
export function MovieGrid({ movies, onSelect }: MovieGridProps): JSX.Element {
  if (movies.length === 0) return <p className="empty-state" role="status">No screenings are available right now.</p>;
  return <ul className="movie-grid" aria-label="Available movies">
    {movies.map((movie) => <li key={movie.id} className="movie-card">
      <p className="eyebrow">NOW SHOWING</p><h2>{movie.title}</h2>
      <button type="button" onClick={() => onSelect(movie)}>Choose {movie.title}</button>
    </li>)}
  </ul>;
}
