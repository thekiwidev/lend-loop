// The session token is customised in Clerk to carry public metadata (see README).
export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata?: { role?: "admin" };
  }
}
