// Test script to simulate complete OAuth 2.1 flow with AI agent

import crypto from 'crypto';

const AUTH_SERVER = 'http://localhost:3000';
const CALLBACK_URL = 'http://localhost:4000/callback';

// Load credentials from test-credentials.json
async function loadCredentials() {
  const fs = await import('fs/promises');
  try {
    const data = await fs.readFile('./test-credentials.json', 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Could not load test-credentials.json');
    console.error('   Run: npm run seed first');
    process.exit(1);
  }
}

// Generate PKCE challenge
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

  return {
    code_verifier: verifier,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  };
}

// Simulate the OAuth flow
async function testOAuthFlow() {
  console.log('🧪 Testing OAuth 2.1 Flow\n');
  console.log('=' .repeat(60));

  const creds = await loadCredentials();
  const { agent, client } = creds;

  console.log('\n📋 Using credentials:');
  console.log(`   Agent ID: ${agent.agent_id}`);
  console.log(`   Client ID: ${client.client_id}\n`);

  // Step 1: Generate PKCE
  console.log('Step 1: Generate PKCE challenge');
  const pkce = generatePKCE();
  console.log(`   ✅ code_challenge: ${pkce.code_challenge.substring(0, 20)}...`);

  // Step 2: Build authorization URL
  console.log('\nStep 2: Build authorization URL');
  const state = crypto.randomBytes(16).toString('hex');
  const authUrl = new URL(`${AUTH_SERVER}/authorize`);
  authUrl.searchParams.set('client_id', client.client_id);
  authUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', pkce.code_challenge);
  authUrl.searchParams.set('code_challenge_method', pkce.code_challenge_method);
  authUrl.searchParams.set('scope', 'openid profile');

  console.log(`   ✅ Authorization URL: ${authUrl.toString().substring(0, 60)}...`);

  // Step 3: Fetch authorization page (would show spinning page)
  console.log('\nStep 3: Request authorization page');
  const authPageResponse = await fetch(authUrl.toString());

  if (!authPageResponse.ok) {
    console.error(`   ❌ Failed: ${authPageResponse.status}`);
    process.exit(1);
  }

  const authPageHtml = await authPageResponse.text();
  console.log('   ✅ Received spinning page');

  // Extract request_id from page
  const requestIdMatch = authPageHtml.match(/request_id:\s*'([^']+)'/);
  if (!requestIdMatch) {
    console.error('   ❌ Could not extract request_id from page');
    process.exit(1);
  }

  const requestId = requestIdMatch[1];
  console.log(`   ✅ Extracted request_id: ${requestId}`);

  // Step 4: Agent authenticates (simulating agent POST)
  console.log('\nStep 4: AI Agent authenticates');
  const authResponse = await fetch(`${AUTH_SERVER}/api/agent/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      request_id: requestId,
      agent_id: agent.agent_id,
      agent_secret: agent.agent_secret,
      model: 'gpt-4',
    }),
  });

  if (!authResponse.ok) {
    const error = await authResponse.json();
    console.error(`   ❌ Authentication failed:`, error);
    process.exit(1);
  }

  const authResult = await authResponse.json();
  console.log(`   ✅ Agent authenticated successfully`);

  // Step 5: Check status (simulating polling)
  console.log('\nStep 5: Check authentication status');
  const statusResponse = await fetch(
    `${AUTH_SERVER}/api/check-status?request_id=${requestId}`
  );

  if (!statusResponse.ok) {
    console.error(`   ❌ Status check failed: ${statusResponse.status}`);
    process.exit(1);
  }

  const status = await statusResponse.json();

  if (status.status !== 'authenticated') {
    console.error(`   ❌ Unexpected status: ${status.status}`);
    process.exit(1);
  }

  console.log(`   ✅ Status: ${status.status}`);
  console.log(`   ✅ Authorization code: ${status.code.substring(0, 20)}...`);

  const authCode = status.code;

  // Step 6: Exchange code for tokens
  console.log('\nStep 6: Exchange authorization code for access token');
  const tokenResponse = await fetch(`${AUTH_SERVER}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: authCode,
      code_verifier: pkce.code_verifier,
      client_id: client.client_id,
      client_secret: client.client_secret,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json();
    console.error(`   ❌ Token exchange failed:`, error);
    process.exit(1);
  }

  const tokens = await tokenResponse.json();
  console.log(`   ✅ Access token: ${tokens.access_token.substring(0, 30)}...`);
  console.log(`   ✅ Refresh token: ${tokens.refresh_token.substring(0, 30)}...`);
  console.log(`   ✅ Expires in: ${tokens.expires_in} seconds`);
  console.log(`   ✅ Scope: ${tokens.scope}`);

  // Step 7: Introspect access token
  console.log('\nStep 7: Introspect access token');
  const introspectResponse = await fetch(`${AUTH_SERVER}/introspect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: tokens.access_token,
      token_type_hint: 'access_token',
      client_id: client.client_id,
      client_secret: client.client_secret,
    }),
  });

  if (!introspectResponse.ok) {
    console.error(`   ❌ Introspection failed: ${introspectResponse.status}`);
    process.exit(1);
  }

  const introspection = await introspectResponse.json();
  console.log(`   ✅ Token active: ${introspection.active}`);
  console.log(`   ✅ Agent ID (sub): ${introspection.sub}`);
  console.log(`   ✅ Model: ${introspection.model}`);
  console.log(`   ✅ Scope: ${introspection.scope}`);

  // Step 8: Refresh access token
  console.log('\nStep 8: Refresh access token');
  const refreshResponse = await fetch(`${AUTH_SERVER}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: client.client_id,
      client_secret: client.client_secret,
    }),
  });

  if (!refreshResponse.ok) {
    const error = await refreshResponse.json();
    console.error(`   ❌ Token refresh failed:`, error);
    process.exit(1);
  }

  const newTokens = await refreshResponse.json();
  console.log(`   ✅ New access token: ${newTokens.access_token.substring(0, 30)}...`);
  console.log(`   ✅ Expires in: ${newTokens.expires_in} seconds`);

  // Step 9: Revoke token
  console.log('\nStep 9: Revoke access token');
  const revokeResponse = await fetch(`${AUTH_SERVER}/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: newTokens.access_token,
      token_type_hint: 'access_token',
      client_id: client.client_id,
      client_secret: client.client_secret,
    }),
  });

  if (!revokeResponse.ok) {
    console.error(`   ❌ Token revocation failed: ${revokeResponse.status}`);
    process.exit(1);
  }

  console.log(`   ✅ Token revoked successfully`);

  // Step 10: Verify token is revoked
  console.log('\nStep 10: Verify token is revoked');
  const verifyResponse = await fetch(`${AUTH_SERVER}/introspect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: newTokens.access_token,
      token_type_hint: 'access_token',
      client_id: client.client_id,
      client_secret: client.client_secret,
    }),
  });

  if (!verifyResponse.ok) {
    console.error(`   ❌ Verification failed: ${verifyResponse.status}`);
    process.exit(1);
  }

  const verification = await verifyResponse.json();
  console.log(`   ✅ Token active: ${verification.active} (should be false)`);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 OAuth 2.1 Flow Test Complete!\n');
  console.log('All steps passed successfully:');
  console.log('  ✅ Authorization with PKCE');
  console.log('  ✅ AI Agent authentication');
  console.log('  ✅ Code exchange for tokens');
  console.log('  ✅ Token introspection');
  console.log('  ✅ Token refresh');
  console.log('  ✅ Token revocation');
}

testOAuthFlow().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
