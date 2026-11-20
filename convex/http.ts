import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verify } from "./lib/signature";

// Endpoints n8n calls. Both require a fresh HMAC signature over method, path and raw body.

const http = httpRouter();

const KINDS = ["request_notification", "overdue_reminder", "workflow_error"] as const;
const STATUSES = ["sent", "failed"] as const;
const MAX_KEY = 200;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function isSigned(request: Request, body: string): Promise<boolean> {
  const path = new URL(request.url).pathname;
  const result = await verify({
    secret: process.env.LENDLOOP_N8N_SECRET ?? "",
    timestamp: request.headers.get(TIMESTAMP_HEADER),
    signature: request.headers.get(SIGNATURE_HEADER),
    method: request.method,
    path,
    body,
    nowSeconds: Math.floor(Date.now() / 1000),
  });
  // Log the reason only, never the payload.
  if (!result.ok) console.warn(`Rejected unsigned automation request to ${path}: ${result.reason}`);
  return result.ok;
}

type Ack = {
  idempotencyKey: string;
  loanId?: string;
  kind: (typeof KINDS)[number];
  status: (typeof STATUSES)[number];
  detail?: string;
};

function parseAck(body: string): Ack | null {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  const ok =
    typeof d.idempotencyKey === "string" &&
    d.idempotencyKey.length > 0 &&
    d.idempotencyKey.length <= MAX_KEY &&
    (d.loanId === undefined || typeof d.loanId === "string") &&
    KINDS.includes(d.kind as Ack["kind"]) &&
    STATUSES.includes(d.status as Ack["status"]) &&
    (d.detail === undefined || typeof d.detail === "string");
  if (!ok) return null;
  return {
    idempotencyKey: d.idempotencyKey as string,
    loanId: d.loanId as string | undefined,
    kind: d.kind as Ack["kind"],
    status: d.status as Ack["status"],
    detail: d.detail as string | undefined,
  };
}

http.route({
  path: "/automation/ack",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    if (!(await isSigned(request, body))) return json(401, { error: "invalid signature" });
    const ack = parseAck(body);
    if (!ack) return json(400, { error: "invalid body" });
    const result = await ctx.runMutation(internal.automation.recordEvent, ack);
    return result.ok ? json(200, { ok: true }) : json(404, { error: result.reason });
  }),
});

http.route({
  path: "/automation/overdue",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await isSigned(request, ""))) return json(401, { error: "invalid signature" });
    const loans = await ctx.runQuery(internal.automation.overdueLoans, {});
    return json(200, { loans });
  }),
});

export default http;
