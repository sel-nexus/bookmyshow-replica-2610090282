/** Render the protected booking confirmation. */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmationTicket } from '../../components/ConfirmationTicket';
import { useBooking } from '../../state/BookingContext';

/** Show only the confirmation DTO returned from the backend. */
export default function ConfirmationPage() {
  const router = useRouter();
  const { confirmation } = useBooking();
  useEffect(() => { if (!confirmation) router.replace('/login'); }, [confirmation, router]);
  if (!confirmation) return null;
  return <main className="confirmation-page"><ConfirmationTicket confirmation={confirmation} /></main>;
}
