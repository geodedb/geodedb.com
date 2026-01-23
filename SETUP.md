# Setup Guide for Local Development

## Quick Start

```bash
# 1. Allow direnv (loads Nix environment automatically)
direnv allow

# 2. Wait for Nix environment to load (first time takes ~2-5 minutes)
# You'll see "Geode Documentation Development Environment" when ready

# 3. Start development server
make serve

# 4. Open http://localhost:1313 in your browser
```

## Requirements

- **Nix** - Package manager (installed automatically by .envrc if missing)
- **direnv** - Environment loader (optional but recommended)
- **Git** - Version control

## Installation

### If you have direnv

Just run `direnv allow` in the project directory. The `.envrc` will:
1. Install Nix if not present
2. Load the Nix flake environment
3. Install Hugo Extended, Dart Sass, Node, and npm

### Without direnv

```bash
# Enter Nix development environment manually
nix develop --accept-flake-config

# Then use make commands
make serve
```

## First Time Setup

When you first load the environment, Nix will:
1. Download and build Hugo Extended
2. Download and build Dart Sass
3. Download Node and npm
4. Cache everything for future use

This takes 2-5 minutes the first time. Subsequent loads are instant.

## Available Commands

```bash
# Development
make serve     # Start dev server at http://localhost:1313
make build     # Build production site to public/
make clean     # Clean build artifacts
make update    # Update theme submodule

# Deployment
make deploy    # Instructions for deploying (push to main)
```

## Environment Variables

Set these in your shell or in `.envrc`:

```bash
export BUILDER_NAME="Your Name"
export BUILDER_EMAIL="your@email.com"
```

Or configure in Git:

```bash
git config user.name "Your Name"
git config user.email "your@email.com"
```

## Troubleshooting

### "This feature is not available in your current Hugo version"

This means Hugo Extended with Dart Sass is not available. Solutions:

1. **Using direnv**: Run `direnv allow` to load Nix environment
2. **Without direnv**: Run `nix develop` before `make serve`
3. **Reload environment**: Exit terminal and open new one

### "direnv: error .envrc is blocked"

Run `direnv allow` to trust the `.envrc` file.

### Slow first build

The first time you enter the Nix environment, it downloads and builds all dependencies. This is normal and only happens once. Future builds are cached.

### Changes not showing

Hugo watches for file changes. If changes aren't appearing:
1. Save the file
2. Check terminal for errors
3. Force refresh browser (Ctrl+Shift+R)

## Directory Structure

```
geodedb.com/
├── flake.nix              # Nix development environment
├── .envrc                 # Direnv configuration (auto-loads Nix)
├── config/_default/       # Hugo configuration
├── content/               # Markdown content
│   ├── docs/             # Documentation
│   ├── clients/          # Client library docs
│   ├── plugins/          # Editor plugin docs
│   └── ...
├── themes/ultra/         # Hugo theme (git submodule)
├── static/               # Static files (images, etc.)
└── public/               # Generated site (git-ignored)
```

## Adding Content

### Create a new page

```bash
hugo new docs/my-page.md
```

Or create manually:

```markdown
---
title: "My Page Title"
description: "Page description for SEO"
weight: 10
---

# My Page Title

Content here...
```

### Add images

Place images in `static/images/`:

```markdown
![Alt text](/images/my-image.png)
```

## Theme Customization

The Ultra theme is in `themes/ultra/`. To customize:

1. Override layouts: Create in `layouts/` (same structure as theme)
2. Override styles: Add to `assets/scss/custom.scss`
3. Override config: Update `config/_default/params.yaml`

## Git Workflow

```bash
# Make changes
git add .
git commit -m "Description of changes"

# Push to GitLab (triggers automatic deployment)
git push origin main
```

## GitLab CI/CD

Every push to `main` triggers:
1. Build site with Hugo
2. Deploy to GitLab Pages
3. Available at https://geodedb.com (after DNS setup)

View pipeline status: https://gitlab.com/devnw/codepros/geode/geodedb.com/-/pipelines

## Getting Help

- Hugo docs: https://gohugo.io/documentation/
- Theme docs: `themes/ultra/README.md`
- Nix docs: https://nixos.org/manual/nix/stable/
- Project issues: https://gitlab.com/devnw/codepros/geode/geodedb.com/-/issues
