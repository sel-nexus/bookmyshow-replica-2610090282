/** Render the OTP verification form. */
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { verifyOtp } from '../lib/apiClient';
import { useBooking } from '../state/BookingContext';

/** Verify the demo code and continue only after a real API response. */
export function OtpForm(): JSX.Element {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { mobileNumber, setToken } = useBooking();

  /** Submit the entered OTP to the verification endpoint. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!mobileNumber) {
      setError('Return to login and enter your mobile number.');
      return;
    }
    if (!otp.trim()) {
      setError('Enter the verification code.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const token = await verifyOtp(mobileNumber, otp.trim());
      setToken(token);
      router.push('/dashboard');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to verify your code.');
    } finally {
      setSubmitting(false);
    }
  }

  return <form className="auth-form" onSubmit={handleSubmit} noValidate>
    <label htmlFor="otp">Verification code</label>
    <input id="otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value)} aria-describedby="otp-help otp-error" />
    <p id="otp-help" className="help-text">For this demo, use 1234.</p>
    {error && <p id="otp-error" className="form-error" role="alert">{error}</p>}
    <button type="submit" disabled={submitting}>{submitting ? 'Verifying…' : 'Verify and continue'}</button>
  </form>;
}
