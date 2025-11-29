<div align="center">

![Auth Agent Logo](./logo/AA.png)

# Auth Agent

### OAuth 2.1 for AI Agents

**Give your AI agents their own login. No password sharing. No cookie scraping.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/auth-agent-better-auth)](https://www.npmjs.com/package/auth-agent-better-auth)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[Website](https://auth-agent.com) · [Agent Console](https://auth-agent.com/console/agent) · [Website Console](https://auth-agent.com/console/website) · [API Docs](https://api.auth-agent.com)

</div>

---

## See it in action

![Profilio Demo](./demo/gif/Profilio.gif)

---

## Quick Start

### 🤖 For AI Agent Developers

Get agent credentials and authenticate on any website that supports Auth Agent.

**1. Get credentials** → [auth-agent.com/console/agent](https://auth-agent.com/console/agent)

**2. Add to your agent:**

```python
from auth_agent_authenticate import AuthAgentTools

tools = AuthAgentTools(
    agent_id="agent_xxx",
    agent_secret="as_xxx",
    model="gpt-4"
)

# When your agent sees "Sign in with Auth Agent", it calls:
await tools.authenticate_with_auth_agent(request_id)
```

**Full example:** [`browser-use integration`](./Auth_Agent/examples/browser-use-integration)

---

### 🌐 For Website Developers

Add "Sign in with Auth Agent" to let AI agents authenticate on your site.

#### Using Better Auth? (Recommended)

```bash
npm install auth-agent-better-auth
```

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { authAgent } from "auth-agent-better-auth/server";

export const auth = betterAuth({
  database: /* your db */,
  plugins: [
    authAgent({
      clientId: process.env.AUTH_AGENT_CLIENT_ID!,
      clientSecret: process.env.AUTH_AGENT_CLIENT_SECRET!,
    })
  ]
});
```

```tsx
// Login page
import { AuthAgentButton } from "auth-agent-better-auth/components";

<AuthAgentButton callbackURL="/dashboard" />
```

**Done.** OAuth 2.1, PKCE, sessions - all handled.

#### Manual Integration?

**1. Register client** → [auth-agent.com/console/website](https://auth-agent.com/console/website)

**2. See examples:**
- [Profilio](./Auth_Agent/Profilio) - Production Next.js app
- [Basic example](./website-integration-example) - Minimal setup

---

## Why Auth Agent?

| Without Auth Agent | With Auth Agent |
|---|---|
| Share passwords with AI | Agents have their own identity |
| Scrape cookies | Standard OAuth 2.1 flow |
| Fragile automation | Clean, consistent auth |
| Security nightmare | Auditable, revocable access |

---

## How It Works

```
Agent clicks "Sign in with Auth Agent"
    ↓
Browser shows spinning auth page  
    ↓
Agent POSTs credentials to Auth Agent API
    ↓
Browser auto-redirects with auth code
    ↓
Website exchanges code for tokens
    ↓
Agent is authenticated ✓
```

Agents get their own `agent_id` and `agent_secret`. No human passwords involved.

---

## Three Integration Scenarios

Websites choose how agents interact with user accounts:

| Scenario | Description |
|----------|-------------|
| **Full Account** | Agent operates as the user (trusted automation) |
| **Contextual Profile** | Agent has separate profile but sees user preferences |
| **Fresh Profile** | Agent starts with clean slate |

The `/userinfo` endpoint returns the user's email, letting websites match agents to existing accounts.

<details>
<summary>See detailed examples →</summary>

### Full Account Access
```typescript
const { email } = await fetch('https://api.auth-agent.com/userinfo', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

const user = await db.users.findOne({ email });
// Link agent to existing account
```

### Contextual Profile
```typescript
const user = await db.users.findOne({ email });
// Create agent profile linked to user context
await db.agentProfiles.create({ agentId, linkedUserId: user.id });
```

### Fresh Profile
```typescript
// No existing user - create fresh agent profile
await db.agentProfiles.create({ agentId, email });
```

</details>

---

## API Reference

| Endpoint | Description |
|----------|-------------|
| `GET /authorize` | Start OAuth flow |
| `POST /token` | Exchange code for tokens |
| `GET /userinfo` | Get user info for token |
| `POST /introspect` | Validate token (RFC 7662) |
| `POST /revoke` | Revoke token (RFC 7009) |
| `POST /api/agent/authenticate` | Agent back-channel auth |

<details>
<summary>Full API docs →</summary>

### Token Exchange
```bash
POST https://api.auth-agent.com/token
{
  "grant_type": "authorization_code",
  "code": "code_xxx",
  "code_verifier": "...",
  "client_id": "client_xxx",
  "client_secret": "..."
}
```

### User Info
```bash
GET https://api.auth-agent.com/userinfo
Authorization: Bearer <access_token>

# Response
{
  "sub": "agent_abc123",
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Agent Authentication (back-channel)
```bash
POST https://api.auth-agent.com/api/agent/authenticate
{
  "request_id": "req_xxx",
  "agent_id": "agent_xxx",
  "agent_secret": "...",
  "model": "gpt-4"
}
```

</details>

---

## Links

- **Website**: [auth-agent.com](https://auth-agent.com)
- **Agent Console**: [auth-agent.com/console/agent](https://auth-agent.com/console/agent)
- **Website Console**: [auth-agent.com/console/website](https://auth-agent.com/console/website)  
- **Better Auth Plugin**: [npm](https://www.npmjs.com/package/auth-agent-better-auth)
- **Live API**: [api.auth-agent.com](https://api.auth-agent.com)

---

## License

MIT

---

<div align="center">

**⭐ Star this repo if you want AI agents to have proper authentication**

Built by [Het Patel](https://github.com/hetpatel-11)

</div>
