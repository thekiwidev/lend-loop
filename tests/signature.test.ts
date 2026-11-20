import { describe, expect, it } from "vitest";
import { constantTimeEqual, MAX_AGE_SECONDS, sign, signedString, verify } from "../convex/lib/signature";

const secret = "test-secret";
const body = JSON.stringify({ eventId: "loan:1:pending", loanId: "1" });
const now = 1_790_000_000;

async function signed(overrides: Partial<Parameters<typeof verify>[0]> = {}) {
  const timestamp = String(now);
  const signature = await sign(secret, timestamp, "POST", "/automation/ack", body);
  return verify({ secret, timestamp, signature, method: "POST", path: "/automation/ack", body, nowSeconds: now, ...overrides });
}

describe("signature", () => {
  it("builds the signed string from timestamp, method, path and body", () => {
    expect(signedString("1", "post", "/p", "{}")).toBe("1.POST./p.{}");
  });

  it("matches a known HMAC-SHA256 vector", async () => {
    // printf '1.GET./x.' | openssl dgst -sha256 -hmac key
    expect(await sign("key", "1", "GET", "/x", "")).toBe(
      "495c5bfa8f4d7b66324243aaf764d962ece508198d230eeed8d53b503fe8d6a9",
    );
  });

  it("accepts a valid signature", async () => {
    expect(await signed()).toEqual({ ok: true });
  });

  it("rejects a tampered body", async () => {
    expect(await signed({ body: body.replace("pending", "approved") })).toEqual({ ok: false, reason: "mismatch" });
  });

  it("rejects the same signature on another path", async () => {
    expect(await signed({ path: "/automation/overdue" })).toEqual({ ok: false, reason: "mismatch" });
  });

  it("rejects the same signature with another method", async () => {
    expect(await signed({ method: "GET" })).toEqual({ ok: false, reason: "mismatch" });
  });

  it("rejects the wrong secret", async () => {
    expect(await signed({ secret: "other" })).toEqual({ ok: false, reason: "mismatch" });
  });

  it("rejects an expired timestamp", async () => {
    expect(await signed({ nowSeconds: now + MAX_AGE_SECONDS + 1 })).toEqual({ ok: false, reason: "stale" });
  });

  it("rejects missing headers and an unset secret", async () => {
    expect(await signed({ signature: null })).toEqual({ ok: false, reason: "missing" });
    expect(await signed({ timestamp: "abc" })).toEqual({ ok: false, reason: "missing" });
    expect(await signed({ secret: "" })).toEqual({ ok: false, reason: "missing" });
  });

  it("compares strings of any length safely", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
  });
});
