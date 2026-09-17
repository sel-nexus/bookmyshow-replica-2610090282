/** Define the application document shell. */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { BookingProvider } from '../state/BookingContext';

/** Describe default document metadata. */
export const metadata: Metadata = {
  title: 'Red Seat | Secure booking access',
  description: 'Verify your mobile number to begin a cinema booking journey.'
};

/** Wrap every route in the booking state provider. */
export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return <html lang="en"><body><BookingProvider>{children}</BookingProvider></body></html>;
}
