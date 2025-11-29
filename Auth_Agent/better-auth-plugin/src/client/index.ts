import type { BetterAuthClientPlugin } from "better-auth/client";
import { atom } from "nanostores";

export interface AuthAgentSignInOptions {
  /**
   * URL to redirect after successful authentication
   */
  callbackURL?: string;
}

/**
 * Auth Agent client plugin for Better Auth
 *
 * Provides client-side actions and state management for Auth Agent authentication.
 *
 * @example
 * ```ts
 * import { createAuthClient } from "better-auth/react";
 * import { authAgentClient } from "@auth-agent/better-auth-plugin/client";
 *
 * export const authClient = createAuthClient({
 *   baseURL: process.env.NEXT_PUBLIC_APP_URL!,
 *   plugins: [authAgentClient()],
 * });
 *
 * // Usage
 * await authClient.authAgent.signIn({ callbackURL: "/dashboard" });
 * ```
 */
export const authAgentClient = () => {
  return {
    id: "auth-agent",

    // Type inference from server plugin
    $InferServerPlugin: {} as ReturnType<typeof import("../server").authAgent>,

    // Client-side actions
    getActions: () => ({
      authAgent: {
        /**
         * Sign in with Auth Agent
         *
         * Redirects to the Auth Agent OAuth flow.
         */
        signIn: async (options?: AuthAgentSignInOptions) => {
          const url = new URL(
            "/api/auth/sign-in/auth-agent",
            window.location.origin
          );

          if (options?.callbackURL) {
            url.searchParams.set("callbackURL", options.callbackURL);
          }

          // Redirect to sign-in endpoint
          window.location.href = url.toString();
        },
      },
    }),

    // State management atoms
    getAtoms: () => ({
      /**
       * Track if current session is from Auth Agent authentication
       */
      isAuthAgentAuth: atom<boolean>(false),

      /**
       * Track Auth Agent flow state
       */
      authAgentState: atom<"idle" | "signing-in" | "authenticating" | "error">(
        "idle"
      ),
    }),

    // Listen for session changes
    atomListeners: [
      {
        matcher: (path) => path.includes("auth-agent"),
        signal: "$sessionSignal",
      },
    ],
  } satisfies BetterAuthClientPlugin;
};
