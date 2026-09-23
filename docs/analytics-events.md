---
# Front matter only so Jekyll doesn't copy this file into the public site
# (docs/ is not in the _config.yml exclude list).
published: false
---

# Analytics events (GA4)

Reference for every custom GA4 event caffcalc.com sends. Event and parameter
names are registered in the GA4 property (`G-GC8Z5975WV`): **do not rename,
pluralize or change casing.** Add new events here in the same PR that ships them.

## How events are sent

| Piece | Role |
|---|---|
| `assets/js/analytics-events.js` | Defines `window.caffTrack(name, params)`, the only path to GA. Also owns scroll depth, read completion, link clicks, `calc_start`, tracker storage and Web Vitals. |
| `_includes/analytics-events.html` | Loads the file above (`defer`) and `web-vitals@5.1.0` from jsDelivr (`async`). Included on every page by `_layouts/default.html`. |
| `assets/js/script.js` | Calculator + tracker hooks, through `trackEvent()` / `trackTrackerSave()`. Both are no-ops if `analytics-events.js` hasn't loaded. |
| `_layouts/default.html` | Adds `data-post-slug="{{ page.slug }}"` to `<body>` on posts only. |

**Guard.** `caffTrack` calls `window.gtag` when it exists. Otherwise, if the head
snippet has already created `window.dataLayer`, it pushes the same arguments
`gtag()` would. This fallback is needed because when `window.innerWidth` is
≤768 at the moment the head snippet runs, the snippet declares `gtag` inside a
callback, so it never becomes global. With
neither present (ad blocker before the snippet runs, local dev without GA), the
call does nothing. Every call is wrapped in `try/catch`.

**Declarative clicks.** Any element with `data-ga-event` sends that event on click,
with `data-ga-params` parsed as JSON:

```html
<a href="{{ '/' | relative_url }}" data-ga-event="blog_to_calc_click"
   data-ga-params='{"source_post":"{{ page.slug }}"}'>Try the calculator</a>
```

Elements carrying `data-ga-event` are skipped by the automatic post-body link
tracking, so they never double-count.

## Events

"Once per page load" is enforced with flags inside the `analytics-events.js`
closure. Events marked "every time" are not deduplicated.

### Calculator (home page, `/`)

| Event | Parameter | Type | Allowed values | Fires when | Frequency | Where |
|---|---|---|---|---|---|---|
| `calc_start` | `entry_point` | string | `blog` \| `home` \| `direct` \| `tracker` | First click on a button or beverage option, or first `input`/`change` on any field, inside `.calculator-layout`. Restoring saved preferences on load does not count. | Once per page load | `analytics-events.js`, "Calculator start" |
| `beverage_add` | `beverage_name` | string | The preset's `slug` from `_data/beverages.yml` (`espresso`, `starbucks-cold-brew`, `excedrin-migraine`). `custom` for Custom Item. | "+" adds an item to Tracked Items (new row or a quantity increase on an existing row). | Every time | `script.js`, `addConsumptionItem()` |
| | `caffeine_mg` | number | Integer mg added by this action (per serving × quantity) | | | |
| | `source` | string | `preset` \| `custom` | | | |
| `calc_complete` | `total_mg` | number | Integer mg across all tracked items | "Calculate Caffeine Intake" shows the meter and status message (300 ms after the click, only with at least one item). | Every time | `script.js`, `calculateCaffeineIntake()` |
| | `limit_status` | string | `under` \| `near` \| `over` | | | |
| | `beverage_count` | number | Servings across all rows (a row with Qty 3 counts 3) | | | |
| `calc_reset` | `beverage_count` | number | Servings at the moment of reset | "Clear All" with at least one item. Deleting a single row is not a reset. | Every time | `script.js`, `clearTracker()` |
| `calc_share` | `method` | string | `copy` \| `link` \| `social` | **Not instrumented.** The calculator has no copy or share control yet. Hook it into that control when one is built. | | |

`entry_point` comes from `document.referrer`. Same host with a `/blog/` path,
`/blog/page/N/`, or a post URL gives `blog`. Same host with a `/caffeine-in/`
path gives `drinks`. Same host with `/` gives `home`. Anything else gives
`direct`: no referrer, an external site, or other same-site pages such as
`/pages/*`. `tracker` is reserved but never sent, because the tracker has no
URL of its own (it is the Tracked Items table on `/`).

`limit_status` is measured against `calculateCaffeineLimit()`, the figure shown
as "Your Safe Caffeine Limit":

- `over`: total above the limit
- `near`: 90% to 100% of the limit, inclusive
- `under`: below 90% of the limit

When the limit is 0 (age group 0–12), any caffeine counts as `over`. These
thresholds deliberately differ from the on-page Safe/Caution/Warning colours,
which switch at 50% and 100%.

### Half-life calculator (`/half-life/`)

The tool recomputes on every input, so there is no explicit "calculate" click:
`hl_start` marks the first interaction and `hl_complete` reports the settled
result 1.2 s after the last input, only once the visitor has changed something
(the defaults rendered on load do not count).

| Event | Parameter | Type | Allowed values | Fires when | Frequency | Where |
|---|---|---|---|---|---|---|
| `hl_start` | `entry_point` | string | `blog` \| `drinks` \| `home` \| `direct` | First click on a button or beverage option, or first `input`/`change` inside `.half-life-tool`. | Once per page load | `analytics-events.js`, "Half-life calculator start" |
| `hl_complete` | `drink` | string | The `slug` from `_data/beverages.yml` | 1.2 s after the visitor's last input, with the result that was on screen | Every settled result | `half-life.js`, `scheduleTrack()` |
| | `dose_mg` | number | Integer mg for the selected size × quantity | | | |
| | `bedtime_mg` | number | Integer mg remaining at bedtime | | | |
| | `sleep_status` | string | `above` \| `below` the sleep threshold (100 mg, or 1.4 mg/kg when weight is entered). Weight itself is never sent. | | | |

### Drink pages (`/caffeine-in/`)

| Event | Parameter | Type | Allowed values | Fires when | Frequency | Where |
|---|---|---|---|---|---|---|
| `drink_size_pick` | `drink` | string | Page slug, e.g. `starbucks-nitro-cold-brew` | Click on a serving-size button in the "How many can I have?" box | Every time | `caffeine-in.js` |
| | `mg` | number | Caffeine in the picked size (top of range for ranged values) | | | |
| `drink_to_calc_click` | `drink` | string | Beverage `slug` | Click on "Add it to the calculator" (`?drink=<slug>` prefill) | Every time | Declarative `data-ga-event` in `_layouts/caffeine-in.html` |

### Tracker

The daily tracker is the Tracked Items table on the calculator page, so adding an
item sends `beverage_add` and `tracker_entry_save` from the same click.

| Event | Parameter | Type | Allowed values | Fires when | Frequency | Where |
|---|---|---|---|---|---|---|
| `tracker_entry_save` | `entries_today` | number | ≥1. Items saved on this device today (local calendar day), including this one. The count survives reloads. | An item is added to Tracked Items. | Every time | `script.js`, `addConsumptionItem()` → `window.caffTrackerSave()` in `analytics-events.js` |
| `tracker_return` | `days_since_first_use` | number | Integer ≥1. Local calendar days since `caffcalc_first_use`. | Page load on **any** page, when `caffcalc_first_use` is an earlier calendar day. | Once per browser session (`sessionStorage`) | `analytics-events.js`, "Tracker" |

### Content

| Event | Parameter | Type | Allowed values | Fires when | Frequency | Where |
|---|---|---|---|---|---|---|
| `scroll_depth` | `percent` | number | `25` \| `50` \| `75` \| `100` | `(scrollY + innerHeight) / body.scrollHeight` crosses the threshold. All pages. | Each threshold once per page load | `analytics-events.js`, "Scroll depth" |
| `read_complete` | `post_slug` | string | Jekyll `page.slug`, e.g. `caffeine-apnea-sleep-quality` | Scroll reaches ≥75% **and** the tab has been visible for ≥45 s (hidden-tab time excluded). Fires as soon as both are true, even if the reader has stopped scrolling. Posts only. | Once per page load | `analytics-events.js`, "read_complete" |
| `blog_to_calc_click` | `source_post` | string | Post slug | Click on a link inside the post body (`.blog-content`) that points to the calculator (same host, path `/`), or on any `data-ga-event="blog_to_calc_click"` element. Navbar and footer links are excluded. Posts only. | Every time | `analytics-events.js`, "Links inside post body"; declarative CTA in `_includes/calc-cta.html` |
| `citation_click` | `domain` | string | Hostname only, including subdomain (e.g. `pubmed.ncbi.nlm.nih.gov`). No path or query. | Click on an `http(s)` link to another host inside the post body, the homepage cards (`.home-content`), `.content-page` wrappers (half-life page, info pages, the `/caffeine-in/` hub) or a drink detail page's `.main-content`. Navbar and footer links are outside these scopes. | Every time | `analytics-events.js`, "Links inside post body" + "External source links outside post bodies" |

The scroll height is measured once when the script runs, again on `load`, and
on every `resize`. It is not re-measured on scroll.

### Performance

| Event | Parameter | Type | Allowed values | Fires when | Frequency | Where |
|---|---|---|---|---|---|---|
| `web_vitals` | `metric_name` | string | `CLS` \| `LCP` \| `INP` | The `web-vitals` library reports a final value. LCP reports after the first interaction or when the page is hidden. CLS and INP usually report when the page is hidden. | Per library; a bfcache restore can report again | `analytics-events.js`, "Web Vitals" |
| | `value` | number | Integer, see units below | | | |

**Units for `value`:**

- **CLS** is a unitless score **× 1000**: a CLS of `0.105` is sent as `105`, and the "good" threshold `0.1` is `100`.
- **LCP** and **INP** are **milliseconds**, rounded.

GA4 custom metrics only accept integers, hence the scaling for CLS.

## Browser storage

| Key | Storage | Value | Written by |
|---|---|---|---|
| `caffcalc_first_use` | localStorage | `YYYY-MM-DD`, local calendar day of the first tracker save. Never overwritten. | `caffTrackerSave()` |
| `caffcalc_entries` | localStorage | `YYYY-MM-DD\|count`, saves on that day | `caffTrackerSave()` |
| `caffcalc_return_sent` | sessionStorage | `1` once `tracker_return` has been sent this session | `analytics-events.js` load |

`caffeineCalculatorPreferences` (age, sex, weight…) belongs to the calculator and
is never read by the analytics code.

## Privacy rules

- Never send body weight, age group, sex, pregnancy or breastfeeding status,
  sensitivity, or any free-text input (including beverage search text) as a
  parameter.
- `limit_status` and `sleep_status` are the only permitted health-adjacent
  derived values; the weight used for `sleep_status` is never sent.
- Custom items send `beverage_name: "custom"`, never user-typed text.

## Checking events

1. Open DebugView in GA4 and use the Google Analytics Debugger extension or Tag Assistant.
2. Without GA, run `dataLayer.filter(a => a[0] === 'event')` in the console to see every event queued on the page.
3. Run `delete window.gtag` in the console. The calculator, tracker and posts must keep working with no console errors.
