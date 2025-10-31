# Blog Post Deployment Scripts

## Overview

Three scripts to automate blog post deployment from n8n workflow output to Jekyll blog.

## Scripts

### 1. `deploy-post.sh` - Basic deployment

Simple script that copies files and shows manual git commands.

**Usage:**
```bash
scripts/deploy-post.sh           # Copy files only
scripts/deploy-post.sh -b        # Copy files + run Jekyll serve
```

**What it does:**
1. Finds newest folder in `/Users/IUshakovsky/n8n_files/_caffcalc/posts`
2. Validates exactly 1 .md and 1 .jpg file exist
3. Extracts image filename from markdown frontmatter
4. Renames image to match
5. Copies files to blog directories (with conflict checking)
6. Optionally runs `bundle exec jekyll serve`
7. Shows manual git commands to run

---

### 2. `deploy-post-auto.sh` - Full automation

Includes automatic git commit and push.

**Usage:**
```bash
# Just copy files
scripts/deploy-post-auto.sh

# Copy + commit + push with auto-generated message
scripts/deploy-post-auto.sh -g ""

# Copy + commit + push with custom message
scripts/deploy-post-auto.sh -g "Add article about weird caffeine sources"

# Copy + build Jekyll + commit + push
scripts/deploy-post-auto.sh -b -g "New post: caffeine sources"
```

**Flags:**
- `-b` - Build and serve with Jekyll after deployment
- `-g "message"` - Automatically commit and push to git (auto-generates message if empty)

**What it does:**
All steps from basic script, plus:
7. Automatically runs git add, commit, and push
8. Uses current branch (detects automatically)
9. Shows all git operations in console

---

### 3. `deploy-to-git.sh` - Git-only deployment ⭐ RECOMMENDED

Deploys the most recent post to git after you've tested it locally. Auto-generates commit message in format: "blog post [name]"

**Usage:**
```bash
scripts/deploy-to-git.sh
```

**What it does:**
1. Finds the most recently modified post in `_posts/`
2. Extracts the post name and associated image
3. Shows what will be committed
4. Auto-generates commit message: "blog post [post-name]"
5. Prompts for confirmation
6. Commits and pushes to current branch

**Perfect for two-step workflow:**
1. First: Test locally with `scripts/deploy-post.sh -b`
2. Then: Deploy to git with `scripts/deploy-to-git.sh`

---

## Git Deployment Options

### Option A: Two-step workflow (⭐ RECOMMENDED)

**Best for checking locally before deploying:**

```bash
# Step 1: Copy files and test locally
scripts/deploy-post.sh -b

# (Check your site at http://localhost:4000)
# Press Ctrl+C to stop Jekyll when done

# Step 2: Deploy to git with auto-generated commit message
scripts/deploy-to-git.sh
```

Commit message will be auto-generated as: `blog post weirdest-caffeine-sources`

---

### Option B: One-step full automation
```bash
scripts/deploy-post-auto.sh -g "Your commit message"
```

### Option C: Manual git workflow
```bash
cd /Users/IUshakovsky/Projects/Caffeine
git add _posts/2025-10-29-your-post.md assets/images/blog/your-image.jpg
git commit -m "Add new post: your-post"
git push origin main
```

### Option D: Create an alias for quick deployment
Add to your `~/.zshrc` or `~/.bashrc`:
```bash
alias deploy-blog='cd /Users/IUshakovsky/Projects/Caffeine && scripts/deploy-post-auto.sh -g ""'
```

Then simply run:
```bash
deploy-blog
```

### Option E: Integrate with GitHub Actions (advanced)
- Commit and push using the script
- GitHub Actions automatically builds and deploys Jekyll site
- Requires setting up `.github/workflows/jekyll.yml`

---

## Error Handling

All scripts will abort with clear error messages if:
- Source directory doesn't exist
- No subfolders found
- Not exactly 1 .md and 1 .jpg file
- Image path not found in markdown
- Destination files already exist (prevents overwriting)
- Git repository issues (auto script only)

---

## Typical Workflow

### Recommended: Two-step workflow

1. **Generate content** via n8n workflow → saves to `/Users/IUshakovsky/n8n_files/_caffcalc`
2. **Review output** in the newest timestamped folder
3. **Copy and test locally:**
   ```bash
   scripts/deploy-post.sh -b
   ```
4. **Check site** at http://localhost:4000
5. **Deploy to git:**
   ```bash
   scripts/deploy-to-git.sh
   ```
   Commit message auto-generated as: "blog post [post-name]"
6. **Verify** deployment at your GitHub Pages URL

### Alternative: One-step workflow

1. **Generate content** via n8n workflow
2. **Deploy directly:**
   ```bash
   scripts/deploy-post-auto.sh -g "Custom message"
   ```

---

## Notes

- Scripts use color-coded output (green = success, yellow = warning, red = error)
- The automated script detects your current git branch automatically
- Image path must match format: `image: "/assets/images/blog/filename.jpg"`
- Both markdown and image must have unique names (no overwrites allowed)
- `deploy-to-git.sh` auto-generates commit messages in format: "blog post [post-name]"
  - Example: `2025-10-29-weirdest-caffeine-sources.md` → `"blog post weirdest caffeine sources"`
