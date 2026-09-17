/** Hold authentication and future booking journey state. */
'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** Describe state retained throughout a booking journey. */
export interface BookingJourney {
  mobileNumber: string;
  token: string;
  movie: string;
  theatre: string;
  seats: string[];
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  confirmation: string;
}

/** Describe state update operations for the booking journey. */
interface BookingContextValue extends BookingJourney {
  setMobileNumber: (mobileNumber: string) => void;
  setToken: (token: string) => void;
  updateJourney: (journey: Partial<Omit<BookingJourney, 'mobileNumber' | 'token'>>) => void;
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

/** Provide booking journey state to client components. */
export function BookingProvider({ children }: { children: ReactNode }): JSX.Element {
  const [journey, setJourney] = useState<BookingJourney>({
    mobileNumber: '', token: '', movie: '', theatre: '', seats: [], total: 0,
    paymentMethod: '', paymentStatus: '', confirmation: ''
  });
  const value = useMemo<BookingContextValue>(() => ({
    ...journey,
    setMobileNumber: (mobileNumber: string): void => setJourney((current) => ({ ...current, mobileNumber })),
    setToken: (token: string): void => setJourney((current) => ({ ...current, token })),
    updateJourney: (updates): void => setJourney((current) => ({ ...current, ...updates }))
  }), [journey]);
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

/** Read the active booking journey state. */
export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within BookingProvider.');
  }
  return context;
}
