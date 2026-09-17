/** Call the OTP access API. */
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

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

/** Convert an unsuccessful response into a readable error. */
async function toApiError(response: Response): Promise<ApiError> {
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  return new ApiError(payload?.error?.message ?? 'Unable to complete this request.', response.status);
}
