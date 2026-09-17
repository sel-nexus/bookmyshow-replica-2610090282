/** Implement OTP verification and JWT issuance. */
import type Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import type { AppConfig } from '../config';
import type { UserRecord } from '../db/database';
import { HttpError } from '../http/errors';

/** Describe the successful OTP verification result. */
export interface VerificationResult {
  token: string;
  tokenType: 'Bearer';
  user: UserRecord;
}

/** Manage demo OTP authentication using persistent users. */
export class AuthService {
  /** Create an authentication service with its dependencies. */
  public constructor(
    private readonly database: Database.Database,
    private readonly appConfig: AppConfig
  ) {}

  /** Report an OTP initiation without mutating user state. */
  public initiateOtp(mobileNumber: string): { status: 'OTP_INITIATED'; mobileNumber: string } {
    return { status: 'OTP_INITIATED', mobileNumber };
  }

  /** Verify the demo OTP, persist the user once, and issue a token. */
  public verifyOtp(mobileNumber: string, otp: string): VerificationResult {
    if (otp !== '1234') {
      throw new HttpError(401, 'INVALID_OTP', 'The OTP is invalid.');
    }

    const user = this.findOrCreateUser(mobileNumber);
    const token = jwt.sign(
      { mobileNumber: user.mobileNumber },
      this.appConfig.jwtSecret,
      {
        subject: String(user.id),
        issuer: this.appConfig.jwtIssuer,
        audience: this.appConfig.jwtAudience,
        expiresIn: '1h'
      }
    );

    return { token, tokenType: 'Bearer', user };
  }

  /** Find a user by mobile number or create exactly one persistent record. */
  private findOrCreateUser(mobileNumber: string): UserRecord {
    const existing = this.database
      .prepare('SELECT id, mobile_number AS mobileNumber FROM users WHERE mobile_number = ?')
      .get(mobileNumber) as UserRecord | undefined;
    if (existing) {
      return existing;
    }

    try {
      const result = this.database
        .prepare('INSERT INTO users (mobile_number) VALUES (?)')
        .run(mobileNumber);
      return { id: Number(result.lastInsertRowid), mobileNumber };
    } catch (error: unknown) {
      const racedUser = this.database
        .prepare('SELECT id, mobile_number AS mobileNumber FROM users WHERE mobile_number = ?')
        .get(mobileNumber) as UserRecord | undefined;
      if (racedUser) {
        return racedUser;
      }
      throw error;
    }
  }
}
