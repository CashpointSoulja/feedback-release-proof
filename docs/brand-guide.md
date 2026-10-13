# Feedback → Release Proof: independent brand guide

**Ayo Ahmed - Independent concept**

Secondary context: **Independent concept for Semble**.

> Unofficial. Synthetic operational data only. Not connected to Semble. Not a clinical system or compliance certification.

## Purpose and brand exception

An original product-operations work sample showing how feedback becomes accountable beta decisions and release evidence. It is intended to demonstrate judgement, operating cadence and measurable outcomes against the publicly advertised Senior Product Operations Manager role. It is not Semble software and makes no claim about Semble's internal processes or defects.

**Brand exception:** no permission to reproduce Semble's brand assets, proprietary font files, website artwork or product interface has been supplied. Semble's [Terms of Service, section 16](https://www.semble.io/terms-of-service) state that Semble owns the Service, Website and Documentation and that the Client will not “copy, reproduce, alter, modify, or create derivative works from the Service and Documentation.” The project therefore uses a separately authored identity, composition, operational dataset and visual system. Public sources inform the business context; their assets do not become project assets. This exception is a project design boundary, not a claim of legal permission or a legal opinion.

Do not include the official logo, favicon, product screenshots, customer logos, portraits, photography, copied illustrations or downloaded website assets. Do not imitate the official wordmark. Private observation screenshots belong only in ignored scratch storage and must never enter commits, public pages or release packages. Reference “Semble” as text only in secondary context and source citations.

## Current official website observation

Observed 13 October 2026, English homepage, Chromium, desktop viewport 1440 × 1000, [https://www.semble.io/](https://www.semble.io/). The page was observed directly, including its full-page pixels and computed styles. This is a factual observation, not an official brand manual or a licence to reproduce the design.

The homepage has a white navigation bar, a warm off-white hero, a centred headline above a software illustration, black calls to action, spacious alternating white/off-white sections, pale mint/teal cards and a deep teal footer. The full-page observation included unloaded image/video regions, so it does not establish every final rendered asset or motion state. The independent application should communicate calm operational clarity through its own dashboard composition rather than copy that marketing-page layout.

| Observed item | Actual value | Observation type |
| --- | --- | --- |
| Ink | `#050505` | Homepage CSS custom property; body computed `rgb(5, 5, 5)` |
| Warm off-white | `#f6f5f3` | Homepage CSS custom property |
| Primary green/highlight | `#38d2a6` | Homepage CSS custom properties |
| Section heading/deep teal | `#004b4b` | Homepage CSS custom properties |
| Secondary dark green | `#007d7d` | Homepage CSS custom property |
| Pale mint | `#e7faf4` | Homepage CSS custom properties |
| Declared body family | `"DM Sans", sans-serif` | Computed family |
| Hero heading | 49px, weight 500, line-height 58.8px, tracking -0.5px | Computed `h1.h1-live` |
| Section heading | 39px, weight 500, line-height 46.8px, tracking -0.5px | Computed `h2.h2-live` |
| Hero/body paragraphs | 16px, weight 400, line-height 24px | Computed paragraph |
| Main hero CTA | 16px/24px, weight 600, 15px 20px padding, 4px radius, white on `#050505` | Computed “See how it works” link |
| Navigation primary CTA | 14px/20px, weight 400, 8px 16px padding, 8px radius | Computed “Book a demo” link |
| Hero heading/content width | 838px, left x=301px | Computed element bounds at 1440px viewport |
| First section heading left edge | x=101px | Computed element bounds |
| Global corners | 8px; larger 16px; extra-large 20px | Homepage CSS custom properties |

The stylesheet also declares `new-kansas, sans-serif` for some app heading/button tokens. This font must not be copied or redistributed. The observed computed homepage headings used DM Sans. **Font delivery limitation:** `document.fonts` contained only Webflow/Swiper icon faces in this observation; no DM Sans face was loaded. Thus the family above is a computed CSS declaration, not proof that the photographed pixels used a successfully downloaded DM Sans font.

## Original implementation system

These project tokens are independent design decisions. They are intentionally separate from the official observations above.

| Project token | Value | Use |
| --- | --- | --- |
| `--canvas` | `#f7f7f2` | Warm off-white application background |
| `--surface` | `#ffffff` | Tables, evidence and detail panels |
| `--ink` | `#172c29` | Dominant readable text and navigation |
| `--muted` | `#526760` | Secondary explanatory text |
| `--mint` | `#c7efdd` | Selected/active surfaces |
| `--mint-strong` | `#9bdec2` | Decorative chart fill and emphasis |
| `--accent` | `#245c49` | Text links, actions and success labels |
| `--border` | `#d8e3db` | Subtle separators |
| `--warning-bg` | `#fff0d3` | Unresolved/blocking warning surface |
| `--warning-ink` | `#765317` | Warning text |
| `--danger-bg` | `#fce8e2` | Escalation surface |
| `--danger-ink` | `#963d32` | Escalation text |

Use 8/12/16px corners, a 4px spacing base with 8/12/16/24/32/48 steps, 1px borders and restrained shadows. Prefer a 16px body with 1.5 line-height, 12–14px metadata, 20–24px panel headings and a 36–48px page heading. Data tables may use 14px text but must remain comfortable to read. Use tabular numerals for counts and measurement. Status always includes a text label or symbol; colour alone never encodes a release decision.

Use **DM Sans** obtained independently from its open-source distribution, with system `Arial, sans-serif` fallback. Google Fonts' [DM Sans distribution](https://github.com/google/fonts/tree/main/ofl/dmsans) is licensed under **SIL Open Font License 1.1**. The [verified licence](https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt) credits “Copyright 2014 The DM Sans Project Authors.” Preserve that copyright notice and complete OFL with bundled font files. Do not retrieve font binaries from Semble's servers. Font copyright/licence attribution is a required third-party acknowledgement, not project authorship.

## Attribution and UI voice

The dominant masthead/cover credit is **Ayo Ahmed - Independent concept**. The project's own name is **Feedback → Release Proof**. Place **Independent concept for Semble** as smaller secondary context. The exact disclaimer above must be plainly visible in the application and portable briefing/export, not confined to a hidden tooltip.

Use direct, human operational language: “Needs owner”, “Evidence incomplete”, “Beta exit blocked”, “Release decision”, “Next review”. Explain why a gate is blocked and which evidence changes the decision. Every apparent customer quote, organisation, date, response, usage figure and release result in the demo is synthetic and must be labelled accordingly. Avoid patient identifiers, medical histories, real customer statements or implied production integrations.

Evidence supports human decisions. A release gate is an operational readiness check; it does not certify clinical safety, security, GDPR compliance or regulatory approval. Do not show Semble certifications as project badges. Do not claim observed business capabilities prove missing features or internal failures.
