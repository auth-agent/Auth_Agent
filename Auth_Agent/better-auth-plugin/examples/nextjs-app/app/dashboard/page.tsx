"use client";

import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export default function Dashboard() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session) {
    redirect("/");
  }

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <p>Welcome, {session.user.name || session.user.email}!</p>

      <div className="info-card">
        <h2>Session Information</h2>
        <dl>
          <dt>User ID:</dt>
          <dd>{session.user.id}</dd>

          <dt>Email:</dt>
          <dd>{session.user.email}</dd>

          <dt>Name:</dt>
          <dd>{session.user.name || "Not set"}</dd>

          <dt>Email Verified:</dt>
          <dd>{session.user.emailVerified ? "Yes" : "No"}</dd>
        </dl>
      </div>

      <button onClick={() => authClient.signOut()}>Sign Out</button>

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

        .info-card {
          margin: 40px 0;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          background: #f9f9f9;
        }

        .info-card h2 {
          font-size: 1.5rem;
          margin-bottom: 20px;
        }

        dl {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 15px;
        }

        dt {
          font-weight: 600;
        }

        dd {
          margin: 0;
        }

        button {
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          background: #dc3545;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        button:hover {
          background: #c82333;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
