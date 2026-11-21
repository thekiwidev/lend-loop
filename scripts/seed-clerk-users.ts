// Dev-only: creates a Clerk test account for each seeded neighbour and links it to the seeded
// Convex user. Run after `bunx convex run seed:run`:  bun scripts/seed-clerk-users.ts
// Emails use Clerk's "+clerk_test" form, so Clerk never sends real mail (code 424242 if asked).
// Logins are written to seed-users.local.md (git-ignored); one shared password per run.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const NEIGHBOURS = [
  { seedId: "seed_amaka", first: "Amaka", last: "Obi" },
  { seedId: "seed_tunde", first: "Tunde", last: "Bello" },
  { seedId: "seed_zainab", first: "Zainab", last: "Yusuf" },
  { seedId: "seed_chidi", first: "Chidi", last: "Okafor" },
  { seedId: "seed_ifeoma", first: "Ifeoma", last: "Nwosu" },
];

const secret = readFileSync(".env.local", "utf8").match(/^CLERK_SECRET_KEY=["']?([^"'\n]+)/m)?.[1];
if (!secret?.startsWith("sk_test_")) throw new Error("Needs a development CLERK_SECRET_KEY (sk_test_) in .env.local.");

async function clerk(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Clerk ${path}: ${res.status} ${JSON.stringify(body)}`);
  return body;
}

const password = `Lend-${randomBytes(6).toString("hex")}`;
const lines = ["# Seeded neighbour logins (dev only, git-ignored)", "", `Password for all: \`${password}\``, ""];

for (const n of NEIGHBOURS) {
  const email = `${n.first.toLowerCase()}+clerk_test@example.com`;
  const [existing] = await clerk(`/users?email_address=${encodeURIComponent(email)}`);
  const user = existing
    ? await clerk(`/users/${existing.id}`, { method: "PATCH", body: JSON.stringify({ password, skip_password_checks: true }) })
    : await clerk("/users", {
        method: "POST",
        body: JSON.stringify({ email_address: [email], password, first_name: n.first, last_name: n.last, skip_password_checks: true }),
      });
  const result = execFileSync("bunx", ["convex", "run", "seed:linkClerkUser", JSON.stringify({ seedId: n.seedId, clerkId: user.id })], { encoding: "utf8" }).trim();
  lines.push(`- ${n.first} ${n.last}: \`${email}\` (${result})`);
}

writeFileSync("seed-users.local.md", `${lines.join("\n")}\n`);
console.log("Done. Logins are in seed-users.local.md");
