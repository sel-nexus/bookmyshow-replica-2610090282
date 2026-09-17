/** Load and validate runtime configuration. */
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const environmentSchema = z.object({
  DATABASE_PATH: z.string().trim().min(1),
  JWT_SECRET: z.string().trim().min(1),
  JWT_ISSUER: z.string().trim().min(1),
  JWT_AUDIENCE: z.string().trim().min(1),
  PORT: z.coerce.number().int().positive(),
  CORS_ORIGIN: z.string().trim().url()
});

/** Represent validated environment settings. */
export interface AppConfig {
  databasePath: string;
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  port: number;
  corsOrigin: string;
}

/** Parse environment variables into application settings. */
export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const values = environmentSchema.parse(environment);
  return {
    databasePath: values.DATABASE_PATH,
    jwtSecret: values.JWT_SECRET,
    jwtIssuer: values.JWT_ISSUER,
    jwtAudience: values.JWT_AUDIENCE,
    port: values.PORT,
    corsOrigin: values.CORS_ORIGIN
  };
}

/** Expose the validated runtime settings. */
export const config = loadConfig();
