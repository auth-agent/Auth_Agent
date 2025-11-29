import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { authAgent } from "../../../src/server";

// Create PostgreSQL pool with explicit parameters
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432"),
  user: process.env.PGUSER || "hetpatel",
  database: process.env.PGDATABASE || "auth_test",
  password: process.env.PGPASSWORD || "",
});

const plugin = authAgent({
  clientId: process.env.AUTH_AGENT_CLIENT_ID!,
  clientSecret: process.env.AUTH_AGENT_CLIENT_SECRET!,
  authServerUrl: process.env.AUTH_AGENT_SERVER_URL || "https://api.auth-agent.com",
  autoCreateUser: true,

  // Custom user mapping
  mapAgentToUser: (agentData) => ({
    email: agentData.email,
    name: agentData.name || "AI Agent",
    emailVerified: true,
  }),

  // Success callback
  onSuccess: async ({ user, session, agentData }) => {
    console.log("Agent authenticated:", {
      userId: user.id,
      agentId: agentData.agent_id,
      email: user.email,
    });
  },
});

export const auth = betterAuth({
  database: pool,
  plugins: [plugin],
});
