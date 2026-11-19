#!/usr/bin/env bash
set -euo pipefail

now="$(date -u '+%F %u')"
read -r edition_date weekday <<< "$now"
case "$CADENCE" in
  sunday) prefix=sun; scheduled_day=7 ;;
  wednesday) prefix=wed; scheduled_day=3 ;;
  *) echo "::error::Unknown newsletter cadence"; exit 1 ;;
esac

if [[ "$GITHUB_EVENT_NAME" == schedule ]]; then
  if [[ "$weekday" != "$scheduled_day" ]]; then
    echo "Scheduled newsletter reached a runner outside its UTC edition day."
    exit 0
  fi

  if [[ "$GITHUB_RUN_ATTEMPT" != '1' ]]; then
    original_date="$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID" --jq '.created_at[:10]')"
    if [[ "$original_date" != "$edition_date" ]]; then
      echo "The original scheduled run belongs to a different UTC edition day."
      exit 0
    fi
  fi
fi

edition_date="${1:-$edition_date}"
if [[ "${NEWSLETTER_DRY_RUN:-}" != true ]]; then
  # List recent PRs directly so a newly created PR is visible even before search indexes it.
  page=1
  while true; do
    pulls="$(gh api --method GET "repos/$GITHUB_REPOSITORY/pulls" \
      -f state=all -f base=main -f sort=created -f direction=desc -F per_page=100 -F page="$page")"
    decision="$(node -e '
      const [prefix, repo, date] = process.argv.slice(1);
      const pulls = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
      const exists = pulls.some(pr => pr.head.repo?.full_name === repo && pr.head.ref.startsWith(prefix));
      if (exists) console.log("exists");
      else if (pulls.length < 100 || pulls.at(-1).created_at < date) console.log("create");
      else console.log("next-page");
    ' "blog/$prefix-$edition_date-" "$GITHUB_REPOSITORY" "$edition_date" <<< "$pulls")"
    case "$decision" in
      exists) echo "A PR already exists for the $edition_date $CADENCE edition." >&2; exit 0 ;;
      create) break ;;
      next-page) page=$((page + 1)) ;;
    esac
  done
fi

printf 'date=%s\n' "$edition_date" >> "$GITHUB_OUTPUT"
