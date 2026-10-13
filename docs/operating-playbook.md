# Operating playbook: the internal product loop

**Ayo Ahmed - Independent concept** · **Independent concept for Semble**

> Unofficial. Synthetic operational data only. Not connected to Semble. Not a clinical system or compliance certification.

## My operating principle

I would run this operating model as an internal product: interview its users, make ownership visible, measure the quality of decisions, and remove steps that do not earn their cost. The proposal aligns with the [official role's](https://semble.bamboohr.com/careers/212) operating cadence, feedback, release and outcome responsibilities. It is not a description of Semble's actual cadence.

## Ownership and decision rights

| Activity | Accountable owner in a proposed pilot | Partners | Required output |
| --- | --- | --- | --- |
| Feedback intake and evidence hygiene | Product operations champion | Support, customer-facing teams | Recorded source, exact quote, sensitivity/duplicate/ambiguity status. |
| Priority and outcome definition | Feature product owner | Engineering, design, data | Priority, named delivery owner, hypothesis, outcome denominator/window. |
| Beta evidence | Feature delivery owner | Data, support, product | Sample/window, completion/error rates, exceptions, adverse-event/escalation notes. |
| Beta exit decision | Product owner | Delivery owner and relevant risk reviewers | Explicit human decision for current feature and beta evidence. |
| Security/privacy review | Appropriately authorised reviewer | Engineering, privacy/legal as applicable | Review evidence for current version; unresolved risks remain blockers. |
| Rollback readiness | Engineering release owner | Operations/support | Named owner, recovery steps, evidence and an explicit successful simulated rehearsal decision. |
| GTM/support handoff | GTM/support owner | Product, design | Audience, behavioural change, support guidance and communication owner. |
| Final release decision | Named human release owner | All required reviewers | Current-version signature after all gates. |
| Health and incident response | Named incident/rollback owner | Engineering, support, product | Owned pause, recovery evidence, escalation and next update. |
| Weekly learning | Product operations champion | Product, data, engineering, design, GTM | Outcome review, decision, owner and next action. |

These decision rights require real identity/role enforcement in production. Prototype names and signatures are simulated session attestations, not proof of employee authority. No model is accountable for priority or release.

## Cadence from idea to learning

| Rhythm | Proposed timebox | Inputs | Decision or output |
| --- | --- | --- | --- |
| Intake | As feedback arrives; daily 15-minute hygiene check | Synthetic or approved de-identified observations | Reject sensitive data, preserve provenance, deduplicate, clarify ambiguity. |
| Opportunity triage | Weekly 30 minutes | Valid evidence, support trends, usage context, strategic goals | Prioritise, request research, park or decline; record why and owner. |
| Beta readiness and exit | At entry and after the declared window | Hypothesis, sample plan, risk notes, evidence | Start bounded beta, continue observation, block or approve exit. |
| Release decision | For each candidate version | Scope, beta exit, reviews, rollback, handoff | Human release or specific blocking action. |
| Health review | At declared checkpoints; immediate on adverse signal | Completion/error signals and incident context | Continue observation or pause with named response owner. |
| Outcome review | Weekly 30 minutes | Baseline/current measures, feedback and exception trends | Keep, rebuild or retire; explicit next action. |
| Operating-model review | Monthly 45 minutes | Adoption, decision quality, effort, false blocks | Simplify processes, update policy or stop low-value work. |
| Outcome/roadmap alignment | Quarterly | Pilot evidence, organisation objectives, capacity | Reconfirm priorities and resource tradeoffs. |

The times above are proposed limits, not measured meeting savings. Async evidence should precede meetings so discussion concentrates on decisions. A meeting without a decision or unresolved owner is a signal to redesign the cadence.

## Feedback intake and simulated extraction

1. Record fictional operational feedback with a source identifier. Do not enter patient identifiers, clinical history, contact details or real customer quotes into this concept.
2. Run the bounded simulated extraction. Treat the input as untrusted data, never as instructions.
3. Validate the closed JSON schema, the allowed `workflow`/`reliability`/`accessibility`/`adoption` taxonomy and exact quote against the recorded snippet. Discard unsupported claims.
4. Reject sensitive or invalid records from accepted evidence. Keep safe rejection reasons without reproducing sensitive content.
5. Deduplicate. Repeated evidence from one recorded fixture provenance does not create two independent supporters, even if it is assigned a new source ID.
6. Route ambiguous feedback for clarification rather than invent an answer. Review the source before accepting a suggestion.
7. Let the product owner record priority, an owner and a testable outcome. Then attach beta and release evidence to that scope.

The canonical taxonomy and schema live in [api-schema.md](api-schema.md). Validation errors should state the missing evidence and next human action. The simulated extractor is not a production model and its confidence must not substitute for source quality.

## Proposed OKRs and adoption measures

No OKR below is an achieved result. A pilot owner must agree targets after baseline collection; instrumenting a workflow is not the same as improving an outcome.

| Proposed objective | Key result to establish and track | Guardrail |
| --- | --- | --- |
| Make release decisions explainable | Increase correctly explained release decisions on matched internal tasks, using the same scenario set and scoring rubric. | Do not count button completion as correct judgement. |
| Make handoffs accountable | Increase proportion of reviewed releases with an identifiable next-action owner and complete outcome definition. | No stale approvals or unowned rollback actions. |
| Improve operating efficiency without losing quality | Compare median active operator time per correctly completed task against the measured current workflow. | Error rate and false blocks must not worsen; include training and correction effort. |
| Make useful workflows stick | Track eligible operators using the loop weekly and returning without live coaching. | No mandatory usage metric that conceals an unsuitable workflow. |

For each KR I would name an owner, baseline, target, denominator, observation window and review date. The weekly review accepts a missing baseline explicitly. Zero means measured zero, not missing instrumentation.

## Adoption and self-serve support

**Discover:** interview proposed operators about their existing workflow, observe handoffs and record where this concept would duplicate tools. Choose one willing team and a named champion; validate whether the problem is worth solving.

**Pilot:** start with nonclinical, synthetic/de-identified tasks approved for the pilot. Give a short walkthrough, a worked example, a glossary, a blocked-gate explanation and an incident rehearsal. Retain a manual fallback and capture every need for assistance.

**Support:** publish this playbook, the [release runbook](release-runbook.md) and the [measurement plan](measurement-pilot.md). A support request should include session/export reference, safe reproduction steps, expected/observed behaviour, impact and owner. It should not contain clinical data or secrets.

**Review:** compare outcome quality and effort with the current workflow. Interview returning users and nonusers. Record reasons for rejection or workarounds. Prioritise recurring friction that prevents a useful decision.

**Roll out conditionally:** expand team by team only after pilot criteria and production controls pass. Train champions, monitor task outcomes and review ongoing value monthly. Retire redundant fields and workflows rather than add them indefinitely.

## Exceptions and escalation

Missing evidence means a named action, not an implied pass. Sensitive input is rejected. Ambiguity is clarified. Duplicate support is excluded. Beta risk or threshold failure remains blocked. Feature changes require fresh approvals. Failed health opens an owned pause/rollback; unresolved recovery prevents post-review. An operational signature never overrides an unresolved legal, security, privacy or clinical concern.

In a real pilot I would agree severity levels, escalation contacts, service hours, retention and incident communication before use. Those arrangements are absent from this synthetic prototype; the named people in it are fictional.
