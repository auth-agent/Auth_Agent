# Website Integration Example

A basic Next.js example demonstrating Auth Agent OAuth 2.1 integration.

## Overview

This is a **manual integration example** showing how Auth Agent OAuth works under the hood. 

### 🚀 Using Better Auth? There's an easier way!

If your website uses [Better Auth](https://better-auth.com), use our plugin instead:

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
      scenario: "fullAccount", // or "contextualProfile" or "freshProfile"
    })
  ]
});
```

```tsx
// Add the button
import { AuthAgentButton } from "auth-agent-better-auth/components";

<AuthAgentButton callbackURL="/dashboard">
  Sign in with Auth Agent
</AuthAgentButton>
```

**That's it!** No manual OAuth handling needed.

**npm:** [auth-agent-better-auth](https://www.npmjs.com/package/auth-agent-better-auth)

---

## Manual Integration (This Example)

This example shows manual OAuth 2.1 implementation for custom auth systems.

### What's Included

- ✅ Auth Agent OAuth 2.1 sign-in button
- ✅ Callback handler for OAuth redirect
- ✅ Token exchange API route
- ✅ Session storage with httpOnly cookies
- ✅ Protected dashboard routes

### Production Example: Profilio

For a complete production implementation with:

- ✅ User email matching via `/userinfo` endpoint
- ✅ Agent profiles linked to user accounts
- ✅ Dashboard showing user context when agent is linked
- ✅ Contextual Profile scenario implementation

**See:** [`../Auth_Agent/Profilio`](../Auth_Agent/Profilio)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_AUTH_AGENT_SERVER_URL=https://api.auth-agent.com
NEXT_PUBLIC_AUTH_AGENT_CLIENT_ID=client_xxx
AUTH_AGENT_SERVER_URL=https://api.auth-agent.com
AUTH_AGENT_CLIENT_ID=client_xxx
AUTH_AGENT_CLIENT_SECRET=cs_xxx
```

### 3. Register OAuth Client

1. Go to [auth-agent.com/console/website](https://auth-agent.com/console/website)
2. Register a new client
3. Add redirect URI: `http://localhost:3000/ai-auth/callback`
4. Copy credentials to `.env.local`

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/ai-auth/login` to test.

## Project Structure

```
website-integration-example/
├── src/
│   ├── app/
│   │   ├── ai-auth/
│   │   │   ├── login/        # Sign-in page
│   │   │   ├── callback/     # OAuth callback handler
│   │   │   └── dashboard/   # Protected dashboard
│   │   └── api/
│   │       └── auth-agent/
│   │           ├── exchange/ # Token exchange endpoint
│   │           └── profile/   # Agent profile management
│   └── components/
│       ├── auth/             # Auth components
│       └── dashboard/         # Dashboard components
└── README.md
```

## Learn More

- **[Profilio Example](../Auth_Agent/Profilio)** - Production example with user matching
- **[Documentation](https://docs.auth-agent.com)** - Complete documentation
- **[Website Quickstart](https://docs.auth-agent.com/guides/website-quickstart)** - Integration guide

## License

MIT

