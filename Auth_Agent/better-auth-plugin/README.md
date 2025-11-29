# @auth-agent/better-auth-plugin

Better Auth plugin for Auth Agent - OAuth 2.1 authentication for AI agents.

[![npm version](https://img.shields.io/npm/v/@auth-agent/better-auth-plugin.svg)](https://www.npmjs.com/package/@auth-agent/better-auth-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is this?

This plugin enables websites using [Better Auth](https://better-auth.com) to add **AI agent authentication** via [Auth Agent](https://github.com/yourusername/auth-agent) in just a few lines of code.

Instead of building two separate authentication systems (one for humans, one for agents), you get:

- ✅ **Unified authentication** - Humans and AI agents use the same Better Auth session system
- ✅ **One-line setup** - Add Auth Agent as a Better Auth plugin
- ✅ **Production ready** - Full OAuth 2.1 with PKCE, rate limiting, error handling
- ✅ **Type-safe** - Complete TypeScript support with type inference
- ✅ **React components** - Pre-built `<AuthAgentButton />` component

## Quick Start

### Installation

```bash
npm install @auth-agent/better-auth-plugin better-auth
```

### Server Setup

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { authAgent } from "@auth-agent/better-auth-plugin/server";

export const auth = betterAuth({
  database: {
    provider: "postgres",
    url: process.env.DATABASE_URL!,
  },

  plugins: [
    authAgent({
      clientId: process.env.AUTH_AGENT_CLIENT_ID!,
      clientSecret: process.env.AUTH_AGENT_CLIENT_SECRET!,
    }),
  ],
});

// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
export const { GET, POST } = auth.handler;
```

### Client Setup

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { authAgentClient } from "@auth-agent/better-auth-plugin/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  plugins: [authAgentClient()],
});
```

### React Component

```tsx
import { AuthAgentButton } from "@auth-agent/better-auth-plugin/client/react";

export default function Page() {
  return (
    <div>
      <h1>Sign In</h1>

      {/* For humans */}
      <button onClick={() => signIn.social({ provider: "google" })}>
        Sign in with Google
      </button>

      {/* For AI agents */}
      <AuthAgentButton callbackURL="/dashboard" />
    </div>
  );
}
```

That's it! Your app now supports both human and AI agent authentication.

## How It Works

### Authentication Flows

**Human Users (Better Auth Native):**
```
User → Google/Email/etc → Better Auth → Session Created
```

**AI Agents (Auth Agent Plugin):**
```
Agent → "Sign in with Auth Agent" Button
      → OAuth 2.1 Authorization (Auth Agent Server)
      → Agent Authenticates (back-channel with agent_id + agent_secret)
      → Authorization Code Returned
      → Better Auth Plugin Exchanges Code for Tokens
      → Session Created in Better Auth
      → Agent Accesses Website
```

### Why This Integration?

**Before:**
- Website builds custom auth system
- Separately integrates Auth Agent OAuth
- Manages two different session systems
- Complex configuration

**After:**
- Install Better Auth (handles human auth)
- Add Auth Agent plugin (handles agent auth)
- One unified session system
- Production-ready in minutes

## API Reference

### Server Plugin Options

```typescript
interface AuthAgentPluginOptions {
  /**
   * Auth Agent authorization server URL
   * @default "https://auth-agent-workers.hetkp8044.workers.dev"
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
   * OAuth scopes
   * @default "openid profile email"
   */
  scopes?: string;

  /**
   * Auto-create users if agent authenticates for unknown user
   * @default true
   */
  autoCreateUser?: boolean;

  /**
   * Custom user mapping from agent auth response
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
  }) => Promise<void> | void;
}
```

### React Component Props

```typescript
interface AuthAgentButtonProps {
  /**
   * Button text
   * @default "Sign in with Auth Agent"
   */
  text?: string;

  /**
   * CSS class name
   */
  className?: string;

  /**
   * Inline styles
   */
  style?: React.CSSProperties;

  /**
   * Callback URL after authentication
   */
  callbackURL?: string;

  /**
   * Callback before sign-in starts
   */
  onSignInStart?: () => void;

  /**
   * Error callback
   */
  onError?: (error: Error) => void;

  /**
   * Show loading state
   * @default true
   */
  showLoading?: boolean;

  /**
   * Disabled state
   */
  disabled?: boolean;
}
```

### Headless Hook

If you want to build your own UI:

```tsx
import { useAuthAgent } from "@auth-agent/better-auth-plugin/client/react";

function CustomButton() {
  const { signIn, loading, error } = useAuthAgent();

  return (
    <button
      onClick={() => signIn({ callbackURL: "/dashboard" })}
      disabled={loading}
    >
      {loading ? "Loading..." : "Sign in"}
    </button>
  );
}
```

## Advanced Usage

### Custom User Mapping

Map agent data to your user schema:

```typescript
authAgent({
  clientId: process.env.AUTH_AGENT_CLIENT_ID!,
  clientSecret: process.env.AUTH_AGENT_CLIENT_SECRET!,

  mapAgentToUser: (agentData) => ({
    email: agentData.email,
    name: agentData.name || `Agent ${agentData.agent_id}`,
    emailVerified: true,
    image: `https://api.dicebear.com/7.x/bottts/svg?seed=${agentData.agent_id}`,
  }),
});
```

### Success Callback

Run custom logic after authentication:

```typescript
authAgent({
  clientId: process.env.AUTH_AGENT_CLIENT_ID!,
  clientSecret: process.env.AUTH_AGENT_CLIENT_SECRET!,

  onSuccess: async ({ user, session, agentData }) => {
    // Log authentication
    await logEvent("agent_auth", {
      userId: user.id,
      agentId: agentData.agent_id,
    });

    // Send notification
    await sendSlackNotification(
      `Agent ${agentData.agent_id} authenticated as ${user.email}`
    );
  },
});
```

### Custom Styling

Customize the button appearance:

```tsx
<AuthAgentButton
  text="AI Agent Sign In"
  className="custom-button"
  style={{
    backgroundColor: "#4A5568",
    borderRadius: "16px",
    padding: "16px 32px",
  }}
/>
```

## Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_URL="https://yourapp.com"

# Auth Agent OAuth
AUTH_AGENT_CLIENT_ID="your_client_id"
AUTH_AGENT_CLIENT_SECRET="your_client_secret"

# Public
NEXT_PUBLIC_APP_URL="https://yourapp.com"
```

## Getting Auth Agent Credentials

1. Sign up at [Auth Agent Dashboard](https://auth-agent.com/dashboard)
2. Create a new OAuth client
3. Add your redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/auth-agent`
   - Production: `https://yourapp.com/api/auth/callback/auth-agent`
4. Copy your `client_id` and `client_secret`

## Testing with AI Agents

### Using browser-use

```python
from browser_use import Agent
from langchain_openai import ChatOpenAI

agent = Agent(
    task="Go to https://yourapp.com and sign in with Auth Agent",
    llm=ChatOpenAI(model="gpt-4"),
)

result = agent.run()
```

### Using Playwright

```python
from auth_agent_agent_sdk import AuthAgentAgentSDK

sdk = AuthAgentAgentSDK(
    agent_id="your_agent_id",
    agent_secret="your_agent_secret",
)

# Agent will automatically authenticate when it encounters the auth page
status = sdk.complete_authentication_flow("https://yourapp.com")
```

## Examples

See the [examples/nextjs-app](./examples/nextjs-app) directory for a complete working example.

## Security

This plugin implements:

- ✅ **PKCE (RFC 7636)** - Proof Key for Code Exchange
- ✅ **State Validation** - CSRF protection
- ✅ **Rate Limiting** - Prevent abuse
- ✅ **Secure Token Storage** - Server-side only
- ✅ **Token Expiration** - Automatic cleanup
- ✅ **HTTPS Enforcement** - Secure redirects

## Compatibility

- **Better Auth:** ^1.4.0
- **React:** ^18.0.0 || ^19.0.0
- **Node.js:** ^18.0.0 || ^20.0.0 || ^22.0.0

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT © [Auth Agent](https://github.com/yourusername/auth-agent)

## Links

- [Auth Agent Documentation](https://auth-agent.com/docs)
- [Better Auth Documentation](https://better-auth.com)
- [GitHub Repository](https://github.com/yourusername/auth-agent/tree/main/better-auth-plugin)
- [Report Issues](https://github.com/yourusername/auth-agent/issues)

## Support

- [Discord Community](https://discord.gg/auth-agent)
- [Twitter](https://twitter.com/auth_agent)
- [Email](mailto:support@auth-agent.com)
