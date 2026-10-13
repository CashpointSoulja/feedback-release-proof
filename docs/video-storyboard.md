# 105-second public walkthrough

**Ayo Ahmed - Independent concept** · Feedback → Release Proof

Independent concept for Semble. Unofficial. Synthetic operational data only. Not connected to Semble. Not a clinical system or compliance certification.

## Current delivery status

**Recording and composition are blocked, not completed.** No approved Cloudflare account destination or scoped deployment credential is configured yet. There is no verified public HTTPS application URL. No final video, public footage, voice track or public screenshot has been recorded by these scripts. Local screenshots and local UI verification cannot substitute for the requested public recording.

The files below prepare a reproducible capture once a real deployment exists. The application must be deployed and verified separately using an authorized account destination and scoped credential. Deployment does not send this work anywhere. Ayo must watch the entire final video with sound before any sharing, outreach or application submission.

## Recording rules

- One continuous real browser recording, 720 × 1280, 30 fps final output, exactly 105 seconds. No slides, reconstructed UI, substituted screenshots, local footage, animated screenshots or cuts between scenes.
- All application requests remain on the verified public HTTPS origin. The capture script rejects local/private hosts and insecure URLs and fails on missing controls, unexpected results or a missed scene deadline.
- The pointer is visible. Its overlay follows actual browser pointer events; every mutation is performed through visible application controls. The script never injects state, hides warnings, overrides network responses or calls mutation APIs directly.
- Valid prerequisites are prepared through the real public UI before the continuous capture starts. Those setup actions are logged. The recorded blocked decision retains unresolved rollback evidence.
- Synthetic evidence, the independent credit and disclaimer remain truthful. All numbers and owners used in the demonstration are synthetic. No production integrations are implied.
- Capture audit stills are inspection artifacts only. They are never inserted into the final video. Browser frame timestamps are normalized to a complete 30 fps intermediate **before** trimming or muxing.

## Scene and narration plan

| Time | Visible real interaction | Required result |
| --- | --- | --- |
| 0–15 s | Overview; visible synthetic label, independent credit and release status | A real public app is loaded; the demo's nature is clear |
| 15–30 s | Feedback → import → injected extraction → preview | The extraction is rejected; commit remains disabled; the reason is visible |
| 30–44 s | Close import; open the traced opportunity and outcome | The accepted source, opportunity, named owner and measurable outcome are visible |
| 44–58 s | Release → try release | The actual server blocks release and identifies missing rollback evidence/signoff |
| 58–74 s | Save owned rollback evidence; approve/sign the current release | Evidence and release signature bind to the current version; the gates become ready |
| 74–88 s | Edit the handoff support plan; show invalidated signature; sign again; release | The previous fingerprint cannot authorize the changed release; a new signature is required |
| 88–105 s | Run actual failure suite; record failed health; resolve owned rollback; export | Suite results, owned rollback and a downloaded audit snapshot are real and inspectable |

The exact spoken text and timing are also machine-readable below. The voice script reads this block, so narration has one source of truth. Ayo can record these lines into a single audio file, preserving the seven scene starts. Alternatively, the script can generate a free local synthetic guide voice. Neither option uses paid services. Use Ayo's recording for the personal final presentation when available.

<!-- recording-plan:start -->
```json
{
  "duration": 105,
  "width": 720,
  "height": 1280,
  "fps": 30,
  "scenes": [
    {"id":"overview","start":0,"end":15,"narration":"I'm Ayo Ahmed. I built Feedback Release Proof as an independent concept. This is synthetic feedback, clearly labeled. I'm testing whether a release claim stays connected to evidence, an outcome, and an accountable owner."},
    {"id":"rejected-extraction","start":15,"end":30,"narration":"I preview a deliberately injected feedback extraction. The system rejects it and explains why. The rejected record cannot be committed, so an instruction hidden in a source cannot quietly become accepted release evidence."},
    {"id":"opportunity-outcome","start":30,"end":44,"narration":"The accepted feedback links to an opportunity and a measurable outcome. I can follow the source, see the intended change, and inspect who owns it. Feedback now has a traceable next step."},
    {"id":"blocked-release","start":44,"end":58,"narration":"I try to release. The system blocks it and names the missing requirements. A confident summary is not enough: this decision needs evidence tied to the exact version being released."},
    {"id":"version-evidence","start":58,"end":74,"narration":"I add owned rollback evidence and sign the current release. The evidence records what was tested and who takes responsibility. The readiness decision and signoff now refer to the same release fingerprint."},
    {"id":"stale-signoff","start":74,"end":88,"narration":"Now I change the handoff after approval. The earlier signoff becomes stale immediately. I review and sign the new fingerprint before the release can proceed."},
    {"id":"failure-rollback-export","start":88,"end":105,"narration":"Finally, I run the actual failure suite, record failed health, resolve an owned rollback, and export the audit trail. This is my working concept for making feedback and release decisions inspectable."}
  ]
}
```
<!-- recording-plan:end -->

## Run after the public deployment is verified

From the repository root, use a genuine public URL; do not insert a placeholder destination.

```bash
PUBLIC_URL="$VERIFIED_PUBLIC_URL" node scripts/capture-public.mjs
scripts/generate-voice.sh --ayo /path/to/ayo-recorded-narration.wav
python3 scripts/compose-video.py
```

Set `VERIFIED_PUBLIC_URL` to the actual deployed origin first; an empty variable or local destination is rejected. For a free local guide voice, run `scripts/generate-voice.sh --free` instead. The capture script uses global Playwright and `/usr/bin/chromium` by default; override `CHROMIUM_PATH` only for a real installed browser. `CAPTURE_DIR` and `VOICE_DIR` default to ignored `work/recording/capture` and `work/recording/voice`. Composition defaults to `work/recording/final`, so no generated artifact is mistaken for a release deliverable.

Capture writes a public-origin manifest, action/state checks, frame timestamps, downloaded export and scene inspection stills. Composition verifies the input manifest, normalizes the full sparse source to CFR, trims exactly 3,150 frames, muxes the verified voice, and extracts start/middle/end stills for every scene. It verifies every normalized and final video frame's presentation timestamp equals its index divided by 30, allowing only ffprobe's decimal rounding. It fails on wrong dimensions, wrong duration, missing audio or discontinuous frame accounting. Review every still, each scene boundary, the complete continuous cut and the complete audio. Automatic checks cannot certify a human watch/listen review.

A separate local, non-recording smoke check verified that the pointer remains visible above native dialogs, follows actual mouse coordinates, returns to the body on close, and survives replacing and reopening a form. Local inspection screenshots remain ignored scratch files. This check produced no video and does not verify the public capture.

## Final manual acceptance

- Inspect every scene's start, middle and end and both sides of every scene boundary. Confirm pointer visibility, legible text, controls entirely inside the vertical frame and every claimed result on screen.
- Watch all 105 seconds with sound. Confirm words match the actual public actions, speech is intelligible and does not overlap the wrong scene, and no blank/off-origin/private page appears.
- Verify the capture manifest retains the rejected preview, blocked attempt and actual suite response. Verify the exported audit history retains version-bound evidence, the handoff edit that invalidated the prior signature, renewed approval and owned rollback. A read-only preview or isolated failure-suite run need not mutate the workspace audit. Record the public URL, app version, capture timestamp, video hash and reviewer/date.
- If the public UI differs from the script contract, update and re-run capture. Never patch the footage to imply a result that did not happen.
- Ayo's full watch and approval are pending. Nothing is sent automatically.
