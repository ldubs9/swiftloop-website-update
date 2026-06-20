# SwiftLoop Journal — Supabase setup

The journal pages (`/journal` and `/journal/<slug>`) read from the
`public.swiftloop_articles` table at runtime using the public anon key. Row Level
Security keeps the anon key read-only and limited to published rows.

## One-time setup

1. **Create the table + policies**
   In the Supabase dashboard → SQL Editor, run [`schema.sql`](schema.sql).

2. **Seed the 75 articles**
   In the same SQL Editor, run [`seed.sql`](seed.sql).
   It uses `on conflict (slug) do update`, so it is safe to re-run.

3. **Connect the site**
   Open `js/supabase-config.js` and paste your values from
   Supabase → Project Settings → API:
   ```js
   window.SUPABASE_CONFIG = {
     url: "https://<your-ref>.supabase.co",
     anonKey: "<anon public key>",
   };
   ```
   The anon key is safe to ship to the browser — RLS restricts it to reading
   `published = true` rows only.

That's it. `/journal` lists every published entry (newest = featured);
`/journal/<slug>` renders the article from its markdown `body`.

## Regenerating content

The markdown files in `content/articles/` are the source of truth.
After editing them (or to re-date them), run:

```bash
node scripts/generate-seed.mjs
```

The generator **mixes topics** (a category round-robin so the timeline is varied,
never clustered) and assigns **Friday** dates: the first 60 articles get past
Fridays (newest = 2026-06-19), and the final 15 get future Fridays
(2026-06-26 → 2026-10-02). It rewrites each `date:`, regenerates
`supabase/seed.sql`, and rebuilds `sitemap.xml` (scheduled entries excluded until
live). Then re-run `seed.sql` in Supabase to push the changes.

Tune the split with the `SCHEDULED` constant and the dating in
`scripts/generate-seed.mjs`.

## Scheduling (how future posts go live by themselves)

Every row is stored with `published = true`. What gates visibility is
**`published_at`**: the RLS policy (and the site's queries) only return rows where
`published_at <= now()`. So a row dated next Friday is simply invisible until that
Friday arrives — then it appears automatically, becomes the new featured (hero)
entry, and drops into the grid. **No cron, no redeploy.** The 15 scheduled
articles will publish one per week for the next 15 weeks on their own.

To check what's queued: `select slug, published_at from swiftloop_articles where published_at > now() order by published_at;`

## Publishing / unpublishing

- **Hide instantly:** set `published = false` on a row.
- **Publish now instead of waiting:** set its `published_at` to the past.
- **Reschedule:** change `published_at` to any future timestamp.
- **Featured (hero) card:** it's automatic — the newest *live* entry is featured,
  so it rolls forward each week as scheduled posts go live. (The `featured` column
  exists if you ever want to pin a specific one; the site prefers a `featured = true`
  row if present, otherwise newest-live.)

## Note on SEO

Articles are rendered client-side from Supabase. Google renders JS and will
index them, and `sitemap.xml` lists every entry. JS-free AI crawlers, however,
see only the page shell. If you want fully pre-rendered HTML for those, the
markdown files in `content/articles/` can be statically built to HTML later —
ask and we can wire up a build step.
