---
name: brand-system
description: The design system for utpals.com / utpal-barman.github.io — Utpal Barman's portfolio. Load this before writing or reviewing ANY markup, CSS, or copy for this site. Defines the pure-black "trace" identity: tokens, type scale, component contracts, motion rules, and the voice guide. Triggers on any edit to index.html, assets/css/style.css, assets/js/main.js, or any request to add a section, change a color, adjust spacing, or write site copy.
---

# Brand system — "trace"

Portfolio of **Utpal Barman**, Lead Software Engineer at Brain Station 23. The page has
exactly one job: convince a recruiter or hiring manager, in under 60 seconds, that this
person is a mobile engineering lead who works with agentic AI — and get them to open the
resume or send an email.

Everything below is a contract. If a change violates it, change the contract
first (in this file), then the code.

## 1. The idea

An agent run produces a **trace**: a tree of spans, each with a start, a
duration, and a status. That is the visual language of the entire site — not as
decoration, but because it is the artifact this audience reads every day.

- Experience is plain rows: company, title, dates, duration, two notes. **No timeline
  bars and no colour-coded role markers** — Utpal removed them in Oct 2026 ("it looks so
  odd"). Do not bring back a waterfall, legend or axis. The current role's duration is
  computed live by main.js from its `<time data-start>`.
- The trace is visual only. Section names and copy are plain recruiter words
  (`Experience`, `Skills`, `Projects`), never trace jargon (see 6c).
- Status colors are **semantic**, never decorative.

## 2. Tokens

Declared once in `assets/css/style.css` under `:root`. Never hardcode a hex
value anywhere else — no exceptions, including inline styles.

Chosen for how a recruiter reads the page (Oct 2026): Apple's dark-mode neutrals and
blues, because blue reads as trust and competence and these exact values are the ones
a reader already associates with polished product work.

```
--black        #000000   page ground. Pure black.
--ink-1        #08080A   raised surface (cards, rows)
--ink-2        #101013   hover / elevated
--rule         #1E1E22   hairlines — 1px, the ONLY divider style
--rule-hi      #2E2E34   hairline on hover/focus

--bone         #F5F5F7   primary text (Apple's off-white, 19.3:1)
--bone-dim     #A1A1A6   body copy (8.2:1 — bright enough to read without effort)
--slate        #86868B   meta, captions (5.8:1 — do not darken)

--cobalt       #2997FF   accent text and focus on black (Apple link blue, 7.0:1)
--cobalt-deep  #0071E3   filled CTA under white text (4.7:1)
--cobalt-press #0066CC   CTA hover: darker, never lighter (5.6:1)
--white        #FFFFFF   only on filled cobalt buttons, text selection and print
--rule-btn     #3A3A42   ghost button border
```

**Accent discipline.** Cobalt marks exactly three things: the primary CTA, focus rings, and the agentic AI
highlight on the current role (its lead-note dash). The `Agentic AI` chip that sat under the role was removed in Oct 2026 (Utpal: a single chip looked odd); do not bring it back. Jade and amber were removed with the waterfall; do not bring them back. If an accent is being
used to "add interest," delete it.

**Liquid glass** (`--glass*` tokens) belongs to the nav only. Once the page scrolls the
bar becomes a floating capsule: a nearly clear pane (`blur(16px) saturate(200%)
brightness(1.1)`), a 1px gradient specular rim brightest at the top left, an inset glow,
and a soft highlight that follows the pointer. The current section sits under a lens of
brighter glass that slides between links (main.js), replacing the old cobalt underline;
links swell to 1.06 on press. The open mobile menu is a second, near-opaque pane of the
same glass. These gradients and inset shadows are light effects on glass, not brand
colour or elevation, and appear nowhere else.

In Chromium, main.js adds real refraction: an SVG displacement filter used as the
capsule's `backdrop-filter`, strongest at the rim and pointing inward, so the page bends
at the edges like liquid on the screen, with a slight per-channel colour split. The map
is rebuilt whenever the capsule changes size. Safari and Firefox keep the frosted
version. The lens moves like liquid, never a spring: its leading edge flows to the new link first,
the trailing edge follows, and it thins while stretched (`lens-flow`). No overshoot, no
wobble (Utpal rejected the spring version). Skipped under reduced motion. Keep the tint (`--glass-liquid`) dense enough that the nav text stays
legible over the large headings that pass beneath it.

**Contrast is a hard gate.** Every text node must clear 4.5:1 against its effective
background (3:1 for >=24px, or >=18.66px bold). `--slate` and `--cobalt-deep` sit near
the edge of passing — darkening either breaks the page. `--cobalt` under white text is
only 3.84:1, which is why filled buttons use `--cobalt-deep`. Re-audit after any colour
change.

**Banned:** acid green (`#43ffa4`, `#00ff88` and family), vermilion, gradients
as brand color, pure `#FFFFFF` text, `box-shadow` for elevation. Elevation is
expressed with `--ink-1`/`--ink-2` and hairlines only.

## 3. Type

**The system stack**: SF Pro on Apple devices, Segoe UI on Windows, Roboto on Android.
It is the face each reader's eyes are tuned to, needs no download, and SF Pro cannot be
self-hosted (Apple's licence). The old Archivo / IBM Plex files are no longer loaded.

| Role | Face | Usage |
|---|---|---|
| Display | system (SF Pro Display) 700 | h1, h2. Tracking `-0.03em` / `-0.025em`, line-height `1.04` / `1.08`. |
| Body | system (SF Pro Text) 400/500/600 | everything readable: prose, nav, tags, labels, buttons. Tracking `-0.011em`. |
| Utility | `ui-monospace` (SF Mono) | only where even digits help: dates, durations, metrics, proof lines. |

Scale (`--fs-*`, Apple reading sizes): `mono` .8125 (13px) · `sm` .9375 (15px) · `base`
1.0625 (17px, Apple's body size) · `md` 1.1875 (19px) · `xl` clamp(2,3.6vw,3) ·
`display` clamp(2.75rem,6vw,4.5rem). Nothing readable goes below 13px.

**Capitalisation.** Normal sentence/title capitalisation everywhere, including mono
labels, nav items, section eyebrows, tags and dates — `Agentic AI`, `MCP`, `CI/CD`,
`ReactJS`, `Dec 2024 — Present`. Lowercase is reserved for identifiers that are
lowercase in the world: package names (`u_credit_card`, `trace_logger`), filenames
(`home_screen.dart`), domains (`pub.dev`), extensions (`.arb`).

## 4. Space & shape

8px base. Allowed steps only: `4 8 12 16 24 32 48 64 96 128`.
Section rhythm: `clamp(72px, 11vw, 128px)` vertical padding, hairline between.
Container: `max-width 1140px`, gutter `clamp(20px, 5vw, 40px)`.
Radius: `2px` default, `999px` for tags, pills and the glass nav capsule, `24px` for the
open mobile menu pane and `16px` for its rows only. Nothing else.
Borders: `1px solid var(--rule)`. Never 2px, never dashed.

## 5. Motion

- Page load: hero staggers in 4 steps, 60ms apart, `translateY(14px)` → 0.
- Scroll: `IntersectionObserver`, reveal once, never re-hide.
- Nav: the name in the bar fades in only once the hero h1 has scrolled out of view
  (`data-brand` on `.nav`, gated on `.js` so it shows without the script), and the bar
  morphs into the glass capsule once the page scrolls.
- Photos and the employer logo are monochrome at rest and take their own colour on hover,
  the same treatment as the avatar.
- Easing: `cubic-bezier(.22,.61,.36,1)`. Durations 180ms (hover) / 420ms (reveal).
- `@media (prefers-reduced-motion: reduce)` must zero every duration. Verify this on
  every change.

## 6. Voice

Plain, active, first person. Normal capitalisation (see 3), sentence case for prose.
Short declaratives. Concrete nouns from the work.

- Say what shipped, where, for whom. "banking app, UAE" beats "fintech solutions"; never the client's name.
- No superlatives, no emoji, no "passionate," no "results-driven," no rocket
  ships. The previous version of this site had all of them; they are gone.
- Never invent metrics, client names, user counts, or awards. If a number is not
  verifiable from Utpal's own record, it does not go on the page. Mark unverified
  content with `<!-- TODO(utpal): ... -->` rather than guessing.
- Percentages for skills are banned outright. Credibility comes from named work,
  not from a bar at 90%.

## 6a. The hero

The h1 is **"Utpal Barman"** — the name, nothing else. Utpal's call: the person is
the brand, and the claim belongs in prose rather than in 4rem type. Do not put a
slogan back in the h1.

The hero is exactly five things: avatar, name, a role line, one paragraph, three
actions. The role line is "Lead Software Engineer at" followed by the Brain Station 23
logo (`assets/img/brain-station-23-logo.webp`, a horizontal lockup on transparent,
linked to the company), added at Utpal's request. The paragraph then starts with "I lead".
Nothing else belongs there. The paragraph carries the whole argument and is the
one thing a non-technical hiring manager will read end to end — lead with the role
and the team, bold only the load-bearing facts, and keep every word parseable
without a glossary.

**Positioning (Utpal, Oct 2026): a mobile expert who works with agentic AI.** Lead with
mobile as a discipline (native and cross-platform, iOS and Android), never "Flutter and
Android" as the headline: Utpal said he does not want to read as Flutter/Android only.
Frameworks (Flutter, React Native, Kotlin Multiplatform) appear as range inside mobile,
in the Architecture card and the Skills tags. Agentic AI is the second half of the claim,
in the title, hero, Expertise h2 and the AI card.

**Do not put a stats bar back in the hero.** It held "Markets shipped: US · NL ·
AE · JP" and "Open source: 2 pub.dev · 2 vs code", which read like a freelancer's
rate card — coverage and inventory. Utpal is an employed lead, not a vendor. The
replacement cells (years, team size, employer) were removed too: the paragraph
already says all of it, and repeating it in mono made the hero look like a pitch
deck. 

## 6b. Tone boundaries

The site presents a working practitioner, never an applicant.

- **Banned:** availability signalling of any kind — "open to remote", "available for
  hire", "relocation", "looking for", "Hiring an engineering lead?". Removed
  deliberately. Location and timezone as facts are fine; wanting a job is not.
- No phone number anywhere on the public page. Email, LinkedIn, GitHub only.
- No self-congratulation in the chrome ("no template", "hand-built", "designed by").
- Headings are plain nouns or plain statements: `Work experience`, `Skills and
  technologies`, `Open-source projects`, `Academic background`. Not questions, not slogans.

## 6c. Recruiter-first, SEO-first (Oct 2026)

The reader is a recruiter or hiring manager, not an engineer. Utpal asked for the
page to be "recruiter friendly, not developer friendly" and flagged the old Focus
cards ("Loops that finish", "bounded state", "golden sets") as reading like AI.

- Section order: hero, Experience, Expertise, Skills, Projects, Awards (with
  speaking), Education, Certificates, Contact. Experience comes first because it is the proof.
- Every sentence must make sense to someone who does not write code. Name the
  country, the industry and the team size, never the client (see 8). Technical terms go in the Skills tags,
  where recruiters and ATS keyword-scan for them, not in prose.
- No code samples on the page. Project cards say what the tool does and for whom.
- No internal operating detail: never say how many projects he runs at once or how work
  is split internally ("several client projects at once" was removed at Utpal's request).
  Describe ownership and outcomes, not workload.
- Numbers are written as numerals in the summary and the descriptions (`7 mobile
  engineers`, `nearly 8 years`, `3-person squad`, `10+ apps`): Utpal's call, they scan faster.
- Plain, first-person, concrete. Avoid clever card titles, aphorisms ("the
  interesting work is..."), and triplet rhythms: they read as generated.
- The current role reads `Dec 2024 — Present · 1y 10m` (duration written by main.js), never
  `Running`. Experience is deliberately terse: at most two short notes per role (the current role
may add a third, lead note: its agentic AI work, highlighted at Utpal's request), no
  section intro paragraph. Each fact lives in one place: hero holds team size, clients
  and years; Experience holds named projects; Expertise holds what he does, without
  repeating either; Contact holds email, LinkedIn and GitHub. Section intros that
  restate the heading are banned.
- Expertise is four leadership cards (team building, client delivery, architecture,
  AI-first engineering), each ending in a mono proof line that points at evidence on
  the page. Skills is six groups (Mobile, Agentic AI, Leadership, Delivery, Industries, Web and
  backend), each a one-word label and 3 to 8 tags, with core tags marked `.tag--core`. No
  per-group sentences: a senior profile scans, it does not read. No beginner filler (single
  APIs, "REST", one-off libraries). Keywords that must stay visible: iOS, Android, Flutter,
  React Native, Kotlin Multiplatform, Agentic AI, Claude Code, AI agents.
- h2s carry search keywords (`Work experience`, `Skills and technologies`,
  `Open-source projects`). Award, education and project names are h3s. Dates use
  `<time datetime>`. JSON-LD Person carries alumniOf, hasCredential, award,
  performerIn; bump `dateModified` there and `lastmod` in `/sitemap.xml` (repo
  root; it moved out of `u/` in Oct 2026, and `.htaccess` 301s the old path) on every
  content change.

## 7. Constraints

- **Zero runtime dependencies.** No Bootstrap, jQuery, Slick, Lightbox,
  FontAwesome, Ionicons. Vanilla JS, hand-written CSS. If a feature seems to need
  a library, it is the wrong feature.
- Single stylesheet `assets/css/style.css`, single script `assets/js/main.js`. Both are
  numbered by section in page order (tokens, reset, primitives, nav, hero, each section,
  responsive, reduced motion, print); new rules go in their section, never appended at the end.
  No `.min` build artifacts checked in — they go stale and ship the old brand.
- Accessibility floor, verified every change: skip link, semantic landmarks,
  visible `:focus-visible` ring in cobalt, ≥4.5:1 text contrast, keyboard-
  reachable everything, `prefers-reduced-motion` honoured.
- Mobile floor: 360px wide with no horizontal scroll. Experience rows stack below 760px;
  award rows stack below 860px with the photo capped at 360px wide.

## 8. Facts on file

Do not contradict these; they are the source of truth for site copy. Cross-checked
against the resume PDF and LinkedIn on 5 Oct 2026. Where they disagree, the resume wins
for dates and project names, and LinkedIn for awards.

- Career length: Dec 2018 to today, so "nearly 8 years" until Dec 2026 (the resume says
  "7+", LinkedIn's About "8+"). Never round up; update the hero, meta descriptions and
  JSON-LD together when it turns 8.
- Named projects (resume, Oct 2026). Brain Station 23: Peppes Pizza (Flutter, Norway),
  TryggBat (Flutter, Norway), Ditio (Kotlin Multiplatform, Norway, contributed), WellWa
  (Flutter, Japan, led). Monstarlab: FAB Business (onboarding stream lead, Dubai), Blinx
  (UAE streaming, team lead and top contributor), Gems (NL location-based social app).
  HeavyTask: Discount Dumpsters (Dallas; paperwork digitised with Flutter and React).
  **Never name clients on the site** (Utpal, Oct 2026): describe them by country and
  industry ("a UAE bank", "clients in Norway and Japan"). The names above are background
  only. Employers (Brain Station 23, Monstarlab, HeavyTask) are named; clients are not.

- Brain Station 23 PLC — Lead Engineer I — Dec 2024 → present. Leads a
  7-engineer mobile team in the Europe SBU; European and Japanese clients;
  hiring, onboarding, mentoring; recruitment board member; (number of concurrent
  projects is internal, never on the page); supports pre-sales
  (proposals, solution design). His LinkedIn About calls him "Lead Software Engineer";
  the site uses that wording outside the Experience row.
- Monstarlab Bangladesh — Senior Mobile Engineer I (Aug 2023 → Nov 2024),
  Mobile Engineer II (Aug 2021 → Jul 2023). Social platform (NL), streaming
  broadcast client (AE), mobile app for a UAE bank.
- HeavyTask LLC — Software Engineer — Dec 2018 → Jul 2021. Helped clients ship faster
  with Flutter and Android (Utpal asked to drop "moving the team from Android to Flutter");
  10+ Flutter apps shipped to the App Store and Google Play, plus ReactJS admin
  dashboards; moved a Dallas dumpster rental company from paper to a mobile app and web
  dashboard. It was never an "inventory management app" (corrected Oct 2026).
- Skrollo — part-time remote consultant, Oct 2018 → Jun 2021. Deliberately NOT on the
  site: Utpal removed it because it was part-time.
- ACMP 4.0 (Advanced Certificate for Management Professionals), IBA, University of
  Dhaka, issued Dec 2025. On the site in its own Certificates section, after Education.
- RUET, CSE, first class, Nov 2018. Notre Dame College HSC 5.00. GSCAHS SSC 5.00.
- Cross-platform range across the career: Flutter, Dart, Android, iOS, React Native,
  Kotlin Multiplatform, Jetpack Compose.
- As Senior Mobile Engineer I: led the three-person onboarding squad on the First Abu
  Dhabi Bank (FAB) app, working on site from the Dubai office (LinkedIn confirms the
  squad lead). As Mobile Engineer II: Netherlands social media and job search apps, a UAE
  media streaming app.
- Published work, all four on the site:
  - `u_credit_card` — pub.dev — 83 likes, 1,804 downloads/30d, 160/160 pub points
  - `trace_logger` — pub.dev — v1.0.2, 160/160 pub points
  - ARB Manager — VS Code Marketplace, `UtpalBarman.arb-manager`, TypeScript
  - EmbeDroid — VS Code Marketplace, `UtpalBarman.embedroid`, scrcpy-based
  These metrics were read from the pub.dev and Marketplace APIs. Re-check before
  quoting; never round up.
- Awards, both from Monstarlab, both read from his LinkedIn experience entries:
  - **Create Value Award 2023** — Monstarlab's company award, "for an outstanding
    performance". Listed under Senior Mobile Engineer I (Aug 2023 - Nov 2024). The
    trophy (photo on the site) cites boldness, swift action and dedication to quality.
  - **MonstarHacks 2024, first place** — the 4th edition of Monstarlab's annual internal
    hackathon, contested across 33 offices. The 4th edition ran May 2024 per
    engineering.monstar-lab.com, which is where the year comes from; LinkedIn states
    the placing and the office count but not the date. It was a TEAM win — Utpal
    confirmed "we were champions", so the copy credits the team, and this is the only
    MonstarHacks he placed first in. He entered MonstarHacks 2022 too (see his blog
    article of 14 Apr 2022) and placed 2nd runner-up with Team Invictus (LinkedIn honors,
    Feb 2022; also on the resume). Not on the page until Utpal decides to add it. Team name:
    SportsBuddy, with AWS as partner; the app served blind and deaf sports fans.
  A third item, "BASIS Outsourcing Award 2021", appears only as a media attachment on
  the Mobile Engineer II entry with no description. BASIS awards normally go to
  companies, not individuals, so it is NOT on the page until Utpal confirms whether it
  was his or Monstarlab Bangladesh's.
- Speaking: **Flutter Guild Day 2026**, speaker — a talk on agentic AI, modern software
  engineering and intelligent product development. Organised by Shunnek Labs; the event
  ran 9 May 2026 (his own post is dated the following day, and other attendees' posts
  name the event "Flutter Guild Day 2026", which is where the exact branding comes
  from — his own post only carries the hashtag #FlutterGuild2026). Talk title, from his
  slide: "Building with Agentic AI — The Modern Development Skill Set". Venue: Brain
  Station 23, Mohakhali.
- Award and speaking photos came from his LinkedIn (May 2026 post, Monstarlab role
  media), re-encoded to WebP under 60 KB in `assets/img/`.
- AI practice (Utpal, Oct 2026): he runs his own engineering through Claude Code with
  custom slash commands that hand planning, implementation and investigation to AI agents.
  The hero and the AI Expertise card say this in plain words. Do not claim he ships AI
  features to clients unless he confirms it.
- GitHub: utpal-barman. The beginner Flutter apps (UShop, PhotoMe, expense tracker,
  foodies, form demos) are deliberately NOT on the site.
- Contact: utpal.barman.bd@gmail.com · linkedin.com/in/utpal-barman · Dhaka,
  Bangladesh, UTC+6. LinkedIn is promoted deliberately: a hero action and a named link
  in the contact block.

## 9. Performance budget

The page must stay near-instant. Current: ~10 requests above the fold (avatar and an
8 KB logo), plus three lazy-loaded award photos of 40–57 KB each. No runtime JS
dependencies.

- **No image over 60 KB**, and no animated GIF at all — one was removed for being
  380 KB with a white first frame. Projects are described in words, not code.
- One CSS file, one JS file (about 27 KB and 12 KB, uncompressed). Bump the `?v=` query on
  both in `index.html` on every edit: `.htaccess` caches them immutable for a year. System fonts only: no
  font files, no font CDN, no `assets/fonts/` (the `/tools/pdf` page uses the same stack).
- `loading="lazy"` below the fold.
- `.htaccess` carries gzip and one-year immutable caching for static assets.
- Adding a dependency, a tracker, or an embed requires deleting something else.

## 10. Files and deploy

- **Two hosts, one repo.** utpals.com (cPanel) is canonical. GitHub Pages also serves
  `master` at `utpal-barman.github.io` as a 200 duplicate, not a redirect: Pages ignores
  `.htaccess`, so its redirects and headers do not apply there. Canonical tags and
  `og:url` always name utpals.com, and the single root `sitemap.xml` lists only
  utpals.com URLs; `robots.txt` points both hosts at it. Never add github.io URLs.
- **Deploy** is cPanel git deployment. `.cpanel.yml` copies an explicit allowlist
  (`assets tools html-editor`, plus `index.html robots.txt sitemap.xml .htaccess`) into
  `public_html/`. Anything new that must be served is added there deliberately; paths
  dropped from the site get an `rm` step, because `cp` never deletes.
- **Resume**: `assets/doc/utpal-barman-resume.pdf` is maintained in the private
  `utpal-barman/utpal-barman-resume` repo (`Utpal_Barman_Resume.pdf`). Refresh it with
  `scripts/update-resume.sh` (GitHub CLI, run locally), then commit the PDF. Never edit
  or replace it by hand, and never link to the private repo. Both hero and Contact link
  to the site path.
- `html-editor/` and `tools/` are standalone tool pages, not part of the portfolio; ask
  before changing or deleting them.

## 11. Never do this in a commit

No `Co-Authored-By: Claude`, no Cursor attribution, no "Generated with Claude Code".
Ruled out absolutely by the user, in every repository.
