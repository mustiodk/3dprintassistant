# Incident response runbook

**Last updated:** 2026-04-23 (IR-2a session).
**Scope:** the web app (3dprintassistant.com) and the iOS app.

Solo-dev scope — intentionally short. When the app breaks, the goal is **stop the bleeding in under 10 minutes**, not run a formal postmortem.

---

## Where the signal comes from

| What you're watching | Link / channel |
|---|---|
| iOS crash reports + non-fatal errors | Sentry → project `apple-ios` → **Issues** tab |
| User feedback (web + iOS) | Discord `#web-app-feedback` + `#3dpa-ios-feedback` |
| Web traffic / error rate / region mix | Cloudflare → 3dprintassistant.com → Analytics |
| `/api/feedback` Worker health | Cloudflare → Workers & Pages → Functions → Logs |
| App Store users who can't install | App Store Connect → My Apps → 3D Print Assistant → App Analytics |

**The single most useful thing after any ship:** check Sentry's Issues tab for the first 24h. If something regressed, it's in there.

---

## Rollback procedures

### Web (Cloudflare Pages)

Auto-deploys from the `main` branch. Roll back with a revert commit:

```bash
cd ~/Documents/Claude/Projects/3dprintassistant
git log --oneline -5                     # find the bad SHA
git revert <bad-sha> --no-edit
git push origin main                      # Cloudflare redeploys in ~30s
```

Verify by hard-refreshing 3dprintassistant.com and checking the engine.js SHA in the footer (if exposed) or by testing the broken behaviour is gone.

### iOS (App Store / TestFlight)

**TestFlight (pre-release):**
- App Store Connect → TestFlight → Builds → select the bad build → **Expire Build** (testers can no longer install it).
- Or: push a corrected commit → CI auto-uploads a new TestFlight build within ~10 min.

**Released App Store version (post-Apple-review):**
- You can't "unship" a released binary. Options:
  1. **Remove from sale** — App Store Connect → App → Pricing & Availability → clear all territories. Takes effect in ~1h. Blast radius: new downloads stop, existing installs keep working.
  2. **Expedited bug fix** — submit a new version with an expedited-review request (App Store Connect → Contact Us). Apple usually reviews expedited fixes in under 24h. This is the normal path for anything that isn't a data-destruction bug.
- Don't panic-reject your own app from App Store — removal is reversible, rejection isn't always.

---

## Common symptoms → first move

| Symptom | First action |
|---|---|
| Sentry Issues tab spikes on a specific iOS version | Check the stack trace. If it's in engine.js, revert the last `engine:` commit on web + iOS. If it's in Swift UI code, revert the last iOS-only commit. |
| Feedback stopped arriving in Discord | `/api/feedback` endpoint failing — check Cloudflare Workers Logs for the function. Most likely: Discord webhook rate-limited (30/min), or `DISCORD_WEBHOOK_URL` env var got unset. |
| iOS app won't launch (crash on start) | Sentry will show `EngineError.initFailed(...)` with the JS message (HIGH-004 made this real, not a timeout). Fix the data file or engine.js line it names, revert + push. |
| Web profile page is blank | `app.js` caught an exception during render — open the browser console to find the first red line. Most recent engine/data change is the likely cause. |
| User reports "wrong value" for their printer | Reproduce in the walkthrough harness (`node scripts/walkthrough-harness.js`) — add the user's combo to `COMBOS[]` if not covered. |

---

## After the dust settles

If the incident was notable (affected real users, took more than ~30 min to resolve, or surfaced a gap in detection):

1. Add a test combo to `scripts/walkthrough-harness.js` that would have caught it.
2. If it was a data-shape issue, add it to the IR-5 backlog as a schema-validation candidate (`[R8]`).
3. Update this runbook with the new symptom → first-move row if it was novel.

**Do not** write a formal postmortem for a <20-user-a-week app. Overhead isn't justified. A one-line note in the session log is enough.

---

## Maintenance

This runbook is intentionally minimal. Grow it only when:
- A real incident revealed a gap here.
- The app's user base grows past the point where "email Musti" stops being a viable escalation path.

At that point it's a different document — this is the solo-dev version.
