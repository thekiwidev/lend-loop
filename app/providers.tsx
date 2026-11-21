"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Always use the Clerk JWT template named "convex". ConvexProviderWithClerk switches to the
 * plain session token whenever that token has aud "convex", and then the role, name and email
 * claims depend on a second Clerk setting; hiding sessionClaims keeps one source of claims.
 */
function useAuthWithConvexTemplate() {
  return { ...useAuth(), sessionClaims: undefined };
}

/** Client boundary: Convex needs Clerk's auth to attach the signed JWT to every call. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuthWithConvexTemplate}>
      {children}
    </ConvexProviderWithClerk>
  );
}
