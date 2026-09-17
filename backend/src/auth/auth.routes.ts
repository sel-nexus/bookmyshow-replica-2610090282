/** Register authentication HTTP endpoints. */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { AuthService } from './auth.service';

const loginSchema = z.object({ mobileNumber: z.string().trim().min(1) });
const verifySchema = z.object({
  mobileNumber: z.string().trim().min(1),
  otp: z.string().trim().min(1)
});

/** Create routes for OTP login and verification. */
export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  router.post('/login', (request: Request, response: Response, next: NextFunction): void => {
    try {
      const { mobileNumber } = loginSchema.parse(request.body);
      response.status(200).json({ data: authService.initiateOtp(mobileNumber) });
    } catch (error: unknown) {
      next(error);
    }
  });

  router.post('/verify', (request: Request, response: Response, next: NextFunction): void => {
    try {
      const { mobileNumber, otp } = verifySchema.parse(request.body);
      response.status(200).json({ data: authService.verifyOtp(mobileNumber, otp) });
    } catch (error: unknown) {
      next(error);
    }
  });

  return router;
}
