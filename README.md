# IOARTS

IOARTS is a static digital-art and fan-art gallery. The site is built with HTML, CSS, and vanilla JavaScript; product and category content is loaded from Hygraph in the browser.

## Features

- Responsive product gallery with tag and color filters
- Featured products and product detail pages
- About, contact, terms of sale, privacy, and copyright pages
- Search-engine metadata, sitemap, and custom 404 page
- Vercel clean URLs and product-route rewrites

## Technology

- HTML, CSS, and vanilla JavaScript
- Hygraph GraphQL API for product and category data
- Vercel for static hosting and URL rewrites

There is no package manifest, dependency installation, or build step.

## Run locally

Use Python 3 (or another static HTTP server) from the repository root:

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). Use an HTTP server rather than opening `index.html` directly, since the gallery requests data from Hygraph.

The clean product URLs are rewritten by Vercel according to `vercel.json`; a basic local static server does not apply those rewrites. Product pages can also be opened through `product.html?slug=<product-slug>` when testing locally.

## Hygraph configuration

The GraphQL endpoint is configured in `javascript.js` and is used by browser-side requests. The site expects Hygraph product data with fields such as `name`, `slug`, `description`, `colorTypeModel`, `tags`, `images`, and `categories`. The queries also use the `ColorEnumeration` type.

The endpoint is public browser configuration, not a secret. Configure Hygraph permissions so the public API exposes only the catalog data the site needs. Do not put private tokens in JavaScript, HTML, local storage, or any other browser-delivered configuration.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Gallery home page |
| `product.html` | Product detail page |
| `about-me.html`, `contact.html` | About and contact pages |
| `terms-of-sale.html`, `privacy-policy.html`, `copyright-attribution.html` | Legal and policy pages |
| `shared.js` | Shared navigation and footer |
| `javascript.js` | Hygraph requests, product rendering, and gallery interactions |
| `shared.css`, `home.css`, `product.css`, `pages.css` | Shared and page-specific styles |
| `vercel.json` | Clean URLs, product rewrite, response headers, and redirect |
| `robots.txt`, `sitemap.xml` | Search crawler configuration |

## Deployment

Deploy the repository as a static site on Vercel. The `vercel.json` file configures clean URLs, product routes, response headers, and the `www.ioarts.ink` to `ioarts.ink` redirect. The `CNAME` file records the custom domain used by the site.
