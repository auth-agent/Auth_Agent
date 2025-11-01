"""
Auth Agent SDK for AI Agents (Python)

This SDK helps AI agents authenticate with Auth Agent OAuth 2.1 server.

Usage:
    from auth_agent_agent_sdk import AuthAgentAgentSDK

    sdk = AuthAgentAgentSDK(
        agent_id='agent_xxx',
        agent_secret='secret_xxx',
        model='gpt-4'
    )

    # Complete flow - extracts server URL from authorization URL automatically
    status = await sdk.complete_authentication_flow_async(authorization_url)
    print(f'Authorization code: {status["code"]}')
"""

import re
import json
import time
from typing import Optional, Dict, Any, Callable
from urllib.parse import urlencode, urlparse
try:
    import aiohttp
    ASYNC_AVAILABLE = True
except ImportError:
    ASYNC_AVAILABLE = False
    import requests


class AuthAgentAgentSDK:
    """SDK for AI agents to authenticate with Auth Agent OAuth 2.1 server."""

    def __init__(
        self,
        agent_id: str,
        agent_secret: str,
        model: str
    ):
        """
        Initialize Auth Agent SDK.

        Args:
            agent_id: Agent ID registered with Auth Agent
            agent_secret: Agent secret (keep secure!)
            model: Model identifier (e.g., 'gpt-4', 'claude-3.5-sonnet')
        """
        self.auth_server_url: Optional[str] = None
        self.agent_id = agent_id
        self.agent_secret = agent_secret
        self.model = model

    def _extract_auth_server_url(self, authorization_url: str) -> str:
        """
        Extract base URL from authorization URL.

        Args:
            authorization_url: Full authorization URL

        Returns:
            Base URL (protocol + host)
        """
        try:
            parsed = urlparse(authorization_url)
            return f"{parsed.scheme}://{parsed.netloc}"
        except Exception as e:
            raise ValueError(f"Invalid authorization URL: {authorization_url}") from e

    def _get_auth_server_url(self, authorization_url: str) -> str:
        """
        Get or extract auth server URL.

        Args:
            authorization_url: Authorization URL to extract from

        Returns:
            Base URL of auth server
        """
        if not self.auth_server_url:
            self.auth_server_url = self._extract_auth_server_url(authorization_url)
        return self.auth_server_url

    def extract_request_id(self, authorization_url_or_html: str) -> str:
        """
        Extract request_id from authorization page HTML or URL.

        Args:
            authorization_url_or_html: Full authorization URL or HTML content

        Returns:
            request_id string

        Raises:
            ValueError: If request_id cannot be extracted
            RuntimeError: If using async methods without aiohttp
        """
        # If it's a URL, extract auth server URL and fetch the HTML
        if authorization_url_or_html.startswith('http://') or authorization_url_or_html.startswith('https://'):
            # Extract and store auth server URL
            self.auth_server_url = self._extract_auth_server_url(authorization_url_or_html)
            # It's a URL - fetch it
            if ASYNC_AVAILABLE:
                raise RuntimeError("Use extract_request_id_async() for async requests, or install 'requests' for sync")
            else:
                import requests
                response = requests.get(authorization_url_or_html)
                response.raise_for_status()
                html = response.text
        else:
            # Assume it's HTML content
            html = authorization_url_or_html

        # Try to extract from window.authRequest in script tag
        window_auth_match = re.search(
            r'window\.authRequest\s*=\s*\{[^}]*request_id:\s*[\'"]([^\'"]+)[\'"]',
            html
        )
        if window_auth_match:
            return window_auth_match.group(1)

        # Try alternative pattern: request_id: '...'
        direct_match = re.search(
            r'request_id:\s*[\'"]([^\'"]+)[\'"]',
            html
        )
        if direct_match:
            return direct_match.group(1)

        # Try extracting from script tag more flexibly
        script_match = re.search(
            r'<script[^>]*>[\s\S]*?request_id[^}]*[\'"]([^\'"]+)[\'"]',
            html
        )
        if script_match:
            return script_match.group(1)

        raise ValueError('Could not extract request_id from authorization page. Make sure the page is loaded correctly.')

    async def extract_request_id_async(self, authorization_url_or_html: str) -> str:
        """
        Extract request_id from authorization page HTML or URL (async version).

        Args:
            authorization_url_or_html: Full authorization URL or HTML content

        Returns:
            request_id string

        Raises:
            ValueError: If request_id cannot be extracted
            RuntimeError: If aiohttp is not installed
        """
        if not ASYNC_AVAILABLE:
            raise RuntimeError("aiohttp is required for async methods. Install with: pip install aiohttp")

        # If it's a URL, extract auth server URL and fetch the HTML
        if authorization_url_or_html.startswith('http://') or authorization_url_or_html.startswith('https://'):
            # Extract and store auth server URL
            self.auth_server_url = self._extract_auth_server_url(authorization_url_or_html)
            async with aiohttp.ClientSession() as session:
                async with session.get(authorization_url_or_html) as response:
                    response.raise_for_status()
                    html = await response.text()
        else:
            # Assume it's HTML content
            html = authorization_url_or_html

        # Use same extraction logic as sync version
        return self.extract_request_id(html)

    def authenticate(self, request_id: str, authorization_url: str) -> Dict[str, Any]:
        """
        Authenticate the agent with Auth Agent server.

        Args:
            request_id: Request ID extracted from authorization page
            authorization_url: Authorization URL (used to extract server URL)

        Returns:
            Authentication result dictionary with 'success', 'message', 'error', etc.

        Raises:
            RuntimeError: If using async methods without aiohttp
        """
        auth_server_url = self._get_auth_server_url(authorization_url)
        url = f"{auth_server_url}/api/agent/authenticate"

        payload = {
            'request_id': request_id,
            'agent_id': self.agent_id,
            'agent_secret': self.agent_secret,
            'model': self.model,
        }

        if ASYNC_AVAILABLE:
            raise RuntimeError("Use authenticate_async() for async requests, or install 'requests' for sync")
        else:
            import requests
            try:
                response = requests.post(url, json=payload)
                data = response.json()

                if not response.ok:
                    return {
                        'success': False,
                        'error': data.get('error', 'authentication_failed'),
                        'error_description': data.get('error_description', f'HTTP {response.status_code}'),
                    }

                return {
                    'success': True,
                    'message': data.get('message', 'Agent authenticated successfully'),
                }
            except requests.RequestException as e:
                return {
                    'success': False,
                    'error': 'network_error',
                    'error_description': str(e),
                }

    async def authenticate_async(self, request_id: str, authorization_url: str) -> Dict[str, Any]:
        """
        Authenticate the agent with Auth Agent server (async version).

        Args:
            request_id: Request ID extracted from authorization page
            authorization_url: Authorization URL (used to extract server URL)

        Returns:
            Authentication result dictionary with 'success', 'message', 'error', etc.

        Raises:
            RuntimeError: If aiohttp is not installed
        """
        if not ASYNC_AVAILABLE:
            raise RuntimeError("aiohttp is required for async methods. Install with: pip install aiohttp")

        auth_server_url = self._get_auth_server_url(authorization_url)
        url = f"{auth_server_url}/api/agent/authenticate"

        payload = {
            'request_id': request_id,
            'agent_id': self.agent_id,
            'agent_secret': self.agent_secret,
            'model': self.model,
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    data = await response.json()
                    
                    # Log for debugging
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f'[SDK] POST {url} - Status: {response.status}')
                    logger.info(f'[SDK] POST Response: {data}')

                    if not response.ok:
                        return {
                            'success': False,
                            'error': data.get('error', 'authentication_failed'),
                            'error_description': data.get('error_description', f'HTTP {response.status}'),
                        }

                    return {
                        'success': True,
                        'message': data.get('message', 'Agent authenticated successfully'),
                        'data': data,  # Include full response for debugging
                    }
        except Exception as e:
            return {
                'success': False,
                'error': 'network_error',
                'error_description': str(e),
            }

    def check_status(self, request_id: str, authorization_url: str) -> Dict[str, Any]:
        """
        Check authentication status.

        Args:
            request_id: Request ID to check
            authorization_url: Authorization URL (used to extract server URL)

        Returns:
            Status dictionary with 'status', 'code', 'redirect_uri', etc.

        Raises:
            RuntimeError: If using async methods without aiohttp
        """
        auth_server_url = self._get_auth_server_url(authorization_url)
        url = f"{auth_server_url}/api/check-status"
        params = {'request_id': request_id}

        if ASYNC_AVAILABLE:
            raise RuntimeError("Use check_status_async() for async requests, or install 'requests' for sync")
        else:
            import requests
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()

    async def check_status_async(self, request_id: str, authorization_url: str) -> Dict[str, Any]:
        """
        Check authentication status (async version).

        Args:
            request_id: Request ID to check
            authorization_url: Authorization URL (used to extract server URL)

        Returns:
            Status dictionary with 'status', 'code', 'redirect_uri', etc.

        Raises:
            RuntimeError: If aiohttp is not installed
        """
        if not ASYNC_AVAILABLE:
            raise RuntimeError("aiohttp is required for async methods. Install with: pip install aiohttp")

        auth_server_url = self._get_auth_server_url(authorization_url)
        url = f"{auth_server_url}/api/check-status"
        params = {'request_id': request_id}

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                response.raise_for_status()
                return await response.json()

    def wait_for_authentication(
        self,
        request_id: str,
        authorization_url: str,
        poll_interval: float = 0.5,
        timeout: float = 60.0,
        on_status_update: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Wait for authentication to complete by polling status.

        Args:
            request_id: Request ID to poll
            authorization_url: Authorization URL (used to extract server URL)
            poll_interval: Seconds between polls (default: 0.5)
            timeout: Maximum wait time in seconds (default: 60.0)
            on_status_update: Optional callback function called on each status check

        Returns:
            Final status dictionary with authorization code

        Raises:
            TimeoutError: If authentication times out
            RuntimeError: If using async methods without aiohttp
        """
        start_time = time.time()

        while True:
            # Check timeout
            if time.time() - start_time > timeout:
                raise TimeoutError('Authentication timeout - exceeded maximum wait time')

            # Check status
            status = self.check_status(request_id, authorization_url)

            # Call status update callback
            if on_status_update:
                on_status_update(status)

            # Check if authentication completed
            if status.get('status') in ('authenticated', 'completed'):
                return status

            # Check if there was an error
            if status.get('status') in ('error', 'expired'):
                error_msg = status.get('error', 'Authentication failed')
                raise RuntimeError(error_msg)

            # Still pending, wait and continue polling
            time.sleep(poll_interval)

    async def wait_for_authentication_async(
        self,
        request_id: str,
        authorization_url: str,
        poll_interval: float = 0.5,
        timeout: float = 60.0,
        on_status_update: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Wait for authentication to complete by polling status (async version).

        Args:
            request_id: Request ID to poll
            authorization_url: Authorization URL (used to extract server URL)
            poll_interval: Seconds between polls (default: 0.5)
            timeout: Maximum wait time in seconds (default: 60.0)
            on_status_update: Optional callback function called on each status check

        Returns:
            Final status dictionary with authorization code

        Raises:
            TimeoutError: If authentication times out
            RuntimeError: If aiohttp is not installed
        """
        if not ASYNC_AVAILABLE:
            raise RuntimeError("aiohttp is required for async methods. Install with: pip install aiohttp")

        import asyncio
        start_time = time.time()

        while True:
            # Check timeout
            if time.time() - start_time > timeout:
                raise TimeoutError('Authentication timeout - exceeded maximum wait time')

            # Check status
            status = await self.check_status_async(request_id, authorization_url)

            # Call status update callback
            if on_status_update:
                on_status_update(status)

            # Check if authentication completed
            if status.get('status') in ('authenticated', 'completed'):
                return status

            # Check if there was an error
            if status.get('status') in ('error', 'expired'):
                error_msg = status.get('error', 'Authentication failed')
                raise RuntimeError(error_msg)

            # Still pending, wait and continue polling
            await asyncio.sleep(poll_interval)

    def complete_authentication_flow(
        self,
        authorization_url: str,
        poll_interval: float = 0.5,
        timeout: float = 60.0,
        on_status_update: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Complete authentication flow: extract request_id, authenticate, and wait.

        Args:
            authorization_url: Full authorization URL
            poll_interval: Seconds between polls (default: 0.5)
            timeout: Maximum wait time in seconds (default: 60.0)
            on_status_update: Optional callback function called on each status check

        Returns:
            Final status dictionary with authorization code

        Raises:
            RuntimeError: If using async methods without aiohttp
        """
        # Step 1: Extract request_id (also extracts and stores auth server URL)
        request_id = self.extract_request_id(authorization_url)

        # Step 2: Authenticate
        auth_result = self.authenticate(request_id, authorization_url)

        if not auth_result.get('success'):
            error_desc = auth_result.get('error_description') or auth_result.get('error', 'Authentication failed')
            raise RuntimeError(error_desc)

        # Step 3: Wait for completion
        return self.wait_for_authentication(request_id, authorization_url, poll_interval, timeout, on_status_update)

    async def complete_authentication_flow_async(
        self,
        authorization_url: str,
        poll_interval: float = 0.5,
        timeout: float = 60.0,
        on_status_update: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Complete authentication flow: extract request_id, authenticate, and wait (async version).

        Args:
            authorization_url: Full authorization URL
            poll_interval: Seconds between polls (default: 0.5)
            timeout: Maximum wait time in seconds (default: 60.0)
            on_status_update: Optional callback function called on each status check

        Returns:
            Final status dictionary with authorization code

        Raises:
            RuntimeError: If aiohttp is not installed
        """
        # Step 1: Extract request_id (also extracts and stores auth server URL)
        request_id = await self.extract_request_id_async(authorization_url)

        # Step 2: Authenticate
        auth_result = await self.authenticate_async(request_id, authorization_url)

        if not auth_result.get('success'):
            error_desc = auth_result.get('error_description') or auth_result.get('error', 'Authentication failed')
            raise RuntimeError(error_desc)

        # Step 3: Wait for completion
        return await self.wait_for_authentication_async(request_id, authorization_url, poll_interval, timeout, on_status_update)


def create_auth_agent_agent_sdk(
    agent_id: str,
    agent_secret: str,
    model: str
) -> AuthAgentAgentSDK:
    """Create a new Auth Agent SDK instance for AI agents."""
    return AuthAgentAgentSDK(agent_id, agent_secret, model)

