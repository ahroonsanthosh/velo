#!/usr/bin/env node
/*
  Café Velo static site builder.
  Reads content/site.json and emits a fully static dist/ directory —
  no server, no CMS, no client-side content fetch. Edit content/site.json,
  run `node scripts/build.js` (or push to main and let CI do it), done.
*/
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const SITE_URL = "https://ahroonsanthosh.github.io/velo/";

const content = JSON.parse(fs.readFileSync(path.join(ROOT, "content/site.json"), "utf8"));
const { business, hours, differentiators, menu, gallery } = content;

// Critical CSS: the whole stylesheet is modest for a single-page site, so
// it's all inlined — this removes render-blocking requests from the
// critical path entirely rather than splitting an artificial "above the
// fold" subset.
const inlineCss =
  fs.readFileSync(path.join(ROOT, "assets/css/tokens.css"), "utf8") +
  "\n" +
  fs.readFileSync(path.join(ROOT, "assets/css/style.css"), "utf8");

/* ---------------------------------------------------------------- */
/* image helper                                                      */
/* ---------------------------------------------------------------- */
const IMG_DIMS = {
  "hero-shopfront": { 480: [480, 640], 765: [765, 1020] },
  "hero-shopfront-band": { 480: [480, 439], 765: [765, 700] },
  latte: { 399: [399, 501] },
  "breakfast-overhead": { 480: [480, 853], 574: [574, 1020] },
  "benedict-thumb": { 480: [480, 417], 700: [700, 608] },
  "burger-thumb": { 480: [480, 432], 700: [700, 630] },
  "velo-detail-band": { 900: [900, 427], 1793: [1793, 850] },
};

function picture(name, { sizes, className = "", alt = "", loading = "lazy", fetchpriority = "" }) {
  const widths = Object.keys(IMG_DIMS[name])
    .map(Number)
    .sort((a, b) => a - b);
  const maxW = widths[widths.length - 1];
  const [w, h] = IMG_DIMS[name][maxW];
  const avifSet = widths.map((wd) => `assets/img/processed/${name}-${wd}.avif ${wd}w`).join(", ");
  const webpSet = widths.map((wd) => `assets/img/processed/${name}-${wd}.webp ${wd}w`).join(", ");
  const fp = fetchpriority ? ` fetchpriority="${fetchpriority}"` : "";
  return `<picture>
    <source type="image/avif" srcset="${avifSet}" sizes="${sizes}">
    <source type="image/webp" srcset="${webpSet}" sizes="${sizes}">
    <img src="assets/img/processed/${name}-${maxW}.webp" width="${w}" height="${h}" alt="${escapeHtml(alt)}" loading="${loading}"${fp} class="${className}" decoding="async">
  </picture>`;
}

function escapeHtml(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Build-time word-mask splitting, standing in for a JS SplitText plugin.
// Each word gets its own overflow:hidden mask so GSAP can stagger a
// yPercent reveal per word without measuring rendered line boxes at runtime.
function maskWords(text) {
  return text
    .split(" ")
    .map((w) => `<span class="word-mask"><span class="word">${escapeHtml(w)}</span></span>`)
    .join(" ");
}

/* ---------------------------------------------------------------- */
/* hand-drawn SVG ornaments — no icon libraries for brand marks      */
/* ---------------------------------------------------------------- */
const svg = {
  wheel: (cls = "") => `<svg class="${cls}" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="4" aria-hidden="true">
    <circle cx="60" cy="60" r="46"/>
    <circle cx="60" cy="60" r="7" fill="currentColor" stroke="none"/>
    <line x1="60" y1="60" x2="60" y2="14"/><line x1="60" y1="60" x2="60" y2="106"/>
    <line x1="60" y1="60" x2="14" y2="60"/><line x1="60" y1="60" x2="106" y2="60"/>
    <line x1="60" y1="60" x2="92.5" y2="27.5"/><line x1="60" y1="60" x2="27.5" y2="92.5"/>
    <line x1="60" y1="60" x2="92.5" y2="92.5"/><line x1="60" y1="60" x2="27.5" y2="27.5"/>
    <rect x="56.5" y="2" width="7" height="11" rx="1.5" fill="currentColor" stroke="none" transform="rotate(3 60 8)"/>
  </svg>`,
  olive: (cls = "") => `<svg class="${cls}" viewBox="0 0 200 70" fill="none" aria-hidden="true">
    <path class="draw-path" d="M6 54 C 50 48, 90 32, 194 10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="34" cy="48" rx="13" ry="5" fill="currentColor" transform="rotate(-25 34 48)"/>
    <ellipse cx="58" cy="40" rx="13" ry="5" fill="currentColor" transform="rotate(15 58 40)"/>
    <ellipse cx="84" cy="32" rx="13" ry="5" fill="currentColor" transform="rotate(-20 84 32)"/>
    <ellipse cx="112" cy="25" rx="12" ry="5" fill="currentColor" transform="rotate(18 112 25)"/>
    <ellipse cx="140" cy="19" rx="12" ry="4.5" fill="currentColor" transform="rotate(-15 140 19)"/>
    <ellipse cx="166" cy="14" rx="11" ry="4.5" fill="currentColor" transform="rotate(20 166 14)"/>
    <circle cx="70" cy="47" r="4" fill="currentColor" opacity="0.55"/>
    <circle cx="122" cy="33" r="4" fill="currentColor" opacity="0.55"/>
  </svg>`,
  badge: (cls = "") => `<svg class="${cls}" viewBox="0 0 160 160" fill="none" aria-hidden="true">
    <circle cx="80" cy="80" r="74" stroke="currentColor" stroke-width="2"/>
    <circle cx="80" cy="80" r="64" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 5"/>
    <path id="badgeArcTop" d="M14 92 A 66 66 0 1 1 146 92" fill="none"/>
    <path id="badgeArcBot" d="M26 112 A 66 66 0 0 0 134 112" fill="none"/>
    <text font-family="'Space Mono', monospace" font-size="11" letter-spacing="1" fill="currentColor">
      <textPath href="#badgeArcTop" startOffset="50%" text-anchor="middle">CAF&#201; &#183; VELO</textPath>
    </text>
    <text font-family="'Space Mono', monospace" font-size="9" letter-spacing="1" fill="currentColor">
      <textPath href="#badgeArcBot" startOffset="50%" text-anchor="middle">CARRIGALINE</textPath>
    </text>
    <g transform="translate(80 80) scale(0.34) translate(-60 -60)" stroke="currentColor" stroke-width="5">
      <circle cx="60" cy="60" r="46"/><circle cx="60" cy="60" r="8" fill="currentColor" stroke="none"/>
      <line x1="60" y1="60" x2="60" y2="14"/><line x1="60" y1="60" x2="60" y2="106"/>
      <line x1="60" y1="60" x2="14" y2="60"/><line x1="60" y1="60" x2="106" y2="60"/>
      <line x1="60" y1="60" x2="92.5" y2="27.5"/><line x1="60" y1="60" x2="27.5" y2="92.5"/>
      <line x1="60" y1="60" x2="92.5" y2="92.5"/><line x1="60" y1="60" x2="27.5" y2="27.5"/>
    </g>
  </svg>`,
  chevron: (cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`,
  arrowUp: (cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
  arrowDiag: (cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="18" x2="18" y2="6"/><polyline points="8 6 18 6 18 16"/></svg>`,
  phone: (cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2C9.5 22 2 14.5 2 6a2 2 0 0 1 2-2Z"/></svg>`,
  pin: (cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-7.4 7-12.6A7 7 0 0 0 5 9.4C5 14.6 12 22 12 22Z"/><circle cx="12" cy="9.4" r="2.4"/></svg>`,
  camera: (cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="14" rx="3"/><circle cx="12" cy="13.5" r="3.6"/><path d="M8.5 6.5 9.8 4h4.4l1.3 2.5"/></svg>`,
  fork: (cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2v8a2 2 0 0 0 4 0V2M8 10v12M18 2c-2 1-3 3-3 6s1 4 3 5v9"/></svg>`,
  burger: (cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,
  close: (cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>`,
};

// Diagonal slide-swap arrow used inside CTA buttons: a resting arrow slides
// off on hover while a duplicate slides in from the opposite corner.
function arrowSwap() {
  return `<span class="btn__arrows" aria-hidden="true">${svg.arrowDiag("btn__arrow btn__arrow--a")}${svg.arrowDiag("btn__arrow btn__arrow--b")}</span>`;
}

/* ---------------------------------------------------------------- */
/* section renderers                                                  */
/* ---------------------------------------------------------------- */
function renderDiffs() {
  const icons = [svg.wheel("diff-card__icon draw-icon"), svg.olive("diff-card__icon draw-icon"), svg.pin("diff-card__icon draw-icon")];
  return differentiators
    .map(
      (d, i) => `
    <article class="diff-card" data-reveal>
      ${icons[i] || svg.badge("diff-card__icon draw-icon")}
      <h3>${escapeHtml(d.title)}</h3>
      <p>${escapeHtml(d.body)}</p>
    </article>`
    )
    .join("");
}

function renderMenuItem(item) {
  const thumb = item.thumb
    ? `<div class="menu-item__thumb">${picture(item.thumb, { sizes: "52px", alt: "" })}</div>`
    : "";
  const tags = [];
  if (item.veg) tags.push("Veg");
  if (item.gf) tags.push("GF");
  if (item.allergens) tags.push("Allergens " + item.allergens);
  return `<div class="menu-item">
    ${thumb}
    <div>
      <div class="menu-item__row">
        <h4>${escapeHtml(item.name)}</h4>
        <span class="menu-item__price">${escapeHtml(item.price)}</span>
      </div>
      ${item.desc ? `<p>${escapeHtml(item.desc)}</p>` : ""}
      ${tags.length ? `<div class="menu-item__tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
    </div>
  </div>`;
}

function renderMenu() {
  return menu.categories
    .map((cat, i) => {
      const thumbName = { breakfast: "breakfast-overhead", drinks: "latte", desserts: "velo-detail-band" }[cat.id];
      return `
    <div class="menu-cat" data-open="${i === 0 ? "true" : "false"}">
      <button class="menu-cat__trigger" aria-expanded="${i === 0 ? "true" : "false"}" aria-controls="panel-${cat.id}">
        <div class="menu-cat__thumb kb-hover">${picture(thumbName, { sizes: "64px", alt: "" })}</div>
        <div class="menu-cat__meta">
          <span class="eyebrow">${escapeHtml(cat.eyebrow)}</span>
          <h3>${escapeHtml(cat.name)}</h3>
          <p>${escapeHtml(cat.blurb)}</p>
        </div>
        ${svg.chevron("menu-cat__chev")}
      </button>
      <div class="menu-cat__panel" id="panel-${cat.id}">
        <div class="menu-cat__panel-inner">
          <div class="menu-cat__items">
            ${cat.items.map(renderMenuItem).join("")}
          </div>
        </div>
      </div>
    </div>`;
    })
    .join("");
}

function renderGallery() {
  return gallery
    .map((g) => `<figure class="gallery__photo">${picture(g.image, { sizes: "220px", alt: g.alt })}</figure>`)
    .join("");
}

function renderHoursRows() {
  return hours.schedule
    .map(
      (d) => `<tr data-day-row="${d.key}" data-highlight="${d.highlight ? "true" : "false"}">
        <td>${d.day}</td><td>${d.label}</td>
      </tr>`
    )
    .join("");
}

const DAY_KEY_TODAY_FALLBACK = (() => {
  // Build-time fallback only — real "today" is computed client-side in main.js.
  const fri = hours.schedule.find((d) => d.key === "fri");
  return fri;
})();

function marqueeContent() {
  const phrases = [
    "Breakfast served all day",
    "Fridays open till 9:30pm",
    "8:30–7 every weekend",
    "Owenabue Mall, Carrigaline",
    "No booking — just walk in",
    "Full Irish, roast potato on the side",
  ];
  const items = phrases.map((p) => `<span class="marquee__item">${svg.wheel("")}${escapeHtml(p)}</span>`).join("");
  return items + items; // duplicated for seamless loop
}

function announcementContent() {
  const phrases = [`Open ${DAY_KEY_TODAY_FALLBACK.label} on Fridays`, "Weekends 8:30am – 7pm", "Owenabue Mall · Carrigaline", "(021) 484 8111"];
  const items = phrases.map((p) => `<span class="announce__item">${escapeHtml(p)}</span>`).join("<span class=\"announce__dot\">·</span>");
  return items + `<span class="announce__dot">·</span>` + items;
}

// Four-panel ingredient-poetry cycler, on-site photography only (no
// studio black-background shots at this near-full-bleed scale).
const CYCLER_PANELS = [
  { heading: "Egg. Rasher. Sausage. Toast.", image: "breakfast-overhead", alt: "Full Irish breakfast on a navy plate" },
  { heading: "Espresso. Milk. Oat. Maple.", image: "latte", alt: "Latte with heart-shaped latte art" },
  { heading: "Navy. Sage. Olive. Open Late.", image: "hero-shopfront-band", alt: "Café Velo shopfront fascia and windows" },
  { heading: "Sun-Warmed. Unpretentious. Local.", image: "velo-detail-band", alt: "Close detail of the CAFÉ VELO dimensional signage" },
];

function renderCycler() {
  return CYCLER_PANELS.map(
    (p, i) => `
    <div class="cycler__panel" data-panel="${i}">
      <div class="cycler__media">${picture(p.image, { sizes: "50vw", alt: p.alt })}</div>
      <h3 class="cycler__heading">${maskWords(p.heading)}</h3>
    </div>`
  ).join("");
}

/* ---------------------------------------------------------------- */
/* JSON-LD                                                           */
/* ---------------------------------------------------------------- */
function buildJsonLd() {
  const openingHours = hours.schedule.map((d) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: `https://schema.org/${{
      mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
    }[d.key]}`,
    opens: d.open,
    closes: d.close,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: business.name,
    image: [SITE_URL + "assets/img/processed/hero-shopfront-765.webp"],
    url: SITE_URL,
    telephone: business.phone,
    priceRange: business.priceRange,
    servesCuisine: business.cuisine,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${business.address.line1}, ${business.address.line2}`,
      addressLocality: business.address.town,
      addressRegion: business.address.county,
      postalCode: business.address.postcode,
      addressCountry: business.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: business.geo.lat,
      longitude: business.geo.lng,
    },
    openingHoursSpecification: openingHours,
    sameAs: [business.socials.instagram.url, business.socials.facebook.url],
    menu: SITE_URL + "#menu",
    hasMenu: {
      "@type": "Menu",
      hasMenuSection: menu.categories.map((c) => ({
        "@type": "MenuSection",
        name: c.name,
        hasMenuItem: c.items.map((i) => ({
          "@type": "MenuItem",
          name: i.name,
          offers: { "@type": "Offer", price: i.price.replace("€", ""), priceCurrency: "EUR" },
        })),
      })),
    },
  };
}

/* ---------------------------------------------------------------- */
/* page                                                              */
/* ---------------------------------------------------------------- */
const pageTitle = "Café Velo — Breakfast & Lunch in Carrigaline";
const pageDescription =
  "Cycling-themed cafe on the Carrigaline main road. Full Irish, eggs benedict and good coffee, 8:30am till late on Fridays and both weekend days.";

const NAV_LINKS = [
  { href: "#story", label: "About" },
  { href: "#menu", label: "Menu" },
  { href: "#gallery", label: "Gallery" },
  { href: "#hours", label: "Hours" },
];

function navLinks(cls) {
  return NAV_LINKS.map((l) => `<a class="${cls}" href="${l.href}">${escapeHtml(l.label)}</a>`).join("");
}

const html = `<!doctype html>
<html lang="en-IE" class="no-js">
<head>
<meta charset="utf-8">
<script>document.documentElement.classList.replace('no-js','js')</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${pageDescription}">
<link rel="canonical" href="${SITE_URL}">
<meta name="theme-color" content="#1c2733">
<meta name="robots" content="index, follow">

<meta property="og:type" content="restaurant">
<meta property="og:title" content="${pageTitle}">
<meta property="og:description" content="${pageDescription}">
<meta property="og:url" content="${SITE_URL}">
<meta property="og:image" content="${SITE_URL}assets/img/processed/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_IE">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${pageTitle}">
<meta name="twitter:description" content="${pageDescription}">
<meta name="twitter:image" content="${SITE_URL}assets/img/processed/og-image.png">

<link rel="icon" href="assets/img/processed/favicon-32.png" sizes="32x32">
<link rel="icon" href="assets/img/processed/favicon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="assets/img/processed/favicon-180.png">
<link rel="manifest" href="site.webmanifest">

<link rel="preload" href="assets/fonts/fraunces-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/space-mono-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" as="image" href="assets/img/processed/hero-shopfront-765.webp">

<style>${inlineCss}</style>
<script type="application/ld+json">${JSON.stringify(buildJsonLd())}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<div class="preloader" data-preloader aria-hidden="true">
  <div class="preloader__wheel">${svg.wheel("")}</div>
  <div class="preloader__count" data-preloader-count>0</div>
</div>

<div class="announce" aria-hidden="true" tabindex="-1">
  <div class="announce__track">${announcementContent()}</div>
</div>

<header class="site-header" data-scrolled="false" data-nav>
  <a href="#main" aria-label="Café Velo home">
    <img class="logo-plaque" src="assets/img/processed/logo-wordmark.webp" width="1180" height="234" alt="Café Velo, traced from the shopfront sign" loading="eager">
  </a>
  <nav class="header__nav" aria-label="Section">
    ${navLinks("header__navlink")}
  </nav>
  <div class="header__right">
    <div class="header__status">
      <span class="status-dot" data-status-dot data-open="true"></span>
      <span data-open-pill>${DAY_KEY_TODAY_FALLBACK.day} · ${DAY_KEY_TODAY_FALLBACK.label}</span>
    </div>
    <button class="header__burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle>
      ${svg.burger("")}
    </button>
  </div>
</header>

<div class="mobile-menu" id="mobile-menu" data-mobile-menu aria-hidden="true">
  <button class="mobile-menu__close" type="button" aria-label="Close menu" data-menu-close>${svg.close("")}</button>
  <nav class="mobile-menu__nav" aria-label="Section">
    ${navLinks("mobile-menu__link")}
  </nav>
  <div class="mobile-menu__foot">
    <a href="${business.phoneHref}">${escapeHtml(business.phone)}</a>
    <a href="${business.socials.instagram.url}" target="_blank" rel="noopener">${escapeHtml(business.socials.instagram.handle)}</a>
  </div>
</div>

<main id="main">

  <section class="hero">
    <div class="hero__ornament hero__ornament--wheel" aria-hidden="true">${svg.wheel("")}</div>
    <div class="hero__ornament hero__ornament--olive" aria-hidden="true">${svg.olive("")}</div>
    <div class="container">
      <div class="hero__copy">
        <span class="eyebrow hero__eyebrow">Owenabue Mall · Carrigaline</span>
        <h1 class="hero__title">${maskWords("Eggs, coffee, and a bike on the wall")}<span class="accent"> — Velo<svg viewBox="0 0 160 12"><path d="M2 8 C 40 2, 120 2, 158 8"/></svg></span></h1>
        <p class="hero__lede lede" style="color:var(--sage-100)">A green-fronted breakfast counter that runs later than every other cafe on this road — Fridays till half nine, both weekend mornings through to 7. ${escapeHtml(business.descriptor)}</p>
        <div class="hero__ctas">
          <a class="btn btn--primary" href="${business.phoneHref}">${svg.phone()}Call<span class="btn__detail"> ${business.phone}</span>${arrowSwap()}</a>
          <a class="btn btn--ghost" href="https://www.google.com/maps/search/?api=1&query=${business.address.mapQuery}" target="_blank" rel="noopener">${svg.pin()}Get Directions${arrowSwap()}</a>
        </div>
        <div class="hero__badge">${svg.wheel("")}<span data-open-pill>Open ${DAY_KEY_TODAY_FALLBACK.label} today</span></div>
      </div>
      <div class="hero__media" data-reveal>
        ${picture("hero-shopfront", { sizes: "(min-width: 960px) 45vw, 100vw", alt: "Café Velo shopfront: navy fascia with dimensional white lettering, sage-green pillars either side of the door, an olive tree by the entrance", loading: "eager", fetchpriority: "high" })}
        <span class="hero__media-cap">The actual shopfront, Owenabue Mall</span>
      </div>
    </div>
  </section>

  <div class="marquee" aria-hidden="true" tabindex="-1">
    <div class="marquee__track">${marqueeContent()}</div>
  </div>

  <section class="story" id="story">
    <div class="container">
      <div class="story__media" data-reveal>
        ${picture("latte", { sizes: "360px", alt: "Latte with heart-shaped latte art on a wooden table next to a potted plant" })}
      </div>
      <div>
        <span class="eyebrow">Most mornings, table by the window</span>
        <p class="script story__quote">sun-warmed, unpretentious, local.</p>
        <p class="lede story__text">That's the whole brief. No loyalty app, no small-batch-anything speech — just a green door on the main road, a coffee that arrives with a heart drawn in it, and a kitchen that doesn't stop at 11am because "breakfast" apparently has a curfew everywhere else. It doesn't here.</p>
      </div>
    </div>
  </section>

  <section class="cycler" aria-labelledby="cycler-h">
    <h2 id="cycler-h" class="visually-hidden">What's on the pass</h2>
    <div class="cycler__pin">
      <div class="cycler__stage">${renderCycler()}</div>
      <div class="cycler__progress" aria-hidden="true">
        ${CYCLER_PANELS.map((_, i) => `<span class="cycler__dot" data-dot="${i}"></span>`).join("")}
      </div>
    </div>
  </section>

  <section class="diffs" aria-labelledby="diffs-h">
    <div class="container">
      <div class="diffs__head" data-reveal>
        <span class="eyebrow">Why here, not the chain next door</span>
        <h2 id="diffs-h">Three things regulars mention first</h2>
      </div>
      <div class="diffs__grid">${renderDiffs()}</div>
    </div>
  </section>

  <section class="menu" id="menu" aria-labelledby="menu-h">
    <div class="container">
      <div class="menu__head" data-reveal>
        <span class="eyebrow">On the board</span>
        <h2 id="menu-h">Breakfast till we close, cake all day</h2>
        <p class="menu__note">${escapeHtml(menu.note)} Allergen codes: ${escapeHtml(menu.allergenLegend)}</p>
      </div>
      <div class="menu__list" data-reveal>${renderMenu()}</div>
    </div>
  </section>

  <section class="gallery" id="gallery" aria-labelledby="gallery-h">
    <div class="container gallery__head" data-reveal>
      <div>
        <span class="eyebrow">On the socials</span>
        <h2 id="gallery-h">Find us on Instagram</h2>
      </div>
      <a class="gallery__handle" href="${business.socials.instagram.url}" target="_blank" rel="noopener">${business.socials.instagram.handle}</a>
    </div>
    <div class="gallery__pin">
      <div class="gallery__collage">${renderGallery()}</div>
    </div>
  </section>

  <section class="hours-location" id="hours" aria-labelledby="hl-h">
    <div class="container">
      <div class="hl__head" data-reveal>
        <div>
          <span class="eyebrow">Hours &amp; getting here</span>
          <h2 id="hl-h">Longer than you'd expect</h2>
        </div>
        <button class="wheel-toy" type="button" aria-label="Drop some wheels, purely for fun" data-drop-wheels>
          ${svg.wheel("")}
          <span>click to drop wheels</span>
        </button>
      </div>

      <div class="hl__grid">
        <div class="ticket" data-reveal>
          <h3>Opening hours</h3>
          <p class="open-pill"><span class="status-dot" data-status-dot data-open="true"></span><span data-open-pill>${DAY_KEY_TODAY_FALLBACK.day}: ${DAY_KEY_TODAY_FALLBACK.label}</span></p>
          <table class="hours-table">
            <tbody>${renderHoursRows()}</tbody>
          </table>
          <p class="menu__note" style="border-color:var(--sage-500);color:var(--sage-100)">${escapeHtml(hours.note)}</p>
        </div>

        <div class="ticket" data-reveal>
          <h3>Find us</h3>
          <address class="addr-block">
            ${escapeHtml(business.address.line1)}<br>
            ${escapeHtml(business.address.line2)}<br>
            ${escapeHtml(business.address.town)}, ${escapeHtml(business.address.county)}<br>
            ${escapeHtml(business.address.postcode)}<br><br>
            <a href="${business.phoneHref}">${escapeHtml(business.phone)}</a>
          </address>
          ${svg.olive("draw-icon")}
          <div class="hl__actions">
            <a class="btn btn--outline-navy" style="color:var(--paper);border-color:rgba(251,248,241,0.5)" href="https://www.google.com/maps/search/?api=1&query=${business.address.mapQuery}" target="_blank" rel="noopener">${svg.pin()}Get Directions${arrowSwap()}</a>
            <a class="btn btn--outline-navy" style="color:var(--paper);border-color:rgba(251,248,241,0.5)" href="${business.phoneHref}">${svg.phone()}Call the cafe${arrowSwap()}</a>
          </div>
        </div>
      </div>
    </div>
  </section>

</main>

<footer class="site-footer">
  <div class="container footer__grid">
    <div class="footer__brand">
      <img class="logo-plaque" src="assets/img/processed/logo-wordmark.webp" width="1180" height="234" alt="Café Velo">
      <p>${escapeHtml(business.descriptor)}</p>
      ${svg.badge("badge-rotate")}
    </div>
    <div>
      <h4>Visit</h4>
      <ul>
        <li><address style="display:inline">${escapeHtml(business.address.line1)}, ${escapeHtml(business.address.line2)}, ${escapeHtml(business.address.town)}</address></li>
        <li><a href="${business.phoneHref}">${escapeHtml(business.phone)}</a></li>
        <li><a href="https://www.google.com/maps/search/?api=1&query=${business.address.mapQuery}" target="_blank" rel="noopener">Get directions</a></li>
      </ul>
    </div>
    <div>
      <h4>Follow</h4>
      <ul>
        <li><a href="${business.socials.instagram.url}" target="_blank" rel="noopener">Instagram — ${escapeHtml(business.socials.instagram.handle)}</a></li>
        <li><a href="${business.socials.facebook.url}" target="_blank" rel="noopener">Facebook</a></li>
      </ul>
    </div>
  </div>
  <div class="footer__wordmark-wrap" data-reveal>
    <span class="footer__wordmark">Café Velo<sup>™</sup></span>
  </div>
  <div class="container footer__bottom">
    <span>© ${new Date().getFullYear()} Café Velo, Carrigaline</span>
    <span>Built as a static site — no tracking, no cookies</span>
  </div>
</footer>

<nav class="dock" aria-label="Quick actions">
  <a class="dock__item dock__item--primary" href="${business.phoneHref}">${svg.phone()}<span>Call</span></a>
  <a class="dock__item" href="https://www.google.com/maps/search/?api=1&query=${business.address.mapQuery}" target="_blank" rel="noopener">${svg.pin()}<span>Directions</span></a>
  <a class="dock__item" href="#menu">${svg.fork()}<span>Menu</span></a>
  <a class="dock__item" href="${business.socials.instagram.url}" target="_blank" rel="noopener">${svg.camera()}<span>Instagram</span></a>
</nav>

<button class="to-top" type="button" aria-label="Back to top">${svg.arrowUp()}</button>

<script id="velo-hours-data" type="application/json">${JSON.stringify(hours.schedule)}</script>
<script src="assets/js/main.js" defer></script>
</body>
</html>
`;

/* ---------------------------------------------------------------- */
/* write dist                                                        */
/* ---------------------------------------------------------------- */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, "index.html"), html);
copyDir(path.join(ROOT, "assets/js"), path.join(DIST, "assets/js"));
copyDir(path.join(ROOT, "assets/fonts"), path.join(DIST, "assets/fonts"));
copyDir(path.join(ROOT, "assets/img/processed"), path.join(DIST, "assets/img/processed"));

fs.writeFileSync(
  path.join(DIST, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`
);
fs.writeFileSync(
  path.join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}</loc></url></urlset>\n`
);
fs.writeFileSync(
  path.join(DIST, "site.webmanifest"),
  JSON.stringify(
    {
      name: business.name,
      short_name: "Velo",
      start_url: ".",
      display: "standalone",
      background_color: "#1c2733",
      theme_color: "#1c2733",
      icons: [
        { src: "assets/img/processed/favicon-192.png", sizes: "192x192", type: "image/png" },
        { src: "assets/img/processed/favicon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2
  )
);

console.log("Built dist/ —", fs.statSync(path.join(DIST, "index.html")).size, "bytes index.html");
