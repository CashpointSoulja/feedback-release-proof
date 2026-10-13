# Release, health and rollback runbook

**Ayo Ahmed - Independent concept** · **Independent concept for Semble**

> Unofficial. Synthetic operational data only. Not connected to Semble. Not a clinical system or compliance certification.

## Scope and authority

I use this runbook for a simulated appointment-reminder workflow release in an isolated prototype session. No reminder is delivered and no patient or Semble system is accessed. Human priority, beta and release decisions remain explicit. The prototype's typed names/signatures are simulated attestations, not verified identity, cryptographic signatures or legal/compliance approval.

Canonical fields/commands are in [api-schema.md](api-schema.md); this document explains the operating decision. The backend enforces gates. A browser display, exported checklist or confident extracted theme cannot substitute for current stored evidence.

## Before prioritisation

Record a safe synthetic source and exact quote. Run the bounded extractor, validate schema/taxonomy and quote fidelity, and review exclusions. Sensitive or invalid records are unusable. Duplicates are not independent support. Reusing the same recorded fictional-team provenance with a new source ID still counts once. Ambiguous evidence needs clarification.

The human product owner can record priority once valid supporting evidence exists. At least **two independent valid supporting sources** are required for beta/release readiness. Record priority, an accountable owner, a hypothesis and an outcome with denominator and window. A large count alone is not a priority argument; the owner must explain the expected outcome and tradeoff.

## Beta exit decision

| Required evidence | Blocking condition | Next accountable action |
| --- | --- | --- |
| Declared synthetic sample and observed days | N < 30 or fewer than 7 observed days | Feature owner extends or corrects evidence. |
| Declared completion rate | Completion < 90% or rate/sample imply a fractional completion count | Feature/data owner investigates and updates evidence. |
| Declared error rate | Error > 1% or rate/sample imply a fractional error count | Feature owner investigates failure; reviewer considers severity. |
| Operational-risk notes | Missing risk context or unaddressed limitation | Owner records risks and mitigating/stop conditions. |
| Adverse-event and escalation coverage | Missing coverage or unresolved adverse signal | Relevant human reviewers assess; name escalation owner. |
| Explicit human beta approval | Evidence missing/stale or reviewer has not decided | Product owner reviews the current scope/evidence. |

The prototype stores sample size, observed days, rates, derived whole-number completion/error counts and explanatory notes. It does not independently verify real timestamps or raw event records. A production reviewer must reconcile those counts and exposure before accepting rates. These are **synthetic policy thresholds**, not production safety criteria. A passing sample does not prove a true 1% error bound. Severe signals or unresolved risks need human escalation even when an aggregate threshold passes. The prototype records simulated evidence; a real release requires the organisation's authorised policy and reviewers.

## Release readiness and final decision

For the **current feature content version**, require the following evidence before final signature:

1. Human prioritisation and a defined outcome.
2. Approved beta exit with current evidence.
3. Human security/privacy review with its scope, evidence and outstanding risks recorded.
4. Rollback readiness: a named owner, rehearsal evidence and an explicit `successful: true` simulated rehearsal result. A recorded failed rehearsal blocks release; a generic evidence note alone cannot pass this gate.
5. GTM/support handoff: who is affected, what changes, support guidance and communication ownership.
6. A named human release owner who inspects all gates and signs the current version.

Security/privacy evidence is an operational review record. It does not certify GDPR, CQC, clinical safety, ISO 27001 or any other standard. The independent prototype does not inherit Semble's advertised security/compliance properties. A real reviewer must resolve applicable obligations independently.

## What counts as successful rollback rehearsal

For a real release I would require a documented rehearsal for the candidate scope: starting/target state, steps and authorised owner, verification of the recovered behaviour/data, measured recovery time, failures/limitations and an explicit pass decision. If compatibility, data restoration or fallback is unverified, readiness remains incomplete. A generic note that a rollback plan exists is insufficient.

In this prototype, `recordRollback` requires a Boolean `successful` field along with the owner and evidence. `false` retains failed rehearsal evidence and blocks release; only an explicit `true` can satisfy readiness. Rehearsal evidence and that pass attestation describe a **simulated exercise**. They do not prove that software, infrastructure or data were restored. A production release needs the actual rehearsal and independent evidence appropriate to its risk.

## Version binding and invalidation

| Change | Approvals invalidated | Required follow-up |
| --- | --- | --- |
| Feature content/scope edit | Prioritisation, beta approval, security/privacy review, rollback evidence, GTM handoff and final signature | Reassess the changed scope and rebuild the approval chain. |
| Beta evidence edit | Beta approval and final release signature | Human beta review and final release decision again. |
| Replacement security/privacy review | Final release signature | Release owner reviews the new evidence and signs again. |
| Replacement rollback evidence | Final release signature | Release owner confirms current recovery readiness. |
| Replacement GTM handoff | Final release signature | Release owner reviews current communication/support scope. |

After a simulated rollout, the backend requires health observation and post-review before release evidence can be changed. A failed-health pause additionally requires owned rollback resolution first. These recovery gates prevent an edit from erasing the unresolved outcome. The exact binding is in the backend contract. Do not copy an old signature into a new release record. The audit history should explain what changed and which human action is now needed. Prior export documents remain historical evidence; they are not fresh approval for later edits.

## Synthetic post-release health

Record a simulated human health observation: healthy/failed status, named owner and explanatory note. The prototype does not compute health from live telemetry or rates. When a failed observation is recorded, the simulated release becomes **paused** and an **owned rollback** is required. This is an explicit operational response, not merely a red dashboard card.

In a real operating model, the incident owner would verify the signal, limit further exposure, engage engineering/support, escalate relevant safety/privacy concerns and publish the next update. Real severity levels, channels and service hours must be agreed before a pilot; the prototype does not provide those arrangements.

## Pause and rollback checklist

1. Record the failed health signal, impact context and responsible rollback owner without sensitive data.
2. Keep the release paused while the recovery obligation is open. Content, evidence and approval changes cannot erase that obligation; a later healthy status cannot clear it.
3. Follow the current rollback evidence/plan; retain the previous known state and safe fallback appropriate to a real system.
4. Record recovery actions, verification evidence and unresolved risks.
5. Use the explicit rollback-resolution action before post-review. An unresolved owned rollback blocks post-review; complete post-review before opening a new scoped release.
6. Decide any subsequent release through current-version review; recovery evidence is not permission to bypass gates.

The concept changes its simulated state only. It does not revert software or operate any external infrastructure. A production rollback requires an executable deployment/data plan, permissions, compatibility checks, backup/restore proof and rehearsal with the actual system.

## Post-review and learning

Review the original hypothesis against the defined outcome, denominator and window. Record baseline/current values only when observed; preserve a missing baseline as missing. Separate a measured zero from missing instrumentation. Record a keep/rebuild/retire decision, accountable owner and next action. Add safe lessons to the feedback framework and policy backlog rather than silently revise historical evidence.

For a real incident, I would also record what detection/response worked, what was delayed, affected cohorts, communication quality and prevention work with owners. Avoid blame; keep the evidence and decision clear.

## Export and handoff

Export the isolated session's briefing/state to preserve sources, decisions, versions, gate evidence, health/rollback and audit history. Keep the exact independent-concept credit and synthetic-data disclaimer in any portable handoff. Check the export against current state before review; mark historical exports with their version/time. Do not add real customer details, patient identifiers or secrets.

The walkthrough should include both a blocked release and a successful current-version decision, followed by a failed-health pause and owned recovery. [The evaluation report](test-eval-report.md) establishes which behaviours were actually checked for the final prototype version.
