// Check auth status endpoint (for polling)

import type { Context } from 'hono';
import { db } from '../db/store.js';

/**
 * GET /api/check-status
 *
 * Poll for auth request completion
 * Called by the spinning page to check if agent has authenticated
 */
export async function checkStatusHandler(c: Context) {
  const { request_id } = c.req.query();

  if (!request_id) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'Missing request_id parameter',
      },
      400
    );
  }

  // Get auth request
  const authRequest = await db.getAuthRequest(request_id);
  if (!authRequest) {
    return c.json(
      {
        error: 'not_found',
        error_description: 'Auth request not found',
      },
      404
    );
  }

  // Check if expired
  if (authRequest.expires_at < Date.now() && authRequest.status === 'pending') {
    await db.updateAuthRequest(request_id, {
      status: 'expired',
      error: 'Auth request expired',
    });

    return c.json({
      status: 'error',
      error: 'request_expired',
    });
  }

  // Return current status
  if (authRequest.status === 'authenticated' && authRequest.code) {
    // Mark as completed (code will be consumed by token endpoint)
    await db.updateAuthRequest(request_id, {
      status: 'completed',
    });

    return c.json({
      status: 'authenticated',
      code: authRequest.code,
      state: authRequest.state,
      redirect_uri: authRequest.redirect_uri,
    });
  }

  if (authRequest.status === 'error') {
    return c.json({
      status: 'error',
      error: authRequest.error || 'Authentication failed',
    });
  }

  // Still pending
  return c.json({
    status: 'pending',
  });
}
