// Admin endpoints for managing AI agents

import type { Context } from 'hono';
import { db } from '../db/store.js';
import { hashSecret, generateSecureRandom } from '../lib/crypto.js';
import { isValidEmail, isValidAgentId } from '../lib/validation.js';
import { nanoid } from 'nanoid';

/**
 * POST /api/admin/agents
 *
 * Create a new AI agent
 */
export async function createAgentHandler(c: Context) {
  try {
    const body = await c.req.json();
    const { user_email, user_name, agent_id } = body;

    // Validate required fields
    if (!user_email || !user_name) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Missing required fields: user_email, user_name',
        },
        400
      );
    }

    // Validate email
    if (!isValidEmail(user_email)) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Invalid email format',
        },
        400
      );
    }

    // Generate agent_id if not provided
    const finalAgentId = agent_id || `agent_${nanoid(16)}`;

    // Validate agent_id format
    if (!isValidAgentId(finalAgentId)) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Invalid agent_id format',
        },
        400
      );
    }

    // Check if agent_id already exists
    const existing = await db.getAgent(finalAgentId);
    if (existing) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Agent ID already exists',
        },
        400
      );
    }

    // Generate agent secret
    const agentSecret = generateSecureRandom(32);
    const agentSecretHash = await hashSecret(agentSecret);

    // Create agent
    const agent = await db.createAgent({
      agent_id: finalAgentId,
      agent_secret_hash: agentSecretHash,
      user_email,
      user_name,
      created_at: Date.now(),
    });

    // Return agent details (including secret - only shown once!)
    return c.json({
      agent_id: agent.agent_id,
      agent_secret: agentSecret,
      user_email: agent.user_email,
      user_name: agent.user_name,
      created_at: agent.created_at,
      warning: 'Save the agent_secret securely. It will not be shown again.',
    }, 201);
  } catch (error) {
    console.error('Create agent error:', error);

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
 * GET /api/admin/agents
 *
 * List all agents
 */
export async function listAgentsHandler(c: Context) {
  try {
    const agents = await db.listAgents();

    // Don't include secret hashes
    const safeAgents = agents.map((agent) => ({
      agent_id: agent.agent_id,
      user_email: agent.user_email,
      user_name: agent.user_name,
      created_at: agent.created_at,
    }));

    return c.json({
      agents: safeAgents,
      count: safeAgents.length,
    });
  } catch (error) {
    console.error('List agents error:', error);

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
 * GET /api/admin/agents/:id
 *
 * Get agent details
 */
export async function getAgentHandler(c: Context) {
  try {
    const agentId = c.req.param('id');

    const agent = await db.getAgent(agentId);
    if (!agent) {
      return c.json(
        {
          error: 'not_found',
          error_description: 'Agent not found',
        },
        404
      );
    }

    // Don't include secret hash
    return c.json({
      agent_id: agent.agent_id,
      user_email: agent.user_email,
      user_name: agent.user_name,
      created_at: agent.created_at,
    });
  } catch (error) {
    console.error('Get agent error:', error);

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
 * DELETE /api/admin/agents/:id
 *
 * Delete an agent
 */
export async function deleteAgentHandler(c: Context) {
  try {
    const agentId = c.req.param('id');

    const deleted = await db.deleteAgent(agentId);
    if (!deleted) {
      return c.json(
        {
          error: 'not_found',
          error_description: 'Agent not found',
        },
        404
      );
    }

    return c.json({
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    console.error('Delete agent error:', error);

    return c.json(
      {
        error: 'server_error',
        error_description: 'Internal server error',
      },
      500
    );
  }
}
