#!/usr/bin/env bash
# currency reports every tool and pin that trails its latest release, one line
# each, and exits non-zero when it reports any. It reads the network and writes
# nothing. Run it through `mise run currency`.
#
# Each scan captures its command's output in a variable before reading it, so
# under set -e a scan command that fails fails currency instead of reporting
# nothing.
set -euo pipefail
cd "$MISE_PROJECT_ROOT"

stale=0
report() {
	echo "$1"
	stale=1
}

# mise tools pinned below their latest version.
outdated=$(mise outdated --bump --local --json |
	jq -r 'to_entries[] | "\(.key) \(.value.requested) -> \(.value.bump)"')
while read -r line; do
	[ -n "$line" ] && report "mise.toml: $line"
done <<<"$outdated"

# GitHub Actions pinned by tag in the workflows, against each action's latest
# release. Until the layers task adds a workflow, there are none to scan.
if [ -d .github/workflows ]; then
	uses=$(grep -rhoE 'uses: *[^ ]+@[^ ]+' .github/workflows | sed -E 's/uses: *//' | sort -u)
	while IFS=@ read -r action pin; do
		[ -n "$action" ] || continue
		latest=$(gh api "repos/$action/releases/latest" --jq .tag_name)
		[ "$pin" = "$latest" ] || report "workflows: $action $pin -> $latest"
	done <<<"$uses"
fi

exit "$stale"
