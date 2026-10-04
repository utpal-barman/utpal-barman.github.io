---
name: Project Context
description: utpals.com — where the design contract lives, what the page is today, and what was deliberately removed
type: project
---

**Canonical spec:** `.claude/skills/brand-system/SKILL.md`. Tokens, type, spacing,
motion, liquid-glass nav, voice, facts on file, performance budget, deploy. This memory
is a pointer and a removal log, not a substitute; when they disagree, the skill wins.

**Page today (Oct 2026):** pure black, Apple dark-mode neutrals and blue (`--cobalt
#2997FF`), system font stack, liquid-glass nav capsule. Sections: hero, Experience,
Expertise, Skills, Projects, Awards and speaking, Education, Certificates, Contact.
Positioning: a mobile engineering lead who works with agentic AI, written for recruiters.

**Plumbing:** sitemap at `/sitemap.xml` (moved from `u/`, 301 in `.htaccess`); resume
PDF pulled from the private resume repo by `scripts/update-resume.sh`; cPanel deploy via
the `.cpanel.yml` allowlist; bump `?v=` on css/js every edit.

## Deliberately removed — do not reintroduce

- The Journey waterfall: timeline bars, legend, year axis, jade/amber role colours
  ("it looks so odd", Oct 2026). Experience is plain rows.
- Self-hosted Archivo / IBM Plex fonts and `assets/fonts/` (system stack now).
- Slogan h1, hero stats bar, Focus cards with engineer jargon, trace-jargon headings.
- Skill percentage bars; Bootstrap, jQuery and every other library; `.min` artifacts.
- Beginner GitHub apps, the 380 KB GIF, phone numbers, availability signalling.
- Skrollo (part-time), MonstarHacks 2022, unconfirmed BASIS award.
