"use client";

import { authClient } from "@/lib/auth-client";
import { AuthAgentButton } from "../../../src/components";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <div className="container">Loading...</div>;
  }

  if (session) {
    return (
      <div className="container">
        <h1>Welcome back!</h1>
        <p>Email: {session.user.email}</p>
        <p>Name: {session.user.name}</p>
        <button onClick={() => authClient.signOut()}>Sign Out</button>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Auth Agent + Better Auth Demo</h1>
      <p>Sign in with AI agent authentication</p>

      <div className="auth-buttons">
        {/* AI agent authentication */}
        <div className="auth-section">
          <h2>AI Agents</h2>
          <AuthAgentButton callbackURL="/dashboard">
            Sign in with Auth Agent
          </AuthAgentButton>
        </div>
      </div>

      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          font-family: system-ui, -apple-system, sans-serif;
        }

        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .auth-buttons {
          margin-top: 40px;
        }

        .auth-section {
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          max-width: 400px;
        }

        .auth-section h2 {
          font-size: 1.5rem;
          margin-bottom: 20px;
        }

        button {
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
}
