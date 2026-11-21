// The session token is customised in Clerk to carry the role from public metadata (see README).
export {};

declare global {
  interface CustomJwtSessionClaims {
    role?: "admin";
  }
}
