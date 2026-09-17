/** Render the protected checkout step. */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckoutForm } from '../../components/CheckoutForm';
import { useBooking } from '../../state/BookingContext';

/** Display checkout only when the complete booking journey is available. */
export default function CheckoutPage() {
  const router = useRouter();
  const booking = useBooking();
  const complete = Boolean(
    booking.token
      && booking.movie
      && booking.theatre
      && booking.seats.join(',') === 'A1,A2,A3'
      && booking.total === 450
  );

  useEffect(() => {
    if (!booking.token) router.replace('/login');
    else if (!complete) router.replace('/seats');
  }, [booking.token, complete, router]);

  if (!complete || !booking.movie || !booking.theatre) return null;

  return (
    <main className="checkout-page">
      <section className="checkout-header" aria-labelledby="checkout-title">
        <p className="eyebrow">RED SEAT / CHECKOUT</p>
        <h1 id="checkout-title">Confirm your booking.</h1>
        <p>
          {booking.movie.title} at {booking.theatre.name}. Seats {booking.seats.join(', ')}.
        </p>
      </section>
      <CheckoutForm
        token={booking.token}
        movie={booking.movie}
        theatre={booking.theatre}
        seats={booking.seats}
        total={booking.total}
        onConfirmed={(confirmation) => {
          booking.updateJourney({ confirmation });
          router.push('/confirmation');
        }}
      />
    </main>
  );
}
