/**
 * Applies every Asar migration, in order, to a Postgres database.
 *
 *   npm run db:push
 *
 * Needs a real Postgres connection string in SUPABASE_DB_URL — the
 * service_role key will not do. That key is a PostgREST JWT: it can call
 * functions and read tables, but PostgREST deliberately exposes no
 * raw-SQL endpoint, so it cannot create any. Get the connection string
 * from Supabase → Project Settings → Database → Connection string (URI),
 * and keep it in .env.local, never in a committed file.
 *
 * Every migration is idempotent (create or replace / if not exists /
 * on conflict), so re-running this is safe.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

// Read .env.local the same way `next dev` does, so the connection string
// lives in one gitignored place rather than being retyped on the command
// line (where it would land in shell history).
const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
  } catch {
    // Node < 20.12 has no loadEnvFile; the env var still works.
  }
}

// Read from disk rather than a hardcoded list. The list used to be
// hardcoded, which meant a newly added migration was silently skipped —
// the script reported success having never run it. Filenames are
// timestamp-prefixed, so a plain sort is the intended order, and the seed
// goes last because it depends on every table existing.
const FILES = [
  ...readdirSync(resolve(process.cwd(), "supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => `supabase/migrations/${name}`),
  "supabase/seed.sql",
];

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    [
      "",
      "  SUPABASE_DB_URL is not set.",
      "",
      "  Supabase → Project Settings → Database → Connection string → URI",
      "  Add it to .env.local (which this script reads automatically):",
      "",
      '    SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"',
      "",
      "  Then re-run: npm run db:push",
      "",
      "  Or paste the files in supabase/migrations/ into the SQL editor, in filename order.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

// Supabase terminates TLS with its own CA: the connection is encrypted, but
// the chain isn't in Node's default store. A local Postgres (a scratch
// container, say) usually has no TLS at all, so don't ask for it there.
const host = (() => {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return "";
  }
})();
const isLocal = ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(host);
const wantsPlaintext = isLocal || /sslmode=disable/.test(connectionString);

const client = new pg.Client({
  connectionString,
  ssl: wantsPlaintext ? false : { rejectUnauthorized: false },
});

try {
  try {
    await client.connect();
  } catch (error) {
    // db.<ref>.supabase.co is IPv6-only unless the IPv4 add-on is on, and
    // plenty of networks have no IPv6 route at all. The session pooler is
    // reachable over IPv4 and speaks the same protocol.
    if (error.code === "ENETUNREACH" || error.code === "EHOSTUNREACH") {
      const ref = host.split(".")[1] ?? "PROJECT";
      console.error(
        [
          "",
          `  Can't reach ${host} over IPv6 from this network.`,
          "",
          "  Use the session pooler instead — Supabase → Connect → Session pooler:",
          "",
          `    SUPABASE_DB_URL="postgresql://postgres.${ref}:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"`,
          "",
        ].join("\n"),
      );
      process.exit(1);
    }
    throw error;
  }
  console.log("Connected.\n");

  for (const file of FILES) {
    const sql = readFileSync(resolve(process.cwd(), file), "utf8");
    process.stdout.write(`  ${file} … `);
    try {
      await client.query(sql);
      console.log("ok");
    } catch (error) {
      console.log("failed");
      console.error(`\n${error.message}\n`);
      if (error.hint) console.error(`hint: ${error.hint}\n`);
      process.exitCode = 1;
      break;
    }
  }

  if (process.exitCode !== 1) {
    const { rows } = await client.query(
      "select count(*)::int as templates from public.mission_templates",
    );
    console.log(`\nDone. ${rows[0].templates} mission presets seeded.`);
    console.log("Next: make yourself an admin with");
    console.log("  update public.profiles set is_admin = true where email = 'you@example.com';");
  }
} finally {
  await client.end();
}
