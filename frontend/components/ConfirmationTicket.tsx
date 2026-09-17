/** Render booking confirmation data without reading mutable journey state. */
import type { BookingConfirmation } from '../lib/apiClient';

/** Describe the ticket data displayed to a confirmed customer. */
interface ConfirmationTicketProps {
  confirmation: BookingConfirmation;
}

/** Present a confirmed booking as an accessible ticket. */
export function ConfirmationTicket({ confirmation }: ConfirmationTicketProps) {
  return <section className="confirmation-ticket" aria-labelledby="confirmation-title">
    <p className="eyebrow">RED SEAT / CONFIRMED</p>
    <h1 id="confirmation-title">Congratulations!</h1>
    <p>Your cinema booking is confirmed.</p>
    <dl>
      <div><dt>Confirmation ID</dt><dd>{confirmation.confirmationId}</dd></div>
      <div><dt>Movie</dt><dd>{confirmation.movie.title}</dd></div>
      <div><dt>Theatre</dt><dd>{confirmation.theatre.name}</dd></div>
      <div><dt>Seats</dt><dd>{confirmation.seats.join(', ')}</dd></div>
      <div><dt>Payment method</dt><dd>{confirmation.paymentMethod}</dd></div>
      <div><dt>Total</dt><dd>₹{confirmation.total} {confirmation.currency}</dd></div>
    </dl>
  </section>;
}
