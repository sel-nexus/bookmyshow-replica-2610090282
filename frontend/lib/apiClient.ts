/** Call the OTP access API. */
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/** Describe a movie returned by catalogue discovery. */
export interface Movie { id: string; title: string; }

/** Describe a theatre returned by catalogue discovery. */
export interface Theatre { id: string; name: string; }

/** Describe the safe data submitted to create a booking. */
export interface CreateBookingDto { movieId: string; theatreId: string; seats: string[]; paymentMethod: 'CARD' | 'UPI'; total: number; }

/** Describe a backend-issued booking confirmation. */
export interface BookingConfirmation { confirmationId: string; movie: Movie; theatre: Theatre; seats: string[]; paymentMethod: 'CARD' | 'UPI'; total: 450; currency: 'INR'; }

/** Describe an API error returned by the backend. */
export class ApiError extends Error {
  /** Construct a public API failure. */
  public constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Initiate an OTP for a mobile number. */
export async function initiateOtp(mobileNumber: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobileNumber })
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
}

/** Verify an OTP and return its bearer token. */
export async function verifyOtp(mobileNumber: string, otp: string): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/api/auth/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobileNumber, otp })
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  const payload = await response.json() as { data: { token: string } };
  return payload.data.token;
}

/** Fetch movies supplied by the persisted catalogue. */
export async function getMovies(): Promise<Movie[]> {
  const response = await fetch(`${apiBaseUrl}/api/movies`);
  if (!response.ok) throw await toApiError(response);
  const payload = await response.json() as { data: { movies: Movie[] } };
  return payload.data.movies;
}

/** Fetch theatres optionally mapped to a selected movie. */
export async function getTheatres(movieId?: string): Promise<Theatre[]> {
  const query = movieId ? `?movieId=${encodeURIComponent(movieId)}` : '';
  const response = await fetch(`${apiBaseUrl}/api/theatres${query}`);
  if (!response.ok) throw await toApiError(response);
  const payload = await response.json() as { data: { theatres: Theatre[] } };
  return payload.data.theatres;
}

/** Create a booking using only the documented booking DTO and bearer token. */
export async function createBooking(booking: CreateBookingDto, token: string): Promise<BookingConfirmation> {
  const response = await fetch(`${apiBaseUrl}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(booking)
  });
  if (!response.ok) throw await toApiError(response);
  const payload = await response.json() as { data: BookingConfirmation };
  return payload.data;
}

/** Convert an unsuccessful response into a readable error. */
async function toApiError(response: Response): Promise<ApiError> {
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  return new ApiError(payload?.error?.message ?? 'Unable to complete this request.', response.status);
}
