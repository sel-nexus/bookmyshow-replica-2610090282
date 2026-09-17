/** Test authentication forms and API-client outcomes. */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const initiateOtp = vi.fn();
const verifyOtp = vi.fn();
const bookingState = { mobileNumber: '', setMobileNumber: vi.fn(), setToken: vi.fn() };

vi.mock('next/navigation', () => ({ useRouter: (): { push: typeof push } => ({ push }) }));
vi.mock('../lib/apiClient', () => ({ initiateOtp, verifyOtp }));
vi.mock('../state/BookingContext', () => ({ useBooking: (): typeof bookingState => bookingState }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

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

describe('apiClient', () => {
  it('returns the documented success payloads using same-origin API paths', async (): Promise<void> => {
    vi.doUnmock('../lib/apiClient');
    vi.resetModules();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { accepted: true } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { token: 'backend-token' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { movies: [{ id: 'mov_1', title: 'Backend Movie' }] } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { theatres: [{ id: 'theatre_1', name: 'Backend Theatre' }] } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { confirmationId: 'confirmed-1', movie: { id: 'mov_1', title: 'Backend Movie' }, theatre: { id: 'theatre_1', name: 'Backend Theatre' }, seats: ['A1', 'A2', 'A3'], paymentMethod: 'UPI', total: 450, currency: 'INR' } }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const api = await import('../lib/apiClient');

    await api.initiateOtp('+15550000001');
    await expect(api.verifyOtp('+15550000001', '1234')).resolves.toBe('backend-token');
    await expect(api.getMovies()).resolves.toEqual([{ id: 'mov_1', title: 'Backend Movie' }]);
    await expect(api.getTheatres('mov 1')).resolves.toEqual([{ id: 'theatre_1', name: 'Backend Theatre' }]);
    await expect(api.createBooking({ movieId: 'mov_1', theatreId: 'theatre_1', seats: ['A1', 'A2', 'A3'], paymentMethod: 'UPI', total: 450 }, 'backend-token')).resolves.toMatchObject({ confirmationId: 'confirmed-1', paymentMethod: 'UPI' });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/auth/login',
      '/api/auth/verify',
      '/api/movies',
      '/api/theatres?movieId=mov%201',
      '/api/bookings'
    ]);
  });

  it('turns a backend and malformed failure response into ApiError values', async (): Promise<void> => {
    vi.doUnmock('../lib/apiClient');
    vi.resetModules();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'Invalid OTP from backend.' } }), { status: 401 }))
      .mockResolvedValueOnce(new Response('not-json', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    const { ApiError, getMovies, verifyOtp } = await import('../lib/apiClient');

    await expect(verifyOtp('+15550000001', '0000')).rejects.toMatchObject({ name: 'ApiError', message: 'Invalid OTP from backend.', status: 401 });
    await expect(getMovies()).rejects.toMatchObject({ name: 'ApiError', message: 'Unable to complete this request.', status: 503 });
    expect(ApiError).toBeTypeOf('function');
  });
});
