/** Render protected theatre discovery for a selected movie. */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TheatreList } from '../../../../components/TheatreList';
import { getTheatres, type Theatre } from '../../../../lib/apiClient';
import { useBooking } from '../../../../state/BookingContext';

/** Describe dynamic theatre route input. */
interface TheatrePageProps { params: { movieId: string }; }

/** Show mapped theatres and require an explicit choice before seats. */
export default function TheatrePage({ params }: TheatrePageProps): JSX.Element {
  const router = useRouter();
  const { token, updateJourney } = useBooking();
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [selectedTheatre, setSelectedTheatre] = useState<Theatre | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    let active = true;
    /** Load only theatres mapped to the route movie. */
    async function loadTheatres(): Promise<void> {
      try {
        const result = await getTheatres(params.movieId);
        if (active) setTheatres(result);
      } catch (requestError: unknown) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load theatres.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadTheatres();
    return () => { active = false; };
  }, [params.movieId, router, token]);

  /** Persist the selected theatre only when the guest continues. */
  function continueToSeats(): void {
    if (!selectedTheatre) return;
    updateJourney({ theatre: selectedTheatre, seats: [], total: 0 });
    router.push('/seats');
  }

  return <main className="discovery-page"><section className="discovery-header" aria-labelledby="theatre-title"><p className="eyebrow">RED SEAT / THEATRES</p><h1 id="theatre-title">Pick a theatre.</h1><p>Choose one location before you continue to the seats.</p></section>
    {loading && <p role="status">Loading theatres…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!loading && !error && <TheatreList theatres={theatres} selectedTheatreId={selectedTheatre?.id ?? null} onSelect={setSelectedTheatre} onContinue={continueToSeats} />}
  </main>;
}
