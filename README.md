# Café Velo — website

A static site for Café Velo, Carrigaline. No CMS, no server, no framework —
just a content file, a build script, and GitHub Pages.

**Live site:** https://ahroonsanthosh.github.io/velo/

## Editing hours, prices, or contact details

Everything a non-technical person would need to change lives in one file:

```
content/site.json
```

Open it, change a price or a closing time, save, commit, and push to `main`.
GitHub Actions rebuilds and republishes the site automatically — no code
edits, no CMS login, no build tooling on your own machine required.

Examples:
- Change a price: find the item under `menu.categories[].items[]` and edit
  `"price"`.
- Change hours: edit the matching entry in `hours.schedule` (24-hour `open`/
  `close` times drive the live "open now" badge; `label` is the text shown).
- Change the phone number, address, or social links: edit `business`.

## How the site is built

`scripts/build.js` reads `content/site.json` and generates a fully static
`dist/` folder (HTML + CSS inlined + JS + images + fonts). There is no
client-side fetch of the content file — everything is baked into the HTML
at build time, so the page is readable and correct with JavaScript
disabled. JavaScript (`assets/js/main.js`) only adds the live open/closed
state, scroll reveals, the menu accordion, and the bicycle-wheel easter egg
— all progressive enhancement.

To build locally:

```
node scripts/build.js
```

Output goes to `dist/`. Open `dist/index.html` directly or serve it with
any static file server.

## Where things live

```
content/site.json         — the editable content (hours, menu, contact)
scripts/build.js          — generates dist/ from content + templates
scripts/process_images.py — one-off image pipeline (crops/exports); only
                             needs re-running if you add new source photos
assets/img/source/        — original photographs, untouched
assets/img/processed/      — cropped/optimized WebP + AVIF derivatives,
                             the logo trace, favicons, and the OG image
assets/fonts/              — self-hosted Fraunces / Caveat / Space Mono
assets/css/style.css       — all styles (inlined into <head> at build time)
assets/js/main.js          — motion + interaction, no dependencies
.github/workflows/deploy.yml — builds and deploys to Pages on push to main
```

## The logo

There is no vector logo file for Café Velo — only the storefront
photograph. The wordmark used across the site (header, footer, favicon,
OG image) is a **direct crop of that photograph** (`assets/img/source/cv1.webp`),
cleaned up with only global levels/contrast/sharpening — never redrawn,
simplified, or re-lettered. This guarantees pixel-accurate fidelity to the
real sign, including the offset acute accent on the "É". See
`scripts/process_images.py` for the exact crop coordinates.

## Deploying

1. Push to `main`.
2. In the repo's Settings → Pages, set the source to **GitHub Actions**
   (one-time setup).
3. The `deploy.yml` workflow builds `dist/` and publishes it automatically.

No manual `gh-pages` branch needed.
