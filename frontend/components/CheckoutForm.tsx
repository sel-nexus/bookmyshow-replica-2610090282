/** Collect a payment method and submit only safe booking data. */
'use client';

import { useEffect, useRef, useState } from 'react';
import { createBooking, type BookingConfirmation } from '../lib/apiClient';
import type { Movie, Theatre } from '../lib/apiClient';

/** Describe the booking data required by checkout. */
interface CheckoutFormProps {
  token: string;
  movie: Movie;
  theatre: Theatre;
  seats: string[];
  total: number;
  onConfirmed: (confirmation: BookingConfirmation) => void;
}

/** Submit a strict booking after the visible two-second payment delay. */
export function CheckoutForm({ token, movie, theatre, seats, total, onConfirmed }: CheckoutFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'UPI'>('CARD');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  /** Schedule one safe booking request without retaining payment field values. */
  function pay(): void {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    setError('');
    timeoutRef.current = setTimeout(() => {
      void createBooking({ movieId: movie.id, theatreId: theatre.id, seats, paymentMethod, total }, token)
        .then(onConfirmed)
        .catch((requestError: unknown) => {
          setError(requestError instanceof Error ? requestError.message : 'Unable to confirm your booking.');
        })
        .finally(() => {
          processingRef.current = false;
          setProcessing(false);
        });
    }, 2000);
  }

  return (
    <form
      className="checkout-form"
      onSubmit={(event) => {
        event.preventDefault();
        pay();
      }}
    >
      <fieldset disabled={processing}>
        <legend>Payment method</legend>
        <label>
          <input
            type="radio"
            name="paymentMethod"
            value="CARD"
            checked={paymentMethod === 'CARD'}
            onChange={() => setPaymentMethod('CARD')}
          />
          Card
        </label>
        <label>
          <input
            type="radio"
            name="paymentMethod"
            value="UPI"
            checked={paymentMethod === 'UPI'}
            onChange={() => setPaymentMethod('UPI')}
          />
          UPI
        </label>
      </fieldset>
      {paymentMethod === 'CARD' ? (
        <div className="payment-fields">
          <label htmlFor="card-number">Card Number</label>
          <input id="card-number" inputMode="numeric" autoComplete="cc-number" />
          <label htmlFor="expiry-date">Expiry Date</label>
          <input id="expiry-date" autoComplete="cc-exp" />
          <label htmlFor="cvv">CVV</label>
          <input id="cvv" inputMode="numeric" autoComplete="cc-csc" />
        </div>
      ) : (
        <div className="payment-fields">
          <label htmlFor="upi-id">UPI ID</label>
          <input id="upi-id" autoComplete="off" aria-describedby="upi-help" />
          <p id="upi-help" className="help-text">Example: user@upi</p>
        </div>
      )}
      <p className="checkout-total">Total: ₹{total}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p aria-live="polite" className="payment-status">
        {processing ? 'Processing Payment...' : ''}
      </p>
      <button type="submit" disabled={processing}>
        {processing ? 'Processing Payment...' : 'Pay ₹450'}
      </button>
    </form>
  );
}
