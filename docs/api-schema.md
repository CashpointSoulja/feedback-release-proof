# Synthetic API and domain contract

**Ayo Ahmed - Independent concept** · **Independent concept for Semble**

> Unofficial. Synthetic operational data only. Not connected to Semble. Not a clinical system or compliance certification.

The browser and evaluation suite use the same deterministic rules in `src/domain.mjs`. The Worker owns visitor persistence, admission limits and origin checks. All numbers, observations, signatures and operational results are synthetic. Signatures record an explicitly named simulated human decision; they do not authenticate that person or certify a release.

## Shared exports

- `initialState()` returns a fresh synthetic workspace at revision 0.
- `previewImport(rows, state)` returns `{accepted, evidence, ambiguous, rejected, duplicates, canCommit, previewId, revision, atomic}` without changing state.
- `transition(state, command)` returns `{state, result}` or throws `DomainError(code, message, details)`. The input is not mutated.
- `gates(state)` returns `{beta, release, postReview, nextDecision, nextPhase, nextView, nextAction, policy, synthetic}`. Each named gate has `{ready, blockers}` and each blocker has `{code, label, owner, nextAction}`.
- `safeExport(state)` returns the consistent synthetic snapshot, gate decisions and audit; it omits private idempotency receipts.
- `SIMULATION_TIME` is `2026-10-13T09:00:00.000Z`. Domain audit time advances deterministically by one minute per accepted command. Security expiry/rate limits use actual server time.
- `SAMPLE_ROWS`, `FIXTURE_SETS` and `POLICY` are exported by `src/fixtures.mjs`.

## HTTP

Every API request must target the exact configured `APP_ORIGIN`. Every POST also requires an exact same-origin `Origin` header. Cross-site fetch metadata is refused. APIs reject query parameters, unsupported methods and unknown routes. There is no CORS allowance. Content type for POST is `application/json`.

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| POST | `/api/session` | `{}` | `{state, gates, expiresAt}` and opaque HttpOnly cookie |
| GET | `/api/state` | — | `{state, gates, expiresAt}` |
| GET | `/api/fixtures` | — | `{SAMPLE_ROWS, FIXTURE_SETS, POLICY, extractionMode}` |
| POST | `/api/preview` | `{rows}` | `{preview}` |
| POST | `/api/command` | `{type, payload, expectedRevision, idempotencyKey}` | `{state, result, gates, expiresAt}` |
| GET | `/api/export` | — | JSON attachment from `safeExport` |
| POST | `/api/eval` | `{}` | Actual shared-domain evaluation report; isolated test states, no visitor-state mutation |

All endpoints except session creation require the cookie. Public cookie is `__Host-feedback_session`, with Secure, HttpOnly, SameSite=Strict, Path=/ and six-hour Max-Age. The local-only HTTP cookie is `feedback_session_local`. Cookie tokens contain 256 random bits; only a SHA-256 digest routes to an isolated SQLite Durable Object. Session tokens are never returned in JSON or exports. Initial state and command responses omit receipt keys and complete recorded receipt commands.

Failures use `{error:{code,message,details}}`. Important HTTP statuses: schema refusal 400; stale revision, stale preview, idempotency conflict, gate blocked or illegal lifecycle 409; absent session 401; cross-origin 403; expired session 410; oversized JSON 413; capacity/rate limit 429; unprovisioned origin or public abuse protection 503. Error details can include gate blockers or a safe preview. Sensitive/rejected rows expose only index, safe synthetic ID, refusal code and reason, never their raw text.

## Strict row schema

```json
{
  "sourceId": "syn-support-01",
  "kind": "support",
  "synthetic": true,
  "text": "Synthetic team A: reminder setup takes too many steps.",
  "extraction": {
    "theme": "workflow",
    "featureId": "reminder",
    "quote": "reminder setup takes too many steps",
    "start": 18,
    "end": 53,
    "assertion": "reduce-reminder-steps",
    "confidence": 0.94
  }
}
```

Only these fields are accepted. Kind is support/interview/sales/usage; theme is workflow/reliability/accessibility/adoption. IDs use `syn-` and bounded safe characters. Quote spans use JavaScript string indexes with end exclusive, and must equal the source slice exactly. Source text, quote, taxonomy, assertion, kind and confidence must match a recorded invented extraction fixture. The feature must exist. No live extraction service is called. Unknown assertions, quote mismatches, extra fields, instructions and patient-shaped/identifying sensitive data are refused.

Confidence under 0.7 or the recorded unclear-scope assertion stays in `ambiguous`; it cannot count as supporting evidence. Repeating one source identity counts once. Re-identifying the same recorded source text also counts once; distinct Team A and Team B provenance count independently even when the supporting quote is identical. `FIXTURE_SETS.independent` demonstrates that distinction.

A preview is not an import. Any rejected row blocks the entire commit. The browser must fix the complete batch rather than silently discard rows. A commit must name the preview and exact rows at the same revision; the server also retains the complete canonical preview content. Accepted and ambiguous sources, opportunities, audit and receipt then commit in one transaction. A preview never writes workflow state. A duplicate-only valid batch records a deduplicated import, without inflating evidence.

## Commands

All HTTP command fields are mandatory. `expectedRevision` is a nonnegative integer. `idempotencyKey` is 8–100 safe alphanumeric/underscore/hyphen characters. Replay of the exact recorded command returns the recorded result without another mutation, even if the workspace has since advanced; changing content under the same key is refused. New keys with a stale revision are refused. Direct domain use supports omitted revision/key for isolated evaluation helpers; production HTTP does not.

| Type | Payload fields | Effect |
| --- | --- | --- |
| `importRows` | rows, previewId | Atomic validated import; derives opportunities |
| `updateFeature` | featureId, patch | Allowed patch: title, owner, hypothesis, metric, denominator, target, observationWindow; increments content version and invalidates corresponding decisions |
| `prioritize` | featureId, owner, rationale | Human priority bound to current content/evidence; at least one supporting source needed |
| `recordBeta` | sampleSize, observedDays, completionRate, errorRate, observations, riskNotes, adverseEvents, adverseEscalation | Replaces beta evidence and increments beta version; rates imply whole counts |
| `approveBeta` | owner | Simulated human beta approval after beta gates pass |
| `recordReview` | kind, owner, notes | Versioned scoped security or privacy review |
| `recordRollback` | owner, testEvidence, successful | Versioned simulated rollback rehearsal evidence; false blocks release |
| `recordGtm` | owner, audience, message, supportPlan | Versioned GTM handoff |
| `signRelease` | owner, rationale | Signs the exact feature/beta/review/rollback/GTM versions after evidence gates pass |
| `simulateRelease` | none: `{}` | Records simulated release; performs no deployment |
| `recordHealth` | healthy, owner, note | Healthy result or owned paused rollout |
| `resolveRollback` | owner, evidence | Resolves the pending owned rollback; records rolled-back status |
| `postReview` | owner, observedOutcome, baseline, measured, denominator, window, notes | Records observed synthetic count, window and limitations; null baseline is explicitly missing |
| `weeklyReview` | owner, decision, nextAction, baseline, observed | Evidence-led cadence record; zero baseline differs from null |
| `enqueueNotification` | event, audience, message | Synthetic outbox only; deduplicates and suppresses opt-out |
| `dispatchOutbox` | none: `{}` | Simulates at most three deliveries in the fixed window; sends no messages |
| `reset` | none: `{}` | Resets synthetic scenario while retaining revision, accounting, receipts and audit capacity |

Beta sample is a whole number and observations are full days. Rates are fractions, not percentages. `sampleSize * completionRate` and `sampleSize * errorRate` must be whole counts; derived `completionCount` and `errorCount` are stored. Example: N=100, completion=.94, error=.01 means 94 completions and one operational error. N=30 with completion=.95 is refused because 28.5 completions is impossible. `adverseEvents` is at most ten plain summaries; any event blocks beta until a human investigates and replaces the evidence with a resolved scenario. Post-review measured is a count, cannot exceed its positive whole denominator, and cannot establish causal impact when baseline is null.

Outbox event is beta-approved/release-ready/rollback/weekly-review. Audience is internal-synthetic/synthetic-opt-out. Dedupe binds event, audience, feature content version and beta version. Synthetic opt-out is suppressed. Three simulated deliveries exhaust this session's fixed simulation window; remaining rows become rate-limited. Neither enqueue nor dispatch invokes an external communication tool.

## State and gates

Top-level state fields are `schemaVersion, revision, simulationTime, project, features, opportunities, sources, evidence, ambiguous, rejections, beta, release, postReview, weeklyReview, outbox, audit`. Internal state also holds `receipts`, omitted from HTTP and export. The only scoped seed feature is `reminder`. Evidence and opportunities start empty; recorded refusal metadata is visibly seeded and labelled as recorded.

Beta exit requires owner, hypothesis, metric, denominator, target, observation window, human priority, at least two independent sources, sample ≥30, seven full days, completion ≥90%, errors ≤1%, observations, operational risks and named adverse-event escalation with no unresolved events. These are prototype workflow thresholds, not Semble or healthcare production standards; N=30 does not establish a true 1% error bound.

Release additionally requires current beta approval, scoped security/privacy reviews, successful rollback rehearsal evidence, GTM handoff and current simulated human signature. The final signature binds content, beta, release and all four evidence versions. Feature edits invalidate human priority, beta approval and all scoped review/handoff/signature evidence. Beta edits invalidate beta approval and final signature. Review, rollback or GTM replacement invalidates the final signature.

Failed health pauses rollout, removes release signature and creates an owned rollback obligation. While paused, scoped content/evidence/review/signature edits and reset are refused; a later healthy check cannot clear the obligation. Resolve rollback, then complete post-review. Released and rolled-back outcomes cannot skip health/post-review by editing evidence. After review, a new scoped feature/beta version can open a new draft release. A signature cannot directly re-release an already reviewed old rollout. The authoritative next-decision phase routes a completed rollout to health, owned rollback, post-review or outcome review; it never prompts reuse of an old signature. `nextView` is feedback/release/health/review and `nextAction` names the relevant domain command.

## Bounds

JSON body ≤64 KiB, nesting ≤12, ≤2,000 JSON nodes, bounded text, import 1–20 rows, ≤100 sources, ≤200 audit entries, ≤150 receipts, ≤30 outbox rows. Refusal records never retain raw rejected text. Sessions last six real hours and allow 1,000 total requests, 120 requests/minute and ten evaluation runs. Invalid schema, stale revision and blocked commands still consume request accounting; they do not change workflow revision/audit. Public edge protection limits new sessions to ten/minute and API requests to 120/minute per hashed client-address bucket. Rate limits are infrastructure protections, not a user identity or guarantee against distributed abuse.
