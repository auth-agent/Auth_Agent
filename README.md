# Auth Agent - OAuth 2.1 for AI Agents

A specialized OAuth 2.1 authorization server designed for autonomous AI agents. Unlike traditional OAuth flows that require human interaction, Auth Agent enables AI agents to authenticate themselves programmatically while maintaining security through PKCE and credential verification.

## Features

- **OAuth 2.1 Compliant** - Full implementation with PKCE required
- **AI Agent Authentication** - Agents authenticate using agent_id + agent_secret
- **No User Consent** - Streamlined for autonomous agents (consent handled during onboarding)
- **JWT Access Tokens** - Stateless token validation with JWT
- **Refresh Tokens** - Long-lived sessions with opaque refresh tokens
- **Token Introspection** - RFC 7662 compliant token validation
- **Token Revocation** - RFC 7009 compliant token revocation
- **OAuth Discovery** - RFC 8414 metadata endpoint

## How It Works

### Traditional OAuth vs Auth Agent

**Traditional OAuth (for humans):**
```
1. User clicks "Sign in"
2. User redirected to auth server
3. User enters credentials manually
4. User approves consent screen
5. User redirected back with code
```

**Auth Agent (for AI):**
```
1. AI Agent clicks "Sign in" (automated)
2. Browser redirected to auth server
3. AI Agent detects auth page
4. AI Agent POSTs credentials via API
5. Browser auto-redirects back with code
```

### Complete Flow

```
┌──────────────┐         ┌─────────────┐         ┌──────────────┐
│  AI Agent    │         │  Website    │         │ Auth Server  │
│  (Browser)   │         │             │         │              │
└──────┬───────┘         └──────┬──────┘         └──────┬───────┘
       │                        │                       │
       │ Navigate to website    │                       │
       │───────────────────────>│                       │
       │                        │                       │
       │ Click "Sign in"        │                       │
       │───────────────────────>│                       │
       │                        │                       │
       │ Redirect to /authorize │                       │
       │<───────────────────────┤                       │
       │                        │                       │
       │ GET /authorize         │                       │
       │────────────────────────────────────────────────>│
       │                        │                       │
       │ Return spinning page   │                       │
       │<────────────────────────────────────────────────┤
       │                        │                       │
       │ Extract request_id     │                       │
       │ POST /api/agent/authenticate                   │
       │────────────────────────────────────────────────>│
       │                        │                       │
       │ Success                │                       │
       │<────────────────────────────────────────────────┤
       │                        │                       │
       │ Page auto-redirects    │                       │
       │ GET /callback?code=... │                       │
       │───────────────────────>│                       │
       │                        │                       │
       │                        │ POST /token           │
       │                        │──────────────────────>│
       │                        │                       │
       │                        │ Return access token   │
       │                        │<──────────────────────┤
       │                        │                       │
       │ Logged in!             │                       │
       │<───────────────────────┤                       │
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### 3. Seed Test Data

```bash
npm run seed
```

This creates:
- A test agent with credentials
- A test client (website)
- Saves credentials to `test-credentials.json`

### 4. Test the Flow

```bash
npm test
```

Runs a complete OAuth flow simulation.

## API Endpoints

### Public OAuth Endpoints

#### `GET /authorize`
Standard OAuth 2.1 authorization endpoint. Shows spinning page while agent authenticates.

**Query Parameters:**
- `client_id` - OAuth client identifier
- `redirect_uri` - Callback URL
- `response_type` - Must be "code"
- `state` - CSRF protection token
- `code_challenge` - PKCE challenge (S256)
- `code_challenge_method` - Must be "S256"
- `scope` - Optional, defaults to "openid profile"

#### `POST /token`
Exchange authorization code for tokens, or refresh access token.

**Body (authorization_code grant):**
```json
{
  "grant_type": "authorization_code",
  "code": "code_xxx",
  "code_verifier": "...",
  "client_id": "client_xxx",
  "client_secret": "..."
}
```

**Body (refresh_token grant):**
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "rt_xxx",
  "client_id": "client_xxx",
  "client_secret": "..."
}
```

#### `POST /introspect`
Validate and get information about a token.

```json
{
  "token": "eyJhbG...",
  "token_type_hint": "access_token",
  "client_id": "client_xxx",
  "client_secret": "..."
}
```

#### `POST /revoke`
Revoke an access or refresh token.

```json
{
  "token": "eyJhbG...",
  "token_type_hint": "access_token",
  "client_id": "client_xxx",
  "client_secret": "..."
}
```

### Agent Back-Channel Endpoints

#### `POST /api/agent/authenticate`
Agent sends credentials to complete an authorization request.

```json
{
  "request_id": "req_xxx",
  "agent_id": "agent_xxx",
  "agent_secret": "...",
  "model": "gpt-4"
}
```

#### `GET /api/check-status`
Check if agent has completed authentication (used by spinning page polling).

**Query Parameters:**
- `request_id` - The authorization request ID

### Admin Endpoints

#### Agents

- `POST /api/admin/agents` - Create new agent
- `GET /api/admin/agents` - List all agents
- `GET /api/admin/agents/:id` - Get agent details
- `DELETE /api/admin/agents/:id` - Delete agent

#### Clients

- `POST /api/admin/clients` - Create new client
- `GET /api/admin/clients` - List all clients
- `GET /api/admin/clients/:id` - Get client details
- `PUT /api/admin/clients/:id` - Update client
- `DELETE /api/admin/clients/:id` - Delete client

### Discovery Endpoints

- `GET /.well-known/oauth-authorization-server` - OAuth server metadata
- `GET /.well-known/jwks.json` - JSON Web Key Set

## Configuration

Environment variables (with defaults):

```env
PORT=3000
BASE_URL=http://localhost:3000
JWT_SECRET=your-secret-key-change-in-production
JWT_ISSUER=auth-agent.com
```

## Security Features

### PKCE (Proof Key for Code Exchange)
OAuth 2.1 **requires** PKCE for all authorization code flows. This prevents authorization code interception attacks.

### Credential Hashing
All secrets (agent_secret, client_secret) are hashed with bcrypt before storage.

### JWT Tokens
Access tokens are JWTs signed with HS256, enabling stateless validation.

### Opaque Refresh Tokens
Refresh tokens are random strings stored in the database, allowing easy revocation.

### Request Expiration
Authorization requests expire after 10 minutes to prevent replay attacks.

## Project Structure

```
src/
├── db/
│   ├── types.ts          # TypeScript types
│   └── store.ts          # In-memory database
├── lib/
│   ├── constants.ts      # Configuration
│   ├── crypto.ts         # Hashing, PKCE, token generation
│   ├── jwt.ts            # JWT utilities
│   └── validation.ts     # Input validation
├── templates/
│   ├── spinningPage.ts   # Authorization page
│   └── errorPage.ts      # Error page
├── oauth/
│   ├── authorize.ts      # GET /authorize
│   ├── agentAuth.ts      # POST /api/agent/authenticate
│   ├── checkStatus.ts    # GET /api/check-status
│   ├── token.ts          # POST /token
│   ├── introspect.ts     # POST /introspect
│   ├── revoke.ts         # POST /revoke
│   └── discovery.ts      # /.well-known/*
├── admin/
│   ├── agents.ts         # Agent management
│   └── clients.ts        # Client management
└── index.ts              # Main server
```

## Future Enhancements

### 2FA with AgentMail (Optional)
Add email-based 2FA for additional security:

1. Agent sends credentials
2. Server sends OTP to agent's AgentMail inbox
3. Agent reads email via API
4. Agent submits OTP
5. Server issues tokens

### Database Migration
Replace in-memory store with:
- **Convex** (serverless, real-time)
- **PostgreSQL** (traditional relational)
- **MongoDB** (document store)

### Additional Features
- Rate limiting
- Audit logs
- Admin dashboard UI
- Multiple scope support
- Client registration API
- Webhook notifications

## Development

### Run in Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Run Tests
```bash
npm test
```

## License

MIT

## Support

For issues and questions, please visit: https://github.com/your-org/auth-agent
