// Error page template

export function errorPage(error: string, errorDescription?: string): string {
  const escapedError = escapeHtml(error);
  const escapedDescription = errorDescription ? escapeHtml(errorDescription) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Error - Auth Agent</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      color: #fff;
      padding: 20px;
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

    .error-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }

    h1 {
      font-size: 28px;
      margin-bottom: 15px;
      font-weight: 600;
    }

    .error-code {
      font-size: 14px;
      font-family: 'Courier New', monospace;
      background: rgba(255, 255, 255, 0.2);
      padding: 10px 15px;
      border-radius: 8px;
      margin: 20px 0;
      word-break: break-word;
    }

    p {
      font-size: 16px;
      opacity: 0.9;
      line-height: 1.6;
    }

    .back-link {
      margin-top: 30px;
    }

    .back-link a {
      color: #fff;
      text-decoration: none;
      padding: 12px 30px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      display: inline-block;
      transition: background 0.3s;
    }

    .back-link a:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">⚠️</div>
    <h1>Authentication Error</h1>

    <div class="error-code">
      <strong>Error:</strong> ${escapedError}
    </div>

    ${escapedDescription ? `<p>${escapedDescription}</p>` : ''}

    <div class="back-link">
      <a href="javascript:window.close()">Close Window</a>
    </div>
  </div>
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
