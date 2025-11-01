import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { spinningPage } from "./templates/spinningPage";
import { errorPage } from "./templates/errorPage";
import { CONFIG } from "./lib/constants";
import {
  isValidUrl,
  isAllowedRedirectUri,
  isValidCodeChallengeMethod,
  isValidClientId,
  isValidRedirectUri,
} from "./lib/validation";

const http = httpRouter();

// Get base URL from environment or request
// Ensures HTTPS in production
function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const baseUrl = process.env.CONVEX_SITE_URL || `${url.protocol}//${url.host}`;
  
  // If no env var is set and request is HTTP, warn (Convex typically serves HTTPS)
  // In production, Convex always serves via HTTPS
  if (!process.env.CONVEX_SITE_URL && url.protocol === 'http:' && url.hostname !== 'localhost') {
    console.warn('Warning: Using HTTP instead of HTTPS. This should only happen in development.');
  }
  
  return baseUrl;
}

// ===================================================
// PUBLIC OAUTH ENDPOINTS
// ===================================================

/**
 * GET /authorize
 * OAuth 2.1 authorization endpoint
 */
http.route({
  path: "/authorize",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const params = url.searchParams;

    const client_id = params.get("client_id");
    const redirect_uri = params.get("redirect_uri");
    const state = params.get("state");
    const code_challenge = params.get("code_challenge");
    const code_challenge_method = params.get("code_challenge_method");
    const scope = params.get("scope") || CONFIG.DEFAULT_SCOPE;
    const response_type = params.get("response_type");

    // Validate required parameters
    if (!client_id) {
      return new Response(errorPage("invalid_request", "Missing client_id parameter"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!redirect_uri) {
      return new Response(errorPage("invalid_request", "Missing redirect_uri parameter"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!state) {
      return new Response(errorPage("invalid_request", "Missing state parameter"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code_challenge) {
      return new Response(errorPage("invalid_request", "Missing code_challenge parameter (PKCE required)"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code_challenge_method) {
      return new Response(errorPage("invalid_request", "Missing code_challenge_method parameter"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (response_type !== "code") {
      return new Response(errorPage("unsupported_response_type", 'Only "code" response type is supported'), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!isValidClientId(client_id)) {
      return new Response(errorPage("invalid_request", "Invalid client_id format"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!isValidRedirectUri(redirect_uri)) {
      return new Response(
        errorPage(
          "invalid_request",
          "Invalid redirect_uri format. HTTPS is required (HTTP allowed only for localhost)"
        ),
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    if (!isValidCodeChallengeMethod(code_challenge_method)) {
      return new Response(errorPage("invalid_request", "Invalid code_challenge_method. Only S256 is supported"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Get client from database
    const client = await ctx.runQuery(api.oauth.getClient, { client_id });

    if (!client) {
      return new Response(errorPage("invalid_client", "Client not found"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Validate redirect_uri
    if (!isAllowedRedirectUri(redirect_uri, client.allowed_redirect_uris)) {
      return new Response(errorPage("invalid_request", "redirect_uri is not registered for this client"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Create auth request
    const request_id = await ctx.runMutation(api.oauth.createAuthRequest, {
      client_id,
      redirect_uri,
      state,
      code_challenge,
      code_challenge_method,
      scope,
    });

    // Return spinning page
    const baseUrl = getBaseUrl(request);
    const html = spinningPage(request_id, client.client_name, baseUrl);

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }),
});

/**
 * POST /token
 * Token exchange and refresh endpoint
 */
http.route({
  path: "/token",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { grant_type, code, code_verifier, redirect_uri, client_id, client_secret } = body;

      // Validate grant type
      if (grant_type !== "authorization_code") {
        return new Response(
          JSON.stringify({
            error: "unsupported_grant_type",
            error_description: "Only authorization_code grant is supported",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Validate required parameters
      if (!code || !code_verifier || !redirect_uri || !client_id || !client_secret) {
        return new Response(
          JSON.stringify({
            error: "invalid_request",
            error_description: "Missing required parameters",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Validate redirect_uri format and HTTPS
      if (!isValidRedirectUri(redirect_uri)) {
        return new Response(
          JSON.stringify({
            error: "invalid_request",
            error_description: "Invalid redirect_uri format. HTTPS is required (HTTP allowed only for localhost)",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Verify client credentials
      const client = await ctx.runQuery(api.oauth.getClient, { client_id });
      if (!client) {
        return new Response(
          JSON.stringify({
            error: "invalid_client",
            error_description: "Client not found",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const clientSecretValid = await ctx.runAction(internal.actions.cryptoActions.verifySecretAction, {
        secret: client_secret,
        hash: client.client_secret_hash,
      });

      if (!clientSecretValid) {
        return new Response(
          JSON.stringify({
            error: "invalid_client",
            error_description: "Invalid client credentials",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Get authorization code
      const authCode = await ctx.runQuery(api.oauth.getAuthCode, { code });
      if (!authCode) {
        return new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Invalid or expired authorization code",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Verify PKCE
      const pkceValid = await ctx.runAction(internal.actions.cryptoActions.validatePKCEAction, {
        codeVerifier: code_verifier,
        codeChallenge: authCode.code_challenge,
        method: 'S256',
      });

      if (!pkceValid) {
        return new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Invalid code_verifier",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Verify redirect_uri matches
      if (authCode.redirect_uri !== redirect_uri) {
        return new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "redirect_uri mismatch",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generate tokens
      const randomValue1 = await ctx.runAction(internal.actions.cryptoActions.generateSecureRandomAction, { bytes: 16 });
      const randomValue2 = await ctx.runAction(internal.actions.cryptoActions.generateSecureRandomAction, { bytes: 32 });
      const tokenId = `tok_${randomValue1}`;
      const refreshTokenValue = `rt_${randomValue2}`;

      const accessTokenExpiresAt = Date.now() + (3600 * 1000); // 1 hour
      const refreshTokenExpiresAt = Date.now() + (30 * 24 * 3600 * 1000); // 30 days

      const accessToken = await ctx.runAction(internal.actions.cryptoActions.generateJWTAction, {
        agentId: authCode.agent_id,
        clientId: authCode.client_id,
        model: authCode.model,
        scope: authCode.scope,
        expiresIn: 3600,
        issuer: CONFIG.JWT_ISSUER,
        secret: CONFIG.JWT_SECRET,
      });

      // Store tokens
      await ctx.runMutation(api.oauth.handleTokenRequest, {
        grant_type: "authorization_code",
        token_id: tokenId,
        access_token: accessToken,
        refresh_token: refreshTokenValue,
        agent_id: authCode.agent_id,
        client_id: authCode.client_id,
        model: authCode.model,
        scope: authCode.scope,
        access_token_expires_at: accessTokenExpiresAt,
        refresh_token_expires_at: refreshTokenExpiresAt,
      });

      // Mark auth code as used
      await ctx.runMutation(api.oauth.markAuthCodeUsed, { code });

      return new Response(
        JSON.stringify({
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: refreshTokenValue,
          scope: authCode.scope,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Token exchange error:", error);
      return new Response(
        JSON.stringify({
          error: "server_error",
          error_description: "Internal server error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * POST /introspect
 * Token introspection endpoint
 */
http.route({
  path: "/introspect",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { token, token_type_hint, client_id, client_secret } = body;

      // Validate client credentials if provided
      if (client_id && client_secret) {
        const client = await ctx.runQuery(api.oauth.getClient, { client_id });
        if (!client) {
          return new Response(
            JSON.stringify({
              active: false,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const clientSecretValid = await ctx.runAction(internal.actions.cryptoActions.verifySecretAction, {
          secret: client_secret,
          hash: client.client_secret_hash,
        });

        if (!clientSecretValid) {
          return new Response(
            JSON.stringify({
              active: false,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }

      const result = await ctx.runQuery(api.oauth.introspectToken, {
        token,
        token_type_hint,
        client_id: client_id || "",
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Introspection error:", error);
      return new Response(
        JSON.stringify({
          error: "server_error",
          error_description: "Internal server error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * POST /revoke
 * Token revocation endpoint
 */
http.route({
  path: "/revoke",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();

      await ctx.runMutation(api.oauth.revokeToken, body);

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Always return 200 per RFC 7009
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ===================================================
// AGENT BACK-CHANNEL ENDPOINTS
// ===================================================

/**
 * POST /api/agent/authenticate
 * Agent authentication endpoint
 */
http.route({
  path: "/api/agent/authenticate",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { request_id, agent_id, agent_secret, model } = body;

      // Validate required fields
      if (!request_id || !agent_id || !agent_secret || !model) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "invalid_request",
            error_description: "Missing required fields: request_id, agent_id, agent_secret, model",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Get agent from database
      const agent = await ctx.runQuery(api.oauth.getAgent, { agent_id });

      if (!agent) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "invalid_agent",
            error_description: "Agent not found",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Verify agent secret using crypto action
      const secretValid = await ctx.runAction(internal.actions.cryptoActions.verifySecretAction, {
        secret: agent_secret,
        hash: agent.agent_secret_hash,
      });

      if (!secretValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "invalid_credentials",
            error_description: "Invalid agent credentials",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Authenticate the agent
      const result = await ctx.runMutation(api.oauth.authenticateAgent, {
        request_id,
        agent_id,
        model,
      });

      if (!result.success) {
        return new Response(JSON.stringify(result), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Agent authentication error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "server_error",
          error_description: "Internal server error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * GET /api/check-status
 * Check authentication status (polling endpoint)
 */
http.route({
  path: "/api/check-status",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const request_id = url.searchParams.get("request_id");

    if (!request_id) {
      return new Response(
        JSON.stringify({
          error: "invalid_request",
          error_description: "Missing request_id parameter",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }

    const result = await ctx.runMutation(api.oauth.checkAuthStatus, { request_id });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

// ===================================================
// DISCOVERY ENDPOINTS
// ===================================================

/**
 * GET /.well-known/oauth-authorization-server
 * OAuth discovery metadata
 */
http.route({
  path: "/.well-known/oauth-authorization-server",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const baseUrl = getBaseUrl(request);

    const metadata = {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      introspection_endpoint: `${baseUrl}/introspect`,
      revocation_endpoint: `${baseUrl}/revoke`,
      jwks_uri: `${baseUrl}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      grant_types_supported: CONFIG.SUPPORTED_GRANT_TYPES,
      code_challenge_methods_supported: CONFIG.SUPPORTED_CODE_CHALLENGE_METHODS,
      token_endpoint_auth_methods_supported: ["client_secret_post"],
      introspection_endpoint_auth_methods_supported: ["client_secret_post"],
      revocation_endpoint_auth_methods_supported: ["client_secret_post"],
      scopes_supported: ["openid", "profile", "email"],
      service_documentation: "https://auth-agent.com/docs",
    };

    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * GET /.well-known/jwks.json
 * JWK Set (empty for symmetric keys)
 */
http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(JSON.stringify({ keys: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ===================================================
// ADMIN ENDPOINTS
// ===================================================

/**
 * POST /api/admin/agents
 * Create a new agent
 */
http.route({
  path: "/api/admin/agents",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { user_email, user_name, agent_id } = body;

      // Generate secret
      const agentSecret = await ctx.runAction(internal.actions.cryptoActions.generateSecureRandomAction, { bytes: 32 });

      // Hash secret
      const agentSecretHash = await ctx.runAction(internal.actions.cryptoActions.hashSecretAction, { secret: agentSecret });

      // Create agent
      const result = await ctx.runMutation(api.admin.createAgent, {
        user_email,
        user_name,
        agent_id,
        agent_secret_hash: agentSecretHash,
      });

      if (!result.success) {
        return new Response(JSON.stringify(result), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        agent_id: result.agent_id,
        agent_secret: agentSecret,
        user_email,
        user_name,
        created_at: Date.now(),
        warning: "Save the agent_secret securely. It will not be shown again.",
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Create agent error:", error);
      return new Response(
        JSON.stringify({
          error: "server_error",
          error_description: "Internal server error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * GET /api/admin/agents
 * List all agents
 */
http.route({
  path: "/api/admin/agents",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const agents = await ctx.runQuery(api.admin.listAgents);

    return new Response(JSON.stringify(agents), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * POST /api/admin/clients
 * Create a new client
 */
http.route({
  path: "/api/admin/clients",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { client_name, redirect_uris, client_id } = body;

      // Generate secret
      const clientSecret = await ctx.runAction(internal.actions.cryptoActions.generateSecureRandomAction, { bytes: 32 });

      // Hash secret
      const clientSecretHash = await ctx.runAction(internal.actions.cryptoActions.hashSecretAction, { secret: clientSecret });

      // Create client
      const result = await ctx.runMutation(api.admin.createClient, {
        client_name,
        redirect_uris,
        client_id,
        client_secret_hash: clientSecretHash,
      });

      if (!result.success) {
        return new Response(JSON.stringify(result), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        client_id: result.client_id,
        client_secret: clientSecret,
        client_name,
        allowed_redirect_uris: redirect_uris,
        allowed_grant_types: ["authorization_code", "refresh_token"],
        created_at: Date.now(),
        warning: "Save the client_secret securely. It will not be shown again.",
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Create client error:", error);
      return new Response(
        JSON.stringify({
          error: "server_error",
          error_description: "Internal server error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * GET /api/admin/clients
 * List all clients
 */
http.route({
  path: "/api/admin/clients",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const clients = await ctx.runQuery(api.admin.listClients);

    return new Response(JSON.stringify(clients), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * PATCH /api/admin/clients/:client_id
 * Update client configuration
 */
http.route({
  path: "/api/admin/clients/update",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { client_id, client_name, redirect_uris } = body;

      if (!client_id) {
        return new Response(
          JSON.stringify({
            error: "invalid_request",
            error_description: "Missing client_id parameter",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const result = await ctx.runMutation(api.admin.updateClient, {
        client_id,
        client_name,
        redirect_uris,
      });

      if (!result.success) {
        return new Response(JSON.stringify(result), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Update client error:", error);
      return new Response(
        JSON.stringify({
          error: "server_error",
          error_description: "Internal server error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// ===================================================
// UTILITY ENDPOINTS
// ===================================================

/**
 * GET /api/health
 * Health check
 */
http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: Date.now(),
        version: "1.0.0",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

/**
 * GET /error
 * Error page
 */
http.route({
  path: "/error",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const message = url.searchParams.get("message") || "An error occurred";

    return new Response(errorPage("error", message), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }),
});

export default http;
