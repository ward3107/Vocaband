# Google Search Console — Vocaband setup

Operator checklist for getting vocaband.com fully indexed in Google,
verifying that the hreflang + transliteration SEO work actually lands,
and monitoring search traffic. All steps are one-time except the
monitoring section.

---

## 1. Verify domain ownership

1. Open https://search.google.com/search-console/
2. **Add property** → **Domain** (not "URL prefix" — the domain option
   covers `www.` and bare `vocaband.com` in one verification)
3. Enter `vocaband.com`
4. Google gives a TXT record (looks like `google-site-verification=...`)
5. Add the TXT record to Cloudflare DNS for `vocaband.com`:
   - Cloudflare dashboard → vocaband.com zone → **DNS** → **Records** → **Add record**
   - Type: `TXT`, Name: `@` (root), Content: the full string from GSC
   - TTL: Auto, Proxy status: DNS only
6. Click **Verify** back in GSC. Usually succeeds within seconds; can
   take up to an hour for DNS propagation.

---

## 2. Submit the sitemap

1. In GSC, click **Sitemaps** in the left nav
2. Enter `sitemap.xml` (just the path, GSC prepends the domain)
3. Submit. Status should flip to "Success" within ~24 hours
4. The sitemap declares hreflang alternates per Google's spec —
   see `public/sitemap.xml` for the structure. If you ever add a new
   public route, add it there *with* the four hreflang `xhtml:link`
   alternates (`en` / `he` / `ar` / `x-default`), or Google ignores
   the language group entirely

---

## 3. Verify hreflang is recognized

About **3-7 days** after the first crawl, check:

- **Pages** → look for the localized URLs (`/?lang=he`, `/?lang=ar`)
  appearing as indexed pages
- **Performance** → filter by **Country: Israel** and **Country: West Bank**
  to confirm Hebrew/Arabic traffic is landing on the right language
  variants
- Past Google Search Console: there used to be an "International
  Targeting" report that explicitly validated hreflang. Google
  deprecated it in 2023. The replacement is implicit — if hreflang is
  broken, the localized URLs simply don't get indexed under the right
  language. If `/?lang=he` is indexed and you see Hebrew snippet text
  in the search result preview, it's working.

If hreflang errors show up in the **Pages → Why pages aren't indexed**
report, the most common causes are:

| Symptom | Likely cause |
|---|---|
| "Alternate page with proper canonical tag" | Working as intended |
| "Duplicate without user-selected canonical" | Missing `<link rel="canonical">` on a localized URL — re-check the Worker rewrite ran |
| "Page with redirect" | The bare URL is 301-ing to a `?lang=` URL — don't do this, it breaks x-default |

---

## 4. Force re-crawl after metadata updates

When you change `<title>` / `<meta name="description">` (or any of
the SEO-relevant tags), Google won't pick it up for ~1-2 weeks on its
natural crawl schedule. To accelerate:

1. GSC **URL Inspection** (search bar at the top)
2. Paste the URL — e.g. `https://www.vocaband.com/?lang=he`
3. Click **Test live URL** — confirms the *current* rendered HTML
   has the new metadata
4. Click **Request Indexing** — pushes the URL into Google's priority
   crawl queue, typically picked up within a few hours

Daily quota: ~10-12 requests per day across the property. Don't burn
them on every page; prioritize `/`, `/?lang=he`, `/?lang=ar`.

---

## 5. Monitor what queries actually drive traffic

**Performance** report — the most useful one:

- **Queries** tab: shows clicks, impressions, CTR, average position per
  search term. Filter for the **keyboard transliterations** to confirm
  they get any impressions at all:
  - `הםבשנשמג` (Hebrew layout for "vocaband")
  - `رخؤشلاشىي` (Arabic layout)
  - `мщсфифтв` (Russian/Ukrainian layout)
  - `ωοψαβανδ` (Greek layout)

  If a transliteration gets zero impressions after 30 days, it means
  nobody is actually searching it — fine to leave in the keywords (no
  cost) but don't expand that direction.

- **Pages** tab filtered by `?lang=he`: confirms Google is treating
  the Hebrew variant as a distinct rankable URL

- **Countries** tab: should show Israel as the #1 country for HE/AR
  traffic; if not, the hreflang signal isn't being honored

---

## 6. Submit to Bing + Yandex

Google is ~95% of Israeli search; the rest is worth a few minutes:

- **Bing Webmaster Tools** — https://www.bing.com/webmasters/
  - Import directly from GSC ("Import your sites from Google Search
    Console") — no separate verification needed
  - Bing also powers DuckDuckGo and Yahoo, so this covers them too

- **Yandex Webmaster** — https://webmaster.yandex.com/
  - Only useful if the Russian-speaking immigrant audience matters
  - Same TXT-record verification pattern as Google
  - Yandex respects hreflang and the keyword transliterations
    (`мщсфифтв` etc.) actually surface there

---

## 7. Test the OG / Twitter cards

When the brand gets shared on WhatsApp / Twitter / Facebook, the
preview card pulls from `og:title` + `og:description` + `og:image`.
The Worker rewrites these per language too, so:

- **Facebook Sharing Debugger** — https://developers.facebook.com/tools/debug/
  Paste `https://www.vocaband.com/?lang=he`, click **Debug**.
  Confirms the Hebrew title + description show up in the preview.
  Click **Scrape Again** to force a re-fetch after deploys.

- **Twitter Card Validator** — was deprecated; the closest replacement
  is just composing a tweet with the URL and watching the inline
  preview render.

---

## Recap — what the SEO work actually changed

| Change | Where | Effect |
|---|---|---|
| Keyboard transliterations + brand variants | `index.html` keywords, `sr-only` block, JSON-LD `alternateName` | Google maps mistyped queries back to the brand |
| `hreflang` link tags + `?lang=` param | `index.html`, `useLanguage.tsx` | Hebrew/Arabic searchers get the right language variant |
| Sitemap with hreflang alternates | `public/sitemap.xml` | Google crawls all three language variants as distinct pages |
| Edge-side metadata rewrite | `worker/index.ts` | Googlebot sees Hebrew/Arabic title + description in the initial HTML for `/?lang=he|ar`, not just after JS render |

What this work does NOT do:

- Build backlinks (still needs operator outreach to Israeli ed blogs)
- Drive paid traffic (would need Google Ads on the transliterations)
- Replace good content — the keywords get you in the results, the
  page quality decides whether you stay there
