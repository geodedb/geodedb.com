# Geode Database Documentation

Official documentation for the Geode Graph Database, hosted at [geodedb.com](https://geodedb.com).

## Overview

This repository contains the source for the Geode documentation website, built with Hugo and the Ultra theme. The site includes:

- **Database Documentation**: Complete reference for Geode database server
- **Client Libraries**: Documentation for Go, Python, Rust, and Zig clients
- **Editor Plugins**: Guides for Neovim, Vim, and VSCode integration
- **Claude Plugins**: Documentation for Claude Code integration
- **Getting Started Guides**: Quick start tutorials and examples
- **API Reference**: Complete API documentation

## Local Development

### Prerequisites

- Hugo Extended (v0.120.0+)
- Git

### Build and Serve Locally

```bash
# Clone with submodules
git clone --recursive git@gitlab.com:devnw/codepros/geode/geodedb.com.git

# Or initialize submodules if already cloned
git submodule update --init --recursive

# Serve locally (default port 1313)
hugo server -D

# Build for production
hugo --minify --gc
```

The site will be available at `http://localhost:1313`

## Content Structure

```
content/
├── _index.md           # Homepage
├── docs/               # Main documentation
│   ├── getting-started/
│   ├── installation/
│   ├── configuration/
│   ├── api-reference/
│   └── architecture/
├── clients/            # Client library docs
│   ├── go/
│   ├── python/
│   ├── rust/
│   └── zig/
├── plugins/            # Editor plugin docs
│   ├── neovim/
│   ├── vim/
│   ├── vscode/
│   └── claude/
├── guides/             # How-to guides
└── blog/               # Blog posts and updates
```

## Deployment

The site is automatically deployed to GitLab Pages when changes are pushed to the `main` branch.

- **Production URL**: https://geodedb.com
- **GitLab Pages URL**: https://devnw.gitlab.io/codepros/geode/geodedb.com

### Custom Domain Setup

To configure the custom domain `geodedb.com`:

1. Go to Settings → Pages in the GitLab project
2. Add domain: `geodedb.com` and `www.geodedb.com`
3. Configure DNS records:
   ```
   A     @     35.185.44.232
   AAAA  @     2600:1901:0:26f3::
   CNAME www   devnw.gitlab.io
   ```
4. Add SSL certificate (Let's Encrypt auto-provisioning enabled)

## Theme

This site uses the [Ultra Hugo theme](https://gitlab.com/devnw/codepros/ultra), a highly optimized theme for SEO with:

- Automatic sitemap generation
- OpenGraph and Twitter Card support
- Structured data (Schema.org)
- PWA support
- RSS/Atom feeds
- Responsive design
- Dark mode support

## Contributing

To contribute to the documentation:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `hugo server -D`
5. Submit a merge request

## License

Documentation is licensed under CC BY 4.0.
Code examples are licensed under Apache 2.0.

Copyright 2024-2025 CodePros
