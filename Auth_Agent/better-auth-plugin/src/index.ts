/**
 * @auth-agent/better-auth-plugin
 *
 * Better Auth plugin for Auth Agent - OAuth 2.1 authentication for AI agents
 *
 * @example Server
 * ```ts
 * import { betterAuth } from "better-auth";
 * import { authAgent } from "@auth-agent/better-auth-plugin/server";
 *
 * export const auth = betterAuth({
 *   plugins: [
 *     authAgent({
 *       clientId: process.env.AUTH_AGENT_CLIENT_ID!,
 *       clientSecret: process.env.AUTH_AGENT_CLIENT_SECRET!,
 *     })
 *   ]
 * });
 * ```
 *
 * @example Client
 * ```ts
 * import { createAuthClient } from "better-auth/react";
 * import { authAgentClient } from "@auth-agent/better-auth-plugin/client";
 *
 * export const authClient = createAuthClient({
 *   plugins: [authAgentClient()],
 * });
 * ```
 *
 * @example React Component
 * ```tsx
 * import { AuthAgentButton } from "@auth-agent/better-auth-plugin/client/react";
 *
 * <AuthAgentButton callbackURL="/dashboard" />
 * ```
 */

// Re-export server plugin
export { authAgent } from "./server";
export type {
  AuthAgentPluginOptions,
  AgentAuthData,
  TokenResponse,
} from "./server/types";

// Re-export client plugin
export { authAgentClient } from "./client";
export type { AuthAgentSignInOptions } from "./client";

// Re-export React components
export { AuthAgentButton, useAuthAgent } from "./client/react";
export type { AuthAgentButtonProps } from "./client/react";
