// Database types for OAuth 2.1 Auth Server

export interface Agent {
  agent_id: string;
  agent_secret_hash: string;
  user_email: string;
  user_name: string;
  created_at: number;
}

export interface Client {
  client_id: string;
  client_secret_hash: string;
  client_name: string;
  allowed_redirect_uris: string[];
  allowed_grant_types: string[];
  created_at: number;
}

export interface AuthRequest {
  request_id: string;
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  code?: string;
  agent_id?: string;
  model?: string;
  status: 'pending' | 'authenticated' | 'completed' | 'expired' | 'error';
  error?: string;
  created_at: number;
  expires_at: number;
}

export interface Token {
  token_id: string;
  access_token: string;
  refresh_token?: string;
  agent_id: string;
  client_id: string;
  model: string;
  scope: string;
  access_token_expires_at: number;
  refresh_token_expires_at?: number;
  created_at: number;
  revoked: boolean;
}

export interface RefreshTokenEntry {
  refresh_token: string;
  token_id: string;
  agent_id: string;
  client_id: string;
  expires_at: number;
  revoked: boolean;
}
