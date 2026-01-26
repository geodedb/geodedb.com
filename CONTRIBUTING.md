<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Contributing to Geode Documentation

Thank you for your interest in contributing to the Geode documentation!

## Local Development

### Quick Start

```bash
# Clone the repository
git clone --recursive git@gitlab.com:devnw/codepros/geode/geodedb.com.git
cd geodedb.com

# Install dependencies
make deps        # Install Hugo Extended, Dart Sass, Node.js
make npm         # Install PostCSS and other npm packages

# Start development server
make serve
```

The site will be available at http://localhost:1313

### Making Changes

1. **Create a new branch**
   ```bash
   git checkout -b your-feature-branch
   ```

2. **Make your changes**
   - Documentation files are in `content/`
   - Configuration is in `config/`
   - Custom layouts go in `layouts/`

3. **Test locally**
   ```bash
   make serve
   ```
   Visit http://localhost:1313 to preview changes

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

5. **Push and create merge request**
   ```bash
   git push origin your-feature-branch
   ```

## Documentation Structure

```
content/
├── _index.md           # Homepage
├── docs/               # Main documentation
│   ├── getting-started/
│   ├── installation/
│   ├── gql-reference/
│   ├── data-types/
│   ├── api-reference/
│   ├── architecture/
│   ├── performance/
│   ├── configuration/
│   └── client-libraries/
├── clients/            # Client library specific docs
├── plugins/            # Editor plugin docs
├── guides/             # How-to guides
└── blog/               # Blog posts and updates
```

## Writing Documentation

### Page Format

All documentation pages should have Hugo front matter:

```markdown
---
title: "Page Title"
description: "Brief description for SEO"
weight: 10
---

# Page Title

Content here...
```

### Style Guide

- **Use clear, concise language**
- **Include code examples** for technical concepts
- **Add screenshots** where helpful
- **Link to related pages** for context
- **Test all code examples** before submitting

### Code Examples

Use fenced code blocks with language identifiers:

````markdown
```gql
MATCH (p:Person)
RETURN p.name
```

```go
db, err := sql.Open("geode", "geode://localhost:3141")
```

```python
async with GeodeClient("localhost", 3141) as client:
    result = await client.query("MATCH (p:Person) RETURN p.name")
```
````

## Reviewing Changes

Before submitting:

1. ✅ Run `make serve` and preview changes
2. ✅ Check for broken links
3. ✅ Verify code examples work
4. ✅ Check spelling and grammar
5. ✅ Ensure proper Hugo front matter
6. ✅ Test on different screen sizes if applicable

## Deployment

The site automatically deploys when changes are merged to `main`:

1. GitLab CI builds the site
2. Deploys to GitLab Pages
3. Available at https://geodedb.com

View pipeline status: https://gitlab.com/devnw/codepros/geode/geodedb.com/-/pipelines

## Need Help?

- Check existing documentation in `content/`
- Review [Hugo documentation](https://gohugo.io/documentation/)
- Ask in the project's issue tracker

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (Apache 2.0 for code examples, CC BY 4.0 for documentation).
