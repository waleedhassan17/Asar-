# SQL tests

These run the whole database contract against a throwaway Postgres — no
Supabase project needed, and nothing here should ever be pointed at a real one.

```bash
docker run -d --name asar-pg -e POSTGRES_PASSWORD=asar -p 55432:5432 postgres:16

# A bare Postgres has no auth schema, no storage schema and no
# anon/authenticated roles. This creates just enough of them.
docker cp supabase/tests/00_supabase_shim.sql asar-pg:/tmp/
docker exec asar-pg psql -U postgres -q -v ON_ERROR_STOP=1 -f /tmp/00_supabase_shim.sql

SUPABASE_DB_URL="postgresql://postgres:asar@localhost:55432/postgres" npm run db:push

docker cp supabase/tests/01_smoke.sql asar-pg:/tmp/
docker exec asar-pg psql -U postgres -q -f /tmp/01_smoke.sql
```

To start over: drop the `public`, `auth` and `storage` schemas and repeat from
the shim.

## What `01_smoke.sql` covers

The happy path, end to end:

1. Signing up creates a profile via the `auth.users` trigger.
2. An owner creates a mission from a preset and attaches a give-link, which
   auto-approves because its domain is on the allow-list.
3. Anonymous friends contribute on all tracks — pledge, wish-only, volunteer,
   share.
4. A contributor self-confirms their pledge with proof (C-102/C-104).
5. A peer endorses it (T-02) and someone else reports it (T-05).
6. `mission_stats` reports the right tally, per-track counts and momentum.
7. `api_get_mission` returns the page payload; a give-link click is recorded.
8. The reveal stays locked before the birthday.
9. Owner reaction, dashboard and admin overview all work.

Then the part that matters most — nine checks that each **fail**:

| Check | Why it matters |
|---|---|
| Direct `insert` into `contributions` | The anon key must hold no write grant anywhere. |
| Direct `update` of `missions` | Same. |
| Reading `missions.share_token` | Would leak every private mission's secret link. |
| Reading `contributions.manage_token` | Would let anyone confirm anyone's pledge. |
| `api_create_mission` as `anon` | Mission creation requires an account. |
| `api_admin_overview` as `anon` | The admin surface is flag-gated in SQL, not just in the UI. |
| Calling `resolve_mission` as `anon` | Internal helpers must not be reachable — Supabase grants `EXECUTE` on new functions to `anon` by default, and the migration has to take that back. |
| Confirming a pledge with the wrong token | The bearer secret has to actually be checked. |
| Opening a link-only mission without its token | M-06 visibility is enforced server-side. |

Any of these passing where it should fail means the anon key — which ships to
every browser — can do something it shouldn't.
