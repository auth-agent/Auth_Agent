// Main server entry point

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CONFIG } from './lib/constants.js';

// OAuth endpoints
import { authorizeHandler } from './oauth/authorize.js';
import { agentAuthenticateHandler } from './oauth/agentAuth.js';
import { checkStatusHandler } from './oauth/checkStatus.js';
import { tokenHandler } from './oauth/token.js';
import { introspectHandler } from './oauth/introspect.js';
import { revokeHandler } from './oauth/revoke.js';
import { discoveryHandler, jwksHandler } from './oauth/discovery.js';

// Admin endpoints
import {
  createAgentHandler,
  listAgentsHandler,
  getAgentHandler,
  deleteAgentHandler,
} from './admin/agents.js';
import {
  createClientHandler,
  listClientsHandler,
  getClientHandler,
  updateClientHandler,
  deleteClientHandler,
} from './admin/clients.js';

import { errorPage } from './templates/errorPage.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// ============================================
// PUBLIC OAUTH ENDPOINTS (Standard)
// ============================================

app.get('/authorize', authorizeHandler);
app.post('/token', tokenHandler);
app.post('/introspect', introspectHandler);
app.post('/revoke', revokeHandler);

// Discovery endpoints
app.get('/.well-known/oauth-authorization-server', discoveryHandler);
app.get('/.well-known/jwks.json', jwksHandler);

// ============================================
// AGENT BACK-CHANNEL ENDPOINTS (Custom)
// ============================================

app.post('/api/agent/authenticate', agentAuthenticateHandler);
app.get('/api/check-status', checkStatusHandler);

// ============================================
// MANAGEMENT ENDPOINTS (Admin)
// ============================================

// Agent management
app.post('/api/admin/agents', createAgentHandler);
app.get('/api/admin/agents', listAgentsHandler);
app.get('/api/admin/agents/:id', getAgentHandler);
app.delete('/api/admin/agents/:id', deleteAgentHandler);

// Client management
app.post('/api/admin/clients', createClientHandler);
app.get('/api/admin/clients', listClientsHandler);
app.get('/api/admin/clients/:id', getClientHandler);
app.put('/api/admin/clients/:id', updateClientHandler);
app.delete('/api/admin/clients/:id', deleteClientHandler);

// ============================================
// UTILITY ENDPOINTS
// ============================================

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
  });
});

// Error page endpoint
app.get('/error', (c) => {
  const message = c.req.query('message') || 'An error occurred';
  return c.html(errorPage('error', message));
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'not_found',
      error_description: 'Endpoint not found',
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);

  return c.json(
    {
      error: 'server_error',
      error_description: 'Internal server error',
    },
    500
  );
});

// Start server
const port = Number(CONFIG.PORT);

console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║   🤖 Auth Agent - OAuth 2.1 Server         ║
║                                            ║
║   Server running on:                       ║
║   ${CONFIG.BASE_URL}                        ║
║                                            ║
╚════════════════════════════════════════════╝

Available endpoints:

PUBLIC OAUTH ENDPOINTS:
  GET  /authorize                    - OAuth authorization
  POST /token                        - Token exchange & refresh
  POST /introspect                   - Token validation
  POST /revoke                       - Token revocation
  GET  /.well-known/oauth-...        - OAuth discovery

AGENT ENDPOINTS:
  POST /api/agent/authenticate       - Agent authentication
  GET  /api/check-status             - Check auth status

ADMIN ENDPOINTS:
  POST /api/admin/agents             - Create agent
  GET  /api/admin/agents             - List agents
  GET  /api/admin/agents/:id         - Get agent
  DELETE /api/admin/agents/:id       - Delete agent

  POST /api/admin/clients            - Create client
  GET  /api/admin/clients            - List clients
  GET  /api/admin/clients/:id        - Get client
  PUT  /api/admin/clients/:id        - Update client
  DELETE /api/admin/clients/:id      - Delete client

UTILITY:
  GET  /api/health                   - Health check
`);

serve({
  fetch: app.fetch,
  port,
});
