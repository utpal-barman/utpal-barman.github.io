#!/usr/bin/env bash
# Pull the latest resume from the private resume repo into the site.
# Runs locally (the cPanel host has no gh auth), so commit the result to ship it.
#   scripts/update-resume.sh [ref]   # ref defaults to main
set -euo pipefail

REPO="utpal-barman/utpal-barman-resume"
SRC="Utpal_Barman_Resume.pdf"
REF="${1:-main}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/assets/doc/utpal-barman-resume.pdf"

command -v gh >/dev/null || { echo "gh is not installed" >&2; exit 1; }

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

gh api -H "Accept: application/vnd.github.raw" \
  "repos/$REPO/contents/$SRC?ref=$REF" > "$tmp"

# guard against saving an error page or JSON instead of the PDF
[ "$(head -c 5 "$tmp")" = "%PDF-" ] || { echo "download is not a PDF" >&2; exit 1; }

if cmp -s "$tmp" "$DEST"; then
  echo "resume already up to date"
else
  mkdir -p "$(dirname "$DEST")"
  mv "$tmp" "$DEST"
  echo "updated $DEST ($(wc -c < "$DEST" | tr -d ' ') bytes) from $REPO@$REF"
fi
