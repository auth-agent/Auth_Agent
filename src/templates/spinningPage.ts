// Spinning page template shown during agent authentication

export function spinningPage(requestId: string, clientName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Authentication - Auth Agent</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg,rgb(255, 115, 0) 0%,rgb(0, 0, 0) 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      color: #fff;
    }

    .container {
      text-align: center;
      max-width: 500px;
      padding: 40px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .spinner {
      width: 80px;
      height: 80px;
      border: 8px solid rgba(255, 255, 255, 0.2);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 30px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    h1 {
      font-size: 28px;
      margin-bottom: 15px;
      font-weight: 600;
    }

    p {
      font-size: 16px;
      opacity: 0.9;
      line-height: 1.6;
    }

    .client-info {
      margin-top: 20px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      font-size: 14px;
    }

    .status {
      margin-top: 25px;
      font-size: 14px;
      opacity: 0.8;
    }

    .dots {
      display: inline-block;
      animation: dots 1.5s steps(4, end) infinite;
    }

    @keyframes dots {
      0%, 20% { content: ''; }
      40% { content: '.'; }
      60% { content: '..'; }
      80%, 100% { content: '...'; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>Authenticating AI Agent</h1>
    <p>Please wait while your AI agent is being authenticated.</p>

    <div class="client-info">
      <strong>Client:</strong> ${escapeHtml(clientName)}
    </div>

    <div class="status">
      <span>Waiting for agent authentication</span><span class="dots"></span>
    </div>
  </div>

  <script>
    // Expose auth request data for agent to read
    window.authRequest = {
      request_id: '${requestId}',
      timestamp: ${Date.now()}
    };

    // Poll for authentication completion
    const requestId = '${requestId}';
    const pollInterval = 500; // 500ms

    async function checkAuthStatus() {
      try {
        const response = await fetch(\`/api/check-status?request_id=\${requestId}\`);

        if (!response.ok) {
          throw new Error('Failed to check status');
        }

        const data = await response.json();

        if (data.status === 'authenticated' || data.status === 'completed') {
          // Redirect to callback URL with authorization code
          const redirectUrl = \`\${data.redirect_uri}?code=\${data.code}&state=\${data.state}\`;
          window.location.href = redirectUrl;
        } else if (data.status === 'error') {
          // Show error
          window.location.href = \`/error?message=\${encodeURIComponent(data.error || 'Authentication failed')}\`;
        } else {
          // Still pending, continue polling
          setTimeout(checkAuthStatus, pollInterval);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Retry after a longer delay on error
        setTimeout(checkAuthStatus, pollInterval * 2);
      }
    }

    // Start polling after a short delay
    setTimeout(checkAuthStatus, pollInterval);
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
