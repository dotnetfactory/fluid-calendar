#!/bin/bash
# Script to sync changes from private to public repository
# Usage: ./scripts/sync-repos.sh /path/to/private/repo /path/to/public/repo

# Check if arguments are provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 /Users/emad/src/fluid-calendar-saas /Users/emad/src/fluid-calendar"
  exit 1
fi

PRIVATE_REPO="$1"
PUBLIC_REPO="$2"

echo "Syncing from private repo ($PRIVATE_REPO) to public repo ($PUBLIC_REPO)"

# Ensure both paths exist
if [ ! -d "$PRIVATE_REPO" ]; then
  echo "Error: Private repo directory does not exist: $PRIVATE_REPO"
  exit 1
fi

if [ ! -d "$PUBLIC_REPO" ]; then
  echo "Error: Public repo directory does not exist: $PUBLIC_REPO"
  exit 1
fi

# Ensure both are git repositories
if [ ! -d "$PRIVATE_REPO/.git" ]; then
  echo "Error: Private repo is not a git repository: $PRIVATE_REPO"
  exit 1
fi

if [ ! -d "$PUBLIC_REPO/.git" ]; then
  echo "Error: Public repo is not a git repository: $PUBLIC_REPO"
  exit 1
fi

# Backup the public repo's .gitignore file
echo "Backing up public repo's .gitignore file..."
GITIGNORE_BACKUP=$(mktemp)
cp "$PUBLIC_REPO/.gitignore" "$GITIGNORE_BACKUP"

# Copy files from private to public, respecting .gitignore
echo "Copying files from private to public repo..."
rsync -av --delete \
  --exclude-from="$PUBLIC_REPO/.gitignore" \
  --exclude=".git" \
  --exclude="*.saas.*" \
  --exclude="src/app/(saas)" \
  --exclude="src/saas" \
  --exclude="src/saas/k8s" \
  --exclude="src/saas/Dockerfile.saas" \
  --exclude=".github/workflows/deploy.saas.yml" \
  "$PRIVATE_REPO/" "$PUBLIC_REPO/"

# Restore the public repo's .gitignore file
echo "Restoring public repo's .gitignore file..."
cp "$GITIGNORE_BACKUP" "$PUBLIC_REPO/.gitignore"
rm "$GITIGNORE_BACKUP"

echo "Files copied successfully."

# Go to public repo and show status
echo "Status of public repo:"
cd "$PUBLIC_REPO"
git status

echo ""
echo "To commit and push changes to the public repo, run:"
echo "cd $PUBLIC_REPO"
echo "git add ."
echo "git commit -m \"Sync changes from private repo\""
echo "git push" 