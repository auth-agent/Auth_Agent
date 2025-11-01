// In-memory database implementation
// TODO: Replace with actual database (Convex, PostgreSQL, etc.)

import type { Agent, Client, AuthRequest, Token, RefreshTokenEntry } from './types.js';

class InMemoryStore {
  private agents: Map<string, Agent> = new Map();
  private clients: Map<string, Client> = new Map();
  private authRequests: Map<string, AuthRequest> = new Map();
  private tokens: Map<string, Token> = new Map();
  private refreshTokens: Map<string, RefreshTokenEntry> = new Map();
  private authorizationCodes: Map<string, string> = new Map(); // code -> request_id

  // Agent operations
  async createAgent(agent: Agent): Promise<Agent> {
    this.agents.set(agent.agent_id, agent);
    return agent;
  }

  async getAgent(agent_id: string): Promise<Agent | null> {
    return this.agents.get(agent_id) || null;
  }

  async listAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async updateAgent(agent_id: string, updates: Partial<Agent>): Promise<Agent | null> {
    const agent = this.agents.get(agent_id);
    if (!agent) return null;

    const updated = { ...agent, ...updates };
    this.agents.set(agent_id, updated);
    return updated;
  }

  async deleteAgent(agent_id: string): Promise<boolean> {
    return this.agents.delete(agent_id);
  }

  // Client operations
  async createClient(client: Client): Promise<Client> {
    this.clients.set(client.client_id, client);
    return client;
  }

  async getClient(client_id: string): Promise<Client | null> {
    return this.clients.get(client_id) || null;
  }

  async listClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async updateClient(client_id: string, updates: Partial<Client>): Promise<Client | null> {
    const client = this.clients.get(client_id);
    if (!client) return null;

    const updated = { ...client, ...updates };
    this.clients.set(client_id, updated);
    return updated;
  }

  async deleteClient(client_id: string): Promise<boolean> {
    return this.clients.delete(client_id);
  }

  // Auth request operations
  async createAuthRequest(request: AuthRequest): Promise<AuthRequest> {
    this.authRequests.set(request.request_id, request);
    return request;
  }

  async getAuthRequest(request_id: string): Promise<AuthRequest | null> {
    return this.authRequests.get(request_id) || null;
  }

  async updateAuthRequest(request_id: string, updates: Partial<AuthRequest>): Promise<AuthRequest | null> {
    const request = this.authRequests.get(request_id);
    if (!request) return null;

    const updated = { ...request, ...updates };
    this.authRequests.set(request_id, updated);
    return updated;
  }

  async deleteAuthRequest(request_id: string): Promise<boolean> {
    return this.authRequests.delete(request_id);
  }

  // Authorization code operations
  async storeAuthCode(code: string, request_id: string): Promise<void> {
    this.authorizationCodes.set(code, request_id);
  }

  async getAuthCodeRequestId(code: string): Promise<string | null> {
    return this.authorizationCodes.get(code) || null;
  }

  async deleteAuthCode(code: string): Promise<boolean> {
    return this.authorizationCodes.delete(code);
  }

  // Token operations
  async createToken(token: Token): Promise<Token> {
    this.tokens.set(token.token_id, token);
    return token;
  }

  async getToken(token_id: string): Promise<Token | null> {
    return this.tokens.get(token_id) || null;
  }

  async getTokenByAccessToken(access_token: string): Promise<Token | null> {
    for (const token of this.tokens.values()) {
      if (token.access_token === access_token) {
        return token;
      }
    }
    return null;
  }

  async revokeToken(token_id: string): Promise<boolean> {
    const token = this.tokens.get(token_id);
    if (!token) return false;

    token.revoked = true;
    this.tokens.set(token_id, token);
    return true;
  }

  async revokeTokenByAccessToken(access_token: string): Promise<boolean> {
    const token = await this.getTokenByAccessToken(access_token);
    if (!token) return false;

    token.revoked = true;
    this.tokens.set(token.token_id, token);
    return true;
  }

  async listTokens(): Promise<Token[]> {
    return Array.from(this.tokens.values());
  }

  // Refresh token operations
  async createRefreshToken(refreshToken: RefreshTokenEntry): Promise<RefreshTokenEntry> {
    this.refreshTokens.set(refreshToken.refresh_token, refreshToken);
    return refreshToken;
  }

  async getRefreshToken(refresh_token: string): Promise<RefreshTokenEntry | null> {
    return this.refreshTokens.get(refresh_token) || null;
  }

  async revokeRefreshToken(refresh_token: string): Promise<boolean> {
    const token = this.refreshTokens.get(refresh_token);
    if (!token) return false;

    token.revoked = true;
    this.refreshTokens.set(refresh_token, token);
    return true;
  }

  // Cleanup expired entries
  async cleanupExpired(): Promise<void> {
    const now = Date.now();

    // Cleanup expired auth requests
    for (const [id, request] of this.authRequests.entries()) {
      if (request.expires_at < now) {
        this.authRequests.delete(id);
      }
    }

    // Cleanup expired refresh tokens
    for (const [token, entry] of this.refreshTokens.entries()) {
      if (entry.expires_at < now) {
        this.refreshTokens.delete(token);
      }
    }
  }
}

// Singleton instance
export const db = new InMemoryStore();

// Cleanup interval (every 5 minutes)
setInterval(() => {
  db.cleanupExpired();
}, 5 * 60 * 1000);
