#!/bin/bash
# Script to sync changes from public (open source) to private (SAAS) repository
# Usage: ./scripts/sync-repos-reverse.sh /path/to/public/repo /path/to/private/repo

# Check if arguments are provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 /Users/emad/src/fluid-calendar /Users/emad/src/fluid-calendar-saas"
  exit 1
fi

PUBLIC_REPO="$1"
PRIVATE_REPO="$2"

echo "Syncing from public repo ($PUBLIC_REPO) to private repo ($PRIVATE_REPO)"

# Ensure both paths exist
if [ ! -d "$PUBLIC_REPO" ]; then
  echo "Error: Public repo directory does not exist: $PUBLIC_REPO"
  exit 1
fi

if [ ! -d "$PRIVATE_REPO" ]; then
  echo "Error: Private repo directory does not exist: $PRIVATE_REPO"
  exit 1
fi

# Ensure both are git repositories
if [ ! -d "$PUBLIC_REPO/.git" ]; then
  echo "Error: Public repo is not a git repository: $PUBLIC_REPO"
  exit 1
fi

if [ ! -d "$PRIVATE_REPO/.git" ]; then
  echo "Error: Private repo is not a git repository: $PRIVATE_REPO"
  exit 1
fi

# The key difference here is that we DON'T want to use --delete flag
# as that would remove SAAS-specific files in the private repo
echo "Copying files from public to private repo..."
rsync -av \
  --exclude=".gitignore" \
  --exclude=".git" \
  --exclude=".next" \
  --exclude="node_modules" \
  --exclude=".env" \
  --exclude=".env.local" \
  --exclude=".env.development" \
  --exclude=".env.production" \
  --exclude=".env.test" \
  --exclude=".env.test.local" \
  --exclude=".github/workflows" \
  "$PUBLIC_REPO/" "$PRIVATE_REPO/"

echo "Files copied successfully."

# Go to private repo and show status
echo "Status of private repo:"
cd "$PRIVATE_REPO"
git status

echo ""
echo "To commit and push changes to the private repo, run:"
echo "cd $PRIVATE_REPO"
echo "git add ."
echo "git commit -m \"Sync changes from open source repo\""
echo "git push" 