"use client";

import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Browser-side auth client. Talks to /api/auth on the same origin. */
export const authClient = createAuthClient({
  plugins: [organizationClient()],
});
