#!/bin/bash

# Blog Post Deployment Script
# Usage: ./deploy-post.sh [-b]
# -b flag: Build and serve with Jekyll after deployment

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SOURCE_DIR="/Users/IUshakovsky/n8n_files/_caffcalc/posts"
DEST_POST_DIR="/Users/IUshakovsky/Projects/Caffeine/_posts"
DEST_IMAGE_DIR="/Users/IUshakovsky/Projects/Caffeine/assets/images/blog"
PROJECT_DIR="/Users/IUshakovsky/Projects/Caffeine"

BUILD_FLAG=false

# Parse command line arguments
while getopts "b" opt; do
    case $opt in
        b)
            BUILD_FLAG=true
            ;;
        \?)
            echo -e "${RED}Invalid option: -$OPTARG${NC}" >&2
            exit 1
            ;;
    esac
done

echo -e "${GREEN}=== Blog Post Deployment Script ===${NC}\n"

# Step 1: Find the newest subfolder by timestamp
echo "Step 1: Finding newest subfolder in $SOURCE_DIR..."
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}Error: Source directory does not exist: $SOURCE_DIR${NC}"
    exit 1
fi

NEWEST_FOLDER=$(ls -t "$SOURCE_DIR" | head -n 1)
if [ -z "$NEWEST_FOLDER" ]; then
    echo -e "${RED}Error: No subfolders found in $SOURCE_DIR${NC}"
    exit 1
fi

NEWEST_PATH="$SOURCE_DIR/$NEWEST_FOLDER"
echo -e "${GREEN}Found: $NEWEST_FOLDER${NC}\n"

# Step 2: Check for exactly one .md and one .jpg file
echo "Step 2: Validating files in $NEWEST_FOLDER..."
MD_COUNT=$(find "$NEWEST_PATH" -maxdepth 1 -type f -name "*.md" | wc -l)
JPG_COUNT=$(find "$NEWEST_PATH" -maxdepth 1 -type f \( -name "*.jpg" -o -name "*.jpeg" \) | wc -l)

if [ "$MD_COUNT" -ne 1 ]; then
    echo -e "${RED}Error: Expected exactly 1 .md file, found $MD_COUNT${NC}"
    exit 1
fi

if [ "$JPG_COUNT" -ne 1 ]; then
    echo -e "${RED}Error: Expected exactly 1 .jpg/.jpeg file, found $JPG_COUNT${NC}"
    exit 1
fi

MD_FILE=$(find "$NEWEST_PATH" -maxdepth 1 -type f -name "*.md")
JPG_FILE=$(find "$NEWEST_PATH" -maxdepth 1 -type f \( -name "*.jpg" -o -name "*.jpeg" \))

echo -e "${GREEN}✓ Found 1 .md file: $(basename "$MD_FILE")${NC}"
echo -e "${GREEN}✓ Found 1 .jpg file: $(basename "$JPG_FILE")${NC}\n"

# Step 3 & 4: Extract image filename from markdown frontmatter
echo "Step 3: Extracting image path from markdown file..."
IMAGE_LINE=$(grep -E '^\s*image:\s*"' "$MD_FILE" | head -n 1)
IMAGE_PATH=$(echo "$IMAGE_LINE" | sed -E 's/^[^"]*"([^"]+)".*$/\1/')

if [ -z "$IMAGE_PATH" ]; then
    echo -e "${RED}Error: Could not find image path in format 'image: \"/path/to/image.jpg\"'${NC}"
    exit 1
fi

IMAGE_FILENAME=$(basename "$IMAGE_PATH")
echo -e "${GREEN}Found image path: $IMAGE_PATH${NC}"
echo -e "${GREEN}Extracted filename: $IMAGE_FILENAME${NC}\n"

# Step 5: Rename jpg file to match extracted filename
echo "Step 5: Renaming image file..."
RENAMED_JPG="$NEWEST_PATH/$IMAGE_FILENAME"

if [ "$JPG_FILE" != "$RENAMED_JPG" ]; then
    mv "$JPG_FILE" "$RENAMED_JPG"
    echo -e "${GREEN}✓ Renamed $(basename "$JPG_FILE") to $IMAGE_FILENAME${NC}\n"
else
    echo -e "${YELLOW}Image already has correct name: $IMAGE_FILENAME${NC}\n"
fi

# Step 6: Copy files to destination (check for conflicts first)
echo "Step 6: Copying files to destination..."

MD_DEST="$DEST_POST_DIR/$(basename "$MD_FILE")"
IMG_DEST="$DEST_IMAGE_DIR/$IMAGE_FILENAME"

# Check for existing files
if [ -f "$MD_DEST" ]; then
    echo -e "${RED}Error: Markdown file already exists: $MD_DEST${NC}"
    echo -e "${RED}Aborting to prevent overwrite.${NC}"
    exit 1
fi

if [ -f "$IMG_DEST" ]; then
    echo -e "${RED}Error: Image file already exists: $IMG_DEST${NC}"
    echo -e "${RED}Aborting to prevent overwrite.${NC}"
    exit 1
fi

# Create destination directories if they don't exist
mkdir -p "$DEST_POST_DIR"
mkdir -p "$DEST_IMAGE_DIR"

# Copy files
cp "$MD_FILE" "$MD_DEST"
cp "$RENAMED_JPG" "$IMG_DEST"

echo -e "${GREEN}✓ Copied markdown to: $MD_DEST${NC}"
echo -e "${GREEN}✓ Copied image to: $IMG_DEST${NC}\n"

# Step 7: Optionally run Jekyll serve
if [ "$BUILD_FLAG" = true ]; then
    echo "Step 7: Building and serving with Jekyll..."
    cd "$PROJECT_DIR"
    bundle exec jekyll serve
else
    echo -e "${YELLOW}Skipping Jekyll build (use -b flag to build and serve)${NC}\n"
fi

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo -e "\nNext steps for Git deployment:"
echo -e "  cd $PROJECT_DIR"
echo -e "  git add _posts/$(basename "$MD_FILE") assets/images/blog/$IMAGE_FILENAME"
echo -e "  git commit -m \"Add new post: $(basename "$MD_FILE" .md)\""
echo -e "  git push origin main"
