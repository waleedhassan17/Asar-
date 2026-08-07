#!/usr/bin/env node
/**
 * Creates (or updates) the platform admin account.
 *
 *   npm run admin:seed
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from .env.local, which is
 * gitignored. Those two values exist only so this script can run without
 * anyone typing a password onto a command line where it would land in
 * shell history — nothing at runtime reads them, and they must NOT be
 * added to Vercel.
 *
 * Idempotent: run it again to reset the password or to re-grant admin.
 *
 * What it does:
 *   1. creates the auth user if missing, already email-confirmed
 *   2. resets the password if it already exists
 *   3. sets profiles.is_admin = true
 *   4. stamps onboarded_at so the admin isn't sent through onboarding
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
  } catch {
    /* Node < 20.12; the env vars still work if exported. */
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!URL || !SERVICE) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}
if (!EMAIL || !PASSWORD) {
  console.error(
    "ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local. See .env.example.",
  );
  process.exit(1);
}

const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

async function api(method, path, body) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: { ...admin, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

/** The admin list endpoint has no email filter, so page through it. */
async function findUser(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { json } = await api("GET", `/auth/v1/admin/users?page=${page}&per_page=200`);
    const users = json?.users ?? [];
    if (users.length === 0) return null;
    const hit = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

const existing = await findUser(EMAIL);
let userId;

if (existing) {
  userId = existing.id;
  const { status, json } = await api("PUT", `/auth/v1/admin/users/${userId}`, {
    password: PASSWORD,
    email_confirm: true,
  });
  if (status !== 200) {
    console.error(`Could not update ${EMAIL}: ${status} ${JSON.stringify(json)}`);
    process.exit(1);
  }
  console.log(`  updated existing account ${EMAIL} (password reset, email confirmed)`);
} else {
  const { status, json } = await api("POST", "/auth/v1/admin/users", {
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: EMAIL.split("@")[0] },
  });
  if (status !== 200 && status !== 201) {
    console.error(`Could not create ${EMAIL}: ${status} ${JSON.stringify(json)}`);
    process.exit(1);
  }
  userId = json.id;
  console.log(`  created account ${EMAIL}`);
}

// The profile row is created by the handle_new_user trigger; give it a
// moment on a fresh account before writing to it.
await new Promise((r) => setTimeout(r, 400));

const { status: profileStatus, json: profileJson } = await api(
  "PATCH",
  `/rest/v1/profiles?id=eq.${userId}`,
  { is_admin: true, onboarded_at: new Date().toISOString() },
);

if (profileStatus >= 300) {
  console.error(`Could not grant admin: ${profileStatus} ${JSON.stringify(profileJson)}`);
  process.exit(1);
}

const { json: check } = await api(
  "GET",
  `/rest/v1/profiles?select=email,is_admin,onboarded_at&id=eq.${userId}`,
);

console.log(`  ${EMAIL} -> is_admin = ${check?.[0]?.is_admin}`);
console.log("\nSign in at /login and the Admin link appears in the header.");
