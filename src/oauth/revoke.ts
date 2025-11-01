// OAuth Token Revocation endpoint (RFC 7009)

import type { Context } from 'hono';
import { db } from '../db/store.js';
import { verifySecret } from '../lib/crypto.js';

/**
 * POST /revoke
 *
 * Revokes an access token or refresh token
 * Always returns 200 OK (even if token is invalid)
 */
export async function revokeHandler(c: Context) {
  try {
    const body = await c.req.json();
    const { token, token_type_hint, client_id, client_secret } = body;

    // Validate required parameters
    if (!token) {
      // Per RFC 7009, return 200 even for invalid requests
      return c.json({});
    }

    if (!client_id || !client_secret) {
      return c.json(
        {
          error: 'invalid_client',
          error_description: 'Missing client credentials',
        },
        401
      );
    }

    // Verify client credentials
    const client = await db.getClient(client_id);
    if (!client) {
      return c.json(
        {
          error: 'invalid_client',
          error_description: 'Client not found',
        },
        401
      );
    }

    const isValidClient = await verifySecret(client_secret, client.client_secret_hash);
    if (!isValidClient) {
      return c.json(
        {
          error: 'invalid_client',
          error_description: 'Invalid client credentials',
        },
        401
      );
    }

    // Try to revoke token based on hint
    if (token_type_hint === 'refresh_token') {
      await revokeRefreshToken(token, client_id);
    } else {
      // Try access token first
      const revokedAccess = await revokeAccessToken(token, client_id);

      // If not found as access token, try as refresh token
      if (!revokedAccess) {
        await revokeRefreshToken(token, client_id);
      }
    }

    // Always return 200 OK per RFC 7009
    return c.json({});
  } catch (error) {
    console.error('Revoke endpoint error:', error);

    // Even on error, return 200 OK per RFC 7009
    return c.json({});
  }
}

/**
 * Revoke an access token
 */
async function revokeAccessToken(token: string, clientId: string): Promise<boolean> {
  const tokenEntry = await db.getTokenByAccessToken(token);

  if (!tokenEntry) {
    return false;
  }

  // Verify client_id matches
  if (tokenEntry.client_id !== clientId) {
    return false;
  }

  // Revoke the token
  await db.revokeTokenByAccessToken(token);

  // Also revoke associated refresh token if it exists
  if (tokenEntry.refresh_token) {
    await db.revokeRefreshToken(tokenEntry.refresh_token);
  }

  return true;
}

/**
 * Revoke a refresh token
 */
async function revokeRefreshToken(token: string, clientId: string): Promise<boolean> {
  const refreshToken = await db.getRefreshToken(token);

  if (!refreshToken) {
    return false;
  }

  // Verify client_id matches
  if (refreshToken.client_id !== clientId) {
    return false;
  }

  // Revoke the refresh token
  await db.revokeRefreshToken(token);

  // Also revoke the associated access token
  const tokenEntry = await db.getToken(refreshToken.token_id);
  if (tokenEntry) {
    await db.revokeToken(tokenEntry.token_id);
  }

  return true;
}
