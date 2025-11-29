/**
 * Integration scenario for Auth Agent authentication
 * 
 * - `fullAccount`: Agent operates within user's existing account (calls /userinfo, finds user by email)
 * - `contextualProfile`: Separate agent profile with access to user context (calls /userinfo, creates agent profile linked to user)
 * - `freshProfile`: Independent agent profile with no user data (skips /userinfo, uses JWT agent_id only)
 */
export type AuthAgentScenario = "fullAccount" | "contextualProfile" | "freshProfile";

export interface AuthAgentPluginOptions {
  /**
   * Auth Agent authorization server URL
   * @default "https://api.auth-agent.com"
   */
  authServerUrl?: string;

  /**
   * OAuth client ID (registered with Auth Agent)
   */
  clientId: string;

  /**
   * OAuth client secret (for server-side token exchange)
   */
  clientSecret: string;

  /**
   * Integration scenario
   * 
   * - `fullAccount`: Agent operates within user's existing account
   * - `contextualProfile`: Separate agent profile linked to user
   * - `freshProfile`: Independent agent profile with no user data
   * 
   * @default "fullAccount"
   */
  scenario?: AuthAgentScenario;

  /**
   * OAuth scopes
   * @default "openid profile email" for fullAccount/contextualProfile
   * @default "openid profile" for freshProfile
   */
  scopes?: string;

  /**
   * Auto-create users if agent authenticates for unknown user
   * Only applies to fullAccount and contextualProfile scenarios
   * @default true
   */
  autoCreateUser?: boolean;

  /**
   * Custom user mapping from agent auth response
   * Only used when autoCreateUser is true
   */
  mapAgentToUser?: (agentData: AgentAuthData) => {
    email: string;
    name?: string;
    emailVerified?: boolean;
    image?: string;
  };

  /**
   * Custom callback to run after successful authentication
   */
  onSuccess?: (data: {
    user: any;
    session: any;
    agentData: AgentAuthData;
    scenario: AuthAgentScenario;
  }) => Promise<void> | void;
}

export interface AgentAuthData {
  email: string;
  name?: string;
  sub: string;
  agent_id?: string;
  [key: string]: any;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface StateData {
  codeVerifier: string;
  callbackURL?: string;
}
