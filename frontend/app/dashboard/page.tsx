/** Render protected movie discovery. */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MovieGrid } from '../../components/MovieGrid';
import { getMovies, type Movie } from '../../lib/apiClient';
import { useBooking } from '../../state/BookingContext';

/** Show API-sourced movies after verifying local booking access. */
export default function DashboardPage(): JSX.Element {
  const router = useRouter();
  const { token, updateJourney } = useBooking();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    let active = true;
    /** Load catalogue data while the page remains mounted. */
    async function loadMovies(): Promise<void> {
      try {
        const result = await getMovies();
        if (active) setMovies(result);
      } catch (requestError: unknown) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load movies.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadMovies();
    return () => { active = false; };
  }, [router, token]);

  /** Save the explicit movie choice before opening its theatres. */
  function chooseMovie(movie: Movie): void {
    updateJourney({ movie, theatre: null, seats: [], total: 0 });
    router.push(`/movies/${movie.id}/theatres`);
  }

  return <main className="discovery-page"><section className="discovery-header" aria-labelledby="dashboard-title"><p className="eyebrow">RED SEAT / DISCOVER</p><h1 id="dashboard-title">Choose your next screening.</h1><p>Start with a film, then select the theatre that fits your night.</p></section>
    {loading && <p role="status">Loading movies…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!loading && !error && <MovieGrid movies={movies} onSelect={chooseMovie} />}
  </main>;
}
