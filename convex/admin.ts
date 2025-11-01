import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { generateAgentId, generateClientId, generateSecureRandom } from "./lib/helpers";
import { isValidEmail, isValidUrl } from "./lib/validation";

// ===================================================
// QUERIES
// ===================================================

/**
 * List all agents
 */
export const listAgents = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();

    const safeAgents = agents.map((agent) => ({
      agent_id: agent.agent_id,
      user_email: agent.user_email,
      user_name: agent.user_name,
      created_at: agent.created_at,
    }));

    return {
      agents: safeAgents,
      count: safeAgents.length,
    };
  },
});

/**
 * Get agent by ID
 */
export const getAgent = query({
  args: { agent_id: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agent_id", (q) => q.eq("agent_id", args.agent_id))
      .unique();

    if (!agent) return null;

    return {
      agent_id: agent.agent_id,
      user_email: agent.user_email,
      user_name: agent.user_name,
      created_at: agent.created_at,
    };
  },
});

/**
 * List all clients
 */
export const listClients = query({
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();

    const safeClients = clients.map((client) => ({
      client_id: client.client_id,
      client_name: client.client_name,
      allowed_redirect_uris: client.allowed_redirect_uris,
      allowed_grant_types: client.allowed_grant_types,
      created_at: client.created_at,
    }));

    return {
      clients: safeClients,
      count: safeClients.length,
    };
  },
});

/**
 * Get client by ID
 */
export const getClient = query({
  args: { client_id: v.string() },
  handler: async (ctx, args) => {
    const client = await ctx.db
      .query("clients")
      .withIndex("by_client_id", (q) => q.eq("client_id", args.client_id))
      .unique();

    if (!client) return null;

    return {
      client_id: client.client_id,
      client_name: client.client_name,
      allowed_redirect_uris: client.allowed_redirect_uris,
      allowed_grant_types: client.allowed_grant_types,
      created_at: client.created_at,
    };
  },
});

// ===================================================
// MUTATIONS
// ===================================================

/**
 * Create a new agent
 * Note: The HTTP action handles hashing the secret using crypto actions
 */
export const createAgent = mutation({
  args: {
    user_email: v.string(),
    user_name: v.string(),
    agent_id: v.optional(v.string()),
    agent_secret_hash: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate email
    if (!isValidEmail(args.user_email)) {
      return {
        success: false,
        error: "invalid_request",
        error_description: "Invalid email format",
      };
    }

    // Use provided or generate agent_id
    const finalAgentId = args.agent_id || generateAgentId();

    // Check if already exists
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_agent_id", (q) => q.eq("agent_id", finalAgentId))
      .unique();

    if (existing) {
      return {
        success: false,
        error: "invalid_request",
        error_description: "Agent ID already exists",
      };
    }

    // Create agent
    await ctx.db.insert("agents", {
      agent_id: finalAgentId,
      agent_secret_hash: args.agent_secret_hash,
      user_email: args.user_email,
      user_name: args.user_name,
      created_at: Date.now(),
    });

    return {
      success: true,
      agent_id: finalAgentId,
    };
  },
});

/**
 * Create a new OAuth client
 * Note: The HTTP action handles hashing the secret using crypto actions
 */
export const createClient = mutation({
  args: {
    client_name: v.string(),
    redirect_uris: v.array(v.string()),
    client_id: v.optional(v.string()),
    client_secret_hash: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate redirect URIs
    for (const uri of args.redirect_uris) {
      if (!isValidUrl(uri)) {
        return {
          success: false,
          error: "invalid_request",
          error_description: `Invalid redirect URI: ${uri}`,
        };
      }
    }

    // Use provided or generate client_id
    const finalClientId = args.client_id || generateClientId();

    // Check if already exists
    const existing = await ctx.db
      .query("clients")
      .withIndex("by_client_id", (q) => q.eq("client_id", finalClientId))
      .unique();

    if (existing) {
      return {
        success: false,
        error: "invalid_request",
        error_description: "Client ID already exists",
      };
    }

    // Create client
    await ctx.db.insert("clients", {
      client_id: finalClientId,
      client_secret_hash: args.client_secret_hash,
      client_name: args.client_name,
      allowed_redirect_uris: args.redirect_uris,
      allowed_grant_types: ["authorization_code", "refresh_token"],
      created_at: Date.now(),
    });

    return {
      success: true,
      client_id: finalClientId,
    };
  },
});

/**
 * Delete an agent
 */
export const deleteAgent = mutation({
  args: { agent_id: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agent_id", (q) => q.eq("agent_id", args.agent_id))
      .unique();

    if (!agent) {
      return {
        success: false,
        error: "not_found",
        error_description: "Agent not found",
      };
    }

    await ctx.db.delete(agent._id);

    return {
      success: true,
      message: "Agent deleted successfully",
    };
  },
});

/**
 * Delete a client
 */
export const deleteClient = mutation({
  args: { client_id: v.string() },
  handler: async (ctx, args) => {
    const client = await ctx.db
      .query("clients")
      .withIndex("by_client_id", (q) => q.eq("client_id", args.client_id))
      .unique();

    if (!client) {
      return {
        success: false,
        error: "not_found",
        error_description: "Client not found",
      };
    }

    await ctx.db.delete(client._id);

    return {
      success: true,
      message: "Client deleted successfully",
    };
  },
});

/**
 * Update client redirect URIs
 */
export const updateClient = mutation({
  args: {
    client_id: v.string(),
    client_name: v.optional(v.string()),
    redirect_uris: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db
      .query("clients")
      .withIndex("by_client_id", (q) => q.eq("client_id", args.client_id))
      .unique();

    if (!client) {
      return {
        success: false,
        error: "not_found",
        error_description: "Client not found",
      };
    }

    const updates: any = {};

    if (args.client_name) {
      updates.client_name = args.client_name;
    }

    if (args.redirect_uris) {
      // Validate URIs
      for (const uri of args.redirect_uris) {
        if (!isValidUrl(uri)) {
          return {
            success: false,
            error: "invalid_request",
            error_description: `Invalid redirect URI: ${uri}`,
          };
        }
      }
      updates.allowed_redirect_uris = args.redirect_uris;
    }

    await ctx.db.patch(client._id, updates);

    return {
      success: true,
      message: "Client updated successfully",
    };
  },
});
