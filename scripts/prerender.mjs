// ============================================================
// SwiftLoop — prerender live Journal articles to static HTML
//
//   node scripts/prerender.mjs
//
// Builds a fully static, on-brand page per LIVE article at
//   journal/<slug>/index.html
// so JS-free AI crawlers (and humans) get the full content with
// zero JavaScript. Scheduled (future-dated) articles are skipped;
// the JS article.html keeps serving them until a later prerender.
//
// Vercel serves static files before vercel.json rewrites, so these
// pages win at /journal/<slug>, and /journal/:slug -> /article.html
// stays as the fallback for not-yet-prerendered slugs.
//
// Source of truth: content/articles/*.md (same content as Supabase).
// "Live" = date <= TODAY. Override the cutoff with PRERENDER_TODAY.
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ARTICLES_DIR = join(ROOT, "content", "articles");
const OUT_DIR = join(ROOT, "journal");
const ORIGIN = "https://swiftloop.tech";
const TODAY = process.env.PRERENDER_TODAY || "2026-06-22";

// ---- frontmatter ----
function parse(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("no frontmatter");
  const fm = {};
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (!mm) continue;
    let [, k, v] = mm;
    v = v.trim();
    if (v.startsWith("[") && v.endsWith("]")) {
      fm[k] = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
    } else fm[k] = v.replace(/^"|"$/g, "");
  }
  return { fm, body: m[2] };
}

function cleanBody(body) {
  let b = body.replace(/^\s+/, "");
  b = b.replace(/^!\[[^\]]*\]\([^)]*\)\s*/, ""); // hero image
  b = b.replace(/^#\s+.*\n?/, ""); // first H1
  return b.replace(/^\s+/, "").replace(/\s+$/, "");
}

const esc = (s) =>
  String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- inline markdown -> html (operates on already-escaped text) ----
function inline(text) {
  let t = esc(text);
  t = t.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const ext = /^https?:\/\//.test(href);
    return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return t;
}

// ---- block markdown -> html ----
function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.trim() === "---") { out.push("<hr />"); i++; continue; }
    if (/^##\s+/.test(line)) { out.push(`<h2>${inline(line.replace(/^##\s+/, ""))}</h2>`); i++; continue; }
    if (/^###\s+/.test(line)) { out.push(`<h3>${inline(line.replace(/^###\s+/, ""))}</h3>`); i++; continue; }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ""))}</li>`); i++; }
      out.push(`<ul>${items.join("")}</ul>`); continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ""))}</li>`); i++; }
      out.push(`<ol>${items.join("")}</ol>`); continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`); continue;
    }
    // paragraph: gather until blank
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(##|###|[-*]\s|\d+\.\s|>\s?|---$)/.test(lines[i])) { buf.push(lines[i]); i++; }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n      ");
}

const NAV = `
  <header class="nav" id="nav">
    <a href="/" class="nav-logo" aria-label="SwiftLoop — home">Swift<em>Loop</em><em>.</em></a>
    <nav class="nav-links" aria-label="Primary">
      <a href="/index.html#services">Services</a>
      <a href="/index.html#process">Process</a>
      <a href="/portfolio.html">Portfolio</a>
      <a href="/journal" class="is-active">Journal</a>
    </nav>
    <a href="https://wa.me/971509725199?text=Hi%20SwiftLoop%2C%20I%27d%20like%20to%20start%20a%20project." target="_blank" rel="noopener" class="btn btn--small nav-cta">Start a project</a>
    <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="menu"><span></span><span></span></button>
  </header>
  <div class="menu" id="menu" aria-hidden="true">
    <nav class="menu-links" aria-label="Mobile">
      <a href="/index.html#services"><i>01</i>Services</a>
      <a href="/index.html#process"><i>02</i>Process</a>
      <a href="/portfolio.html"><i>03</i>Portfolio</a>
      <a href="/journal"><i>04</i>Journal</a>
      <a href="/index.html#contact"><i>05</i>Contact</a>
    </nav>
    <div class="menu-foot mono">
      <a href="https://wa.me/971509725199" target="_blank" rel="noopener">WA +971 50 972 5199</a>
      <a href="mailto:info@swiftloop.tech">info@swiftloop.tech</a>
    </div>
  </div>`;

const FOOTER = `
  <footer class="footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <span class="nav-logo">Swift<em>Loop</em><em>.</em></span>
        <p>A web-design and AI-automation studio. Designed by hand, run by machine.</p>
      </div>
      <div class="footer-col"><h4 class="mono">Studio</h4><a href="/index.html#services">Services</a><a href="/index.html#process">Process</a><a href="/portfolio.html">Portfolio</a><a href="/journal">Journal</a></div>
      <div class="footer-col"><h4 class="mono">Social</h4><a href="#" rel="noopener">X / Twitter</a><a href="#" rel="noopener">LinkedIn</a><a href="#" rel="noopener">Dribbble</a></div>
      <div class="footer-col"><h4 class="mono">Contact</h4><a href="https://wa.me/971509725199" target="_blank" rel="noopener">WhatsApp +971 50 972 5199</a><a href="mailto:info@swiftloop.tech">info@swiftloop.tech</a></div>
    </div>
    <div class="footer-base mono"><span>© 2026 SwiftLoop Studio</span><span>Dubai / Remote — GMT+4</span></div>
  </footer>`;

function fmtDate(ymd) {
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(ymd + "T09:00:00+04:00"));
  } catch (e) { return ymd; }
}

function relatedCard(a) {
  return `<a class="jr-card" href="/journal/${a.slug}">
        <div class="jr-card-media">${a.image ? `<img src="${esc(a.image)}" alt="${esc(a.imageAlt || a.title)}" loading="lazy" />` : ""}</div>
        <div class="jr-card-body">
          <div class="jr-meta"><span class="cat">${esc(a.category)}</span>${a.readTime ? `<i class="dot"></i><span>${esc(a.readTime)}</span>` : ""}</div>
          <h3>${esc(a.title)}</h3>
        </div>
      </a>`;
}

function page(a, related) {
  const url = `${ORIGIN}/journal/${a.slug}`;
  const metaRow = `<span class="cat">${esc(a.category)}</span><i class="dot"></i><span>${fmtDate(a.date)}</span>${a.readTime ? `<i class="dot"></i><span>${esc(a.readTime)}</span>` : ""}`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.title,
    description: a.description,
    image: a.image ? [a.image] : undefined,
    datePublished: `${a.date}T09:00:00+04:00`,
    dateModified: `${a.date}T09:00:00+04:00`,
    articleSection: a.category,
    keywords: (a.keywords || []).join(", "),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: "SwiftLoop" },
    publisher: { "@type": "Organization", name: "SwiftLoop", url: ORIGIN + "/" },
  });
  const enc = encodeURIComponent;
  return `<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(a.title)} — SwiftLoop Journal</title>
  <meta name="description" content="${esc(a.description)}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="geo.region" content="AE-DU" /><meta name="geo.placename" content="Dubai" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="SwiftLoop" />
  <meta property="og:title" content="${esc(a.title)}" />
  <meta property="og:description" content="${esc(a.description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${esc(a.image)}" />
  <meta property="article:published_time" content="${a.date}T09:00:00+04:00" />
  <meta property="article:section" content="${esc(a.category)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(a.title)}" />
  <meta name="twitter:image" content="${esc(a.image)}" />
  <link rel="preconnect" href="https://api.fontshare.com" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://images.unsplash.com" crossorigin />
  <link href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600&f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='38' fill='none' stroke='%23ff4d1f' stroke-width='14'/%3E%3C/svg%3E" />
  <script>
    (function(){try{if(sessionStorage.getItem("sl-visited"))document.documentElement.classList.add("sl-revisit");sessionStorage.setItem("sl-visited","1");}catch(e){}document.documentElement.classList.remove("no-js");})();
  </script>
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <div class="grain" aria-hidden="true"></div>
  <div class="read-progress" id="readProgress" aria-hidden="true"></div>
${NAV}
  <main>
    <article>
      <header class="article-hero article-wrap">
        <a href="/journal" class="article-back">← Back to journal</a>
        <div class="jr-meta">${metaRow}</div>
        <h1 class="article-title">${esc(a.title)}</h1>
        <p class="article-lede">${esc(a.description)}</p>
      </header>
      ${a.image ? `<figure class="article-figure"><div class="frame"><img src="${esc(a.image)}" alt="${esc(a.imageAlt || a.title)}" /></div></figure>` : ""}
      <div class="article-body">
      ${a.bodyHtml}
      </div>
      <div class="article-end">
        <span class="mono">Designed by hand, run by machine.</span>
        <div class="article-share" aria-label="Share">
          <a href="https://twitter.com/intent/tweet?text=${enc(a.title)}&url=${enc(url)}" target="_blank" rel="noopener" aria-label="Share on X">X</a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}" target="_blank" rel="noopener" aria-label="Share on LinkedIn">in</a>
          <a href="https://wa.me/?text=${enc(a.title + " " + url)}" target="_blank" rel="noopener" aria-label="Share on WhatsApp">WA</a>
        </div>
      </div>
    </article>
    ${related.length ? `<section class="related">
      <div class="section-head"><h2 class="section-title">Keep reading</h2><span class="section-kicker mono">More from the journal</span></div>
      <div class="related-grid">${related.map(relatedCard).join("\n      ")}</div>
    </section>` : ""}
    <section class="section cta" id="contact">
      <h2 class="cta-title"><span class="line-mask"><span>Your project</span></span><span class="line-mask"><span class="outline">next?</span></span></h2>
      <p class="gs-reveal">One call. We'll map your funnel and your busywork — and show you what the loop looks like.</p>
      <div class="cta-actions gs-reveal">
        <a class="btn" href="https://wa.me/971509725199?text=Hi%20SwiftLoop%2C%20I%27d%20like%20to%20discuss%20a%20project." target="_blank" rel="noopener">Chat on WhatsApp <span class="arrow">→</span></a>
        <a class="btn btn--ghost" href="mailto:info@swiftloop.tech">info@swiftloop.tech</a>
      </div>
    </section>
  </main>
${FOOTER}
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
  <script src="/js/main.js" defer></script>
  <script>
    (function(){var bar=document.getElementById("readProgress");if(!bar)return;function p(){var h=document.documentElement,m=h.scrollHeight-h.clientHeight;bar.style.transform="scaleX("+(m>0?Math.min(1,h.scrollTop/m):0)+")";}addEventListener("scroll",p,{passive:true});p();})();
  </script>
</body>
</html>
`;
}

// ---- build ----
const files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".md") && f !== "index.md");
const all = files.map((f) => {
  const { fm, body } = parse(readFileSync(join(ARTICLES_DIR, f), "utf8"));
  return {
    slug: fm.slug || f.replace(/\.md$/, ""),
    title: fm.title || "",
    description: fm.description || "",
    category: fm.category || "Journal",
    keywords: fm.keywords || [],
    readTime: fm.readTime || "",
    image: fm.image || "",
    imageAlt: fm.imageAlt || "",
    date: fm.date || "",
    bodyHtml: mdToHtml(cleanBody(body)),
  };
});

const live = all.filter((a) => a.date && a.date <= TODAY).sort((a, b) => (a.date < b.date ? 1 : -1));

let written = 0;
for (const a of live) {
  const related = live.filter((x) => x.category === a.category && x.slug !== a.slug).slice(0, 3);
  const dir = join(OUT_DIR, a.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page(a, related), "utf8");
  written++;
}

console.log(`Prerendered ${written} live articles -> journal/<slug>/index.html`);
console.log(`Skipped ${all.length - live.length} scheduled (date > ${TODAY}); JS article.html serves those until next prerender.`);
