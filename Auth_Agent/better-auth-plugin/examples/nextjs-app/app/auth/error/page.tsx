"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "An unknown error occurred";

  return (
    <div className="container">
      <h1>Authentication Error</h1>
      <div className="error-card">
        <p>{error}</p>
      </div>
      <Link href="/">Return to Home</Link>

      <style jsx>{`
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
          font-family: system-ui, -apple-system, sans-serif;
          text-align: center;
        }

        h1 {
          font-size: 2rem;
          color: #dc3545;
          margin-bottom: 20px;
        }

        .error-card {
          padding: 30px;
          background: #f8d7da;
          border: 1px solid #f5c2c7;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .error-card p {
          color: #842029;
          margin: 0;
        }

        a {
          display: inline-block;
          padding: 12px 24px;
          color: #fff;
          background: #0d6efd;
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        a:hover {
          background: #0b5ed7;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
