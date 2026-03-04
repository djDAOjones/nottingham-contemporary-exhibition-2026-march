#!/bin/bash

# Git Push — Commit, push, and deploy in one step
# Usage: ./scripts/git_push.sh [commit message]
#
# What it does:
#   1. Checks for uncommitted changes
#   2. Stages all changes (respecting .gitignore)
#   3. Commits with provided message (or auto-generates one)
#   4. Pushes to origin/master
#   5. Deploys updated static pages to Vercel (if vercel CLI is installed)
#
# Examples:
#   ./scripts/git_push.sh "Fix display page layout"
#   ./scripts/git_push.sh                              # auto-generates commit message

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

# ── Colours ──────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()     { echo -e "${CYAN}[GIT]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}  $1"; }
warn()    { echo -e "${YELLOW}[!]${NC}  $1"; }
fail()    { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

# ── Pre-flight checks ───────────────────────────────

# Ensure we're in a git repo
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Not a git repository"

BRANCH=$(git branch --show-current)
log "Branch: $BRANCH"

# Check for changes
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    warn "No changes to commit"
    exit 0
fi

# ── Stage & Commit ───────────────────────────────────

log "Staging changes..."
git add -A

# Show summary of what's being committed
STATS=$(git diff --cached --stat | tail -1)
CHANGED_FILES=$(git diff --cached --name-only | wc -l | tr -d ' ')
log "$CHANGED_FILES file(s) staged — $STATS"

# Build commit message
if [ -n "$1" ]; then
    COMMIT_MSG="$*"
else
    # Auto-generate message from changed files
    ADDED=$(git diff --cached --name-only --diff-filter=A | wc -l | tr -d ' ')
    MODIFIED=$(git diff --cached --name-only --diff-filter=M | wc -l | tr -d ' ')
    DELETED=$(git diff --cached --name-only --diff-filter=D | wc -l | tr -d ' ')

    PARTS=()
    [ "$ADDED" -gt 0 ] && PARTS+=("${ADDED} added")
    [ "$MODIFIED" -gt 0 ] && PARTS+=("${MODIFIED} modified")
    [ "$DELETED" -gt 0 ] && PARTS+=("${DELETED} deleted")

    SUMMARY=$(IFS=', '; echo "${PARTS[*]}")
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
    COMMIT_MSG="Update: ${SUMMARY} [${TIMESTAMP}]"
fi

log "Committing: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"
success "Committed"

# ── Push ─────────────────────────────────────────────

log "Pushing to origin/$BRANCH..."
git push origin "$BRANCH"
success "Pushed to origin/$BRANCH"

# ── Vercel Deploy ────────────────────────────────────

if command -v vercel >/dev/null 2>&1; then
    log "Deploying static pages to Vercel..."
    cd "$PROJECT_ROOT/public"
    VERCEL_OUTPUT=$(vercel deploy --prod --yes 2>&1)
    if echo "$VERCEL_OUTPUT" | grep -q "Production:"; then
        VERCEL_URL=$(echo "$VERCEL_OUTPUT" | grep "Production:" | tail -1 | awk '{print $NF}')
        success "Vercel deployed: $VERCEL_URL"
    else
        warn "Vercel deploy may have had issues — check output above"
    fi
    cd "$PROJECT_ROOT"
else
    warn "Vercel CLI not installed — skipping deploy"
fi

# ── Summary ──────────────────────────────────────────

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN} Done!${NC}"
echo -e "  Commit:  $COMMIT_MSG"
echo -e "  Branch:  $BRANCH"
echo -e "  Remote:  origin"
echo -e "${GREEN}════════════════════════════════════════${NC}"
