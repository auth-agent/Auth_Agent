// Seed script to create test agents and clients

const BASE_URL = 'http://localhost:3000';

async function createAgent(userData: { user_email: string; user_name: string }) {
  const response = await fetch(`${BASE_URL}/api/admin/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create agent: ${await response.text()}`);
  }

  return response.json();
}

async function createClient(clientData: { client_name: string; redirect_uris: string[] }) {
  const response = await fetch(`${BASE_URL}/api/admin/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(clientData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create client: ${await response.text()}`);
  }

  return response.json();
}

async function main() {
  console.log('🌱 Seeding database with test data...\n');

  try {
    // Create test agent
    console.log('Creating test agent...');
    const agent = await createAgent({
      user_email: 'test@example.com',
      user_name: 'Test User',
    });

    console.log('✅ Agent created:');
    console.log(`   Agent ID: ${agent.agent_id}`);
    console.log(`   Agent Secret: ${agent.agent_secret}`);
    console.log(`   ⚠️  Save these credentials! Secret will not be shown again.\n`);

    // Create test client
    console.log('Creating test client (example website)...');
    const client = await createClient({
      client_name: 'Example Website',
      redirect_uris: [
        'http://localhost:4000/callback',
        'http://localhost:4000/auth/callback',
      ],
    });

    console.log('✅ Client created:');
    console.log(`   Client ID: ${client.client_id}`);
    console.log(`   Client Secret: ${client.client_secret}`);
    console.log(`   ⚠️  Save these credentials! Secret will not be shown again.\n`);

    // Save credentials to a file for easy testing
    const credentials = {
      agent: {
        agent_id: agent.agent_id,
        agent_secret: agent.agent_secret,
        user_email: agent.user_email,
        user_name: agent.user_name,
      },
      client: {
        client_id: client.client_id,
        client_secret: client.client_secret,
        client_name: client.client_name,
        redirect_uris: client.allowed_redirect_uris,
      },
    };

    const fs = await import('fs/promises');
    await fs.writeFile(
      './test-credentials.json',
      JSON.stringify(credentials, null, 2)
    );

    console.log('💾 Credentials saved to: test-credentials.json\n');

    console.log('🎉 Database seeded successfully!');
    console.log('\nNext steps:');
    console.log('1. Use these credentials to test the OAuth flow');
    console.log('2. See scripts/test-flow.ts for a complete example');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

main();
