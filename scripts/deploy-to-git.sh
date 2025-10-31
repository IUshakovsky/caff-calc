#!/bin/bash

# Git Deployment Script for Blog Posts
# Usage: ./deploy-to-git.sh
# Automatically commits and pushes the most recently added post

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/Users/IUshakovsky/Projects/Caffeine"
POSTS_DIR="$PROJECT_DIR/_posts"
IMAGES_DIR="$PROJECT_DIR/assets/images/blog"

echo -e "${GREEN}=== Git Deployment for Blog Post ===${NC}\n"

cd "$PROJECT_DIR"

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Find the most recently modified markdown file in _posts
LATEST_POST=$(ls -t "$POSTS_DIR"/*.md 2>/dev/null | head -n 1)

if [ -z "$LATEST_POST" ]; then
    echo -e "${RED}Error: No markdown files found in $POSTS_DIR${NC}"
    exit 1
fi

POST_FILENAME=$(basename "$LATEST_POST")
echo -e "${GREEN}Latest post found: $POST_FILENAME${NC}\n"

# Extract the post name from filename (remove date and extension)
# Format: 2025-10-29-weirdest-caffeine-sources.md → weirdest-caffeine-sources
POST_NAME=$(echo "$POST_FILENAME" | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-(.*)\.md$/\1/')

# Convert hyphens to spaces and capitalize for better commit message
POST_TITLE=$(echo "$POST_NAME" | tr '-' ' ')

# Extract image path from the post
IMAGE_PATH=$(grep -E '^\s*image:\s*"' "$LATEST_POST" | head -n 1 | sed -E 's/.*image:\s*"([^"]+)".*/\1/')

if [ -z "$IMAGE_PATH" ]; then
    echo -e "${YELLOW}Warning: No image path found in post${NC}"
    IMAGE_FILENAME=""
else
    IMAGE_FILENAME=$(basename "$IMAGE_PATH")
    echo -e "${GREEN}Associated image: $IMAGE_FILENAME${NC}\n"
fi

# Check what files are new or modified
echo "Checking git status..."
git status --short

# Show what will be committed
echo -e "\n${YELLOW}Files to be committed:${NC}"
echo "  - _posts/$POST_FILENAME"
if [ -n "$IMAGE_FILENAME" ]; then
    echo "  - assets/images/blog/$IMAGE_FILENAME"
fi

# Confirm before proceeding
echo -e "\n${YELLOW}Commit message will be: ${NC}\"blog post $POST_TITLE\""
read -p "Proceed with commit and push? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi

# Add the files
git add "_posts/$POST_FILENAME"
if [ -n "$IMAGE_FILENAME" ] && [ -f "$IMAGES_DIR/$IMAGE_FILENAME" ]; then
    git add "assets/images/blog/$IMAGE_FILENAME"
fi

echo -e "${GREEN}✓ Added files to git${NC}"

# Commit with auto-generated message
COMMIT_MESSAGE="blog post $POST_TITLE"
git commit -m "$COMMIT_MESSAGE"
echo -e "${GREEN}✓ Committed: $COMMIT_MESSAGE${NC}"

# Push to origin
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Pushing to origin/$CURRENT_BRANCH...${NC}"
git push origin "$CURRENT_BRANCH"
echo -e "${GREEN}✓ Pushed to origin/$CURRENT_BRANCH${NC}\n"

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo -e "Post \"$POST_TITLE\" has been deployed to git!"
