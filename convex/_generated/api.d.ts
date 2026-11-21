/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as automation from "../automation.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_counts from "../lib/counts.js";
import type * as lib_loanRules from "../lib/loanRules.js";
import type * as lib_pages from "../lib/pages.js";
import type * as lib_signature from "../lib/signature.js";
import type * as loans from "../loans.js";
import type * as seed from "../seed.js";
import type * as tools from "../tools.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  automation: typeof automation;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/counts": typeof lib_counts;
  "lib/loanRules": typeof lib_loanRules;
  "lib/pages": typeof lib_pages;
  "lib/signature": typeof lib_signature;
  loans: typeof loans;
  seed: typeof seed;
  tools: typeof tools;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  loanCount: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"loanCount">;
  toolCount: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"toolCount">;
  userCount: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"userCount">;
  eventCount: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"eventCount">;
};
