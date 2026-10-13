# Threat and privacy boundaries

**Ayo Ahmed - Independent concept** · **Independent concept for Semble**

> Unofficial. Synthetic operational data only. Not connected to Semble. Not a clinical system or compliance certification.

## Data and trust

The application accepts only bounded invented operational JSON matching recorded fixture responses. No patient/clinical data, real identifying contact details, arbitrary uploads, secret entry, live model request or external message delivery is part of the flow. Apparent customers, feedback, usage, review signatures, dates and rollout results are synthetic. Official public source evidence in the docs is separate from invented operational evidence.

Rejected inputs are not persisted. Preview rejections expose safe synthetic ID/index, reason and code, not raw sensitive or injected text. Accepted source text is validated fixture text. Initial recorded rejection examples contain only metadata. Exports include accepted synthetic evidence, gate decisions and audit while excluding receipt keys, complete receipt commands, cookie tokens and request metadata.

## Controls and residual risks

| Threat | Enforced control | Remaining boundary |
| --- | --- | --- |
| Cross-site mutation/session fixation | Exact configured destination and Origin, SameSite=Strict HttpOnly Secure host-only public cookie, fetch-metadata refusal, no CORS | Same-origin compromise and a user intentionally copying a possession cookie remain outside the prototype identity model |
| Shared demo data corruption | One SQLite object per SHA-256 digest of 256-bit opaque visitor token; no shared workflow state | Cookies are short-lived visitor possession, not organizational authentication |
| Fabricated sessions or request floods | Provisioned edge creation and API limiters; public fail-closed checks; persisted per-session totals/minute/evaluation caps | Distributed abuse is not eliminated; infrastructure costs/quotas need deployment-owner monitoring |
| Invalid requests bypass limits | Request accounting persists before JSON/domain validation, independently of workflow transaction | Infrastructure rejection happens before workflow access and is bounded by edge limits |
| Large/deep or uncontrolled inputs | 64 KiB streamed read limit, bounded structure/text, ≤20 rows, strict schemas, bounded state/audit/receipt/outbox | This is a synthetic demonstrator, not a universal hostile-file parser |
| Embedded instructions become actions | Instructions refused; no model invocation; extraction must match fixture text/quote/assertion/taxonomy/kind/confidence | Pattern detection alone is insufficient for arbitrary production input; exact fixture allowlist is the stronger boundary here |
| Hallucinated or ungrounded evidence | Exact quote slice; known recorded response; nonexistent themes/features/assertions refused; low-confidence ambiguity isolated | Recorded responses are invented and cannot establish actual customer need |
| Duplicate provenance inflates support | Same source ID counts once; re-ID of the same recorded text counts once; distinct known team provenance counts separately | Synthetic provenance proves mechanics, not production respondent verification |
| Browser bypasses release gates | Pure domain recomputes gates; versions bind signatures; arbitrary fields/readiness flags refused | Named human signatures are simulated decisions, not verified professional approvals |
| Stale/replayed commands | Expected revision, complete content-bound receipts, atomic state+audit+receipt | Receipt limits refuse further mutations rather than silently evicting prior receipts |
| Failed health erased by edits | Paused scope freezes until owned rollback; outcome health/post-review required before new release scope | All rollout/rollback results are simulations; no actual deployment control exists |
| Data leaks through export | Explicit synthetic JSON snapshot, consistent revision/audit, no receipt/session/security metadata | User-saved copies persist outside session expiry; synthetic export is intentionally shareable |
| Notification leakage | Fixed synthetic event/audience enums, opt-out suppression, dedupe, simulated rate limit, no external dispatch | No delivery guarantee is implied because nothing is sent |
| Script injection/clickjacking | Escaped UI content; strict local CSP, MIME protection, frame denial, no-referrer, denied device/payment permissions | Supply-chain/deployment integrity and browser vulnerabilities require separate review |

## Retention and availability

Sessions expire after six real hours; alarms delete their state, with request-time expiry checks even if an alarm is delayed. Maximum 100 synthetic sources, 200 audit entries, 150 receipts and 30 outbox rows bound retained state. Each session has 1,000 requests, 120/minute and ten evaluation runs. Limits are explicit refusal paths, not silent data truncation. Reset retains security accounting and audit/receipt capacity. A fresh session is a separate opaque workspace; there is no administrator access or permanent user account.

Cloudflare's platform serves and stores the prototype. This project makes no claim about production health-data residency, DPIA approval, clinical safety, GDPR certification, ISO certification or legal compliance. Do not enter real personal or health information. Passing the synthetic release gate establishes only that the invented workflow evidence met its stated prototype policy.

## Deployment boundary

Public API operation requires exact approved HTTPS `APP_ORIGIN`, `LOCAL_DEV=false`, `RATE_LIMIT_ENFORCED=true` and provisioned creation/request limiter bindings. The committed blank origin intentionally fails closed. Local loopback fallback is for development only and is not a distributed production protection. Deploying must use the approved destination workflow documented by the project owner; this document does not authorize deployment to an unrelated account or existing service.

Reviewers should assess actual test results in the evaluation report. Injected-fault cases deliberately exercise broken rule wrappers and must show red assertions; their red results are evidence that the suite detects the fault, not a claimed baseline vulnerability fix. Integration and browser checks provide bounded prototype evidence, not exhaustive security assurance.
