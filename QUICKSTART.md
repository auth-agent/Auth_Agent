# Quick Start Guide

Get your OAuth 2.1 Auth Server for AI Agents up and running in under 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════════╗
║                                            ║
║   🤖 Auth Agent - OAuth 2.1 Server         ║
║                                            ║
║   Server running on:                       ║
║   http://localhost:3000                    ║
║                                            ║
╚════════════════════════════════════════════╝
```

### 3. Seed Test Data

In a **new terminal**, run:

```bash
npm run seed
```

This creates:
- A test AI agent with credentials
- A test OAuth client (representing a website)
- Saves credentials to `test-credentials.json`

**⚠️ Important:** Save the agent_secret and client_secret! They're only shown once.

### 4. Test the OAuth Flow

```bash
npm test
```

This runs a complete end-to-end OAuth 2.1 flow test, simulating:
1. Authorization request with PKCE
2. AI agent authentication
3. Token exchange
4. Token introspection
5. Token refresh
6. Token revocation

If all tests pass, you'll see:
```
🎉 OAuth 2.1 Flow Test Complete!

All steps passed successfully:
  ✅ Authorization with PKCE
  ✅ AI Agent authentication
  ✅ Code exchange for tokens
  ✅ Token introspection
  ✅ Token refresh
  ✅ Token revocation
```

## Next Steps

### Integrate with Your Website

1. **Register your website as an OAuth client:**

```bash
curl -X POST http://localhost:3000/api/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "My Website",
    "redirect_uris": ["https://mywebsite.com/callback"]
  }'
```

Save the returned `client_id` and `client_secret`.

2. **Create an AI agent:**

```bash
curl -X POST http://localhost:3000/api/admin/agents \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "user@example.com",
    "user_name": "John Doe"
  }'
```

Save the returned `agent_id` and `agent_secret`.

3. **Implement the OAuth flow in your website:**

See the [Integration Guide](./docs/INTEGRATION.md) for detailed examples.

### Test Individual Endpoints

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

**OAuth Discovery:**
```bash
curl http://localhost:3000/.well-known/oauth-authorization-server
```

**List Agents:**
```bash
curl http://localhost:3000/api/admin/agents
```

**List Clients:**
```bash
curl http://localhost:3000/api/admin/clients
```

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Set a different port: `PORT=3001 npm run dev`

### Tests fail
- Make sure server is running: `npm run dev`
- Re-seed the database: `npm run seed`
- Check `test-credentials.json` exists

### "Agent not found" error
- The in-memory database resets when server restarts
- Run `npm run seed` again after restarting

## Project Structure

```
Auth_Agent_YC/
├── src/
│   ├── db/              # Database (in-memory for now)
│   ├── lib/             # Utilities (crypto, JWT, validation)
│   ├── templates/       # HTML pages
│   ├── oauth/           # OAuth endpoints
│   ├── admin/           # Admin endpoints
│   └── index.ts         # Main server
├── scripts/
│   ├── seed.ts          # Seed test data
│   └── test-flow.ts     # End-to-end test
├── README.md            # Full documentation
└── QUICKSTART.md        # This file
```

## Key Concepts

### How AI Agent Auth Works

Unlike traditional OAuth where a **human** logs in, here an **AI agent** authenticates:

1. Website redirects browser to auth server
2. Auth server shows spinning page
3. AI agent (controlling the browser) detects the page
4. AI agent POSTs its credentials to authenticate
5. Page auto-redirects back to website with auth code
6. Website exchanges code for access token
7. AI agent is now authenticated!

### Security Features

- ✅ **PKCE Required** - Prevents code interception
- ✅ **Bcrypt Hashing** - Secrets are hashed before storage
- ✅ **JWT Access Tokens** - Stateless validation
- ✅ **Opaque Refresh Tokens** - Easy revocation
- ✅ **Request Expiration** - Auth requests expire after 10 minutes

## Configuration

Create a `.env` file (optional):

```env
PORT=3000
BASE_URL=http://localhost:3000
JWT_SECRET=your-secret-key-change-in-production
JWT_ISSUER=auth-agent.com
```

## Need Help?

- Read the full [README.md](./README.md)
- Check the [API Documentation](./docs/API.md)
- See example implementations in [scripts/test-flow.ts](./scripts/test-flow.ts)

## What's Next?

This is currently using **in-memory storage** which resets on server restart.

For production, you'll want to:
1. Add a real database (Convex, PostgreSQL, etc.)
2. Add authentication for admin endpoints
3. Add rate limiting
4. Deploy to production
5. Use HTTPS everywhere
6. Add optional 2FA with AgentMail

See the [Production Deployment Guide](./docs/PRODUCTION.md) for details.

---

**Happy building! 🚀**
