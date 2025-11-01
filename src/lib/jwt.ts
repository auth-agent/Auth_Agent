// JWT utilities

import jwt from 'jsonwebtoken';
import { CONFIG } from './constants.js';

export interface JWTPayload {
  sub: string; // agent_id
  client_id: string;
  model: string;
  scope: string;
  iat: number;
  exp: number;
  iss: string;
}

/**
 * Generate a JWT access token
 */
export function generateAccessToken(
  agentId: string,
  clientId: string,
  model: string,
  scope: string
): string {
  const now = Math.floor(Date.now() / 1000);

  const payload: JWTPayload = {
    sub: agentId,
    client_id: clientId,
    model,
    scope,
    iat: now,
    exp: now + CONFIG.ACCESS_TOKEN_EXPIRES_IN,
    iss: CONFIG.JWT_ISSUER,
  };

  return jwt.sign(payload, CONFIG.JWT_SECRET, { algorithm: 'HS256' });
}

/**
 * Verify and decode a JWT access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: CONFIG.JWT_ISSUER,
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Decode a JWT without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
}
