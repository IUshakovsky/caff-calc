# Deployment Scripts

This folder contains automation scripts for deploying blog posts from n8n workflow output.

## Quick Start

### Recommended workflow:

```bash
# 1. Copy files and test locally
scripts/deploy-post.sh -b

# 2. Deploy to git (auto-generated commit message)
scripts/deploy-to-git.sh
```

## Scripts

- **`deploy-post.sh`** - Copy files from n8n output to blog (with optional Jekyll build)
- **`deploy-post-auto.sh`** - Full automation: copy + commit + push
- **`deploy-to-git.sh`** - Git deployment only (for after local testing) ⭐
- **`DEPLOYMENT_GUIDE.md`** - Full documentation

## Documentation

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete usage instructions and all options.
