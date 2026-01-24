# Documentation Site Layout - Implementation Guide

## Overview

This document describes the redesigned documentation layout for GeodeDB.com, optimized for technical documentation with modern UX patterns while preserving all SEO optimizations from the Ultra theme.

## What Changed

### Before
- Documentation pages used generic blog-style layouts
- No persistent navigation sidebar
- Limited mobile experience
- No table of contents for long pages
- No documentation-specific features

### After
- **3-column responsive layout** (navigation, content, TOC)
- **Persistent sidebar navigation** with collapsible sections
- **Enhanced table of contents** with active section highlighting
- **Search integration** with keyboard shortcuts
- **Mobile-first responsive design**
- **Callouts/admonitions** for important notes
- **Code tabs** for multi-language examples
- **Print-optimized** styling

## File Structure

```
geodedb.com/layouts/
├── docs/
│   ├── single.html              # Individual documentation pages
│   └── list.html                # Documentation section indexes
├── partials/
│   └── docs/
│       ├── catalog-enhanced.html    # Sidebar navigation
│       ├── toc-enhanced.html        # Table of contents
│       └── search-box.html          # Search component
├── shortcodes/
│   ├── callout.html             # Callout/admonition boxes
│   ├── tabs.html                # Code tabs container
│   └── tab.html                 # Individual tab
└── assets/scss/
    └── _docs.scss               # Documentation-specific styles
```

## Layout Features

### 1. Single Page Layout (`layouts/docs/single.html`)

**Desktop (>992px):**
```
┌─────────────────────────────────────────────────────────┐
│                    Header + Breadcrumb                  │
├──────────┬─────────────────────────────┬────────────────┤
│          │                             │                │
│  Nav     │   Main Content              │  TOC Sidebar   │
│ Sidebar  │   (Documentation)           │  (Sticky)      │
│ (Sticky) │                             │                │
│          │                             │                │
│          │   Prev/Next Navigation      │  Related Pages │
└──────────┴─────────────────────────────┴────────────────┘
│                       Footer                            │
└─────────────────────────────────────────────────────────┘
```

**Mobile (<992px):**
- Collapsible navigation sidebar (toggle button)
- Full-width content
- TOC moved above content
- Single column layout

### 2. List/Index Layout (`layouts/docs/list.html`)

Shows documentation section overview with:
- Section introduction from `_index.md`
- Subsections as cards with page counts
- Pages as organized list items
- Reading time estimates

### 3. Navigation Catalog

**Features:**
- Hierarchical structure (sections → subsections → pages)
- Active state highlighting for current page
- Collapsible sections
- Icon indicators for folders and files
- Smooth animations

**Location:** Left sidebar on all documentation pages

### 4. Table of Contents

**Features:**
- Auto-generated from page headings (H2-H6)
- Active section highlighting (scrollspy)
- Smooth scroll to sections
- Only appears if page has >300 words

**Location:** Right sidebar on desktop, above content on mobile

### 5. Search Box

**Features:**
- Keyboard shortcut: `Alt+K` or `Cmd+K`
- Auto-focus and select on activation
- Integrates with site search

**Configuration:** Set `search.enable = true` in config

## New Shortcodes

### Callout/Admonition

Display important notes, tips, warnings:

```markdown
{{< callout type="note" title="Custom Title" >}}
This is important information that readers should notice.
{{< /callout >}}
```

**Types:**
- `note` (blue) - General information
- `tip` (green) - Helpful suggestions
- `warning` (yellow) - Caution notices
- `danger` (red) - Critical warnings
- `info` (cyan) - Additional context

### Code Tabs

Show code examples in multiple languages:

```markdown
{{< tabs >}}
{{< tab "Go" >}}
```go
client, err := geode.Connect("localhost:3141")
```
{{< /tab >}}
{{< tab "Python" >}}
```python
client = await geode.connect("localhost:3141")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
let client = geode::connect("localhost:3141").await?;
```
{{< /tab >}}
{{< /tabs >}}
```

## Styling Features

### Typography Improvements

- Better line height (1.7) for readability
- Improved heading hierarchy
- Optimized font sizes for screen and print
- Enhanced link styles with hover effects

### Code Blocks

- Syntax highlighting with Monokai theme
- Line numbers for longer blocks
- Horizontal scroll for mobile
- Copy button support (via theme)

### Tables

- Responsive horizontal scroll on mobile
- Hover effects on rows
- Sticky headers for long tables
- Better spacing and borders

### Images

- Automatic responsive sizing
- Border radius and subtle shadows
- Proper margin spacing

## Responsive Breakpoints

```scss
Desktop (≥992px):  Navigation (3 cols) + Content (6 cols) + TOC (3 cols)
Tablet (768-991px): Collapsible Nav + Full width content
Mobile (<768px):    Single column, nav toggle button
```

## SEO Optimizations (Preserved)

All SEO features from Ultra theme are maintained:

✅ Canonical URLs
✅ Open Graph tags
✅ Twitter Cards
✅ Structured data (TechnicalArticle schema)
✅ Breadcrumb navigation
✅ Meta descriptions
✅ Sitemap integration
✅ RSS/Atom feeds
✅ Hreflang tags (multilingual)
✅ Alt text support
✅ Semantic HTML5

## Accessibility Features

✅ WCAG 2.1 AA compliant
✅ Keyboard navigation support
✅ Focus visible styles
✅ ARIA labels and landmarks
✅ Skip to main content link
✅ Proper heading hierarchy
✅ Color contrast ratios met
✅ Reduced motion support

## Print Optimization

When printing documentation:
- Navigation and sidebars hidden
- Full-width content
- Better typography (12pt base)
- Link URLs shown in parentheses
- Page break avoidance for code/tables
- Ink-saving (no shadows/backgrounds)

## Configuration

### Enable Search (optional)

In `config/_default/params.yaml`:

```yaml
search:
  enable: true
```

### Edit on GitHub (optional)

```yaml
docs:
  editURL: "https://github.com/yourorg/yourrepo/edit/main/geodedb.com/content/"
  feedback: true
  showRelated: true
```

### Table of Contents

```yaml
toc: true                # Enable TOC
tocWordCount: 300        # Min words to show TOC
```

### Front Matter Example

```yaml
---
title: "Getting Started with Geode"
description: "Quick start guide for Geode graph database"
weight: 10               # Lower = earlier in lists
toc: true                # Enable table of contents
draft: false
categories: ["Getting Started"]
tags: ["quickstart", "tutorial"]
---
```

## Usage Guidelines

### Documentation Structure

Organize content hierarchically:

```
content/docs/
├── _index.md                    # Main docs index
├── getting-started/
│   ├── _index.md               # Section index
│   ├── installation.md
│   ├── quick-start.md
│   └── configuration.md
├── guides/
│   ├── _index.md
│   ├── querying/
│   │   ├── _index.md
│   │   ├── basic-queries.md
│   │   └── advanced-patterns.md
│   └── security/
│       ├── _index.md
│       └── authentication.md
└── api-reference/
    ├── _index.md
    └── functions.md
```

### Weight-Based Ordering

Use `weight` in front matter to control order:
- Lower weights appear first
- Same weight sorted alphabetically
- Recommended: Use increments of 10 (10, 20, 30) for easy reordering

### Writing Best Practices

1. **Use descriptive titles** - Clear, action-oriented
2. **Add descriptions** - Brief summary for SEO and previews
3. **Structure with headings** - H2 for main sections, H3 for subsections
4. **Use callouts** - Highlight important information
5. **Add code examples** - Use tabs for multi-language
6. **Include images** - Screenshots, diagrams (optimized)
7. **Link liberally** - Connect related topics
8. **Test mobile** - Verify responsive layout

## Performance

The new layout maintains excellent performance:

- **Lazy-loaded images** via Hugo processing
- **Minified CSS/JS** in production
- **Critical CSS inlined** in `<head>`
- **Font preloading** for LCP optimization
- **Intersection Observer** for active TOC (progressive enhancement)
- **Local assets** (no CDN dependencies for core functionality)

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile Safari (iOS 13+)
- Chrome Mobile (Android 8+)

## Migration from Old Layout

No migration needed! The new layouts automatically apply to all content in `/content/docs/`. Existing markdown files work as-is.

### Optional Enhancements

Add to existing docs:

1. **Callouts** - Replace blockquotes with styled callouts
2. **Code tabs** - Combine language-specific examples
3. **Descriptions** - Add front matter descriptions for better SEO
4. **Images** - Optimize and add alt text

## Testing

### Local Development

```bash
cd geodedb.com
hugo server -D
```

Navigate to http://localhost:1313/docs/

### Check Responsiveness

1. Desktop: Full 3-column layout
2. Tablet (iPad): Collapsible sidebar
3. Mobile (iPhone): Single column with toggle
4. Print: Print preview should show clean, printable content

### Validate Accessibility

```bash
# Install axe-core or use browser DevTools
npm install -g @axe-core/cli
axe http://localhost:1313/docs/getting-started/
```

## Troubleshooting

### Navigation not showing

- Check that `_index.md` exists in `/content/docs/`
- Verify front matter has proper `weight` values
- Ensure pages aren't marked as `draft: true`

### TOC not appearing

- Check page has >300 words
- Verify `toc: true` in front matter
- Ensure headings use `##` (H2) or lower

### Search not working

- Enable in config: `search.enable = true`
- Build search index: `hugo` (production build)
- Check that JSON output is configured

### Styling issues

- Clear browser cache
- Rebuild: `hugo --gc`
- Check SCSS compilation errors in terminal

## Future Enhancements

Potential additions:

- [ ] Dark mode toggle for code blocks
- [ ] Copy code button for syntax blocks
- [ ] Version switcher for docs
- [ ] Collapsible code blocks
- [ ] Mermaid diagram support
- [ ] Download as PDF button
- [ ] Multi-language documentation
- [ ] Search autocomplete
- [ ] Keyboard shortcuts panel

## License

Same as GeodeDB documentation (Apache 2.0)

## Support

For issues with the documentation layout:
1. Check this guide
2. Review `/layouts/docs/` files
3. Consult Ultra theme documentation
4. Open issue on project repository
