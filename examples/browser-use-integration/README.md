# Auth Agent Browser-Use Integration

Integration example for using Auth Agent authentication with browser-use agents.

## Quick Start

### 1. Install Dependencies

```bash
pip install browser-use python-dotenv aiohttp
```

### 2. Set Up Environment Variables

Create a `.env` file:

```bash
BROWSER_USE_API_KEY=your_browser_use_api_key
AGENT_ID=agent_xxx
AGENT_SECRET=secret_xxx
AGENT_MODEL=gpt-4  # optional
```

Or export them:

```bash
export BROWSER_USE_API_KEY=your_key
export AGENT_ID=agent_xxx
export AGENT_SECRET=secret_xxx
```

### 3. Run the Example

```bash
cd Auth_Agent/examples/browser-use-integration
python3 example.py
```

## How It Works

The `AuthAgentTools` class extends browser-use's `Tools` and provides an `authenticate_with_auth_agent` action that:

1. Extracts `request_id` from the authorization page
2. Authenticates using the Auth Agent SDK
3. Waits for authentication completion
4. Returns the authorization code

## Usage in Your Code

```python
import asyncio
import os
from dotenv import load_dotenv
from browser_use import Agent, ChatBrowserUse
from auth_agent_authenticate import AuthAgentTools

load_dotenv()

async def main():
    llm = ChatBrowserUse()
    
    tools = AuthAgentTools(
        agent_id=os.getenv('AGENT_ID'),
        agent_secret=os.getenv('AGENT_SECRET'),
    )
    
    agent = Agent(
        task="Go to https://profilio-z561-het-s-projects-30bce613.vercel.app/ai-auth/login and sign in",
        llm=llm,
        use_custom_tools=[tools],
    )
    
    await agent.run()

asyncio.run(main())
```

## Prompt for Agents

When instructing your agent, use:

```
Go to https://profilio-z561-het-s-projects-30bce613.vercel.app/ai-auth/login 
and click "Sign in with Auth Agent". 
When you see the spinning authentication page, use the authenticate_with_auth_agent tool.
Wait for the redirect to complete.
```

## Files

- `auth_agent_authenticate.py` - The tool class for browser-use integration
- `example.py` - Complete working example
- `README.md` - This file

## See Also

- [Auth Agent SDK Documentation](../../sdk/agent/README.md)
- [Browser-Use Documentation](https://docs.browser-use.com)

