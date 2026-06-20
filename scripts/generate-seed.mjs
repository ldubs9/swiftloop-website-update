// ============================================================
// SwiftLoop — mix articles, backdate + schedule, generate seed
//
//   node scripts/generate-seed.mjs
//
// Scheme (75 articles, all uploaded on Fridays):
//   • Topics are MIXED — a category round-robin spreads Web
//     Design / AI / Industries / etc. so the timeline is varied,
//     never clustered.
//   • PAST: the first (total - SCHEDULED) articles get past Friday
//     dates, weekly, the newest landing on ANCHOR_FRIDAY (the last
//     Friday before today).
//   • SCHEDULED: the final SCHEDULED articles get FUTURE Friday
//     dates, one per week. They are stored with published = true
//     but published_at in the future; RLS + the client query gate
//     `published_at <= now()`, so each one goes live automatically
//     on its Friday — no cron, no redeploy.
//
// Re-runnable: INSERT uses on conflict (slug) do update.
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ARTICLES_DIR = join(ROOT, "content", "articles");

const TODAY = "2026-06-20";
// The newest PAST article lands here — the last Friday before today.
const ANCHOR_FRIDAY = Date.UTC(2026, 5, 19, 5, 0, 0); // 2026-06-19 09:00 +04
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SCHEDULED = 15; // final N articles are future Friday uploads

// The full set of 75 slugs (order here is just membership — the
// publishing order is computed by mixByCategory below).
const SLUGS = [
  "web-design-in-dubai-what-premium-costs",
  "custom-website-vs-template",
  "what-is-a-design-system",
  "how-long-to-build-a-custom-website-uae",
  "web-design-for-jewelry-businesses-dubai",
  "why-core-web-vitals-matter",
  "what-is-ai-workflow-automation",
  "selling-luxury-online-beyond-pretty-photos",
  "custom-ai-chatbots-vs-off-the-shelf",
  "the-swiftloop-loop-process",
  "whatsapp-bots-for-uae-businesses",
  "bilingual-arabic-english-websites-rtl",
  "watch-resale-websites-building-trust",
  "automating-lead-follow-up",
  "portfolio-websites-for-interior-designers",
  "ai-agents-rag-explained-simply",
  "how-to-photograph-jewelry-for-the-web",
  "websites-for-architecture-firms-uae",
  "custom-branding-vs-generic-logos",
  "automating-invoices-reports-admin",
  "ecommerce-details-that-signal-premium",
  "web-design-for-fit-out-companies-dubai",
  "product-configurators-custom-web-apps",
  "voice-ai-agents-booking-support",
  "what-goes-into-brand-identity-system",
  "website-speed-equals-revenue",
  "custom-ai-systems-vs-saas-subscriptions",
  "booking-systems-for-studios-and-services",
  "web-design-for-real-estate-companies-dubai",
  "motion-and-3d-on-the-web-threejs-gsap",
  "conversion-focused-design-what-moves-the-needle",
  "why-every-build-ships-with-a-retainer",
  "custom-crm-automations-for-small-teams",
  "web-design-for-beauty-wellness-studios-dubai",
  "headless-cms-explained-for-business-owners",
  "how-much-should-uae-business-spend-on-website",
  "ai-inventory-management-for-product-businesses",
  "customizer-web-apps-for-furniture-interiors",
  "email-dm-automation-that-doesnt-feel-robotic",
  "shopify-webflow-or-custom",
  "web-accessibility-for-premium-brands",
  "why-your-luxury-brand-needs-arabic-first",
  "what-happens-after-launch",
  "building-a-watch-resale-marketplace",
  "from-inquiry-to-invoice-automating-client-journey",
  "cost-of-a-slow-or-outdated-website",
  "how-swiftloop-measures-results",
  "seo-for-dubai-businesses-2026",
  "llms-txt-making-your-site-ai-readable",
  "get-found-by-ai-search-aeo-geo",
  // --- Dubai/UAE-specific batch ---
  "web-design-difc-financial-firms",
  "ramadan-eid-campaign-websites-uae",
  "web-design-dubai-design-district-d3",
  "new-business-website-checklist-dubai",
  "web-design-restaurants-cafes-dubai",
  "vat-invoicing-automation-uae",
  "multi-location-websites-uae",
  "web-design-abu-dhabi-businesses",
  "whatsapp-business-api-setup-uae",
  "real-estate-lead-automation-dubai-brokers",
  "web-design-medical-dental-clinics-dubai",
  "web-design-law-firms-uae",
  "luxury-car-dealership-rental-websites-dubai",
  "membership-loyalty-systems-dubai-brands",
  "event-wedding-planner-websites-uae",
  "gold-souk-jewelry-traders-online-dubai",
  "tour-desert-safari-booking-automation-dubai",
  "web-design-gyms-fitness-studios-dubai",
  "yacht-charter-luxury-experience-websites-dubai",
  "instagram-to-website-uae-smes",
  "bilingual-ai-support-uae-ecommerce",
  "domain-hosting-uae-business-ae-vs-com",
  "gitex-event-landing-pages-uae",
  "local-seo-google-business-profile-dubai",
  "ecommerce-payments-uae-tabby-tamara-apple-pay",
];

// ---- tiny frontmatter parser (we control the format) ----
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
    } else {
      fm[k] = v.replace(/^"|"$/g, "");
    }
  }
  return { fm, body: m[2] };
}

function cleanBody(body) {
  let b = body.replace(/^\s+/, "");
  b = b.replace(/^!\[[^\]]*\]\([^)]*\)\s*/, ""); // hero image line
  b = b.replace(/^#\s+.*\n?/, ""); // first H1
  return b.replace(/^\s+/, "").replace(/\s+$/, "");
}

// Deterministic category round-robin: spread topics so adjacent
// entries differ in category and big categories are evenly distributed.
function mixByCategory(items) {
  const groups = new Map();
  for (const it of items) {
    if (!groups.has(it.category)) groups.set(it.category, []);
    groups.get(it.category).push(it);
  }
  const out = [];
  let last = null;
  while (out.length < items.length) {
    const cats = [...groups.entries()]
      .filter(([, arr]) => arr.length > 0)
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const pick = cats.find(([c]) => c !== last) || cats[0];
    out.push(pick[1].shift());
    last = pick[0];
  }
  return out;
}

function dateForPosition(i, total) {
  // i is 1-based. The newest PAST article (position = total - SCHEDULED)
  // lands on ANCHOR_FRIDAY; everything else steps a week per position.
  const anchorPos = total - SCHEDULED;
  const d = new Date(ANCHOR_FRIDAY + (i - anchorPos) * WEEK_MS);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return { ymd: `${y}-${mo}-${day}`, ts: `${y}-${mo}-${day}T09:00:00+04:00` };
}

// ---- pre-pass: read every article + its category ----
const items = SLUGS.map((slug) => {
  const file = join(ARTICLES_DIR, slug + ".md");
  const raw = readFileSync(file, "utf8");
  const { fm, body } = parse(raw);
  return { slug, file, raw, fm, body, category: fm.category || "Journal" };
});

// ---- mix, then date by position ----
const mixed = mixByCategory(items);
const total = mixed.length;
const rows = [];

mixed.forEach((it, idx) => {
  const i = idx + 1;
  const { ymd, ts } = dateForPosition(i, total);
  const scheduled = ymd > TODAY;

  // rewrite the markdown date in place
  const updated = it.raw.replace(/^date:\s*".*"\s*$/m, `date: "${ymd}"`);
  writeFileSync(it.file, updated, "utf8");

  rows.push({
    slug: it.slug,
    title: it.fm.title || it.slug,
    description: it.fm.description || "",
    body: cleanBody(it.body),
    category: it.category,
    keywords: it.fm.keywords || [],
    read_time: it.fm.readTime || "",
    image: it.fm.image || "",
    image_alt: it.fm.imageAlt || "",
    published_at: ts,
    ymd,
    scheduled,
  });

  console.log(`${String(i).padStart(2, "0")}  ${ymd}  ${scheduled ? "[scheduled] " : "            "}${it.category.padEnd(18)} ${it.slug}`);
});

// ---- helpers for SQL emission ----
function dollar(str) {
  let tag = "body";
  while (str.includes("$" + tag + "$")) tag += "x";
  return `$${tag}$${str}$${tag}$`;
}
function pgArray(arr) {
  if (!arr || !arr.length) return "'{}'";
  return "'{" + arr.map((s) => '"' + String(s).replace(/"/g, '\\"') + '"').join(",") + "}'";
}
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

// ---- emit seed.sql ----
let sql = `-- ============================================================
-- SwiftLoop Journal — seed data (${rows.length} articles, topics mixed)
-- Generated by scripts/generate-seed.mjs — do not edit by hand.
-- ${total - SCHEDULED} live (Friday dates through ${rows.filter((r) => !r.scheduled).slice(-1)[0].ymd}),
-- ${SCHEDULED} scheduled (future Fridays). Scheduled rows are published=true
-- but gated by published_at <= now() in RLS, so they go live on their date.
-- Run schema.sql first, then run this file.
-- ============================================================

`;
for (const r of rows) {
  sql += `insert into public.swiftloop_articles
  (slug, title, description, body, category, keywords, read_time, image, image_alt, featured, published, published_at)
values
  (${q(r.slug)}, ${q(r.title)}, ${q(r.description)}, ${dollar(r.body)}, ${q(r.category)}, ${pgArray(r.keywords)}, ${q(r.read_time)}, ${q(r.image)}, ${q(r.image_alt)}, false, true, ${q(r.published_at)})
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  body = excluded.body,
  category = excluded.category,
  keywords = excluded.keywords,
  read_time = excluded.read_time,
  image = excluded.image,
  image_alt = excluded.image_alt,
  featured = excluded.featured,
  published = excluded.published,
  published_at = excluded.published_at;

`;
}
writeFileSync(join(ROOT, "supabase", "seed.sql"), sql, "utf8");

// ---- emit sitemap.xml (static pages + LIVE entries only) ----
const live = rows.filter((r) => !r.scheduled);
let sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://swiftloop.tech/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://swiftloop.tech/portfolio.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://swiftloop.tech/journal</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
for (const r of live) {
  sm += `  <url>
    <loc>https://swiftloop.tech/journal/${r.slug}</loc>
    <lastmod>${r.ymd}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>${
      r.image
        ? `
    <image:image>
      <image:loc>${r.image.replace(/&/g, "&amp;")}</image:loc>
      <image:title>${r.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</image:title>
    </image:image>`
        : ""
    }
  </url>
`;
}
sm += `</urlset>\n`;
writeFileSync(join(ROOT, "sitemap.xml"), sm, "utf8");

console.log(`\nWrote supabase/seed.sql (${rows.length} rows: ${total - SCHEDULED} live, ${SCHEDULED} scheduled).`);
console.log(`Wrote sitemap.xml (${live.length + 3} urls — scheduled entries excluded until live).`);
console.log(`\nScheduled (future Friday) uploads:`);
rows.filter((r) => r.scheduled).forEach((r) => console.log(`  ${r.ymd}  ${r.slug}`));
