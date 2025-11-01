// Configuration constants for Convex

export const CONFIG = {
  // Token expiration times (in seconds)
  ACCESS_TOKEN_EXPIRES_IN: 60 * 60, // 1 hour
  REFRESH_TOKEN_EXPIRES_IN: 30 * 24 * 60 * 60, // 30 days
  AUTHORIZATION_CODE_EXPIRES_IN: 10 * 60, // 10 minutes
  AUTH_REQUEST_EXPIRES_IN: 10 * 60, // 10 minutes

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_ISSUER: process.env.JWT_ISSUER || 'auth-agent.com',

  // Security
  BCRYPT_ROUNDS: 10,

  // OAuth
  SUPPORTED_GRANT_TYPES: ['authorization_code', 'refresh_token'],
  SUPPORTED_RESPONSE_TYPES: ['code'],
  SUPPORTED_CODE_CHALLENGE_METHODS: ['S256'],
  DEFAULT_SCOPE: 'openid profile',
} as const;
