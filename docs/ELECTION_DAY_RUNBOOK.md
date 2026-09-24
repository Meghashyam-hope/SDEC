# SDEC — Election Day Runbook

For the election commission running a live election. Assumes the app is
already deployed and the election exists in `/admin/elections` — this is
about the day itself, not initial setup (see `sdec-web/README.md` for that).

---

## Pre-flight checklist (do this the day before)

- [ ] **Voter roll is current.** `/admin/voters` — import any last-minute
      CSV updates. Deactivate anyone who's left, rather than deleting them
      (deleting a voter who's already cast a ballot or been nominated
      would break foreign-key references).
- [ ] **Election details are locked in.** On `/admin/elections/<id>` →
      Details: schedule (in IST), results visibility, NOTA setting,
      eligibility. Once the election goes **live**, these fields lock
      except the description — double check before that happens.
- [ ] **Every position has enough approved candidates.** Positions &
      candidates tab, and/or the Nominations tab if this election used
      self-nomination. `Publish` (Controls tab) will refuse to go live if
      any position has zero approved candidates or `max_choices` exceeds
      the approved candidate count — better to catch that now than at
      go-time.
- [ ] **The election is published.** Draft elections are invisible to
      students. Controls tab → Publish, once positions/candidates are
      final.
- [ ] **Test the flow yourself.** Sign in as a seeded/test voter (not an
      officer account) and walk through login → ballot → review → cast →
      receipt on a phone-width browser window. This is the single best
      way to catch a bad eligibility rule or a missing candidate before
      real students hit it.
- [ ] **Custom SMTP is live**, if this is a real (non-dev-bypass) election
      — see the Production checklist in `sdec-web/README.md`. Send
      yourself a test OTP the day before, not the morning of.

---

## During voting

### If email is slow or not arriving

- Ask the student to check spam/junk first — this is the most common
  cause, especially right after the election opens and a burst of OTP
  emails goes out at once.
- Confirm the roll number is actually on the roll and active
  (`/admin/voters`, search by roll number). "Not on the voter roll" is a
  different problem from "email didn't arrive" — the login UI
  distinguishes the two, so check what the student actually saw first.
- If `AUTH_DEV_BYPASS` is still on (it shouldn't be for a real election —
  see the Production checklist), the code shows directly in the UI and
  there's no email to wait for at all.
- Check your SMTP provider's dashboard (Resend/Brevo/etc.) for bounces or
  rate-limit warnings. Free-tier email limits are usually the first thing
  to break under a real turnout burst.
- As a last resort for one student: have them wait ~60 seconds and use
  the "Resend" button rather than repeatedly re-submitting their roll
  number, which just adds to the same rate limit.

### Pausing an election

If something is actively wrong (a bad candidate list, a hosting issue,
anything you'd want to freeze mid-vote): `/admin/elections/<id>` →
Controls → **Pause**. This stops new votes immediately; votes already
cast are unaffected. Students see a calm "voting is paused, check back
soon" screen rather than an error. Type the election's exact title to
confirm — this is deliberate friction so it can't happen by accident.

**Resume** the same way once the issue is fixed. Pausing and resuming is
audit-logged both ways.

### Closing early or cancelling

- **Close early**: ends voting now instead of at the scheduled time.
  Votes already cast still count. Use this if, say, turnout has clearly
  plateaued and you want to move to results sooner — not as a way to cut
  off a contested result.
- **Cancel**: the election is over for good, no results will be
  published. Use only for a genuinely broken election (wrong candidate
  list discovered live, an eligibility error that can't be fixed
  mid-vote, etc.), not as a way to undo a result you don't like — votes
  already cast are not deleted, just never surfaced.

Both require typing the election's exact title, and both are permanent —
there's no "undo" action, only a fresh election.

---

## After voting closes

1. **Check turnout** (`/admin/elections/<id>` → Turnout) — updates live,
   no action needed here beyond watching it.
2. **Review results** (Results tab) — visible to officers/admins once the
   election has ended, even before publishing. Look for:
   - Any position flagged **"Tie at the seat cutoff"** — this needs a
     manual decision by the commission; the app doesn't auto-resolve
     ties.
   - Vote counts that look implausible for the turnout — worth a sanity
     check before publishing, not after.
3. **Publish results** when ready (Results tab → Publish results). This
   is one-way — there's no unpublish. Students and the public can then
   see `/results/<slug>`.
4. **Export a CSV** of the final results (Results tab → Export CSV) for
   your own records before moving on to the next election.

---

## Quick reference

| Situation | Where |
|---|---|
| Student can't log in | `/admin/voters` — check roll number is active |
| Need to pause/resume/close/cancel | `/admin/elections/<id>` → Controls |
| Review or approve/reject nominations | `/admin/elections/<id>` → Nominations |
| Check live turnout | `/admin/elections/<id>` → Turnout |
| Publish results | `/admin/elections/<id>` → Results |
| Verify a specific receipt | `/verify` (public) |
| Full history of who did what | `/admin/audit` (admin only) |
