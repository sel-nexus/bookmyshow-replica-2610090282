import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('configuration', () => {
  it('allows dependency-injected test configuration without validating process environment at import time', () => {
    expect(loadConfig({
      DATABASE_PATH: ':memory:',
      JWT_SECRET: 'test-secret',
      JWT_ISSUER: 'test-issuer',
      JWT_AUDIENCE: 'test-audience',
      PORT: '4000',
      CORS_ORIGIN: 'http://localhost:3000'
    })).toEqual({
      databasePath: ':memory:',
      jwtSecret: 'test-secret',
      jwtIssuer: 'test-issuer',
      jwtAudience: 'test-audience',
      port: 4000,
      corsOrigin: 'http://localhost:3000'
    });
  });

  it('continues to reject incomplete configuration when explicitly loaded', () => {
    expect(() => loadConfig({})).toThrow();
  });
});
