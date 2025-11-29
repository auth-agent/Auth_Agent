# Quick Start Guide

## ✅ Plugin Successfully Built!

The Better Auth plugin for Auth Agent is ready to use.

## 🚀 Test with Example App

### 1. Set Up Environment Variables

```bash
cd examples/nextjs-app
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:

```bash
# Database (PostgreSQL required)
DATABASE_URL="postgresql://user:password@localhost:5432/auth_test"

# Better Auth
BETTER_AUTH_SECRET="your-random-secret-at-least-32-chars-long-here"
BETTER_AUTH_URL="http://localhost:3000"

# Auth Agent OAuth (Get these from Auth Agent dashboard)
AUTH_AGENT_CLIENT_ID="your_client_id"
AUTH_AGENT_CLIENT_SECRET="your_client_secret"
AUTH_AGENT_SERVER_URL="https://auth-agent-workers.hetkp8044.workers.dev"

# Optional: Google OAuth for human users
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Public
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Set Up Database

Make sure you have PostgreSQL running, then Better Auth will auto-create tables:

```bash
# Install PostgreSQL (if needed)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb auth_test
```

### 3. Run the Example App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

You should see:
- **Human Users** section with "Sign in with Google" button
- **AI Agents** section with "Sign in with Auth Agent" button

### 4. Test AI Agent Authentication

#### Option A: Manual Test (Browser)

1. Click "Sign in with Auth Agent"
2. You'll be redirected to Auth Agent server
3. The page will show a "spinning" authentication page
4. Normally an AI agent would:
   - Extract the `request_id` from `window.authRequest`
   - POST credentials to `/api/agent/authenticate`
   - Poll `/api/check-status` until authenticated
   - Get redirected back to your app

#### Option B: Automated Test (with browser-use)

```python
from browser_use import Agent
from langchain_openai import ChatOpenAI

agent = Agent(
    task="Go to http://localhost:3000 and click 'Sign in with Auth Agent', then authenticate",
    llm=ChatOpenAI(model="gpt-4"),
)

result = agent.run()
```

## 📝 Notes

### Database Setup

Better Auth requires a database. The example uses PostgreSQL, but you can use:
- PostgreSQL (recommended)
- MySQL
- SQLite (via Drizzle adapter)

Better Auth will automatically create these tables:
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth accounts (social providers)
- `verification` - Email verification & PKCE state storage

### Auth Agent Credentials

To get Auth Agent OAuth credentials:

1. Contact Auth Agent team or access dashboard
2. Register your application
3. Add redirect URI: `http://localhost:3000/api/auth/callback/auth-agent`
4. Save your `client_id` and `client_secret`

### Google OAuth (Optional)

For testing human authentication, set up Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Secret to `.env.local`

## 🔧 Troubleshooting

### "Database connection failed"

- Check PostgreSQL is running: `brew services list`
- Verify DATABASE_URL is correct
- Try creating database: `createdb auth_test`

### "Module not found: @auth-agent/better-auth-plugin"

The example uses relative imports from `../../../src/`, so it works directly.
No need to install the plugin for the example app.

### "Invalid client_id"

- Verify AUTH_AGENT_CLIENT_ID in .env.local
- Check credentials are from Auth Agent dashboard
- Ensure OAuth client is active

### "Redirect URI mismatch"

- Verify redirect URI in Auth Agent dashboard matches:
  `http://localhost:3000/api/auth/callback/auth-agent`
- No trailing slash
- Must match exactly

## 📚 Next Steps

1. ✅ Test human authentication (Google OAuth)
2. ✅ Test AI agent authentication
3. ✅ Check session creation in database
4. ✅ Verify protected routes work
5. ✅ Test sign out functionality

## 🎯 Integration in Your Own App

To use in your own Better Auth application:

### Option 1: Install from File (Development)

```bash
npm install ../better-auth-plugin
```

### Option 2: Link Locally (Development)

```bash
# In plugin directory
npm link

# In your app
npm link @auth-agent/better-auth-plugin
```

### Option 3: Publish to NPM (Production)

```bash
cd better-auth-plugin
npm publish --access public
```

Then install normally:
```bash
npm install @auth-agent/better-auth-plugin
```

## 💡 Tips

- **Database**: Start with PostgreSQL on localhost for simplest setup
- **Credentials**: Get Auth Agent OAuth credentials before testing
- **Google OAuth**: Optional - only needed for human auth testing
- **Logs**: Check terminal for authentication flow logs
- **Errors**: Check `/auth/error` page for OAuth error messages

## 🆘 Need Help?

- Check [README.md](./README.md) for full documentation
- Review [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed setup
- Open an issue on GitHub
- Contact Auth Agent team

---

**Status:** ✅ Ready to test!
**Location:** `/Auth_Agent/better-auth-plugin/examples/nextjs-app/`
