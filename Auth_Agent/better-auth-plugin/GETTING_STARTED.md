# Getting Started with @auth-agent/better-auth-plugin

This guide will help you integrate Auth Agent into your Better Auth application.

## Prerequisites

- Node.js 18+ or later
- A Better Auth application (or create a new one)
- Auth Agent OAuth credentials (client ID and secret)

## Step 1: Get Auth Agent Credentials

1. Visit the Auth Agent dashboard (or contact the Auth Agent team)
2. Create a new OAuth client application
3. Configure redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/auth-agent`
   - Production: `https://yourdomain.com/api/auth/callback/auth-agent`
4. Save your `client_id` and `client_secret`

## Step 2: Install the Plugin

```bash
npm install @auth-agent/better-auth-plugin better-auth
```

## Step 3: Configure Environment Variables

Add to your `.env.local`:

```bash
# Auth Agent OAuth
AUTH_AGENT_CLIENT_ID="your_client_id_here"
AUTH_AGENT_CLIENT_SECRET="your_client_secret_here"

# Optional: Custom Auth Agent server URL
# AUTH_AGENT_SERVER_URL="https://auth-agent-workers.hetkp8044.workers.dev"
```

## Step 4: Add Plugin to Better Auth

Update your Better Auth configuration:

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { authAgent } from "@auth-agent/better-auth-plugin/server";

export const auth = betterAuth({
  database: {
    provider: "postgres", // or your database
    url: process.env.DATABASE_URL!,
  },

  // Add the Auth Agent plugin
  plugins: [
    authAgent({
      clientId: process.env.AUTH_AGENT_CLIENT_ID!,
      clientSecret: process.env.AUTH_AGENT_CLIENT_SECRET!,
      // Optional configuration
      autoCreateUser: true, // Auto-create users for agents
      scopes: "openid profile email",
    }),
  ],
});
```

## Step 5: Set Up Client

Configure the client-side plugin:

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { authAgentClient } from "@auth-agent/better-auth-plugin/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  plugins: [authAgentClient()],
});
```

## Step 6: Add the Sign-In Button

Use the pre-built component:

```tsx
import { AuthAgentButton } from "@auth-agent/better-auth-plugin/client/react";

export default function LoginPage() {
  return (
    <div>
      {/* For human users */}
      <button onClick={() => authClient.signIn.social({ provider: "google" })}>
        Sign in with Google
      </button>

      {/* For AI agents */}
      <AuthAgentButton
        callbackURL="/dashboard"
        onSignInStart={() => console.log("Agent auth started")}
        onError={(err) => console.error("Auth error:", err)}
      />
    </div>
  );
}
```

## Step 7: Protect Routes

Use Better Auth's session management:

```tsx
"use client";

import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export default function Dashboard() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) redirect("/");

  return (
    <div>
      <h1>Welcome, {session.user.name}!</h1>
      <p>Email: {session.user.email}</p>
      <button onClick={() => authClient.signOut()}>Sign Out</button>
    </div>
  );
}
```

## Step 8: Test with an AI Agent

### Using browser-use (Python)

```python
from browser_use import Agent
from langchain_openai import ChatOpenAI

agent = Agent(
    task="Go to http://localhost:3000 and sign in with Auth Agent",
    llm=ChatOpenAI(model="gpt-4"),
)

result = agent.run()
print(f"Agent authentication: {result}")
```

### Using Auth Agent SDK

```python
from auth_agent_agent_sdk import AuthAgentAgentSDK

sdk = AuthAgentAgentSDK(
    agent_id="your_agent_id",
    agent_secret="your_agent_secret",
)

# Agent will auto-authenticate when encountering the auth page
status = sdk.complete_authentication_flow("http://localhost:3000")
```

## Advanced Configuration

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
})
```

### Post-Authentication Hook

Run custom logic after successful authentication:

```typescript
authAgent({
  clientId: process.env.AUTH_AGENT_CLIENT_ID!,
  clientSecret: process.env.AUTH_AGENT_CLIENT_SECRET!,

  onSuccess: async ({ user, session, agentData }) => {
    console.log("Agent authenticated:", agentData.agent_id);

    // Track in analytics
    await analytics.track("agent_auth", {
      userId: user.id,
      agentId: agentData.agent_id,
    });

    // Send notification
    await sendSlackMessage(`Agent ${agentData.agent_id} authenticated`);
  },
})
```

### Custom Button Styling

```tsx
<AuthAgentButton
  text="AI Agent Login"
  style={{
    backgroundColor: "#4A90E2",
    borderRadius: "12px",
    padding: "14px 28px",
    fontSize: "18px",
  }}
  className="my-custom-class"
/>
```

### Headless Usage

Build your own UI:

```tsx
import { useAuthAgent } from "@auth-agent/better-auth-plugin/client/react";

function CustomButton() {
  const { signIn, loading, error } = useAuthAgent();

  return (
    <button
      onClick={() => signIn({ callbackURL: "/dashboard" })}
      disabled={loading}
    >
      {loading ? "Authenticating..." : "Agent Sign In"}
    </button>
  );
}
```

## Troubleshooting

### "Invalid client_id" Error

- Verify your `AUTH_AGENT_CLIENT_ID` is correct
- Check that your OAuth client is active in Auth Agent dashboard

### "Redirect URI mismatch" Error

- Ensure your redirect URI matches exactly:
  - Development: `http://localhost:3000/api/auth/callback/auth-agent`
  - Production: `https://yourdomain.com/api/auth/callback/auth-agent`
- No trailing slashes
- Protocol must match (http vs https)

### "State parameter invalid" Error

- This usually means the state token expired (10 minutes)
- Try the authentication flow again
- Check that your database is working correctly

### Agent Not Authenticating

- Verify agent has valid credentials (agent_id and agent_secret)
- Check that agent is using the Auth Agent SDK
- Ensure agent is clicking the correct button

## Next Steps

- Check out the [full example app](./examples/nextjs-app)
- Read the [API documentation](./README.md#api-reference)
- Join the [Discord community](https://discord.gg/auth-agent)
- Report issues on [GitHub](https://github.com/yourusername/auth-agent/issues)

## Support

Need help? Reach out:

- **Discord:** https://discord.gg/auth-agent
- **Email:** support@auth-agent.com
- **GitHub Issues:** https://github.com/yourusername/auth-agent/issues
