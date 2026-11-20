// HMAC-SHA256 request signing shared by Convex and (re-implemented in) the n8n workflows.
// Signed string: `${timestamp}.${METHOD}.${path}.${rawBody}`. Method and path stop a
// captured signature being replayed against another endpoint; the timestamp window stops
// it being replayed later.

export const TIMESTAMP_HEADER = "X-LendLoop-Timestamp";
export const SIGNATURE_HEADER = "X-LendLoop-Signature";
export const MAX_AGE_SECONDS = 300;

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function signedString(timestamp: string, method: string, path: string, body: string): string {
  return `${timestamp}.${method.toUpperCase()}.${path}.${body}`;
}

export async function sign(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  body: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(signedString(timestamp, method, path, body)));
  return toHex(mac);
}

/** Compares every character so timing does not reveal how much of the signature matched. */
export function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export type VerifyResult = { ok: true } | { ok: false; reason: "missing" | "stale" | "mismatch" };

export async function verify(input: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  method: string;
  path: string;
  body: string;
  nowSeconds: number;
}): Promise<VerifyResult> {
  const { secret, timestamp, signature } = input;
  if (!secret || !timestamp || !signature || !/^\d+$/.test(timestamp)) return { ok: false, reason: "missing" };
  if (Math.abs(input.nowSeconds - Number(timestamp)) > MAX_AGE_SECONDS) return { ok: false, reason: "stale" };
  const expected = await sign(secret, timestamp, input.method, input.path, input.body);
  return constantTimeEqual(expected, signature.toLowerCase()) ? { ok: true } : { ok: false, reason: "mismatch" };
}

export async function signedHeaders(
  secret: string,
  method: string,
  path: string,
  body: string,
  nowSeconds: number,
): Promise<Record<string, string>> {
  const timestamp = String(nowSeconds);
  return {
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: await sign(secret, timestamp, method, path, body),
  };
}
