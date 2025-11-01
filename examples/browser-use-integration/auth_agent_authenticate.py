"""
Auth Agent authentication tool for browser-use.

This tool enables AI agents to authenticate with Auth Agent OAuth 2.1 server
when they encounter the authorization spinning page.

Usage:
    from browser_use import Agent, ChatBrowserUse
    from auth_agent_authenticate import AuthAgentTools
    
    tools = AuthAgentTools(
        agent_id='agent_xxx',
        agent_secret='secret_xxx',
        model='gpt-4'
    )
    
    agent = Agent(
        task="Go to https://profilio-z561-het-s-projects-30bce613.vercel.app/ai-auth/login and sign in",
        llm=llm,
        use_custom_tools=[tools],
    )
"""

import os
import sys
import logging
from typing import Optional

# Add the Auth Agent SDK to the path
# SDK is in Auth_Agent/sdk/agent/ relative to examples/browser-use-integration/
sdk_path = os.path.join(os.path.dirname(__file__), '..', '..', 'sdk', 'agent')
if os.path.exists(sdk_path):
    sys.path.insert(0, sdk_path)

try:
    from auth_agent_agent_sdk import AuthAgentAgentSDK
except ImportError:
    raise ImportError(
        f'Could not find Auth Agent SDK at {sdk_path}. '
        'Make sure the SDK file exists at Auth_Agent/sdk/agent/auth_agent_agent_sdk.py'
    )

# Import Tools/Controller - try multiple methods for compatibility
try:
    # Try Tools from tools.service (newer versions, local dev)
    from browser_use.tools.service import Tools
except ImportError:
    try:
        # Try Controller (older versions like 0.6.1) - Controller has same API
        from browser_use.controller.service import Controller as Tools
    except ImportError:
        try:
            # Try lazy import from browser_use (some versions)
            import browser_use
            Tools = getattr(browser_use, 'Tools')
        except (ImportError, AttributeError):
            # Last resort: try direct import
            from browser_use import Tools

from browser_use.agent.views import ActionResult
from browser_use.browser import BrowserSession

logger = logging.getLogger(__name__)


class AuthAgentTools(Tools):
    """Tools for authenticating with Auth Agent OAuth 2.1 server."""

    def __init__(
        self,
        agent_id: Optional[str] = None,
        agent_secret: Optional[str] = None,
        model: Optional[str] = None,
    ):
        """
        Initialize Auth Agent Tools.

        Args:
            agent_id: Agent ID (defaults to AGENT_ID env var)
            agent_secret: Agent secret (defaults to AGENT_SECRET env var)
            model: Model identifier (defaults to AGENT_MODEL env var or 'browser-use')
        """
        super().__init__()
        
        self.agent_id = agent_id or os.getenv('AGENT_ID')
        self.agent_secret = agent_secret or os.getenv('AGENT_SECRET')
        self.model = model or os.getenv('AGENT_MODEL', 'browser-use')
        
        if not self.agent_id or not self.agent_secret:
            raise ValueError(
                'Agent ID and secret must be provided either as arguments or via '
                'AGENT_ID and AGENT_SECRET environment variables'
            )
        
        # Initialize SDK
        self.sdk = AuthAgentAgentSDK(
            agent_id=self.agent_id,
            agent_secret=self.agent_secret,
            model=self.model,
        )
        
        self.register_auth_agent_tools()

    def register_auth_agent_tools(self):
        """Register all Auth Agent authentication tools."""

        @self.action(
            'Authenticate with Auth Agent when you see the spinning authentication page. '
            'Extract the request_id from the current page and authenticate. '
            'Use this after clicking "Sign in with Auth Agent" button and the spinning page appears.'
        )
        async def authenticate_with_auth_agent(browser_session: BrowserSession) -> ActionResult:
            """
            Authenticate with Auth Agent OAuth server.
            
            This tool:
            1. Gets the current page URL
            2. Extracts request_id from the authorization page
            3. Authenticates using the agent credentials
            4. Returns the authentication result
            
            Args:
                browser_session: The browser session (automatically injected)
            
            Returns:
                ActionResult with authentication status and authorization code
            """
            try:
                # Get current page URL
                current_url = await browser_session.get_current_page_url()
                logger.info(f'🔐 Authenticating with Auth Agent at: {current_url}')
                
                # Extract request_id from window.authRequest on the page (not from URL)
                try:
                    # Read window.authRequest directly from the page using JavaScript via CDP
                    js_code = """
                    (function() {
                        if (window.authRequest && window.authRequest.request_id) {
                            return window.authRequest.request_id;
                        }
                        return null;
                    })()
                    """
                    
                    # Get CDP session and evaluate JavaScript
                    cdp_session = await browser_session.get_or_create_cdp_session()
                    result = await cdp_session.cdp_client.send.Runtime.evaluate(
                        params={'expression': js_code, 'returnByValue': True, 'awaitPromise': True},
                        session_id=cdp_session.session_id,
                    )
                    
                    # Check for errors
                    if result.get('exceptionDetails'):
                        raise RuntimeError(f'JavaScript execution failed: {result["exceptionDetails"]}')
                    
                    # Get the value from result
                    value = result.get('result', {}).get('value')
                    request_id = value if value else None
                    
                    if not request_id:
                        raise ValueError('window.authRequest.request_id not found on page')
                    
                    logger.info(f'✅ Extracted request_id from window.authRequest: {request_id}')
                except Exception as e:
                    error_msg = f'Failed to extract request_id from window.authRequest: {str(e)}. Make sure you are on the Auth Agent authorization spinning page.'
                    logger.error(f'❌ {error_msg}')
                    return ActionResult(
                        extracted_content=error_msg,
                        error=error_msg,
                        success=False
                    )
                
                # Authenticate
                logger.info('🔑 Sending authentication request...')
                logger.info(f'   Request ID: {request_id}')
                logger.info(f'   Agent ID: {self.agent_id}')
                logger.info(f'   URL: {current_url}')
                
                auth_result = await self.sdk.authenticate_async(request_id, current_url)
                logger.info(f'   POST Response Status: {auth_result}')
                logger.info(f'   POST Success: {auth_result.get("success")}')
                logger.info(f'   POST Error: {auth_result.get("error")}')
                logger.info(f'   POST Error Description: {auth_result.get("error_description")}')
                logger.info(f'   POST Message: {auth_result.get("message")}')
                
                if not auth_result.get('success'):
                    error_msg = auth_result.get('error_description') or auth_result.get('error', 'Authentication failed')
                    logger.error(f'❌ Authentication failed: {error_msg}')
                    return ActionResult(
                        extracted_content=f'Authentication failed: {error_msg}',
                        error=error_msg,
                        success=False
                    )
                
                logger.info('✅ Agent authenticated successfully')
                
                # Wait for authentication to complete and get the authorization code
                logger.info('⏳ Waiting for authentication to complete...')
                try:
                    def on_status_update(status):
                        logger.info(f'   Status: {status.get("status")}')
                    
                    final_status = await self.sdk.wait_for_authentication_async(
                        request_id,
                        current_url,
                        poll_interval=0.5,
                        timeout=30.0,
                        on_status_update=on_status_update
                    )
                    
                    auth_code = final_status.get('code', '')
                    logger.info(f'🎉 Authentication complete! Authorization code: {auth_code[:30]}...')
                    
                    return ActionResult(
                        extracted_content=(
                            f'✅ Successfully authenticated with Auth Agent!\n'
                            f'Authorization code: {auth_code[:30]}...\n'
                            f'Status: {final_status.get("status")}\n'
                            f'The page will redirect automatically to complete the OAuth flow.'
                        ),
                        long_term_memory=f'Authenticated with Auth Agent using request_id {request_id}'
                    )
                except TimeoutError:
                    logger.warning('⏱️ Authentication timeout - page may redirect on its own')
                    return ActionResult(
                        extracted_content=(
                            '⚠️ Authentication request sent, but timed out waiting for completion. '
                            'The page should redirect automatically. If not, check the page manually.'
                        )
                    )
                except Exception as e:
                    error_msg = f'Error waiting for authentication: {str(e)}'
                    logger.error(f'❌ {error_msg}')
                    return ActionResult(
                        extracted_content=error_msg,
                        error=error_msg,
                        success=False
                    )
                    
            except Exception as e:
                error_msg = f'Unexpected error during authentication: {str(e)}'
                logger.error(f'❌ {error_msg}')
                return ActionResult(
                    extracted_content=error_msg,
                    error=error_msg,
                    success=False
                )

