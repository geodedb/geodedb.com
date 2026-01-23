# Deployment Guide for geodedb.com

## GitLab Pages Setup

The site is automatically deployed to GitLab Pages when changes are pushed to the `main` branch.

### Pipeline Status

Check the pipeline status at:
https://gitlab.com/devnw/codepros/geode/geodedb.com/-/pipelines

### Default GitLab Pages URL

Once deployed, the site will be available at:
https://devnw.gitlab.io/codepros/geode/geodedb.com/

## Custom Domain Configuration

To configure the custom domain `geodedb.com`:

### 1. Add Domain in GitLab

1. Go to: https://gitlab.com/devnw/codepros/geode/geodedb.com/-/pages
2. Click "New Domain"
3. Add domains:
   - `geodedb.com`
   - `www.geodedb.com`
4. Enable "Automatic certificate management using Let's Encrypt"

### 2. Configure DNS Records

Add the following DNS records at your domain registrar:

#### For geodedb.com (root domain):

```
Type: A
Name: @
Value: 35.185.44.232
TTL: 3600
```

```
Type: AAAA
Name: @
Value: 2600:1901:0:26f3::
TTL: 3600
```

#### For www.geodedb.com (subdomain):

```
Type: CNAME
Name: www
Value: devnw.gitlab.io
TTL: 3600
```

### 3. Verify Domain

After adding DNS records:

1. Wait for DNS propagation (can take up to 48 hours, usually much faster)
2. Verify in GitLab Pages settings
3. Let's Encrypt certificate will be automatically provisioned

### 4. Force HTTPS

In GitLab Pages settings, enable "Force HTTPS" after the certificate is issued.

## DNS Verification

Check DNS propagation:

```bash
# Check A record
dig geodedb.com

# Check AAAA record
dig geodedb.com AAAA

# Check CNAME record
dig www.geodedb.com

# Check from a specific DNS server
dig @8.8.8.8 geodedb.com
```

## SSL Certificate

GitLab Pages automatically provisions Let's Encrypt certificates when:
1. DNS records are correctly configured
2. Domain is verified in GitLab
3. Domain is accessible via HTTP

Certificate renewal is automatic.

## Deployment Process

### Automatic Deployment

Every push to `main` branch triggers:

1. **Test Stage** (on all branches):
   - Builds the site
   - Validates HTML/CSS
   - Checks for broken links

2. **Deploy Stage** (main branch only):
   - Builds production site
   - Deploys to GitLab Pages
   - Site is available within ~2 minutes

### Manual Deployment

To manually trigger a pipeline:

```bash
# Via glab CLI
glab ci run --repo devnw/codepros/geode/geodedb.com

# Or via GitLab UI
# Go to CI/CD → Pipelines → Run Pipeline
```

## Monitoring

### Pipeline Status

```bash
glab ci status --repo devnw/codepros/geode/geodedb.com
```

### View Logs

```bash
glab ci view --repo devnw/codepros/geode/geodedb.com
```

### Pages Status

Check Pages deployment:
https://gitlab.com/devnw/codepros/geode/geodedb.com/-/pages

## Troubleshooting

### Pipeline Fails

1. Check pipeline logs:
   ```bash
   glab ci view
   ```

2. Common issues:
   - Hugo version mismatch
   - Theme submodule not initialized
   - Invalid configuration syntax

### Domain Not Accessible

1. Verify DNS records:
   ```bash
   dig geodedb.com
   ```

2. Check GitLab Pages settings:
   - Domain verification status
   - SSL certificate status

3. Wait for DNS propagation (up to 48 hours)

### SSL Certificate Issues

1. Ensure DNS records are correct
2. Domain must be verified in GitLab
3. HTTP access must work first
4. Certificate provisioning takes 1-2 hours

### 404 Errors

1. Check `baseURL` in config matches domain
2. Verify `public/` directory is generated
3. Check GitLab Pages access control settings

## Performance

### Site Speed

The site is optimized for performance:
- Minified HTML/CSS/JS
- Compressed images (WebP)
- CDN delivery via GitLab Pages
- HTTP/2 support
- Brotli compression

### Monitoring

Use these tools to monitor performance:

- Google PageSpeed Insights
- GTmetrix
- WebPageTest
- Lighthouse CI

## Maintenance

### Update Theme

```bash
cd themes/ultra
git pull origin main
cd ../..
git add themes/ultra
git commit -m "Update ultra theme"
git push
```

### Update Hugo Version

Update `.gitlab-ci.yml`:

```yaml
image: registry.gitlab.com/pages/hugo/hugo_extended:0.XXX.X
```

## Security

### Access Control

By default, the site is public. To restrict access:

1. Go to Settings → General → Visibility
2. Adjust Pages access control
3. Note: Custom domains require public access

### Content Security

- All user-contributed content is reviewed
- Automated link checking prevents broken links
- Regular security updates for dependencies

## Backup

GitLab provides automatic backups of the repository. To create a manual backup:

```bash
git clone --mirror git@gitlab.com:devnw/codepros/geode/geodedb.com.git backup-geodedb
```

## Support

For issues with:
- **GitLab Pages**: https://docs.gitlab.com/ee/user/project/pages/
- **Hugo**: https://gohugo.io/documentation/
- **Ultra Theme**: https://gitlab.com/devnw/codepros/ultra
- **Domain/DNS**: Contact your domain registrar

## Additional Resources

- [GitLab Pages Documentation](https://docs.gitlab.com/ee/user/project/pages/)
- [Custom Domain Setup](https://docs.gitlab.com/ee/user/project/pages/custom_domains_ssl_tls_certification/)
- [Hugo Documentation](https://gohugo.io/documentation/)
- [Ultra Theme Docs](https://gitlab.com/devnw/codepros/ultra)
