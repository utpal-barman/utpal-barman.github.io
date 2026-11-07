---
name: brand-system
description: The design system for utpals.com / utpal-barman.github.io — Utpal Barman's portfolio. Load this before writing or reviewing ANY markup, CSS, or copy for this site. Defines the pure-black "trace" identity: tokens, type scale, component contracts, motion rules, and the voice guide. Triggers on any edit to index.html, assets/css/style.css, assets/js/main.js, or any request to add a section, change a color, adjust spacing, or write site copy.
---

# Brand system — "trace"

Portfolio of **Utpal Barman**, Principal Software Engineer at Brain Station 23. The page has
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

**One design system, iOS first** (Utpal, Nov 2026: "mostly iOS respected and modern
trendy", respecting both iOS Liquid Glass and Material 3 Expressive). Apple decides what
things look like: colours, SF type, Liquid Glass, 44px touch targets, Reduce Transparency
and Increase Contrast. Material 3 Expressive supplies the structure iOS does not spell out
for the web: role-named tokens, a shape scale, state layers, the shape morph on press and
spring motion tokens. When the two disagree, iOS wins.

Declared once in `assets/css/style.css` under `:root`. Never hardcode a colour anywhere
else, inline styles included. Tokens are **roles**, named after iOS's semantic colours:

```
--bg               #000000   page (systemBackground)
--surface-1        #1C1C1E   tiles: Expertise, Projects, Contact (secondarySystemBackground)
--surface-2        #2C2C2E   raised bits: core tags (tertiarySystemBackground)
--separator        #38383A   hairlines (opaqueSeparator) — 1px, the only divider
--separator-strong #48484A   stronger hairline
--outline          #636366   control outlines (3.5:1 on bg, WCAG 1.4.11)

--label            #F5F5F7   primary text   19.3 / 15.6 / 12.8 on bg / surface-1 / surface-2
--label-2          #A1A1A6   secondary       8.2 /  6.6 /  5.4
--label-3          #86868B   tertiary        5.8 /  4.7 — never on surface-2 (3.85)

--tint             #2997FF   links, focus     7.0 /  5.6 /  4.6
--tint-fill        #0071E3   filled button under --on-tint (4.7:1)
--tint-fill-press  #0066CC   its hover and press: darker, never lighter (5.6:1)
--on-tint          #FFFFFF   only on tint fills, selection and print

--state-hover      label @ 8%    Material state layers, washed over controls
--state-press      label @ 12%
```

**Colour means "you can press this"** (HIG). The tint marks links, the primary button
and focus, plus one exception: the agentic AI lead-note dot on the current role.
Eyebrows and kickers are `--label-2`. The `Agentic AI` chip under the role, jade, amber and
the waterfall stay gone.

**State layers only on controls** (both systems): buttons, nav links, the menu toggle. Tiles,
tags and rows are content and never react to hover. A tile hover would also push `--label-3`
under 4.5:1. The primary button darkens instead of taking a light wash, which would drop
white text to 4.2:1. Hovers sit inside `@media (hover: hover) and (pointer: fine)` so touch
never sticks. The state layer is the registered `--state` property, painted as a
`background-image` gradient, so it animates.

**Liquid glass** is **liquidGL** (naughtyduk/liquidGL v3, MIT, vendored at
`assets/js/vendor/liquidGL.js` with its licence): real refraction drawn in WebGPU/WebGL.
The page bends through a bevelled rim with a slight colour split, a moving specular sheen
and a viscous ripple under the pointer. The glass is **clear, never frosted** (`frost: 0`).
glisse (SVG-filter glass) was tried in Nov 2026 and removed the same day. Utpal: "glass
is blurry, not like apple's original liquid glass refraction style". Do not bring back
glisse or any blur-based glass.

Glass is for **floating controls only**, as on iOS 26:
- the nav: main.js inserts an empty `.nav__glass` pane as liquidGL's target
  (`content: false`), so the links stay ordinary DOM. The library's canvas sits inside
  `.nav` and shows only once the bar has become the capsule. Once it is live, `.liquid` on
  `<html>` drops the CSS pane and keeps only the 1px gradient rim. A light dye
  (`--glass-dye`, multiplied into the refracted page) and a dark halo on the labels
  (`--glass-halo`, live glass only) keep nav text legible over large headings.
- the open mobile menu: a second lens (`.nav__menu-glass`, fitted over the menu by
  main.js) with a denser dye (`--glass-dye-menu`).
- secondary buttons (`.btn--glass`: Email me, LinkedIn, project links): iOS's `.glass`
  button style in CSS, a clear `--glass-control` fill with the same lit rim. No blur.
- the **scroll edge** (`.nav::before`): content dims, without blurring, as it slides under
  the bar.

liquidGL works from a still snapshot of the page, so main.js forces `.reveal` blocks
visible while it captures (`.glass-snap`, reset instantly via `.glass-settle`) and
recaptures once lazy images load. It loads after `load`, when the browser is idle, and
only where WebGPU or WebGL exists, not under Save-Data or Reduce Transparency, and only
for `(hover: hover) and (pointer: fine)`: phones and tablets keep the CSS glass, because
the lens costs memory and main-thread time for a desktop flourish. Without it,
the CSS stand-in shows: tint, frost and rim. Under reduced motion the specular sheen and
pointer ripple are off. All nav labels are `--label`. The current section sits under a
lens (`--glass-lens`) that slides between links. It moves like liquid, never a spring: the
leading edge first, the trailing edge after, thinning while stretched (`lens-flow`).
Utpal rejected the spring version.

**Accessibility preferences are part of the system:** `prefers-reduced-transparency`
turns all glass solid (`--surface-1`) and main.js skips liquidGL. `prefers-contrast: more`
raises `--label-2`/`--label-3`, separators and glass opacity. `prefers-reduced-motion`
zeroes durations, and the download spinner holds still and dims instead of turning.

**Contrast is a hard gate.** Every text node clears 4.5:1 on its effective background
(3:1 for >=24px, or >=18.66px bold). The table above is the audit; re-run it after any
colour change.

**Banned:** acid green (`#43ffa4`, `#00ff88` and family), vermilion, gradients
as brand color, pure `#FFFFFF` text, `box-shadow` for elevation. Elevation is the
`--surface-*` steps; light effects on glass are not elevation.

## 3. Type

**The system stack**: SF Pro on Apple devices, Segoe UI on Windows, Roboto on Android.
It is the face each reader's eyes are tuned to, needs no download, and SF Pro cannot be
self-hosted (Apple's licence). The old Archivo / IBM Plex files are no longer loaded.

Hierarchy follows Apple's web text styles (Nov 2026): one size, line height and tracking
per role, tokenised as `--fs-*`, `--lh-*`, `--ls-*`. Headlines are **600 (semibold)**,
never 700. SF tracks tighter as it shrinks to body size and opens slightly from 21px up;
use the role's `--ls-*`, never an ad-hoc value.

| Role | Size | LH | Tracking | Weight | Used for |
|---|---|---|---|---|---|
| hero | clamp(48,7vw,80) | 1.05 | -0.015em | 600 | h1 |
| headline | clamp(32,4.2vw,48) | 1.08 | -0.003em | 600 | h2, contact title |
| title | 24 | 1.17 | 0.009em | 600 | h3 on tiles and projects |
| intro | 21 | 1.38 | 0.011em | 400/600 | hero lede and role line, contact lede, company names |
| body | 17 | 1.47 | -0.022em | 400/500/600 | prose, notes, eyebrows (600), list names (600), buttons |
| caption | 14 | 1.43 | -0.016em | 400/600 | nav, tags, kickers, proof lines, footer |
| footnote | 13, `ui-monospace` | 1.38 | 0 | 400 | dates, durations, metrics only |

Nothing readable goes below 13px. Mono (SF Mono) is only for digits that should align.

**Capitalisation.** Normal sentence/title capitalisation everywhere, including mono
labels, nav items, section eyebrows, tags and dates — `Agentic AI`, `MCP`, `CI/CD`,
`ReactJS`, `Dec 2024 — Present`. Lowercase is reserved for identifiers that are
lowercase in the world: package names (`u_credit_card`, `trace_logger`), filenames
(`home_screen.dart`), domains (`pub.dev`), extensions (`.arb`).

## 4. Space & shape

4px grid. Allowed steps: `4 8 12 16 24 32 48 64 96 128`.
Section rhythm: `clamp(72px, 11vw, 128px)` vertical padding, hairline between.
Container: `max-width 1140px`, gutter `clamp(20px, 5vw, 40px)`.

**Shape scale** (Material 3 Expressive), used **concentrically** (iOS 26): a shape inside
a padded container takes the container's corner minus the padding.

```
--shape-xs 4    text links' focus ring, role-line logo link
--shape-sm 8    contact email focus
--shape-md 12   company logos; a button's corner while pressed
--shape-lg 16   photos
--shape-xl 28   tiles (Expertise, Projects, Contact), the mobile menu (rows: 28 − 8 = 20)
--shape-full    buttons, tags, nav capsule, lens, toggle; the avatar is a circle
```

Lists (Experience, Skills, Awards, Education) stay flat rows on hairlines, like grouped
settings lists. A company with several roles joins them with a separator down the left.
Touch targets: **44px minimum** (`--tap`): buttons, icon button, toggle, logos, social
links; mobile menu rows are 48px. Borders: `1px solid var(--separator)`. Never 2px, never
dashed.

## 5. Motion

Two springs, written as CSS `linear()` curves computed from real spring physics:
- `--spring-spatial`: Material 3 Expressive's spatial spring (damping 0.9, a 0.2% settle
  past the target). Used for anything that moves or changes shape: press scale, the shape
  morph, logos, menu open, the toggle's bars. `--t-fast` 220ms, `--t-default` 320ms.
- `--spring-smooth`: iOS's `.smooth` (critically damped, no bounce), for reveals and the
  nav's lift into the capsule. `--t-reveal` 500ms.
- Effects (colour, opacity, state layers) use `--ease` at `--t-hover` 180ms and never bounce.

- **Press**: buttons settle to 0.97 and morph from capsule to a `--shape-md` rounded square
  (Material 3 Expressive). Nav links and the toggle swell to 1.06 (iOS glass controls).
- Page load: the hero staggers in 4 steps, 70ms apart, `translateY(14px)` → 0.
- Scroll: `IntersectionObserver`, reveal once, never re-hide. Anchors land below the nav
  (`scroll-padding-top`), and scrolling is smooth unless reduced motion is on.
- Nav: the name in the bar fades in only once the hero h1 has left view (`data-brand`,
  gated on `.js`); the bar lifts into the glass capsule once the page scrolls; the lens rule is in 2.
- Photos and the employer logo are monochrome at rest and take their own colour on hover.
- `.js` is set by a one-line script in the head, before first paint, so the reveals and
  the brand never flash hidden-then-visible. Everything gated on it must stay readable
  when it is absent: without JS the page shows all of its content.
- Award photos open in a native `<dialog>` (`.zoom`), an iOS-style sheet; modified clicks
  and no-JS keep the plain link to the file.
- **Resume download** (Utpal, Nov 2026): every `[data-download]` link saves the PDF to the
  browser's downloads (`download="Utpal-Barman-Resume.pdf"`), never a new tab. On click
  the button shows a spinner and "Preparing download…" for **at least 1500ms**
  while the file is fetched, then "Downloaded" for 2s. Its width is held steady, `aria-busy`
  is set, and `#liveStatus` announces each step. Modified clicks and fetch failures fall
  back to the plain link.
- `@media (prefers-reduced-motion: reduce)` zeroes every duration. Verify on every change.

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
actions. The role line is "Principal Software Engineer at" followed by the Brain Station 23
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

- **One runtime dependency: liquidGL**, for the nav and menu glass only (see 2), vendored
  and loaded on idle. No Bootstrap, jQuery, Slick, Lightbox, FontAwesome, Ionicons. Vanilla
  JS, hand-written CSS. Anything else that seems to need a library is the wrong feature.
- Single stylesheet `assets/css/style.css`, single script `assets/js/main.js`. Both are
  numbered by section in page order (tokens, reset, primitives, nav, hero, each section,
  responsive, reduced motion, print); new rules go in their section, never appended at the end.
  No `.min` build artifacts checked in — they go stale and ship the old brand.
- Accessibility floor, verified every change: skip link, semantic landmarks,
  visible `:focus-visible` ring in cobalt, ≥4.5:1 text contrast, keyboard-
  reachable everything, `prefers-reduced-motion` honoured.
- Mobile floor: 360px wide with no horizontal scroll. Experience rows stack below 760px;
  award rows stack below 860px with the photo capped at 360px wide.
- Touch and no-JS floors: every control is at least 44×44 (menu button and nav rows
  included), the open menu scrolls inside itself on short or landscape viewports and
  locks the page behind it, and without JS the menu is not rendered at all — the bar
  keeps the brand — because a menu that cannot open or close is worse than none.
- Award photos open in a native `<dialog>` over the page (Escape and the returning focus
  come with the element); modified clicks and no-JS visitors still get the image file.

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

- Brain Station 23 PLC — **Principal Software Engineer, Oct 2026 → present** (promotion,
  read from his LinkedIn experience on 7 Nov 2026; LinkedIn skills on the role: Agentic AI
  Development, Organizational Leadership). Before that, Lead Engineer I (LinkedIn: "Lead
  Software Engineer"), Dec 2024 → Sep 2026, 1y 10m (Utpal's correction; LinkedIn shows
  Oct 2026 as the overlap month). Leads a 7-engineer mobile team in the
  Europe SBU; European and Japanese clients; hiring, onboarding, mentoring; recruitment
  board member; (the number of concurrent projects is internal and never on the page);
  supports pre-sales (proposals, solution design). **As Principal the focus is AIDLC with
  agentic workflows and Norway-based clients** (Utpal, 7 Nov 2026): never present Japan as a
  current client; Japanese-market work (WellWa) belongs to the Lead period. The title everywhere outside the
  Experience row (hero, nav, meta, JSON-LD, share image) is "Principal Software Engineer".
  The resume (repo and site PDF) was updated to Principal on 7 Nov 2026.
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
- One CSS file, one JS file (about 36 KB and 16 KB, uncompressed), plus the vendored
  liquidGL (290 KB raw, about 62 KB gzipped). It is fetched after `load` when the browser
  is idle, so it never blocks first paint. Bump its `?v=` (in main.js) when upgrading it. Bump the `?v=` query on
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
