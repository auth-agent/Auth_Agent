// OAuth Token Introspection endpoint (RFC 7662)

import type { Context } from 'hono';
import { db } from '../db/store.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { verifySecret } from '../lib/crypto.js';

/**
 * POST /introspect
 *
 * Validates and returns information about an access or refresh token
 */
export async function introspectHandler(c: Context) {
  try {
    const body = await c.req.json();
    const { token, token_type_hint, client_id, client_secret } = body;

    // Validate required parameters
    if (!token) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Missing token parameter',
        },
        400
      );
    }

    if (!client_id || !client_secret) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Missing client credentials',
        },
        400
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

    // Check if it's a refresh token or access token
    if (token_type_hint === 'refresh_token') {
      const result = await introspectRefreshToken(token, client_id);
      return c.json(result);
    } else {
      // Default to access token
      const result = await introspectAccessToken(token, client_id);
      return c.json(result);
    }
  } catch (error) {
    console.error('Introspect endpoint error:', error);

    return c.json(
      {
        error: 'server_error',
        error_description: 'Internal server error',
      },
      500
    );
  }
}

/**
 * Introspect an access token (JWT)
 */
async function introspectAccessToken(token: string, clientId: string) {
  // Verify JWT
  const payload = verifyAccessToken(token);

  if (!payload) {
    return {
      active: false,
    };
  }

  // Check if token exists in database and is not revoked
  const tokenEntry = await db.getTokenByAccessToken(token);

  if (!tokenEntry || tokenEntry.revoked) {
    return {
      active: false,
    };
  }

  // Verify client_id matches
  if (tokenEntry.client_id !== clientId) {
    return {
      active: false,
    };
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return {
      active: false,
    };
  }

  // Return token information
  return {
    active: true,
    scope: payload.scope,
    client_id: payload.client_id,
    token_type: 'Bearer',
    exp: payload.exp,
    iat: payload.iat,
    sub: payload.sub,
    iss: payload.iss,
    model: payload.model,
  };
}

/**
 * Introspect a refresh token
 */
async function introspectRefreshToken(token: string, clientId: string) {
  const refreshToken = await db.getRefreshToken(token);

  if (!refreshToken || refreshToken.revoked) {
    return {
      active: false,
    };
  }

  // Verify client_id matches
  if (refreshToken.client_id !== clientId) {
    return {
      active: false,
    };
  }

  // Check expiration
  const now = Date.now();
  if (refreshToken.expires_at < now) {
    return {
      active: false,
    };
  }

  // Get original token for additional info
  const originalToken = await db.getToken(refreshToken.token_id);

  // Return token information
  return {
    active: true,
    token_type: 'refresh_token',
    client_id: refreshToken.client_id,
    sub: refreshToken.agent_id,
    exp: Math.floor(refreshToken.expires_at / 1000),
    model: originalToken?.model,
    scope: originalToken?.scope,
  };
}
