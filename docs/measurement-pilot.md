# Measurement and pilot plan

**Ayo Ahmed - Independent concept** · **Independent concept for Semble**

> Unofficial. Synthetic operational data only. Not connected to Semble. Not a clinical system or compliance certification.

## What I would measure

My intended outcome is better internal release judgement and accountable recovery with acceptable operator effort. The concept has not measured current business baselines, time savings, defect reductions or adoption. I distinguish **executed prototype evaluation**, **synthetic beta policy examples** and **a proposed real pilot**.

Actual executed checks and measured runtime belong in [test-eval-report.md](test-eval-report.md). The fixed simulation clock is `2026-10-13T09:00:00.000Z`; it makes fixtures reproducible. It cannot measure time saved. Any illustrative baseline/current values entered during the demonstration are synthetic calculations, not observed team impact.

## Metric definitions

| Metric | Numerator / denominator | Window and owner | Interpretation |
| --- | --- | --- | --- |
| Correct release decision | Tasks with correct release/block/pause decision and stated reason / eligible matched decision tasks | Pilot task session and weekly review; pilot/data owner | Measures decision quality, not clicks completed. |
| Owner completeness | Decisions with a named accountable next-action owner / decisions requiring action | Weekly; operations champion | An ownership quality measure, not proof that action occurred. |
| Outcome-definition completeness | Priorities with hypothesis, outcome, denominator and window / accepted priorities | Weekly; product owner | Indicates evaluability; it does not establish improvement. |
| Quote fidelity | Accepted extracted quotes exactly supported by source / accepted extracted quotes | Each evaluation version; evaluation owner | Synthetic extractor quality; no production model inference. |
| Schema validity | Extractor outputs passing the closed schema / attempted outputs | Each evaluation version; evaluation owner | Invalid outputs must remain unusable, even if plausible. |
| Independent support | Distinct valid supporting fixture provenances / accepted supporting records | At priority review; product owner | Duplicates or relabelled copies do not increase the readiness-support count. |
| Beta completion | Completed synthetic reminder-setup attempts / eligible synthetic reminder-setup attempts | Declared beta start/end; feature owner | Fixture evidence for policy; no live reminders are sent. |
| Beta error rate | Erroneous synthetic reminder-setup attempts / eligible synthetic reminder-setup attempts | Same beta window and denominator; feature owner | Define error/adverse events before measurement; don't hide severity in an average. |
| Decision latency | Elapsed time from complete ready-to-review evidence to human decision / eligible decisions | Weekly; operations champion | Include only comparable states; separate queue time from active work. |
| Active operator effort | Total observed active minutes including correction / correctly completed comparable tasks | Baseline and pilot sessions; pilot/data owner | Compare medians/distribution as well as totals; include training separately. |
| Adoption | Eligible operators using the loop without live coaching at least once in a week / eligible pilot operators | Weekly, then monthly; pilot owner | Usage is necessary evidence of usefulness, not sufficient evidence of impact. |
| False blocks and unsafe passes | Incorrectly blocked tasks and incorrectly allowed tasks / eligible decision tasks | Each task set and weekly; evaluation owner | Report separately; unsafe pass has a different risk from delay. |
| Recovery clarity | Failed-health tasks with correct pause, owner and recovery next action / failed-health tasks | Rehearsal and weekly; incident owner | A simulated recovery task cannot establish production recovery time. |

A missing baseline is `null`/not measured. A baseline of zero means a defined measure was observed as zero. Percentage improvement with a zero baseline is undefined; report absolute change and context instead. A percentage without its denominator and window is incomplete evidence.

## Proposed discovery and pilot design

1. **Discover first.** Interview and observe proposed internal users in product, engineering, design, data and GTM/support. Map the current tool chain, permissions and pain. Obtain an approved nonclinical data scope; prefer synthetic tasks until production controls exist.
2. **Collect a baseline.** Observe the current workflow on a predeclared set of representative tasks: usable evidence, ambiguous feedback, duplicates, sensitive rejection, insufficient beta data, changed scope, stale approval and failed health. Score decision quality with a rubric agreed before viewing results. Record active and queue time separately.
3. **Run a small formative pilot.** A suggested starting design is 6–8 consenting internal operators over four weeks, using matched task sets and counterbalanced task order to reduce learning effects. This size is for usability/discovery, not statistical proof of business impact. Final sample and exposure depend on risk and access.
4. **Instrument outcomes.** Record anonymous approved operator IDs, task IDs, scenario/version, start/end, correction time, reason/owner completeness and help requests. Collect only data necessary for the pilot; approve retention and deletion before real use.
5. **Review weekly.** Inspect failures and subgroup differences, interview nonusers, and record a keep/rebuild/retire decision and next action. Revisit a confusing metric rather than optimise it blindly.
6. **Exit explicitly.** Require better or acceptably maintained decision quality against the current process, understood ownership/recovery, acceptable total effort, willing return use and completed production controls before broader rollout. Agree quantitative targets after baseline collection and before comparative analysis.

There are no pilot participants, baseline records or achieved targets represented here. The suggested sample and duration are planning assumptions. A small, self-selected pilot is subject to novelty, coaching, selection and learning effects; matched tasks may differ from real incidents. I would report these limits with results, include adverse findings and avoid causal claims from a simple pre/post comparison.

## Beta policy versus evidence strength

The demonstration's beta exit policy requires **N ≥ 30**, an observation window of **at least 7 days**, **completion ≥ 90%**, **error ≤ 1%**, plus operational-risk notes, adverse-event coverage, escalation and human approval. The prototype stores declared sample size, observed days and rates; rates must yield whole-number completion/error counts, which it derives and stores. It does not independently verify raw event records or real start/end dates. In a production pilot I would require those raw counts, consistent denominators and a verified observation window.

**Illustrative synthetic calculation:** 50 declared setup attempts, 47 completions and 0 operational errors over 7 declared days correspond to 94% completion and 0% errors. This satisfies the numeric prototype thresholds if the remaining evidence and human reviews are present; it is not an observed business result.

These thresholds make the workflow demonstrable, not statistically assured. At N=30, one error is 3.33%; zero observed errors still does not prove the true error rate is below 1%. A real release would need a risk-based sample design, sufficient exposure, cohort coverage, severity review and healthcare/security/privacy approval as applicable. An aggregate rate must never conceal a severe incident or an affected subgroup.

## Efficiency gains: how I would earn a claim

I would compare **total active operator effort per correctly completed task**, including review, correction and rework. I would report training/setup separately and also consider ongoing reviewer/support cost. A possible absolute difference is `baseline median minutes − pilot median minutes`; relative change requires a nonzero comparable baseline. Both need actual observed values, sample counts and windows.

I would not multiply a tiny synthetic timing difference by company headcount or claim annual savings. Only a sustained, comparable pilot with agreed attribution and costs could support an efficiency estimate. A fast extractor that creates more correction work is not an improvement.

## Evaluation and measurement handoff

Before a real model replaces simulation, I would require a representative labelled evaluation set, reviewer agreement, sensitive-data and prompt-injection cases, duplicate/ambiguity coverage, quote/schema checks, abstention measures, versioned provider/prompt/schema and drift monitoring. Model or policy changes require renewed evaluation; reviewer overrides become learning inputs rather than hidden passes.

The weekly review should end with a decision, an accountable owner and a dated next action. If the evidence is missing, record that explicitly and say what observation would change the decision.
