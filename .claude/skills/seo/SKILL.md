---
name: seo
description: Audit and optimize SEO for static portfolio/personal websites. Use when the user mentions SEO, search visibility, meta tags, schema markup, sitemap, robots.txt, Open Graph, search rankings, Google indexing, or wants their site to show up in search results. Also trigger on "why can't I find my site on Google" or any search discoverability concern.
---

# SEO Skill — Static Site Optimization

Lightweight SEO audit and fix tool for static HTML sites (GitHub Pages, Netlify, Vercel, etc.). No build tools required. Reads your HTML, reports what's missing, and adds it.

## Setup

Before first use, tell Claude about your site so it can fill in the right values:

- **Domain** (e.g. `https://yourname.com`)
- **Pages** (e.g. index, about, resume, projects/foo)
- **Social profiles** (LinkedIn, GitHub, Twitter, etc.)
- **What you want to rank for** (e.g. "jane doe software engineer", "jane doe portfolio")

Claude stores this context for the session. You only need to say it once.

---

## What to do when invoked

Read all HTML files in the site source directory. Check each item below. Report a pass/fail table, then offer to fix what's missing.

---

## 1. Per-page `<head>` essentials

Every HTML page needs these inside `<head>`:

```html
<title>[Page Title] — [Your Name]</title>
<meta name="description" content="[unique, 150-160 chars, includes target keywords]">
<link rel="canonical" href="https://yourdomain.com/[path]/">

<!-- Open Graph -->
<meta property="og:title" content="[same as title or shorter]">
<meta property="og:description" content="[same as meta description]">
<meta property="og:image" content="https://yourdomain.com/[path-to-image]">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://yourdomain.com/[path]/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="[Your Name]">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="[same as og:title]">
<meta name="twitter:description" content="[same as og:description]">
<meta name="twitter:image" content="https://yourdomain.com/[path-to-image]">
```

**Guidelines:**
- Title: 50-60 chars. Name + differentiator.
- Meta description: 150-160 chars, unique per page, include your name + relevant keywords.
- OG image: 1200x630px recommended. If no custom image exists per page, use a shared one. Use a real image from the site, not a placeholder.
- Canonical URL: must match the actual deployed URL exactly (trailing slash consistency).

## 2. Structured data (JSON-LD)

Add **Person** + **WebSite** schema to the homepage:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "[Your Name]",
  "url": "https://yourdomain.com",
  "jobTitle": "[Your Title/Role]",
  "affiliation": {
    "@type": "Organization",
    "name": "[School or Company]"
  },
  "sameAs": [
    "[GitHub URL]",
    "[LinkedIn URL]"
  ],
  "knowsAbout": ["[skill1]", "[skill2]", "[skill3]"]
}
</script>
```

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "[Your Name] — [Portfolio Tagline]",
  "url": "https://yourdomain.com"
}
</script>
```

For **project pages**, use `CreativeWork`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "[Project Name]",
  "author": { "@type": "Person", "name": "[Your Name]" },
  "description": "[Brief project description]",
  "url": "https://yourdomain.com/[project]/"
}
</script>
```

**Rules:** JSON-LD only (not Microdata/RDFa). No FAQPage (restricted to government/healthcare). No HowTo (deprecated). No placeholder text in schema fields.

## 3. robots.txt

Create in site root:

```
User-agent: *
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml
```

## 4. sitemap.xml

Create in site root:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yourdomain.com/</loc>
    <lastmod>[YYYY-MM-DD]</lastmod>
    <priority>1.0</priority>
  </url>
  <!-- repeat for each page -->
</urlset>
```

Set `lastmod` to actual last-edit dates. Update sitemap when pages change.

## 5. Image SEO

- All `<img>` tags need descriptive `alt` text (not "image1" or "screenshot")
- Use WebP where possible, keep images under 200KB
- Add `loading="lazy"` to below-fold images
- OG image should be a real file, not a placeholder

## 6. Content & keyword signals

- **H1 tags:** One per page, includes name or project name + keywords
- **Heading hierarchy:** h1 > h2 > h3, no skipping levels
- **Name in body text:** Your name should appear naturally on every page
- **Internal linking:** Pages should link to each other (homepage to projects, about to projects, etc.)
- **External links:** Social profiles linked from about/homepage

## 7. Technical checks

- **HTTPS:** Verify all internal links and resources use `https://`
- **Trailing slash consistency:** Pick one pattern and stick to it across all links, canonicals, and sitemap
- **No broken links:** Check all `href` and `src` attributes resolve
- **Mobile responsive:** Viewport meta tag present on all pages
- **Page speed:** Defer non-critical scripts. Minimal JS = good baseline for static sites.

## 8. Post-deploy verification

After deploying:
1. Visit `/robots.txt` and `/sitemap.xml` directly to verify they're accessible
2. Test OG tags by sharing a link on Discord/Slack/Twitter and checking the preview card
3. Submit sitemap in Google Search Console
4. Search `site:yourdomain.com` after a few days to verify indexing
5. Search your target queries and track ranking over time

## 9. Google Search Console setup

1. Go to Google Search Console, add property for your domain
2. Verify via DNS TXT record or HTML file method
3. Submit sitemap URL
4. Monitor Coverage report for indexing issues

---

## Quick audit output

When running an audit, read all HTML files and output:

| Check | Status | Notes |
|-------|--------|-------|
| Meta descriptions | ... | ... |
| OG tags | ... | ... |
| JSON-LD schema | ... | ... |
| robots.txt | ... | ... |
| sitemap.xml | ... | ... |
| Image alt text | ... | ... |
| H1 tags | ... | ... |
| Internal links | ... | ... |
| Canonical URLs | ... | ... |

Then offer to fix what's missing.
