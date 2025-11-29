# Installation & Usage

## ✅ Plugin is Built and Ready!

The `@auth-agent/better-auth-plugin` has been successfully built. Here's how to use it:

## Quick Test (Local)

### 1. Link the Plugin Locally

```bash
# In the plugin directory
cd /Users/hetpatel/Desktop/Auth_Agent_YC/Auth_Agent/better-auth-plugin
npm link

# In your Next.js app
npm link @auth-agent/better-auth-plugin
```

### 2. Or Install from File Path

```bash
npm install ../better-auth-plugin
```

## Usage in Your App

### Server Setup

\`\`\`typescript
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
\`\`\`

### Client Setup

\`\`\`typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { authAgentClient } from "@auth-agent/better-auth-plugin/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  plugins: [authAgentClient()],
});
\`\`\`

### React Component

\`\`\`tsx
import { AuthAgentButton } from "@auth-agent/better-auth-plugin/client/react";

<AuthAgentButton callbackURL="/dashboard" />
\`\`\`

## Example App

Check out the complete example at:
\`\`\`
/Users/hetpatel/Desktop/Auth_Agent_YC/Auth_Agent/better-auth-plugin/examples/nextjs-app/
\`\`\`

## Build Status

✅ Build: Success
✅ TypeScript: Valid
✅ Exports: Working
✅ Types: Generated

## Package Info

- **Name:** @auth-agent/better-auth-plugin
- **Version:** 0.1.0
- **Size:** ~16KB (ESM), ~16KB (CJS)
- **Exports:** Server, Client, React

## Next Steps

1. Test with your Auth Agent OAuth credentials
2. Run the example app
3. Integrate into your Better Auth application

For full documentation, see README.md
