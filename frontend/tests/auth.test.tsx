/** Test the accessible OTP form behaviors. */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const initiateOtp = vi.fn();
const verifyOtp = vi.fn();
const bookingState = { mobileNumber: '', setMobileNumber: vi.fn(), setToken: vi.fn() };

vi.mock('next/navigation', () => ({ useRouter: (): { push: typeof push } => ({ push }) }));
vi.mock('../lib/apiClient', () => ({ initiateOtp, verifyOtp }));
vi.mock('../state/BookingContext', () => ({ useBooking: (): typeof bookingState => bookingState }));

/** Render a component after resetting observed behavior. */
async function setup(): Promise<void> {
  vi.clearAllMocks();
  bookingState.mobileNumber = '';
}

describe('authentication forms', () => {
  it('shows an accessible error without posting an empty mobile number', async (): Promise<void> => {
    await setup();
    const { LoginForm } = await import('../components/LoginForm');
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your mobile number.');
    expect(initiateOtp).not.toHaveBeenCalled();
  });

  it('posts login only on submit, saves the mobile number, and routes to verify', async (): Promise<void> => {
    await setup();
    initiateOtp.mockResolvedValue(undefined);
    const { LoginForm } = await import('../components/LoginForm');
    render(<LoginForm />);
    const input = screen.getByLabelText('Mobile number');
    await userEvent.type(input, '+15550000001');
    expect(initiateOtp).not.toHaveBeenCalled();
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(await screen.findByRole('button', { name: 'Send verification code' })).toBeInTheDocument();
    expect(initiateOtp).toHaveBeenCalledWith('+15550000001');
    expect(bookingState.setMobileNumber).toHaveBeenCalledWith('+15550000001');
    expect(push).toHaveBeenCalledWith('/verify');
  });

  it('keeps verification on the page when the API rejects the OTP', async (): Promise<void> => {
    await setup();
    bookingState.mobileNumber = '+15550000001';
    verifyOtp.mockRejectedValue(new Error('The OTP is invalid.'));
    const { OtpForm } = await import('../components/OtpForm');
    render(<OtpForm />);
    await userEvent.type(screen.getByLabelText('Verification code'), '0000');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The OTP is invalid.');
    expect(push).not.toHaveBeenCalledWith('/dashboard');
  });
});
