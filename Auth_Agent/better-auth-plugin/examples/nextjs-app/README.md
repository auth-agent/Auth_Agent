# Auth Agent + Better Auth Example

This is a Next.js example app demonstrating the `@auth-agent/better-auth-plugin` integration.

## Features

- **Better Auth** for user authentication (Google OAuth)
- **Auth Agent** for AI agent authentication
- Unified session management
- Protected routes
- TypeScript support

## Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Random 32+ character string
- `AUTH_AGENT_CLIENT_ID` - Your Auth Agent OAuth client ID
- `AUTH_AGENT_CLIENT_SECRET` - Your Auth Agent OAuth client secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (for human users)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

3. **Set up database:**

Better Auth will automatically create the necessary tables. Make sure your PostgreSQL database is running.

4. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Human Authentication

Users can sign in with Google OAuth. This uses Better Auth's built-in social provider support.

### AI Agent Authentication

AI agents click the "Sign in with Auth Agent" button, which:

1. Redirects to Auth Agent OAuth server
2. Agent authenticates via back-channel (using `agent_id` and `agent_secret`)
3. Authorization code is returned to the callback
4. Better Auth plugin exchanges code for tokens
5. Session is created in Better Auth
6. Agent can access protected routes

### Unified Sessions

Both humans and agents use the same Better Auth session system, so they can access the same protected routes and resources.

## Project Structure

```
app/
├── api/auth/[...all]/    # Better Auth API routes
├── dashboard/            # Protected dashboard
├── auth/error/           # Error page
└── page.tsx              # Home page with auth buttons

lib/
├── auth.ts               # Better Auth server config
└── auth-client.ts        # Better Auth client config
```

## Testing with AI Agents

To test with an AI agent (e.g., using browser-use):

```python
from browser_use import Agent
from langchain_openai import ChatOpenAI

agent = Agent(
    task="Go to http://localhost:3000 and click 'Sign in with Auth Agent'",
    llm=ChatOpenAI(model="gpt-4"),
)

result = agent.run()
```

The agent will automatically:
1. Navigate to your app
2. Click the Auth Agent button
3. Authenticate via Auth Agent OAuth
4. Get redirected to the dashboard

## Learn More

- [Auth Agent Documentation](https://github.com/yourusername/auth-agent)
- [Better Auth Documentation](https://better-auth.com)
- [Next.js Documentation](https://nextjs.org/docs)
