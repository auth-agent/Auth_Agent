// OAuth Authorization endpoint implementation

import type { Context } from 'hono';
import { db } from '../db/store.js';
import { generateRequestId } from '../lib/crypto.js';
import { CONFIG } from '../lib/constants.js';
import {
  isValidUrl,
  isAllowedRedirectUri,
  isValidCodeChallengeMethod,
  isValidClientId,
} from '../lib/validation.js';
import { spinningPage } from '../templates/spinningPage.js';
import { errorPage } from '../templates/errorPage.js';

/**
 * GET /authorize
 *
 * Standard OAuth 2.1 authorization endpoint
 * Shows spinning page and waits for agent to authenticate
 */
export async function authorizeHandler(c: Context) {
  const {
    client_id,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
    scope,
    response_type,
  } = c.req.query();

  // Validate required parameters
  if (!client_id) {
    return c.html(errorPage('invalid_request', 'Missing client_id parameter'));
  }

  if (!redirect_uri) {
    return c.html(errorPage('invalid_request', 'Missing redirect_uri parameter'));
  }

  if (!state) {
    return c.html(errorPage('invalid_request', 'Missing state parameter'));
  }

  if (!code_challenge) {
    return c.html(errorPage('invalid_request', 'Missing code_challenge parameter (PKCE required)'));
  }

  if (!code_challenge_method) {
    return c.html(errorPage('invalid_request', 'Missing code_challenge_method parameter'));
  }

  // Validate response_type
  if (response_type !== 'code') {
    return c.html(errorPage('unsupported_response_type', 'Only "code" response type is supported'));
  }

  // Validate client_id format
  if (!isValidClientId(client_id)) {
    return c.html(errorPage('invalid_request', 'Invalid client_id format'));
  }

  // Validate redirect_uri format
  if (!isValidUrl(redirect_uri)) {
    return c.html(errorPage('invalid_request', 'Invalid redirect_uri format'));
  }

  // Validate code_challenge_method (OAuth 2.1 requires S256)
  if (!isValidCodeChallengeMethod(code_challenge_method)) {
    return c.html(
      errorPage('invalid_request', 'Invalid code_challenge_method. Only S256 is supported')
    );
  }

  // Get client from database
  const client = await db.getClient(client_id);
  if (!client) {
    return c.html(errorPage('invalid_client', 'Client not found'));
  }

  // Validate redirect_uri is registered
  if (!isAllowedRedirectUri(redirect_uri, client.allowed_redirect_uris)) {
    return c.html(
      errorPage('invalid_request', 'redirect_uri is not registered for this client')
    );
  }

  // Use default scope if not provided
  const finalScope = scope || CONFIG.DEFAULT_SCOPE;

  // Create auth request
  const requestId = generateRequestId();
  const now = Date.now();

  await db.createAuthRequest({
    request_id: requestId,
    client_id,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
    scope: finalScope,
    status: 'pending',
    created_at: now,
    expires_at: now + CONFIG.AUTH_REQUEST_EXPIRES_IN * 1000,
  });

  // Return spinning page
  return c.html(spinningPage(requestId, client.client_name));
}
