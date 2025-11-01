// OAuth Token endpoint implementation

import type { Context } from 'hono';
import { db } from '../db/store.js';
import { verifySecret, validatePKCE, generateRefreshToken, generateTokenId } from '../lib/crypto.js';
import { generateAccessToken } from '../lib/jwt.js';
import { CONFIG } from '../lib/constants.js';

/**
 * POST /token
 *
 * Exchange authorization code for access token
 * OR refresh access token using refresh token
 */
export async function tokenHandler(c: Context) {
  try {
    const body = await c.req.json();
    const { grant_type, code, code_verifier, client_id, client_secret, refresh_token } = body;

    // Validate grant_type
    if (!grant_type) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Missing grant_type parameter',
        },
        400
      );
    }

    if (grant_type === 'authorization_code') {
      return await handleAuthorizationCodeGrant(c, {
        code,
        code_verifier,
        client_id,
        client_secret,
      });
    } else if (grant_type === 'refresh_token') {
      return await handleRefreshTokenGrant(c, {
        refresh_token,
        client_id,
        client_secret,
      });
    } else {
      return c.json(
        {
          error: 'unsupported_grant_type',
          error_description: `Grant type "${grant_type}" is not supported`,
        },
        400
      );
    }
  } catch (error) {
    console.error('Token endpoint error:', error);

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
 * Handle authorization_code grant type
 */
async function handleAuthorizationCodeGrant(
  c: Context,
  params: {
    code?: string;
    code_verifier?: string;
    client_id?: string;
    client_secret?: string;
  }
) {
  const { code, code_verifier, client_id, client_secret } = params;

  // Validate required parameters
  if (!code || !code_verifier || !client_id || !client_secret) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required parameters for authorization_code grant',
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

  // Get auth request by code
  const requestId = await db.getAuthCodeRequestId(code);
  if (!requestId) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code',
      },
      400
    );
  }

  const authRequest = await db.getAuthRequest(requestId);
  if (!authRequest || authRequest.code !== code) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Invalid authorization code',
      },
      400
    );
  }

  // Verify client_id matches
  if (authRequest.client_id !== client_id) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Client ID mismatch',
      },
      400
    );
  }

  // Verify PKCE
  const isPKCEValid = validatePKCE(
    code_verifier,
    authRequest.code_challenge,
    authRequest.code_challenge_method
  );

  if (!isPKCEValid) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Invalid PKCE code_verifier',
      },
      400
    );
  }

  // Check if code is expired
  if (authRequest.expires_at < Date.now()) {
    await db.deleteAuthCode(code);
    await db.deleteAuthRequest(requestId);

    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Authorization code expired',
      },
      400
    );
  }

  // Ensure agent_id and model exist
  if (!authRequest.agent_id || !authRequest.model) {
    return c.json(
      {
        error: 'server_error',
        error_description: 'Missing agent information in auth request',
      },
      500
    );
  }

  // Generate tokens
  const now = Date.now();
  const tokenId = generateTokenId();
  const accessToken = generateAccessToken(
    authRequest.agent_id,
    client_id,
    authRequest.model,
    authRequest.scope
  );
  const refreshTokenValue = generateRefreshToken();

  // Store token
  await db.createToken({
    token_id: tokenId,
    access_token: accessToken,
    refresh_token: refreshTokenValue,
    agent_id: authRequest.agent_id,
    client_id,
    model: authRequest.model,
    scope: authRequest.scope,
    access_token_expires_at: now + CONFIG.ACCESS_TOKEN_EXPIRES_IN * 1000,
    refresh_token_expires_at: now + CONFIG.REFRESH_TOKEN_EXPIRES_IN * 1000,
    created_at: now,
    revoked: false,
  });

  // Store refresh token
  await db.createRefreshToken({
    refresh_token: refreshTokenValue,
    token_id: tokenId,
    agent_id: authRequest.agent_id,
    client_id,
    expires_at: now + CONFIG.REFRESH_TOKEN_EXPIRES_IN * 1000,
    revoked: false,
  });

  // Delete authorization code (single use)
  await db.deleteAuthCode(code);
  await db.deleteAuthRequest(requestId);

  // Return token response
  return c.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: CONFIG.ACCESS_TOKEN_EXPIRES_IN,
    refresh_token: refreshTokenValue,
    scope: authRequest.scope,
  });
}

/**
 * Handle refresh_token grant type
 */
async function handleRefreshTokenGrant(
  c: Context,
  params: {
    refresh_token?: string;
    client_id?: string;
    client_secret?: string;
  }
) {
  const { refresh_token, client_id, client_secret } = params;

  // Validate required parameters
  if (!refresh_token || !client_id || !client_secret) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required parameters for refresh_token grant',
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

  // Get refresh token
  const refreshTokenEntry = await db.getRefreshToken(refresh_token);
  if (!refreshTokenEntry) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Invalid refresh token',
      },
      400
    );
  }

  // Check if revoked
  if (refreshTokenEntry.revoked) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Refresh token has been revoked',
      },
      400
    );
  }

  // Check if expired
  if (refreshTokenEntry.expires_at < Date.now()) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Refresh token expired',
      },
      400
    );
  }

  // Verify client_id matches
  if (refreshTokenEntry.client_id !== client_id) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Client ID mismatch',
      },
      400
    );
  }

  // Get original token to get scope and model
  const originalToken = await db.getToken(refreshTokenEntry.token_id);
  if (!originalToken) {
    return c.json(
      {
        error: 'server_error',
        error_description: 'Original token not found',
      },
      500
    );
  }

  // Generate new access token
  const now = Date.now();
  const newTokenId = generateTokenId();
  const newAccessToken = generateAccessToken(
    refreshTokenEntry.agent_id,
    client_id,
    originalToken.model,
    originalToken.scope
  );

  // Store new token (reuse same refresh token)
  await db.createToken({
    token_id: newTokenId,
    access_token: newAccessToken,
    refresh_token: refresh_token,
    agent_id: refreshTokenEntry.agent_id,
    client_id,
    model: originalToken.model,
    scope: originalToken.scope,
    access_token_expires_at: now + CONFIG.ACCESS_TOKEN_EXPIRES_IN * 1000,
    refresh_token_expires_at: refreshTokenEntry.expires_at,
    created_at: now,
    revoked: false,
  });

  // Return new access token
  return c.json({
    access_token: newAccessToken,
    token_type: 'Bearer',
    expires_in: CONFIG.ACCESS_TOKEN_EXPIRES_IN,
    refresh_token: refresh_token,
    scope: originalToken.scope,
  });
}
