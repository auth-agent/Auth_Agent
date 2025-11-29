import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import type {
  AuthAgentPluginOptions,
  AuthAgentScenario,
  TokenResponse,
  StateData,
  AgentAuthData,
} from "./types";
import {
  generateRandomString,
  sha256,
  decodeJWT,
  getRedirectUri,
} from "./utils";

/**
 * Auth Agent plugin for Better Auth
 *
 * Enables OAuth 2.1 authentication for AI agents via Auth Agent authorization server.
 * Supports three integration scenarios:
 * 
 * - `fullAccount`: Agent operates within user's existing account
 * - `contextualProfile`: Separate agent profile linked to user  
 * - `freshProfile`: Independent agent profile with no user data
 *
 * @example
 * ```ts
 * import { betterAuth } from "better-auth";
 * import { authAgent } from "@auth-agent/better-auth-plugin/server";
 *
 * export const auth = betterAuth({
 *   plugins: [
 *     authAgent({
 *       clientId: process.env.AUTH_AGENT_CLIENT_ID!,
 *       clientSecret: process.env.AUTH_AGENT_CLIENT_SECRET!,
 *       scenario: "fullAccount", // or "contextualProfile" or "freshProfile"
 *     })
 *   ]
 * });
 * ```
 */
export const authAgent = (options: AuthAgentPluginOptions) => {
  const scenario: AuthAgentScenario = options.scenario || "fullAccount";
  
  // Default scopes based on scenario
  const defaultScopes = scenario === "freshProfile" 
    ? "openid profile" 
    : "openid profile email";

  const opts: Required<
    Pick<
      AuthAgentPluginOptions,
      "authServerUrl" | "scopes" | "autoCreateUser" | "scenario"
    >
  > &
    AuthAgentPluginOptions = {
    authServerUrl: "https://api.auth-agent.com",
    scopes: defaultScopes,
    autoCreateUser: true,
    scenario,
    ...options,
  };

  return {
    id: "auth-agent",

    endpoints: {
      /**
       * GET /sign-in/auth-agent
       *
       * Initiates OAuth 2.1 authorization flow with Auth Agent server.
       * Generates PKCE challenge and redirects to Auth Agent authorization endpoint.
       */
      signInAuthAgent: createAuthEndpoint(
        "/sign-in/auth-agent",
        {
          method: "GET",
          query: z.object({
            callbackURL: z
              .string()
              .optional()
              .describe("URL to redirect after authentication"),
          }),
          metadata: {
            openapi: {
              operationId: "signInWithAuthAgent",
              description:
                "Sign in with Auth Agent - OAuth 2.1 authentication for AI agents",
              responses: {
                302: {
                  description: "Redirect to Auth Agent authorization server",
                },
                400: {
                  description: "Bad request",
                },
              },
            },
          },
        },
        async (ctx) => {
          try {
            // Generate PKCE challenge (128-char verifier)
            const codeVerifier = generateRandomString(128);
            const codeChallenge = await sha256(codeVerifier);
            const state = generateRandomString(32);

            // Store PKCE verifier and state in verification table
            await ctx.context.internalAdapter.createVerificationValue({
              identifier: state,
              value: JSON.stringify({
                codeVerifier,
                callbackURL: ctx.query.callbackURL,
              } satisfies StateData),
              expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            });

            // Build Auth Agent authorization URL
            const authUrl = new URL(`${opts.authServerUrl}/authorize`);
            authUrl.searchParams.set("client_id", opts.clientId);
            authUrl.searchParams.set("redirect_uri", getRedirectUri(ctx));
            authUrl.searchParams.set("response_type", "code");
            authUrl.searchParams.set("state", state);
            authUrl.searchParams.set("code_challenge", codeChallenge);
            authUrl.searchParams.set("code_challenge_method", "S256");
            authUrl.searchParams.set("scope", opts.scopes);

            // Redirect to Auth Agent authorization server
            return ctx.redirect(authUrl.toString());
          } catch (error) {
            console.error("Auth Agent sign-in error:", error);
            throw error;
          }
        }
      ),

      /**
       * GET /callback/auth-agent
       *
       * OAuth callback handler. Validates state, exchanges authorization code
       * for tokens, and creates a Better Auth session.
       */
      callbackAuthAgent: createAuthEndpoint(
        "/callback/auth-agent",
        {
          method: "GET",
          query: z.object({
            code: z.string().describe("Authorization code from Auth Agent"),
            state: z.string().describe("CSRF state token"),
            error: z.string().optional().describe("OAuth error code"),
            error_description: z
              .string()
              .optional()
              .describe("OAuth error description"),
          }),
          metadata: {
            openapi: {
              operationId: "authAgentCallback",
              description: "Auth Agent OAuth callback handler",
              responses: {
                302: {
                  description: "Redirect to callback URL with session",
                },
                400: {
                  description: "Bad request or OAuth error",
                },
              },
            },
          },
        },
        async (ctx) => {
          try {
            // Check for OAuth errors
            if (ctx.query.error) {
              const errorMsg = ctx.query.error_description || ctx.query.error;
              throw new Error(`OAuth error: ${errorMsg}`);
            }

            // Validate state and retrieve PKCE verifier
            const stateData = await ctx.context.internalAdapter.findVerificationValue(
              ctx.query.state
            );

            if (!stateData) {
              throw new Error(
                "Invalid or expired state parameter. Please try again."
              );
            }

            const { codeVerifier, callbackURL } = JSON.parse(
              stateData.value
            ) as StateData;

            // Exchange authorization code for tokens
            const tokenResponse = await fetch(`${opts.authServerUrl}/token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                grant_type: "authorization_code",
                code: ctx.query.code,
                redirect_uri: getRedirectUri(ctx),
                client_id: opts.clientId,
                client_secret: opts.clientSecret,
                code_verifier: codeVerifier,
              }),
            });

            if (!tokenResponse.ok) {
              const errorData = await tokenResponse.json();
              throw new Error(
                `Token exchange failed: ${errorData.error_description || errorData.error}`
              );
            }

            const tokens: TokenResponse = await tokenResponse.json();

            // Decode JWT to get agent info
            const payload = decodeJWT(tokens.access_token);
            const agentId = payload.sub || payload.agent_id;
            
            let user: any;
            let agentData: AgentAuthData;

            // Handle based on scenario
            if (opts.scenario === "freshProfile") {
              // SCENARIO 3: Fresh Profile
              // Do NOT call /userinfo - create independent agent profile
              agentData = {
                email: `agent-${agentId}@auth-agent.local`, // Generated email for agent
                name: payload.name || `Agent ${agentId.slice(-6)}`,
                sub: agentId,
                agent_id: agentId,
                model: payload.model,
                ...payload,
              };

              // Find or create agent user by agent ID
              const agentEmail = agentData.email;
              user = await ctx.context.internalAdapter
                .findUserByEmail(agentEmail)
                .then((res) => res?.user);

              if (!user) {
                user = await ctx.context.internalAdapter.createUser({
                  email: agentEmail,
                  name: agentData.name || `Agent ${agentId.slice(-6)}`,
                  emailVerified: true,
                });
              }
            } else {
              // SCENARIO 1 & 2: Full Account or Contextual Profile
              // Call /userinfo to get user email
              const userInfoResponse = await fetch(`${opts.authServerUrl}/userinfo`, {
                headers: {
                  Authorization: `Bearer ${tokens.access_token}`,
                },
              });

              if (!userInfoResponse.ok) {
                throw new Error("Failed to fetch user info from Auth Agent");
              }

              const userInfo = await userInfoResponse.json();
              
              agentData = {
                email: userInfo.email || payload.email,
                name: userInfo.name || payload.name,
                sub: agentId,
                agent_id: agentId,
                model: payload.model,
                ...payload,
                ...userInfo,
              };

              if (!agentData.email) {
                throw new Error("User email not available. Ensure 'email' scope is requested.");
              }

              // Map agent data to Better Auth user format
              const userData = opts.mapAgentToUser
                ? opts.mapAgentToUser(agentData)
                : {
                    email: agentData.email,
                    name: agentData.name,
                    emailVerified: true,
                  };

              // Find or create user by email
              user = await ctx.context.internalAdapter
                .findUserByEmail(userData.email)
                .then((res) => res?.user);

              if (opts.scenario === "fullAccount") {
                // SCENARIO 1: Full Account Access
                // User must exist (or auto-create if enabled)
                if (!user && opts.autoCreateUser) {
                  user = await ctx.context.internalAdapter.createUser({
                    email: userData.email,
                    name: userData.name || "User",
                    emailVerified: userData.emailVerified ?? true,
                    image: userData.image,
                  });
                } else if (!user) {
                  throw new Error(
                    "User not found and auto-creation is disabled. Please register first."
                  );
                }
              } else {
                // SCENARIO 2: Contextual Profile
                // Create user if not exists, agent operates with separate identity but linked context
                if (!user) {
                  user = await ctx.context.internalAdapter.createUser({
                    email: userData.email,
                    name: userData.name || "User",
                    emailVerified: true,
                    image: userData.image,
                  });
                }
                
                // Store agent profile link in account table
                // This allows distinguishing agent sessions from user sessions
                const existingAccount = await ctx.context.internalAdapter.findAccounts(user.id);
                const hasAgentAccount = existingAccount?.some(
                  (acc: any) => acc.providerId === "auth-agent" && acc.accountId === agentId
                );
                
                if (!hasAgentAccount) {
                  await ctx.context.internalAdapter.linkAccount({
                    userId: user.id,
                    providerId: "auth-agent",
                    accountId: agentId,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
                  });
                }
              }
            }

            // Create Better Auth session
            const session = await ctx.context.internalAdapter.createSession(
              user.id
            );

            // Set session cookie
            await setSessionCookie(ctx, {
              session,
              user,
            });

            // Clean up verification value
            await ctx.context.internalAdapter.deleteVerificationValue(
              stateData.id
            );

            // Call success callback if provided
            if (opts.onSuccess) {
              await opts.onSuccess({ user, session, agentData, scenario: opts.scenario });
            }

            // Redirect to callback URL or default
            const redirectUrl = callbackURL || "/";
            return ctx.redirect(redirectUrl);
          } catch (error) {
            console.error("Auth Agent callback error:", error);

            // Redirect to error page with message
            const errorUrl = new URL("/auth/error", getRedirectUri(ctx));
            errorUrl.searchParams.set(
              "error",
              error instanceof Error ? error.message : "Authentication failed"
            );
            return ctx.redirect(errorUrl.toString());
          }
        }
      ),
    },

    rateLimit: [
      {
        pathMatcher: (path) => path === "/sign-in/auth-agent",
        window: 60, // 1 minute
        max: 10, // 10 requests per minute
      },
      {
        pathMatcher: (path) => path === "/callback/auth-agent",
        window: 60,
        max: 20, // 20 callbacks per minute
      },
    ],
  } satisfies BetterAuthPlugin;
};

// Export types
export type { AuthAgentPluginOptions, AuthAgentScenario, AgentAuthData, TokenResponse };
