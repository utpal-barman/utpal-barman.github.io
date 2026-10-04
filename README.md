# utpals.com — Utpal Barman

Personal site of **Utpal Barman**, Lead Software Engineer at Brain Station 23 — mobile
engineering leadership (native and cross-platform, iOS and Android) and agentic AI.
Live at [utpals.com](https://utpals.com).

## Stack

Hand-written HTML, CSS and JavaScript. **No runtime dependencies** — no framework, no
jQuery, no CSS library, no icon font, no font files. Type is the system stack (SF Pro on
Apple, Segoe UI on Windows, Roboto on Android) with `ui-monospace` for dates and figures.
There is no build step.

```text
index.html                 the whole page
assets/css/style.css       the single stylesheet; every design token lives in :root
assets/js/main.js          nav and liquid-glass capsule, scroll reveal, live role duration
assets/img/                WebP photos and logos, each under 60 KB
assets/doc/                resume PDF (pulled from a private repo, see below)
assets/favicon/            favicon set generated from favicon.svg
tools/                     standalone tool pages (tools/pdf: in-browser PDF tools)
html-editor/               standalone HTML editor, not part of the portfolio
scripts/update-resume.sh   pulls the latest resume PDF from the private resume repo
sitemap.xml, robots.txt    SEO; the sitemap lists canonical utpals.com URLs only
.htaccess                  canonical host, redirects, gzip, caching, security headers
.cpanel.yml                deploy allowlist for utpals.com
```

## Design system

Pure black, Apple dark-mode neutrals, one blue accent, hairlines instead of shadows, and
a liquid-glass nav capsule. The page is written for recruiters and hiring managers:
plain words, named clients and teams, technical terms kept to the Skills section.

The full contract (tokens, type scale, spacing, motion, voice, verified facts) is in
[`.claude/skills/brand-system/SKILL.md`](.claude/skills/brand-system/SKILL.md). Read it
before changing anything visual or any copy.

## Local development

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

When you edit `style.css` or `main.js`, bump its `?v=` query in `index.html`:
`.htaccess` caches both as immutable for a year. On content changes, bump
`dateModified` in the JSON-LD and `lastmod` in `sitemap.xml`.

## Updating the resume

The PDF is maintained in the private `utpal-barman/utpal-barman-resume` repo. Pull the
latest copy with the GitHub CLI (needs `gh auth login`), then commit it:

```sh
scripts/update-resume.sh          # or: scripts/update-resume.sh <branch|tag|sha>
```

The script saves to `assets/doc/utpal-barman-resume.pdf`, refuses anything that is not a
PDF, and leaves the file alone if nothing changed.

## Deployment

The same repo is served in two places:

- **utpals.com** (canonical) — cPanel git deployment. `.cpanel.yml` copies an explicit
  allowlist into `public_html/`; anything new that must be served has to be added there,
  and removed paths need an `rm` step because `cp` never deletes. `www` and `http`
  301 to `https://utpals.com`.
- **utpal-barman.github.io** — GitHub Pages from `master`. It serves the same files as a
  copy, not a redirect, and ignores `.htaccess`. Every page's canonical tag points to
  utpals.com, and `robots.txt` points both hosts at `https://utpals.com/sitemap.xml`.

## Contact

[LinkedIn](https://www.linkedin.com/in/utpal-barman/) ·
[GitHub](https://github.com/utpal-barman) ·
<utpal.barman.bd@gmail.com>
