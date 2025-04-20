#!/bin/bash
# Script to push content to Gitea
set -e

# Configuration
GITEA_URL="${GITEA_URL:-https://gitea.k8s.orb.local}"
GITEA_USER="${GITEA_USER:-gitea_admin}"
GITEA_PASS="${GITEA_PASS:-gitea_admin}"
REPO_NAME="${REPO_NAME:-git-server}"

# echo "Using Gitea URL: $GITEA_URL"
# echo "Using repository: $REPO_NAME"

# Ensure we're in a git repo or create one
if [ ! -d ".git" ]; then
  git init
  git config user.email "admin@example.com"
  git config user.name "Admin"
  git add .
  git commit -m "Initial commit"
fi

REMOTE_URL="${GITEA_URL#https://}"
# Set up Gitea remote
git remote remove gitea 2>/dev/null || true
git remote add gitea "https://${GITEA_USER}:${GITEA_PASS}@${REMOTE_URL}/${GITEA_USER}/${REPO_NAME}.git"

# Get current branch and force push
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push -f gitea ${BRANCH}