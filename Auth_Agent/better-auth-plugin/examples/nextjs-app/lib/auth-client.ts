import { createAuthClient } from "better-auth/react";
import { authAgentClient } from "../../../src/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  plugins: [authAgentClient()],
});
