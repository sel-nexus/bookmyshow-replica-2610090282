/** Format predictable API error responses. */
import { randomUUID } from 'node:crypto';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

/** Carry an intentional HTTP response failure. */
export class HttpError extends Error {
  /** Construct an HTTP failure with a public error code. */
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Serialize errors in the public error envelope. */
export const errorHandler: ErrorRequestHandler = (error, _request, response, _next): void => {
  const correlationId = randomUUID();
  if (error instanceof ZodError) {
    response.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Request body is invalid.', correlationId }
    });
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message, correlationId }
    });
    return;
  }
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', correlationId }
  });
};
