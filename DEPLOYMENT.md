<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Deployment Guide for geodedb.com

## Deployment Strategy

| Environment | URL | Platform | Trigger |
|-------------|-----|----------|---------|
| **Production** | https://geodedb.com | Cloudflare Pages | Tagged releases (`v*.*.*`) - **Automatic** |
| **Development** | https://dev.geodedb.com | GitLab Pages | Main branch pushes - **Automatic** |

## How It Works

### Development (GitLab Pages) - dev.geodedb.com

Every push to the `main` branch automatically deploys to GitLab Pages:

1. GitLab CI runs the `pages` job
2. Hugo builds the site with `baseURL: https://dev.geodedb.com`
3. Site is deployed to GitLab Pages
4. DNS record `dev.geodedb.com` points to `devnw.gitlab.io`

This provides a preview environment for testing changes before production release.

### Production (Cloudflare Pages) - geodedb.com

Production deployments are **automatically triggered** by semantic version tags:

1. Create and push a tag: `git tag v1.0.0 && git push origin v1.0.0`
2. GitLab CI automatically runs the `cloudflare-pages` job
3. Hugo builds the site with `baseURL: https://geodedb.com`
4. Wrangler deploys to Cloudflare Pages
5. Site is live at https://geodedb.com

**Tag Format**: Must match `v*.*.*` (e.g., `v1.0.0`, `v2.1.3`, `v0.18.1`)

### Manual Production Deploy (Emergency)

For urgent fixes without creating a tag:

1. Go to GitLab CI/CD > Pipelines
2. Find the pipeline for main branch
3. Click "Run" on the `cloudflare-pages-manual` job

## Release Process

### Standard Release

```bash
# 1. Ensure all changes are committed and pushed to main
git checkout main
git pull origin main

# 2. Test on development site
# Visit https://dev.geodedb.com and verify changes

# 3. Create a release tag
git tag v1.0.0
git push origin v1.0.0

# 4. Production deployment starts automatically
# Monitor at: https://gitlab.com/devnw/codepros/geode/geodedb.com/-/pipelines

# 5. Verify production site
# Visit https://geodedb.com
```

### Hotfix Release

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-fix main

# 2. Make and commit fixes
git add .
git commit -m "Fix: critical issue"

# 3. Merge to main
git checkout main
git merge hotfix/critical-fix
git push origin main

# 4. Wait for dev site deployment, verify fix at dev.geodedb.com

# 5. Create patch release tag
git tag v1.0.1
git push origin v1.0.1
```

## CI/CD Variables

The following variables must be configured in GitLab CI/CD settings:

| Variable | Description | Required For |
|----------|-------------|--------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages edit permission | Production deploys |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Production deploys |

### Creating the Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Edit Cloudflare Workers" template or create custom:
   - **Permissions**: Account > Cloudflare Pages > Edit
   - **Account Resources**: Include > Your Account
4. Copy the token and add to GitLab CI/CD variables (Settings > CI/CD > Variables)

## Local Development

```bash
# Install dependencies
make deps
make npm

# Start development server (http://localhost:1313)
make serve

# Build production site locally
make build

# Build development site locally
make build-dev

# Deploy to Cloudflare Pages manually (requires CLOUDFLARE_API_TOKEN)
make deploy-cf
```

## Initial Cloudflare Pages Setup

If the Cloudflare Pages project doesn't exist yet:

```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create the Pages project
wrangler pages project create geodedb-com

# Add custom domains in Cloudflare Dashboard:
# - geodedb.com
# - www.geodedb.com
```

## Infrastructure

The DNS and Cloudflare configuration is managed via Terraform in:

```
~/src/gl/devnw/infra/prod-critical/geodedb_pages.tf
```

This includes:
- DNS records for geodedb.com (apex, www, dev)
- DNS records for geode.run (redirect to geodedb.com)
- Redirect rules for www and geode.run

## Pipeline Status

### Check Pipeline Status

```bash
# Via glab CLI
glab ci status --repo devnw/codepros/geode/geodedb.com

# View logs
glab ci view --repo devnw/codepros/geode/geodedb.com
```

### Pipeline URLs

- **All Pipelines**: https://gitlab.com/devnw/codepros/geode/geodedb.com/-/pipelines
- **GitLab Pages Settings**: https://gitlab.com/devnw/codepros/geode/geodedb.com/-/pages

## Troubleshooting

### Build Fails

1. Check Hugo version matches: `hugo version` should show `0.139.4`
2. Ensure Dart Sass is installed: `sass --version`
3. Run `make clean` and try again

### Cloudflare Deploy Fails

1. Verify `CLOUDFLARE_API_TOKEN` is set correctly in GitLab CI/CD variables
2. Check the token has Pages edit permission
3. Ensure the project name matches: `geodedb-com`
4. Check wrangler output in pipeline logs

### DNS Issues

1. Check Terraform state:
   ```bash
   cd ~/src/gl/devnw/infra/prod-critical
   terraform plan
   ```
2. Verify Cloudflare Pages custom domain is configured
3. Allow up to 24 hours for DNS propagation

### 404 Errors on Production

1. Verify the Cloudflare Pages project exists
2. Check custom domain is configured in Cloudflare Dashboard
3. Ensure `_headers` and `_redirects` are in `static/` directory

### Development Site Not Updating

1. Check GitLab Pages deployment status
2. Verify DNS record for `dev.geodedb.com`
3. Clear browser cache or try incognito mode

## Domain Configuration

### Production (geodedb.com)

- **Hosted on**: Cloudflare Pages
- **Project name**: `geodedb-com`
- **DNS**: CNAME to `geodedb-com.pages.dev`

### Development (dev.geodedb.com)

- **Hosted on**: GitLab Pages
- **DNS**: CNAME to `devnw.gitlab.io`
- **Path**: `/codepros/geode/geodedb.com`

### Alternative Domain (geode.run)

- **Redirects to**: geodedb.com
- **Managed via**: Cloudflare redirect rules

## Security

### Access Control

- Production site is public (required for custom domain)
- Development site is public for preview access
- Repository access controlled via GitLab permissions

### SSL/TLS

- **Production**: Cloudflare Universal SSL (automatic)
- **Development**: Let's Encrypt via GitLab Pages (automatic)

## Support

For issues with:
- **Cloudflare Pages**: https://developers.cloudflare.com/pages/
- **GitLab Pages**: https://docs.gitlab.com/ee/user/project/pages/
- **Hugo**: https://gohugo.io/documentation/
- **Infrastructure**: Check `prod-critical` repo Terraform configuration
