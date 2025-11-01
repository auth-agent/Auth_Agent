import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  generateRequestId,
  generateAuthCode,
  generateTokenId,
  generateRefreshToken,
} from "./lib/helpers";
import { CONFIG } from "./lib/constants";

// ===================================================
// QUERIES
// ===================================================

/**
 * Get client by client_id
 */
export const getClient = query({
  args: { client_id: v.string() },
  handler: async (ctx, args) => {
    const client = await ctx.db
      .query("clients")
      .withIndex("by_client_id", (q) => q.eq("client_id", args.client_id))
      .unique();

    return client;
  },
});

/**
 * Get agent by agent_id
 */
export const getAgent = query({
  args: { agent_id: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agent_id", (q) => q.eq("agent_id", args.agent_id))
      .unique();

    return agent;
  },
});

/**
 * Get auth request by request_id
 */
export const getAuthRequest = query({
  args: { request_id: v.string() },
  handler: async (ctx, args) => {
    const authRequest = await ctx.db
      .query("auth_requests")
      .withIndex("by_request_id", (q) => q.eq("request_id", args.request_id))
      .unique();

    return authRequest;
  },
});

/**
 * Get auth request by code
 */
export const getAuthRequestByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const authCode = await ctx.db
      .query("auth_codes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!authCode) return null;

    const authRequest = await ctx.db
      .query("auth_requests")
      .withIndex("by_request_id", (q) => q.eq("request_id", authCode.request_id))
      .unique();

    return { authRequest, authCodeId: authCode._id };
  },
});

/**
 * Get token by access token
 */
export const getTokenByAccessToken = query({
  args: { access_token: v.string() },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("tokens")
      .withIndex("by_access_token", (q) => q.eq("access_token", args.access_token))
      .unique();

    return token;
  },
});

/**
 * Get refresh token entry
 */
export const getRefreshToken = query({
  args: { refresh_token: v.string() },
  handler: async (ctx, args) => {
    const refreshToken = await ctx.db
      .query("refresh_tokens")
      .withIndex("by_refresh_token", (q) => q.eq("refresh_token", args.refresh_token))
      .unique();

    if (!refreshToken) return null;

    const token = await ctx.db
      .query("tokens")
      .withIndex("by_token_id", (q) => q.eq("token_id", refreshToken.token_id))
      .unique();

    return { refreshToken, originalToken: token };
  },
});

/**
 * Introspect token - returns token info for validation
 */
export const introspectToken = query({
  args: {
    token: v.string(),
    token_type_hint: v.optional(v.string()),
    client_id: v.string(),
  },
  handler: async (ctx, args) => {
    // For refresh tokens
    if (args.token_type_hint === "refresh_token") {
      const refreshToken = await ctx.db
        .query("refresh_tokens")
        .withIndex("by_refresh_token", (q) => q.eq("refresh_token", args.token))
        .unique();

      if (!refreshToken || refreshToken.revoked || refreshToken.client_id !== args.client_id) {
        return { active: false };
      }

      if (refreshToken.expires_at < Date.now()) {
        return { active: false };
      }

      const token = await ctx.db
        .query("tokens")
        .withIndex("by_token_id", (q) => q.eq("token_id", refreshToken.token_id))
        .unique();

      return {
        active: true,
        token_type: "refresh_token",
        client_id: refreshToken.client_id,
        sub: refreshToken.agent_id,
        exp: Math.floor(refreshToken.expires_at / 1000),
        model: token?.model,
        scope: token?.scope,
      };
    }

    // For access tokens - check database first
    const tokenEntry = await ctx.db
      .query("tokens")
      .withIndex("by_access_token", (q) => q.eq("access_token", args.token))
      .unique();

    if (!tokenEntry || tokenEntry.revoked || tokenEntry.client_id !== args.client_id) {
      return { active: false };
    }

    if (tokenEntry.access_token_expires_at < Date.now()) {
      return { active: false };
    }

    // Return token info (JWT verification happens in HTTP action)
    return {
      active: true,
      scope: tokenEntry.scope,
      client_id: tokenEntry.client_id,
      token_type: "Bearer",
      exp: Math.floor(tokenEntry.access_token_expires_at / 1000),
      sub: tokenEntry.agent_id,
      model: tokenEntry.model,
    };
  },
});

// ===================================================
// MUTATIONS
// ===================================================

/**
 * Create auth request
 */
export const createAuthRequest = mutation({
  args: {
    client_id: v.string(),
    redirect_uri: v.string(),
    state: v.string(),
    code_challenge: v.string(),
    code_challenge_method: v.string(),
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    const request_id = generateRequestId();
    const now = Date.now();

    await ctx.db.insert("auth_requests", {
      request_id,
      client_id: args.client_id,
      redirect_uri: args.redirect_uri,
      state: args.state,
      code_challenge: args.code_challenge,
      code_challenge_method: args.code_challenge_method,
      scope: args.scope,
      status: "pending",
      created_at: now,
      expires_at: now + CONFIG.AUTH_REQUEST_EXPIRES_IN * 1000,
    });

    return request_id;
  },
});

/**
 * Authenticate agent - called by HTTP action after verifying credentials
 */
export const authenticateAgent = mutation({
  args: {
    request_id: v.string(),
    agent_id: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const authRequest = await ctx.db
      .query("auth_requests")
      .withIndex("by_request_id", (q) => q.eq("request_id", args.request_id))
      .unique();

    if (!authRequest) {
      return { success: false, error: "Auth request not found" };
    }

    if (authRequest.expires_at < Date.now()) {
      await ctx.db.patch(authRequest._id, {
        status: "expired",
        error: "Auth request expired",
      });
      return { success: false, error: "Auth request expired" };
    }

    if (authRequest.status !== "pending") {
      return { success: false, error: `Auth request is already ${authRequest.status}` };
    }

    // Generate auth code
    const authCode = generateAuthCode();

    // Update auth request
    await ctx.db.patch(authRequest._id, {
      agent_id: args.agent_id,
      model: args.model,
      code: authCode,
      status: "authenticated",
    });

    // Store auth code
    await ctx.db.insert("auth_codes", {
      code: authCode,
      request_id: args.request_id,
      created_at: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark auth request as error
 */
export const markAuthRequestError = mutation({
  args: {
    request_id: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const authRequest = await ctx.db
      .query("auth_requests")
      .withIndex("by_request_id", (q) => q.eq("request_id", args.request_id))
      .unique();

    if (authRequest) {
      await ctx.db.patch(authRequest._id, {
        status: "error",
        error: args.error,
      });
    }
  },
});

/**
 * Check auth status
 */
export const checkAuthStatus = mutation({
  args: { request_id: v.string() },
  handler: async (ctx, args) => {
    const authRequest = await ctx.db
      .query("auth_requests")
      .withIndex("by_request_id", (q) => q.eq("request_id", args.request_id))
      .unique();

    if (!authRequest) {
      return {
        error: "not_found",
        error_description: "Auth request not found",
      };
    }

    // Check if expired
    if (authRequest.expires_at < Date.now() && authRequest.status === "pending") {
      await ctx.db.patch(authRequest._id, {
        status: "expired",
        error: "Auth request expired",
      });

      return {
        status: "error",
        error: "request_expired",
      };
    }

    if ((authRequest.status === "authenticated" || authRequest.status === "completed") && authRequest.code) {
      // Return auth code (don't change status, let it be used once)
      return {
        status: "authenticated",
        code: authRequest.code,
        state: authRequest.state,
        redirect_uri: authRequest.redirect_uri,
      };
    }

    if (authRequest.status === "error") {
      return {
        status: "error",
        error: authRequest.error || "Authentication failed",
      };
    }

    return {
      status: "pending",
    };
  },
});

/**
 * Store token after successful exchange
 */
export const storeToken = mutation({
  args: {
    token_id: v.string(),
    access_token: v.string(),
    refresh_token: v.string(),
    agent_id: v.string(),
    client_id: v.string(),
    model: v.string(),
    scope: v.string(),
    access_token_expires_at: v.number(),
    refresh_token_expires_at: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("tokens", {
      token_id: args.token_id,
      access_token: args.access_token,
      refresh_token: args.refresh_token,
      agent_id: args.agent_id,
      client_id: args.client_id,
      model: args.model,
      scope: args.scope,
      access_token_expires_at: args.access_token_expires_at,
      refresh_token_expires_at: args.refresh_token_expires_at,
      created_at: now,
      revoked: false,
    });

    await ctx.db.insert("refresh_tokens", {
      refresh_token: args.refresh_token,
      token_id: args.token_id,
      agent_id: args.agent_id,
      client_id: args.client_id,
      expires_at: args.refresh_token_expires_at,
      revoked: false,
    });
  },
});

/**
 * Delete auth code and request after token exchange
 */
export const deleteAuthCodeAndRequest = mutation({
  args: {
    authCodeId: v.id("auth_codes"),
    authRequestId: v.id("auth_requests"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.authCodeId);
    await ctx.db.delete(args.authRequestId);
  },
});

/**
 * Revoke token
 */
export const revokeToken = mutation({
  args: {
    token: v.string(),
    token_type_hint: v.optional(v.string()),
    client_id: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.token_type_hint === "refresh_token") {
      const refreshToken = await ctx.db
        .query("refresh_tokens")
        .withIndex("by_refresh_token", (q) => q.eq("refresh_token", args.token))
        .unique();

      if (refreshToken && refreshToken.client_id === args.client_id) {
        await ctx.db.patch(refreshToken._id, { revoked: true });

        const token = await ctx.db
          .query("tokens")
          .withIndex("by_token_id", (q) => q.eq("token_id", refreshToken.token_id))
          .unique();

        if (token) {
          await ctx.db.patch(token._id, { revoked: true });
        }
      }
    } else {
      const tokenEntry = await ctx.db
        .query("tokens")
        .withIndex("by_access_token", (q) => q.eq("access_token", args.token))
        .unique();

      if (tokenEntry && tokenEntry.client_id === args.client_id) {
        await ctx.db.patch(tokenEntry._id, { revoked: true });

        if (tokenEntry.refresh_token) {
          const refreshToken = await ctx.db
            .query("refresh_tokens")
            .withIndex("by_refresh_token", (q) => q.eq("refresh_token", tokenEntry.refresh_token!))
            .unique();

          if (refreshToken) {
            await ctx.db.patch(refreshToken._id, { revoked: true });
          }
        }
      }
    }
  },
});

/**
 * Handle token request - this is called by HTTP action
 * The HTTP action handles crypto operations, this just manages DB
 */
export const handleTokenRequest = mutation({
  args: {
    grant_type: v.string(),
    // Response data from HTTP action
    token_id: v.string(),
    access_token: v.string(),
    refresh_token: v.optional(v.string()),
    agent_id: v.string(),
    client_id: v.string(),
    model: v.string(),
    scope: v.string(),
    access_token_expires_at: v.number(),
    refresh_token_expires_at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("tokens", {
      token_id: args.token_id,
      access_token: args.access_token,
      refresh_token: args.refresh_token,
      agent_id: args.agent_id,
      client_id: args.client_id,
      model: args.model,
      scope: args.scope,
      access_token_expires_at: args.access_token_expires_at,
      refresh_token_expires_at: args.refresh_token_expires_at,
      created_at: now,
      revoked: false,
    });

    if (args.refresh_token && args.refresh_token_expires_at) {
      await ctx.db.insert("refresh_tokens", {
        refresh_token: args.refresh_token,
        token_id: args.token_id,
        agent_id: args.agent_id,
        client_id: args.client_id,
        expires_at: args.refresh_token_expires_at,
        revoked: false,
      });
    }

    return { success: true };
  },
});
