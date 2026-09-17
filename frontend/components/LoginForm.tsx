/** Render the mobile-number login form. */
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { initiateOtp } from '../lib/apiClient';
import { useBooking } from '../state/BookingContext';

/** Collect a mobile number and initiate OTP delivery. */
export function LoginForm(): JSX.Element {
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { setMobileNumber: saveMobileNumber } = useBooking();

  /** Submit the mobile number only after explicit user action. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!mobileNumber.trim()) {
      setError('Enter your mobile number.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await initiateOtp(mobileNumber.trim());
      saveMobileNumber(mobileNumber.trim());
      router.push('/verify');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to start verification.');
    } finally {
      setSubmitting(false);
    }
  }

  return <form className="auth-form" onSubmit={handleSubmit} noValidate>
    <label htmlFor="mobileNumber">Mobile number</label>
    <input id="mobileNumber" name="mobileNumber" type="tel" autoComplete="tel" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} aria-describedby="mobile-error" />
    {error && <p id="mobile-error" className="form-error" role="alert">{error}</p>}
    <button type="submit" disabled={submitting}>{submitting ? 'Sending code…' : 'Send verification code'}</button>
  </form>;
}
