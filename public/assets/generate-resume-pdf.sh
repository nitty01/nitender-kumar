#!/usr/bin/env bash
# Regenerate NITENDER_KUMAR_DL_V5_2025.pdf (2-page A4) from the markdown.
# Requires: pandoc on PATH (or set PANDOC=/path/to/pandoc), google-chrome or chromium, pdfinfo (poppler-utils).
#
# Chrome uses 100% scale by default for --print-to-pdf (no “Shrink to fit”).
# Layout: A4, 0.7in margins, min 10.5pt — see resume-pdf-print-include.html.
set -euo pipefail
cd "$(dirname "$0")"
PANDOC_BIN="${PANDOC:-$(command -v pandoc || true)}"
if [[ -z "$PANDOC_BIN" ]]; then
  echo "pandoc not found. Install pandoc or set PANDOC to the binary path." >&2
  exit 1
fi
CHROME="${CHROME:-$(command -v google-chrome || command -v chromium-browser || command -v chromium || true)}"
if [[ -z "$CHROME" ]]; then
  echo "Chrome/Chromium not found. Set CHROME to the browser binary." >&2
  exit 1
fi
TMP="$(mktemp /tmp/resume-v5-XXXXXX.html)"
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT
"$PANDOC_BIN" -f markdown+raw_html NITENDER_KUMAR_DL_V5_2025.md -s \
  --template=resume-pdf-template.html \
  --include-in-header=resume-pdf-print-include.html \
  -o "$TMP"
# --no-pdf-header-footer: no browser header/footer; default print scale = 100% (actual size).
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$(pwd)/NITENDER_KUMAR_DL_V5_2025.pdf" \
  "file://$TMP"
pdfinfo NITENDER_KUMAR_DL_V5_2025.pdf | grep Pages
