#!/usr/bin/env node
/**
 * Load test for `cast_ballot` — SDEC_PLAN §10 Phase 7 ("script ~2,000
 * simulated cast_ballot calls against a staging Supabase project, and
 * check for no deadlocks or double votes").
 *
 * NOT run anywhere automatically, and NOT written to be run against this
 * app's real dev/prod project — it consumes real voters' logins and
 * casts real votes against a real election. Point it only at a
 * disposable staging Supabase project seeded with throwaway voters and a
 * live test election (see supabase/seed.sql for the shape).
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_ANON_KEY=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   ELECTION_SLUG=your-live-test-election \
 *   node scripts/load-test-cast-ballot.mjs [voterCount] [concurrency]
 *
 * What it does:
 *   1. Picks up to `voterCount` active, eligible voters for the election
 *      who haven't voted yet.
 *   2. For each, mints a real session via the Admin API (same mechanism
 *      as AUTH_DEV_BYPASS — generateLink + verifyOtp), then calls
 *      `cast_ballot` as that voter, picking one random valid candidate
 *      per eligible position.
 *   3. Runs those with bounded concurrency and reports success/failure
 *      counts, grouped by error message.
 *   4. Re-submits a sample of already-voted voters concurrently, to
 *      specifically stress the "can't vote twice" path — this MUST
 *      produce exactly one success and the rest `already_voted`, never
 *      more than one success (that would mean the primary-key guard in
 *      `cast_ballot` failed under concurrency).
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELECTION_SLUG = process.env.ELECTION_SLUG;
const VOTER_COUNT = Number(process.argv[2] ?? process.env.VOTER_COUNT ?? 2000);
const CONCURRENCY = Number(process.argv[3] ?? process.env.CONCURRENCY ?? 50);
const DOUBLE_VOTE_SAMPLE = Number(process.env.DOUBLE_VOTE_SAMPLE ?? 20);

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY || !ELECTION_SLUG) {
  console.error(
    "Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and ELECTION_SLUG.",
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Mints a real session for a voter's email the same way AUTH_DEV_BYPASS
 * does (src/actions/auth.ts), then returns a client acting as that user —
 * anon key as the base (so RLS applies), user's access token overriding
 * the Authorization header. */
async function clientForVoter(email) {
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) throw linkError;

  const otp = link.properties?.email_otp;
  if (!otp) throw new Error(`No OTP returned for ${email}`);

  const bootstrap = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified, error: verifyError } = await bootstrap.auth.verifyOtp({
    email,
    token: otp,
    type: "email",
  });
  if (verifyError) throw verifyError;

  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${verified.session.access_token}` } },
  });
}

async function pool(items, concurrency, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i).catch((err) => ({ ok: false, error: err.message }));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function summarize(results) {
  const summary = { ok: 0, failed: 0, byError: {} };
  for (const r of results) {
    if (r?.ok) {
      summary.ok++;
    } else {
      summary.failed++;
      const key = r?.error ?? "unknown";
      summary.byError[key] = (summary.byError[key] ?? 0) + 1;
    }
  }
  return summary;
}

async function main() {
  const { data: election, error: electionError } = await admin
    .from("elections")
    .select("id, title, allow_nota")
    .eq("slug", ELECTION_SLUG)
    .single();
  if (electionError || !election) throw new Error(`Election "${ELECTION_SLUG}" not found`);

  const { data: positions, error: positionsError } = await admin
    .from("positions")
    .select("id, max_choices, candidates(id, status)")
    .eq("election_id", election.id);
  if (positionsError) throw positionsError;

  const ballotPositions = positions
    .map((p) => ({ id: p.id, max_choices: p.max_choices, candidates: p.candidates.filter((c) => c.status === "approved") }))
    .filter((p) => p.candidates.length > 0);
  if (ballotPositions.length === 0) throw new Error("Election has no positions with approved candidates");

  function randomSelections() {
    return ballotPositions.map((p) => {
      const shuffled = [...p.candidates].sort(() => Math.random() - 0.5);
      const count = 1 + Math.floor(Math.random() * p.max_choices);
      return {
        position_id: p.id,
        is_nota: false,
        candidate_ids: shuffled.slice(0, count).map((c) => c.id),
      };
    });
  }

  const { data: participation, error: participationError } = await admin
    .from("voter_participation")
    .select("voter_id")
    .eq("election_id", election.id);
  if (participationError) throw participationError;
  const alreadyVoted = new Set((participation ?? []).map((p) => p.voter_id));

  const { data: activeVoters, error: votersError } = await admin
    .from("voters")
    .select("id, email")
    .eq("is_active", true);
  if (votersError) throw votersError;

  const voters = activeVoters.filter((v) => !alreadyVoted.has(v.id)).slice(0, VOTER_COUNT);

  console.log(`Election: ${election.title} (${election.id})`);
  console.log(`Casting up to ${voters.length} ballots at concurrency ${CONCURRENCY}...`);

  const start = Date.now();
  const results = await pool(voters, CONCURRENCY, async (voter) => {
    const client = await clientForVoter(voter.email);
    const { error } = await client.rpc("cast_ballot", {
      p_election: election.id,
      p_selections: randomSelections(),
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  });
  const elapsedMs = Date.now() - start;

  const summary = summarize(results);
  console.log(`\nDone in ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`  ok: ${summary.ok}`);
  console.log(`  failed: ${summary.failed}`);
  if (Object.keys(summary.byError).length > 0) {
    console.log("  errors:", summary.byError);
  }

  if (DOUBLE_VOTE_SAMPLE > 0 && summary.ok > 0) {
    const votedVoters = voters.slice(0, Math.min(DOUBLE_VOTE_SAMPLE, summary.ok));
    console.log(`\nRe-attempting ${votedVoters.length} already-voted voters concurrently (expect exactly 1 ok, rest already_voted)...`);
    const retryResults = await pool(votedVoters, votedVoters.length, async (voter) => {
      const client = await clientForVoter(voter.email);
      const { error } = await client.rpc("cast_ballot", {
        p_election: election.id,
        p_selections: randomSelections(),
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    });
    const retrySummary = summarize(retryResults);
    console.log(`  ok: ${retrySummary.ok} (should be 0 — these voters already voted above)`);
    console.log(`  already_voted: ${retrySummary.byError.already_voted ?? 0} (should equal ${votedVoters.length})`);
    if (retrySummary.ok > 0) {
      console.error("  ⚠ DOUBLE VOTE DETECTED — a voter who already voted was allowed to vote again.");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
