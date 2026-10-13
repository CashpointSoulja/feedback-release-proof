# Executed test and evaluation report

This report records executed assertions against the shared backend rules and visitor-isolated HTTP persistence. It does not demonstrate production quality, clinical safety, compliance certification, causal impact or operational time savings.

- Fixed simulation time: `2026-10-13T09:00:00.000Z`.
- Recorded evaluation timestamp: `2026-10-13T08:54:31.922Z`.
- Domain baseline: **58/58 scenarios passed**, 171 assertions, 0 failed scenarios; measured scenario execution 90.274 ms.
- Intentional faults: **3/3 detected**, 4 assertions. Their failed assertions are deliberately red in the evaluation UI. They do not affect application commands.
- Recorded HTTP integration: **31/31 scenarios passed**, 83 assertions, 0 failed scenarios; measured scenario execution 4590.376 ms. Integration timestamp: `2026-10-13T08:54:31.922Z`.

## What executes

`src/evaluation.mjs` exports `runDomainEvaluation()`. The command-line evaluator and authenticated `POST /api/eval` execute this same function. Each scenario starts from an isolated synthetic state and invokes the same `previewImport`, `transition`, `gates` and export functions used by the application. Live evaluation does not mutate the visitor workflow. `tests/integration.mjs` exercises the actual Worker request handler with isolated SQLite persistence.

Every result in [the recorded JSON](../public/eval-report.json) contains expected and actual assertion values, assertion count, status and measured duration. The simulation clock is fixed; runtime durations and generation timestamps are measured at execution and will vary. Durations sum scenario execution and exclude some harness startup and file-writing work.

## Covered protections

The domain cases exercise unknown schemas and taxonomy, nonexistent quotes, unsupported extraction assertions, embedded instructions, patient-shaped sensitive input, mixed-batch atomic refusal, duplicated and re-identified sources, recorded provenance and confidence tampering, ambiguous evidence, import limits, stale previews and mutations, denominator and whole-count consistency, inadequate beta samples and observation windows, owner and escalation requirements, adverse events, current security/privacy/GTM reviews, rollback evidence, stale approvals, idempotent receipts, outbox deduplication, suppression and rate limits, health failure, owned rollback and post-review obligations, authoritative phase/view/action guidance, missing baselines and audit/export consistency. The lifecycle guidance cases verify that a completed rollout requests health or review, a paused rollout requests its owned rollback, and a reviewed outcome requests baseline review and new scoped work. A complete synthetic lifecycle executes the passing path.

HTTP cases exercise exact origins, session cookies, visitor isolation and reload persistence, forged and duplicate cookies, method/query/body bounds, server-issued preview binding, atomic import refusal, content-bound idempotency, concurrent identical requests and concurrent revision conflicts, export privacy, security headers, live evaluation isolation and limits, valid and invalid request budgets, HTTPS cookie attributes and fail-closed public configuration without rate protection.

## Intentional broken-rule fixtures

These isolated adapters actually produce incorrect behavior and fail the evaluator's assertions. They are distinct from the baseline:

- `fault-missing-privacy`: Catch GATE_BLOCKED and force a ready result for missing privacy. Expected: Missing privacy must refuse signing: GATE_BLOCKED Actual: Missing privacy must refuse signing: ready
- `fault-fabricated-quote`: Replace failed quote validation with acceptance in an isolated preview adapter. Expected: Fabricated quote must be rejected: QUOTE_MISMATCH; Invalid batch cannot commit: false Actual: Fabricated quote must be rejected: accepted; Invalid batch cannot commit: true
- `fault-duplicate-outbox`: Append a duplicate outbox record after the shared dedupe rule executes. Expected: Duplicate identity must retain one entry: 1 Actual: Duplicate identity must retain one entry: 2

## Executed domain cases

| Scenario | Result | Assertions | Measured ms |
| --- | --- | ---: | ---: |
| wrong-schema | passed | 4 | 2.114 |
| nonexistent-quote | passed | 4 | 1.223 |
| embedded-instructions | passed | 4 | 0.32 |
| sensitive-patient-shaped | passed | 4 | 0.354 |
| unknown-taxonomy | passed | 4 | 0.153 |
| unsupported-assertion | passed | 4 | 0.454 |
| partial-invalid-atomic | passed | 4 | 0.513 |
| duplicate-source | passed | 4 | 0.913 |
| independent-sources | passed | 2 | 0.487 |
| relabelled-source-not-independent | passed | 2 | 0.345 |
| extraction-kind-tamper | passed | 3 | 0.085 |
| extraction-confidence-tamper | passed | 3 | 0.038 |
| source-conflict | passed | 2 | 0.095 |
| ambiguous-source | passed | 3 | 0.448 |
| import-row-bound | passed | 1 | 0.114 |
| stale-preview | passed | 2 | 0.512 |
| no-denominator | passed | 2 | 1.731 |
| no-owner | passed | 2 | 1.032 |
| no-observation-window | passed | 2 | 1.004 |
| insufficient-beta-sample | passed | 2 | 1.034 |
| incomplete-beta-window | passed | 2 | 0.888 |
| low-beta-completion | passed | 2 | 0.809 |
| high-beta-errors | passed | 2 | 4.046 |
| adverse-escalation | passed | 2 | 0.777 |
| adverse-event-pause | passed | 2 | 0.928 |
| inconsistent-beta-counts | passed | 2 | 0.118 |
| missing-security | passed | 2 | 3.042 |
| missing-privacy | passed | 2 | 2.473 |
| missing-rollback | passed | 2 | 1.656 |
| missing-gtm | passed | 2 | 1.492 |
| failed-rollback-rehearsal | passed | 3 | 1.778 |
| rollback-result-required | passed | 2 | 0.057 |
| stale-reviews-after-edit | passed | 3 | 3.719 |
| stale-beta-approval | passed | 3 | 2.611 |
| stale-mutation | passed | 2 | 0.817 |
| approval-idempotency | passed | 4 | 1.769 |
| duplicate-notification | passed | 2 | 0.292 |
| suppressed-notification | passed | 3 | 0.513 |
| notification-rate-limit | passed | 4 | 0.886 |
| health-failure-rollback | passed | 8 | 3.894 |
| post-review-denominator | passed | 2 | 3.012 |
| post-review-numerator | passed | 2 | 3.034 |
| paused-feature-edit | passed | 3 | 3.137 |
| paused-beta-edit | passed | 3 | 2.96 |
| paused-review-edit | passed | 3 | 3.727 |
| rollback-postreview-obligation | passed | 2 | 3.596 |
| released-postreview-obligation | passed | 4 | 2.387 |
| reviewed-new-cycle | passed | 4 | 2.451 |
| happy-lifecycle | passed | 5 | 2.407 |
| export-audit-consistency | passed | 6 | 0.857 |
| guidance-initial-feedback | passed | 2 | 0.233 |
| guidance-beta-approval | passed | 3 | 0.992 |
| guidance-signed-release | passed | 2 | 1.642 |
| guidance-awaiting-health | passed | 4 | 1.992 |
| guidance-healthy-postreview | passed | 4 | 3.449 |
| guidance-owned-rollback | passed | 3 | 2.882 |
| guidance-resolved-rollback | passed | 3 | 2.863 |
| guidance-reviewed-next-cycle | passed | 4 | 3.119 |

## Recorded HTTP cases

| Scenario | Result | Assertions | Measured ms |
| --- | --- | ---: | ---: |
| http-static-security-headers | passed | 4 | 167.676 |
| http-origin-missing | passed | 2 | 9.982 |
| http-hostile-origin | passed | 1 | 7.911 |
| http-host-mismatch | passed | 1 | 4.281 |
| http-session-cookie | passed | 5 | 11.858 |
| http-no-session | passed | 1 | 3.275 |
| http-forged-session | passed | 1 | 4.066 |
| http-duplicate-cookie | passed | 1 | 3.351 |
| http-cross-site-read | passed | 1 | 2.572 |
| http-query-rejected | passed | 2 | 2.051 |
| http-method-rejected | passed | 1 | 2.435 |
| http-content-type | passed | 1 | 2.796 |
| http-invalid-json | passed | 2 | 2.611 |
| http-stream-size-bound | passed | 2 | 3.373 |
| http-command-contract | passed | 1 | 3.685 |
| http-preview-required | passed | 3 | 4.045 |
| http-preview-import | passed | 5 | 12.3 |
| http-import-receipt-replay | passed | 4 | 3.934 |
| http-content-bound-receipt | passed | 2 | 3.225 |
| http-reload-and-isolation | passed | 4 | 6.79 |
| http-atomic-invalid-import | passed | 4 | 9.268 |
| http-stale-mutation | passed | 4 | 5.01 |
| http-concurrent-identical | passed | 3 | 5.468 |
| http-concurrent-conflict | passed | 2 | 6.243 |
| http-export-consistency | passed | 6 | 3.011 |
| http-live-evaluation | passed | 5 | 92.646 |
| http-evaluation-bound | passed | 2 | 603.422 |
| http-request-bound | passed | 2 | 168.078 |
| http-invalid-request-bound | passed | 4 | 257 |
| http-public-fail-closed | passed | 2 | 81.584 |
| http-secure-cookie-policy | passed | 5 | 3096.429 |

## Reproduction and limits

Run `npm test` for the domain evaluator and `npm run test:integration` for HTTP persistence checks. The HTTP harness needs local loopback networking. Test commands return failure for any baseline/integration failure or an undetected injected fault. `public/eval-report.json` and `public/integration-report.json` are recorded artifacts; the live UI evaluation reruns domain assertions and labels the HTTP integration as recorded.

All source text, extraction responses, beta observations and messages are invented. No external notification or deployment happens in these tests. Static header checks use an isolated asset fixture; actual app visual, accessibility and browser workflow checks are recorded separately. Rate-limit and HTTPS configuration checks run locally and do not establish production provisioning. There is no long-running production observation window or measured production improvement in this report.
