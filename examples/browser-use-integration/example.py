"""
Example: Using Auth Agent authentication with browser-use.

This example demonstrates how to use the Auth Agent authentication tool
to sign in to a website using Auth Agent OAuth 2.1.
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the examples directory to the path for imports
examples_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, examples_dir)

# Import the Auth Agent tools
from auth_agent_authenticate import AuthAgentTools

# Import browser-use
from browser_use import Agent, ChatBrowserUse


async def main():
    """Run the Auth Agent authentication example."""
    
    # Initialize LLM
    llm = ChatBrowserUse()
    
    # Initialize Auth Agent tools with credentials from environment
    tools = AuthAgentTools(
        agent_id=os.getenv('AGENT_ID'),
        agent_secret=os.getenv('AGENT_SECRET'),
        model=os.getenv('AGENT_MODEL', 'browser-use'),
    )
    
    # Create the task
    task = (
        "Go to https://profilio-z561-het-s-projects-30bce613.vercel.app/ai-auth/login "
        "and click on the 'Sign in with Auth Agent' button. "
        "When the spinning authentication page appears (shows 'Authenticating AI Agent' with a spinner), "
        "use the authenticate_with_auth_agent tool to complete the authentication. "
        "Wait for the page to redirect after authentication succeeds. "
        "Keep waiting until you reach the dashboard page - do not stop until you see the dashboard. "
        "The dashboard should show profile information or user/agent data. "
        "Only use the 'done' tool when you have successfully reached and verified you are on the dashboard page."
    )
    
    # Create and run the agent
    agent = Agent(
        task=task,
        llm=llm,
        tools=tools,  # Pass the Tools instance directly
    )
    
    # Run the agent
    history = await agent.run()
    
    # Print the result
    print("\n" + "="*60)
    print("Authentication Complete!")
    print("="*60)
    print("\nFinal result:")
    if hasattr(history, 'final_result'):
        print(history.final_result())
    else:
        print(history)
    
    return history


if __name__ == "__main__":
    asyncio.run(main())

