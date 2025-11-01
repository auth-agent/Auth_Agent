// Agent authentication endpoint

import type { Context } from 'hono';
import { db } from '../db/store.js';
import { verifySecret, generateAuthCode } from '../lib/crypto.js';

/**
 * POST /api/agent/authenticate
 *
 * Agent sends credentials to complete an auth request
 */
export async function agentAuthenticateHandler(c: Context) {
  try {
    const body = await c.req.json();
    const { request_id, agent_id, agent_secret, model } = body;

    // Validate required fields
    if (!request_id || !agent_id || !agent_secret || !model) {
      return c.json(
        {
          success: false,
          error: 'invalid_request',
          error_description: 'Missing required fields: request_id, agent_id, agent_secret, model',
        },
        400
      );
    }

    // Get auth request
    const authRequest = await db.getAuthRequest(request_id);
    if (!authRequest) {
      return c.json(
        {
          success: false,
          error: 'invalid_request',
          error_description: 'Auth request not found or expired',
        },
        404
      );
    }

    // Check if request is expired
    if (authRequest.expires_at < Date.now()) {
      await db.updateAuthRequest(request_id, {
        status: 'expired',
        error: 'Auth request expired',
      });

      return c.json(
        {
          success: false,
          error: 'request_expired',
          error_description: 'Auth request has expired',
        },
        400
      );
    }

    // Check if request is already completed
    if (authRequest.status !== 'pending') {
      return c.json(
        {
          success: false,
          error: 'invalid_request',
          error_description: `Auth request is already ${authRequest.status}`,
        },
        400
      );
    }

    // Get agent from database
    const agent = await db.getAgent(agent_id);
    if (!agent) {
      await db.updateAuthRequest(request_id, {
        status: 'error',
        error: 'Invalid agent credentials',
      });

      return c.json(
        {
          success: false,
          error: 'invalid_client',
          error_description: 'Agent not found',
        },
        401
      );
    }

    // Verify agent secret
    const isValidSecret = await verifySecret(agent_secret, agent.agent_secret_hash);
    if (!isValidSecret) {
      await db.updateAuthRequest(request_id, {
        status: 'error',
        error: 'Invalid agent credentials',
      });

      return c.json(
        {
          success: false,
          error: 'invalid_client',
          error_description: 'Invalid agent credentials',
        },
        401
      );
    }

    // Generate authorization code
    const authCode = generateAuthCode();

    // Update auth request with agent info and code
    await db.updateAuthRequest(request_id, {
      agent_id,
      model,
      code: authCode,
      status: 'authenticated',
    });

    // Store authorization code mapping
    await db.storeAuthCode(authCode, request_id);

    return c.json({
      success: true,
      message: 'Agent authenticated successfully',
    });
  } catch (error) {
    console.error('Agent authentication error:', error);

    return c.json(
      {
        success: false,
        error: 'server_error',
        error_description: 'Internal server error',
      },
      500
    );
  }
}
