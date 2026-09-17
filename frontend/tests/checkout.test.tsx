import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckoutForm } from '../components/CheckoutForm';
import { ConfirmationTicket } from '../components/ConfirmationTicket';
import * as api from '../lib/apiClient';

const props = { token: 'jwt', movie: { id: 'mov_paradise', title: 'Paradise' }, theatre: { id: 'theatre_grand', name: 'Grand Cinema' }, seats: ['A1', 'A2', 'A3'], total: 450, onConfirmed: vi.fn() };
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe('checkout', () => {
  it('shows card and UPI controls and never posts before two seconds', async () => {
    vi.useFakeTimers(); const create = vi.spyOn(api, 'createBooking').mockResolvedValue({ confirmationId: 'c1', movie: props.movie, theatre: props.theatre, seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', total: 450, currency: 'INR' });
    render(<CheckoutForm {...props} />); expect(screen.getByLabelText('Card Number')).toBeInTheDocument(); fireEvent.click(screen.getByLabelText('UPI')); expect(screen.getByLabelText('UPI ID')).toBeInTheDocument(); expect(screen.getByText('Example: user@upi')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: /pay/i })); await act(async () => { vi.advanceTimersByTime(1999); }); expect(create).not.toHaveBeenCalled();
  });
  it('posts one safe complete payload after two seconds and guards duplicate pay', async () => {
    vi.useFakeTimers(); const create = vi.spyOn(api, 'createBooking').mockResolvedValue({ confirmationId: 'c1', movie: props.movie, theatre: props.theatre, seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', total: 450, currency: 'INR' }); render(<CheckoutForm {...props} />); fireEvent.click(screen.getByRole('button', { name: /pay/i })); fireEvent.click(screen.getByRole('button', { name: /processing/i })); await act(async () => { vi.advanceTimersByTime(2000); }); expect(create).toHaveBeenCalledTimes(1); expect(create).toHaveBeenCalledWith({ movieId: 'mov_paradise', theatreId: 'theatre_grand', seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', total: 450 }, 'jwt');
  });
  it('keeps checkout available after a backend failure', async () => {
    vi.useFakeTimers(); vi.spyOn(api, 'createBooking').mockRejectedValue(new Error('Booking unavailable')); render(<CheckoutForm {...props} />); fireEvent.click(screen.getByRole('button', { name: /pay/i })); await act(async () => { vi.advanceTimersByTime(2000); }); expect(screen.getByRole('alert')).toHaveTextContent('Booking unavailable'); expect(screen.getByRole('button', { name: /pay/i })).toBeEnabled();
  });
  it('renders ticket values exclusively from a confirmation fixture', () => { render(<ConfirmationTicket confirmation={{ confirmationId: 'confirmed-99', movie: { id: 'other', title: 'Backend Movie' }, theatre: { id: 'other-theatre', name: 'Backend Theatre' }, seats: ['A1', 'A2', 'A3'], paymentMethod: 'UPI', total: 450, currency: 'INR' }} />); expect(screen.getByText('Backend Movie')).toBeInTheDocument(); expect(screen.getByText('Backend Theatre')).toBeInTheDocument(); expect(screen.getByText('confirmed-99')).toBeInTheDocument(); });
});
