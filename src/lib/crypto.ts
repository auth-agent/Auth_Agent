// Cryptographic utilities

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { CONFIG } from './constants.js';

/**
 * Hash a password using bcrypt
 */
export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, CONFIG.BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifySecret(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}

/**
 * Validate PKCE code_verifier against code_challenge
 *
 * OAuth 2.1 requires S256 method:
 * code_challenge = BASE64URL(SHA256(code_verifier))
 */
export function validatePKCE(
  codeVerifier: string,
  codeChallenge: string,
  method: string
): boolean {
  if (method !== 'S256') {
    return false;
  }

  // Generate challenge from verifier
  const hash = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return hash === codeChallenge;
}

/**
 * Generate a secure random string for tokens and IDs
 */
export function generateSecureRandom(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Generate an authorization code
 */
export function generateAuthCode(): string {
  return `code_${generateSecureRandom(32)}`;
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(): string {
  return `rt_${generateSecureRandom(48)}`;
}

/**
 * Generate a request ID
 */
export function generateRequestId(): string {
  return `req_${generateSecureRandom(16)}`;
}

/**
 * Generate a token ID
 */
export function generateTokenId(): string {
  return `tok_${generateSecureRandom(16)}`;
}
