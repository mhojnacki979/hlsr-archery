#!/usr/bin/env bash
#
# Re-sync the public results site from Eyes on Score and publish it.
#
# hlsr.eyesonscore.com is a static export — scores are baked in at build time,
# so the page only changes when this runs. hlsrlive.eyesonscore.com polls the
# API from the browser and needs none of this.
#
# Installed on cron for the shoot weekend only; see event-sync.crontab in this
# folder for the entry and how to remove it.
#
#   ./scripts/event-sync.sh        # safe to run by hand too
#
set -uo pipefail

REPO="/Users/michaelhojnacki/Documents/HLSR/hlsr-archery"
DATA="src/data/hlsr/2027.json"
LOG="$REPO/.event-sync.log"
PY=/usr/bin/python3

# cron gets almost no environment, so every tool is named explicitly.
export PATH="/Users/michaelhojnacki/.nvm/versions/node/v20.20.2/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd "$REPO" || exit 1
say() { echo "$(date '+%F %T')  $*" >>"$LOG"; }

# Hard stop after the shoot. The crontab entry is dated to 9-11 October, which
# would come round again next year — this makes a forgotten entry harmless.
EVENT_ENDS="2026-10-12"
if [[ "$(date '+%F')" > "$EVENT_ENDS" ]]; then
  say "event window closed — remove the crontab entry (crontab -e)"
  exit 0
fi

archers() {
  "$PY" -c "
import json,sys
try:
    d=json.load(open('$DATA'))
    print(sum(s.get('archers',0) for s in d['segments'].values()))
except Exception:
    print(-1)
"
}

before=$(archers)

# EOS rate-limits, and answers with an HTML error page rather than JSON when it
# does. The sync writes the data file only on full success, so a failed attempt
# leaves the previous scores in place.
ok=0
for attempt in 1 2 3; do
  if npm run sync:hlsr --silent -- 2027 >>"$LOG" 2>&1; then
    ok=1
    break
  fi
  say "sync attempt $attempt failed; retrying in 30s"
  sleep 30
done

if [ "$ok" -ne 1 ]; then
  say "ALL SYNC ATTEMPTS FAILED — site left showing the last good scores"
  exit 1
fi

after=$(archers)

# Never let a 200-with-nothing-in-it empty the public site mid-event.
if [ "$after" -le 0 ] && [ "$before" -gt 0 ]; then
  say "REFUSED: sync returned $after archers but the site had $before — reverting"
  git checkout -- "$DATA"
  exit 1
fi

if git diff --quiet -- "$DATA"; then
  say "no change ($after archers)"
  exit 0
fi

git add "$DATA"
git -c commit.gpgsign=false commit -q -m "Event sync — $after archers" >>"$LOG" 2>&1
if git push -q >>"$LOG" 2>&1; then
  say "PUBLISHED — $after archers (GitHub Pages takes ~2 min to go live)"
else
  say "PUSH FAILED (keychain locked?) — commit is local, next run will carry it"
fi
