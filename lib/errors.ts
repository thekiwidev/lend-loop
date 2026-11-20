import { ConvexError } from "convex/values";

/** Convex rule errors carry a message written for people; anything else gets a generic line. */
export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return "Something went wrong. Try again.";
}
