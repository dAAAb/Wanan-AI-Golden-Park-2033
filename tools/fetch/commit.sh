#!/usr/bin/env bash
# Commit the given paths back to the branch that triggered the workflow (retrying on races).
set -u
msg="$1"; shift
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
for p in "$@"; do [ -e "$p" ] && git add -A "$p"; done
if git diff --cached --quiet; then echo "nothing to commit"; exit 0; fi
git commit -m "$msg"
for i in 1 2 3 4 5 6; do
  if git pull --rebase -X theirs origin "$GITHUB_REF_NAME" && git push origin "HEAD:$GITHUB_REF_NAME"; then exit 0; fi
  sleep $((i * 7))
done
exit 1
