// Admin endpoints for managing OAuth clients

import type { Context } from 'hono';
import { db } from '../db/store.js';
import { hashSecret, generateSecureRandom } from '../lib/crypto.js';
import { isValidUrl, isValidClientId } from '../lib/validation.js';
import { nanoid } from 'nanoid';

/**
 * POST /api/admin/clients
 *
 * Register a new OAuth client
 */
export async function createClientHandler(c: Context) {
  try {
    const body = await c.req.json();
    const { client_name, redirect_uris, client_id } = body;

    // Validate required fields
    if (!client_name || !redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Missing required fields: client_name, redirect_uris (array)',
        },
        400
      );
    }

    // Validate redirect URIs
    for (const uri of redirect_uris) {
      if (!isValidUrl(uri)) {
        return c.json(
          {
            error: 'invalid_request',
            error_description: `Invalid redirect URI: ${uri}`,
          },
          400
        );
      }
    }

    // Generate client_id if not provided
    const finalClientId = client_id || `client_${nanoid(16)}`;

    // Validate client_id format
    if (!isValidClientId(finalClientId)) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Invalid client_id format',
        },
        400
      );
    }

    // Check if client_id already exists
    const existing = await db.getClient(finalClientId);
    if (existing) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Client ID already exists',
        },
        400
      );
    }

    // Generate client secret
    const clientSecret = generateSecureRandom(32);
    const clientSecretHash = await hashSecret(clientSecret);

    // Create client
    const client = await db.createClient({
      client_id: finalClientId,
      client_secret_hash: clientSecretHash,
      client_name,
      allowed_redirect_uris: redirect_uris,
      allowed_grant_types: ['authorization_code', 'refresh_token'],
      created_at: Date.now(),
    });

    // Return client details (including secret - only shown once!)
    return c.json({
      client_id: client.client_id,
      client_secret: clientSecret,
      client_name: client.client_name,
      allowed_redirect_uris: client.allowed_redirect_uris,
      allowed_grant_types: client.allowed_grant_types,
      created_at: client.created_at,
      warning: 'Save the client_secret securely. It will not be shown again.',
    }, 201);
  } catch (error) {
    console.error('Create client error:', error);

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
 * GET /api/admin/clients
 *
 * List all clients
 */
export async function listClientsHandler(c: Context) {
  try {
    const clients = await db.listClients();

    // Don't include secret hashes
    const safeClients = clients.map((client) => ({
      client_id: client.client_id,
      client_name: client.client_name,
      allowed_redirect_uris: client.allowed_redirect_uris,
      allowed_grant_types: client.allowed_grant_types,
      created_at: client.created_at,
    }));

    return c.json({
      clients: safeClients,
      count: safeClients.length,
    });
  } catch (error) {
    console.error('List clients error:', error);

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
 * GET /api/admin/clients/:id
 *
 * Get client details
 */
export async function getClientHandler(c: Context) {
  try {
    const clientId = c.req.param('id');

    const client = await db.getClient(clientId);
    if (!client) {
      return c.json(
        {
          error: 'not_found',
          error_description: 'Client not found',
        },
        404
      );
    }

    // Don't include secret hash
    return c.json({
      client_id: client.client_id,
      client_name: client.client_name,
      allowed_redirect_uris: client.allowed_redirect_uris,
      allowed_grant_types: client.allowed_grant_types,
      created_at: client.created_at,
    });
  } catch (error) {
    console.error('Get client error:', error);

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
 * PUT /api/admin/clients/:id
 *
 * Update client details
 */
export async function updateClientHandler(c: Context) {
  try {
    const clientId = c.req.param('id');
    const body = await c.req.json();
    const { client_name, redirect_uris } = body;

    const client = await db.getClient(clientId);
    if (!client) {
      return c.json(
        {
          error: 'not_found',
          error_description: 'Client not found',
        },
        404
      );
    }

    // Build updates object
    const updates: any = {};

    if (client_name) {
      updates.client_name = client_name;
    }

    if (redirect_uris) {
      if (!Array.isArray(redirect_uris)) {
        return c.json(
          {
            error: 'invalid_request',
            error_description: 'redirect_uris must be an array',
          },
          400
        );
      }

      // Validate redirect URIs
      for (const uri of redirect_uris) {
        if (!isValidUrl(uri)) {
          return c.json(
            {
              error: 'invalid_request',
              error_description: `Invalid redirect URI: ${uri}`,
            },
            400
          );
        }
      }

      updates.allowed_redirect_uris = redirect_uris;
    }

    // Update client
    const updated = await db.updateClient(clientId, updates);

    return c.json({
      client_id: updated!.client_id,
      client_name: updated!.client_name,
      allowed_redirect_uris: updated!.allowed_redirect_uris,
      allowed_grant_types: updated!.allowed_grant_types,
      created_at: updated!.created_at,
    });
  } catch (error) {
    console.error('Update client error:', error);

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
 * DELETE /api/admin/clients/:id
 *
 * Delete a client
 */
export async function deleteClientHandler(c: Context) {
  try {
    const clientId = c.req.param('id');

    const deleted = await db.deleteClient(clientId);
    if (!deleted) {
      return c.json(
        {
          error: 'not_found',
          error_description: 'Client not found',
        },
        404
      );
    }

    return c.json({
      message: 'Client deleted successfully',
    });
  } catch (error) {
    console.error('Delete client error:', error);

    return c.json(
      {
        error: 'server_error',
        error_description: 'Internal server error',
      },
      500
    );
  }
}
