/** Render protected seat selection. */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SeatGrid } from '../../components/SeatGrid';
import { useBooking } from '../../state/BookingContext';

/** Display the fixed seat bundle for the selected theatre. */
export default function SeatsPage(): JSX.Element {
  const router = useRouter();
  const { token, theatre, updateJourney } = useBooking();

  useEffect(() => { if (!token) router.replace('/login'); }, [router, token]);

  /** Write the deterministic bundle on every explicit selection. */
  function selectSeats(): void {
    updateJourney({ seats: ['A1', 'A2', 'A3'], total: 450 });
    router.push('/checkout');
  }

  return <main className="discovery-page"><section className="discovery-header" aria-labelledby="seats-title"><p className="eyebrow">RED SEAT / SEATS</p><h1 id="seats-title">Your seat bundle.</h1><p>{theatre ? `Selected theatre: ${theatre.name}` : 'Select a theatre before confirming seats.'}</p></section>
    <SeatGrid />
    <button type="button" onClick={selectSeats}>Select seats</button>
  </main>;
}
