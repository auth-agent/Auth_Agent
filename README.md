<div align="center">

![Auth Agent Logo](./logo/AA.png)

# Auth Agent - OIDC + OAuth 2.1 for AI Agents

**Standardized authentication for autonomous AI agents**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020)](https://workers.cloudflare.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)](https://supabase.com/)

A specialized OAuth 2.1 authorization server designed for autonomous AI agents. Unlike traditional OAuth flows that require human interaction, Auth Agent enables AI agents to authenticate themselves programmatically through PKCE and credential verification.

</div>

---

## 🎥 Video Demos

Watch Auth Agent in action:

### Demo 1: Profilio Integration
AI agent authenticating on Profilio platform using browser-use.

![Profilio Demo](./demo/gif/Profilio.gif)

### Demo 2: Crypto Exchange Dashboard
Authentication flow on crypto trading platform.

![Crypto Exchange Demo](./demo/gif/Crypto_Website_Demo.gif)

### Demo 3: GitHub Clone Website
Full OAuth flow on GitHub-style repository dashboard.

![GitHub Clone Demo](./demo/gif/Github_Replica_Website_Demo.gif)

## ✨ Features

- **🔐 OAuth 2.1 Compliant** - Full implementation with PKCE required
- **🤖 AI Agent Authentication** - Agents authenticate using `agent_id` + `agent_secret`
- **⚡ No User Consent** - Streamlined for autonomous agents (consent handled during onboarding)
- **🎫 JWT Access Tokens** - Stateless token validation with JWT (HS256)
- **🔄 Refresh Tokens** - Long-lived sessions with opaque refresh tokens
- **🔍 Token Introspection** - RFC 7662 compliant token validation
- **🗑️ Token Revocation** - RFC 7009 compliant token revocation
- **📋 OAuth Discovery** - RFC 8414 metadata endpoint
- **🌐 Edge Deployment** - Global deployment on Cloudflare Workers + Supabase PostgreSQL
- **📦 SDK Support** - TypeScript & Python SDKs for easy integration

## 🛠️ Tech Stack

### Backend & Infrastructure
- **[Cloudflare Workers](https://workers.cloudflare.com/)** - Edge serverless platform for OAuth endpoints
- **[Supabase](https://supabase.com/)** - PostgreSQL database for storing clients, agents, and tokens
- **[Hono](https://hono.dev/)** - Fast web framework for Cloudflare Workers
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[JWT (jose)](https://github.com/panva/jose)** - JSON Web Tokens for stateless authentication

### Frontend & Client SDKs
- **[Next.js](https://nextjs.org/)** - React framework for demo websites
- **[React](https://react.dev/)** - UI components and SDK widgets
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe client SDK
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling for demo websites

### AI Agent Integration
- **[Python](https://www.python.org/)** - Agent SDK
- **[aiohttp](https://docs.aiohttp.org/)** - Async HTTP client for agents

### Database & Storage
- **[Supabase (PostgreSQL)](https://supabase.com/)** - Primary database with row-level security

### Deployment
- **[Vercel](https://vercel.com/)** - Frontend deployment (demo websites)
- **[Cloudflare Workers](https://workers.cloudflare.com/)** - Backend deployment (edge network)

### Security & Cryptography
- **PBKDF2** - Password hashing for secrets
- **SHA-256** - PKCE code challenge hashing
- **HS256** - JWT signing algorithm
- **bcrypt** - Additional credential hashing

## 🔄 Complete OAuth 2.1 Workflow

```mermaid
sequenceDiagram
    participant Agent as AI Agent<br/>(browser-use)
    participant Website as Website<br/>(Next.js)
    participant AuthServer as Auth Server<br/>(Cloudflare Workers)

    Note over Agent,AuthServer: Auth Agent OAuth 2.1 Flow

    Agent->>Website: 1. Navigate to website
    Agent->>Website: 2. Click "Sign in with<br/>Auth Agent" button
    
    Note over Website: 3. Generate PKCE<br/>(code_verifier, code_challenge)
    
    Website->>AuthServer: 4. Redirect to /authorize<br/>(with PKCE challenge)
    
    AuthServer->>Agent: 5. Return spinning page<br/>(shows "Authenticating AI Agent")
    
    Note over Agent: 6. Extract request_id<br/>from window.authRequest
    
    Agent->>AuthServer: 7. POST /api/agent/authenticate<br/>{ request_id, agent_id,<br/>agent_secret, model }
    
    Note over AuthServer: 8. Verify credentials<br/>(PBKDF2 hash check)
    
    AuthServer->>Agent: 9. Authentication success
    
    loop Polling for completion
        Agent->>AuthServer: 10. GET /api/check-status?<br/>request_id=...
        AuthServer->>Agent: 11. Status: "authenticated"
    end
    
    Agent->>Website: 12. Auto-redirect to callback<br/>(with authorization code)
    
    Website->>AuthServer: 13. POST /token<br/>{ code, code_verifier,<br/>client_id, secret }
    
    Note over AuthServer: 14. Validate PKCE<br/>(SHA-256 verify)
    Note over AuthServer: 15. Generate JWT &<br/>refresh token
    
    AuthServer->>Website: 16. Return tokens<br/>{ access_token, refresh_token }
    
    Note over Website: 17. Store tokens in<br/>localStorage
    
    Website->>Agent: 18. Redirect to dashboard<br/>(authenticated!)
```

### Key Differences from Traditional OAuth

**Traditional OAuth (for humans):**
1. User clicks "Sign in"
2. User redirected to auth server
3. **User enters credentials manually** ❌
4. **User approves consent screen** ❌
5. User redirected back with code

**Auth Agent (for AI):**
1. AI Agent clicks "Sign in" (automated)
2. Browser redirected to auth server
3. **Agent detects auth page programmatically** ✅
4. **Agent POSTs credentials via API** ✅
5. Browser auto-redirects back with code

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

**⚠️ Important:** All `.env*` files are gitignored. You need to create your own `.env` files from the provided `.env.example` templates.

```bash
# Copy environment variable template
cp .env.example .env

# Edit .env with your actual credentials
# See Configuration section below for details
```

### 3. Deploy to Cloudflare Workers

```bash
# Install Wrangler CLI if you haven't
npm install -g wrangler

# Login to Cloudflare
npx wrangler login

# Deploy
npx wrangler deploy
```

### 4. Seed Test Data

```bash
npm run seed
```

This creates:
- A test agent with credentials
- A test client (website)
- Saves credentials to `test-credentials.json`

### 5. Test the Flow

```bash
npm test
```

Runs a complete OAuth flow simulation.

## 📚 Documentation

- **[SDK Documentation](./sdk/README.md)** - Client and agent SDKs
- **[Browser-Use Integration](./examples/browser-use-integration/README.md)** - AI agent authentication examples
- **[Demo Websites](./websites/README.md)** - Three integrated demo websites
- **[Hackathon Pitch Guide](./HACKATHON_PITCH.md)** - Presentation materials

## 🔌 API Endpoints

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
Validate and get information about a token (RFC 7662).

```json
{
  "token": "eyJhbG...",
  "token_type_hint": "access_token",
  "client_id": "client_xxx",
  "client_secret": "..."
}
```

#### `POST /revoke`
Revoke an access or refresh token (RFC 7009).

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

- `GET /.well-known/oauth-authorization-server` - OAuth server metadata (RFC 8414)
- `GET /.well-known/jwks.json` - JSON Web Key Set

## ⚙️ Configuration

### Environment Variables

**Important:** All `.env*` files are gitignored for security. Never commit actual credentials to the repository.

Environment variable templates (`.env.example`) are provided for:
- **`Auth_Agent/workers/`** - Auth Agent server configuration (Cloudflare Workers, Supabase, JWT)
- **`website-integration-example/`** - Website integration example with OAuth client credentials
- **`Auth_Agent/examples/browser-use-integration/`** - AI agent credentials (AGENT_ID, AGENT_SECRET, etc.)

To get started:

1. **Copy the relevant `.env.example` file to `.env` (or `.env.local` for Next.js projects):**
   ```bash
   # For the Cloudflare Workers server
   cd Auth_Agent/workers
   cp .env.example .env

   # For browser-use examples
   cd Auth_Agent/examples/browser-use-integration
   cp .env.example .env

   # For website integration example (use .env.local for Next.js)
   cd website-integration-example
   cp .env.example .env.local
   ```

2. **Fill in your actual credentials** in the `.env` file

3. **Create agents/clients** using the provided scripts (see SDK documentation)

### Server Environment Variables

For the Cloudflare Workers server, configure these variables in your `wrangler.toml` and Cloudflare dashboard:

```env
JWT_SECRET=your-secret-key-change-in-production
JWT_ISSUER=auth-agent.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## 🔒 Security Features

### PKCE (Proof Key for Code Exchange)
OAuth 2.1 **requires** PKCE for all authorization code flows. This prevents authorization code interception attacks.

- Code verifier: Random 128-character string
- Code challenge: SHA-256 hash of verifier
- Method: S256 (SHA-256)

### Credential Hashing
All secrets (agent_secret, client_secret) are hashed with PBKDF2 before storage. Original secrets are never stored in the database.

### JWT Tokens
Access tokens are JWTs signed with HS256, enabling stateless validation. Tokens include:
- `sub` - Agent ID
- `client_id` - OAuth client identifier
- `model` - AI model type
- `scope` - Granted permissions
- `iat` - Issued at timestamp
- `exp` - Expiration timestamp

### Opaque Refresh Tokens
Refresh tokens are random strings stored in the database, allowing easy revocation and token rotation.

### Request Expiration
Authorization requests expire after 10 minutes to prevent replay attacks.

### HTTPS Enforcement
All redirect URIs must use HTTPS (except `localhost` for development).

## 📁 Project Structure

```
Auth_Agent_YC/
├── Auth_Agent/               # Main Auth Agent implementation
│   ├── workers/             # Cloudflare Workers backend
│   │   ├── src/            # Source code
│   │   │   ├── index.ts   # Main Hono router (OAuth endpoints)
│   │   │   ├── routes/    # OAuth route handlers
│   │   │   ├── db/        # Supabase database client
│   │   │   ├── lib/       # Shared utilities (crypto, JWT)
│   │   │   └── templates/ # HTML templates (spinning page, errors)
│   │   └── wrangler.toml  # Cloudflare Workers configuration
│   ├── sdk/                # SDKs for integration
│   │   ├── agent/         # AI Agent SDKs (TypeScript & Python)
│   │   ├── client/        # Client SDK (React components, TypeScript)
│   │   └── server/        # Server SDK (TypeScript)
│   ├── examples/           # Integration examples
│   │   └── browser-use-integration/  # Browser-use agent examples
│   ├── scripts/            # Utility scripts
│   │   ├── create-agent-credentials.js
│   │   └── create-*-client.js/py
│   └── demo/               # Video demonstrations
├── website-integration-example/  # Website integration example
│   └── src/                     # Next.js app with Auth Agent integration
├── logo/                    # Branding assets
└── README.md                # This file
```

## 🌟 Website Integration Example

A fully integrated Next.js website showcasing Auth Agent authentication:

Includes:
- ✅ Auth Agent OAuth 2.1 sign-in button
- ✅ Callback handler for OAuth redirect
- ✅ Token exchange API route
- ✅ Session storage with httpOnly cookies
- ✅ Protected dashboard routes
- ✅ Supabase integration for user data

See [website-integration-example/README.md](./website-integration-example/README.md) for setup instructions.

## 🤝 Contributing

Contributions welcome! This project is designed to standardize AI agent authentication across the web.

## 📄 License

MIT

## 🔗 Links

- **Repository**: https://github.com/auth-agent/auth-agent
- **Live API**: https://api.auth-agent.com
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Supabase Dashboard**: https://supabase.com/dashboard

---

<div align="center">

**Built with ❤️ by Het Patel for the AI agent community**

Standardizing authentication, one agent at a time.

</div>
