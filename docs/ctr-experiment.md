# CTR experiment: drink page titles (Oct 2026)

**Changed:** 13 October 2026 (brief: `docs/caffcalc-agent-brief-2026-10.md`, Task 3).
**Follow-up:** compare a 4-week GSC window starting after Google has recrawled the pages (around 10 November 2026) against the baseline below.

## Hypothesis

Drink pages got about 192k impressions but only about 120 clicks in the Oct export (CTR ~0.06%) at positions 6–9. The titles stated the answer (the mg figure), so searchers got it from the snippet and had no reason to click. Keeping the headline figure but adding what the snippet can't give (every size, a comparison, how many fit in a day) should lift CTR without hiding the answer.

## Design

- **Treatment:** the 10 drink pages with the most Oct impressions. Only `seo_title` (the `<title>`) and `description` (meta description) changed; page body, H1, figures and sources are untouched.
- **Control:** every other `/caffeine-in/` drink page, unchanged.
- **Title rules applied:** drink name and headline mg figure kept; added only things the page actually contains (all pages have the "Caffeine by size" table, the "How it compares" bars against an 8 oz brewed coffee and Red Bull, and the "How many can I have?" box; named drink comparisons were checked against each page's body). About 60 characters, no clickbait.
- **Description rules applied:** one concrete fact, then what the reader gets by clicking; ≤155 characters.
- **Caveats:** Google may rewrite titles; seasonality and ranking changes affect CTR, so compare against the control group's CTR change over the same window, not just before/after. Position is not in the brief's baseline table; take it from the Oct GSC export (Pages report, same date range) when filling in the follow-up.

## Baseline (Oct export, 13 Oct 2026) and follow-up

| Page | Oct clicks | Oct impr | Oct CTR | Oct position | +4 wk clicks | +4 wk impr | +4 wk CTR | +4 wk position | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `starbucks-caffe-latte` | 3 | 6,873 | 0.04% | — |  |  |  |  |  |
| `mountain-dew` | 4 | 6,644 | 0.06% | — |  |  |  |  |  |
| `starbucks-espresso` | 1 | 6,482 | 0.02% | — |  |  |  |  |  |
| `coca-cola-classic` | 2 | 6,195 | 0.03% | — |  |  |  |  |  |
| `starbucks-doubleshot-energy` | 1 | 6,194 | 0.02% | — |  |  |  |  |  |
| `diet-coke` | 3 | 6,083 | 0.05% | — |  |  |  |  |  |
| `starbucks-caramel-macchiato` | 10 | 6,002 | 0.17% | — |  |  |  |  |  |
| `pepsi` | 1 | 5,816 | 0.02% | — |  |  |  |  |  |
| `starbucks-pink-drink` | 1 | 5,707 | 0.02% | — |  |  |  |  |  |
| `starbucks-chai-latte` | 2 | 5,565 | 0.04% | — |  |  |  |  |  |
| **Total (10 pages)** | **28** | **61,561** | **0.05%** | |  |  |  |  |  |
| Control group (all other drink pages) | | | | |  |  |  |  |  |

## Title and description changes

### `starbucks-caffe-latte`

| | Before | After |
|---|---|---|
| Title | Starbucks Latte Caffeine: 75 mg Tall, 150 mg Grande or Venti | Starbucks Latte Caffeine: 150 mg Grande (Every Size + vs Coffee) |
| Description | A Starbucks Caffè Latte has 75 mg in a Short or Tall and 150 mg in a Grande or hot Venti. Why a bigger latte isn't always stronger, and the iced exception. | A Grande Starbucks Caffè Latte has 150 mg of caffeine. See every size from Short to Venti, how it compares with coffee, and how many fit in a day. |

### `mountain-dew`

| | Before | After |
|---|---|---|
| Title | Mountain Dew Caffeine: 54 mg per 12 oz Can | Mountain Dew Caffeine: 54 mg a Can (vs Coke, Pepsi, Coffee) |
| Description | A 12 oz can of Mountain Dew has 54 mg of caffeine, and Diet Mountain Dew has the same. How it compares with Coke, Pepsi, Kickstart and coffee. | A 12 oz can of Mountain Dew has 54 mg of caffeine, the most of the mainstream sodas. Compare it with Coke, Pepsi and coffee, and see how many fit in a day. |

### `starbucks-espresso`

| | Before | After |
|---|---|---|
| Title | Starbucks Espresso Caffeine: 75 mg a Shot, 300 mg a Quad | Starbucks Espresso Caffeine: 75 mg a Shot (Solo to Quad) |
| Description | A single Starbucks espresso shot (Solo) has 75 mg of caffeine. A Doppio has 150 mg, a Triple 225 mg, and a Quad 300 mg. The unit behind the whole menu. | A Starbucks espresso shot has 75 mg of caffeine. See Solo to Quad in one table, how a Doppio compares with brewed coffee, and how many shots fit in a day. |

### `coca-cola-classic`

| | Before | After |
|---|---|---|
| Title | Coca-Cola Caffeine: 34 mg per 12 oz Can | Coca-Cola Caffeine: 34 mg a Can (vs Diet Coke, Pepsi, Coffee) |
| Description | A 12 oz can of Coca-Cola has 34 mg of caffeine, about a third of a cup of coffee. How Coke compares with Diet Coke, Pepsi and Mountain Dew. | A 12 oz can of Coca-Cola has 34 mg of caffeine, about a third of a coffee. Compare it with Diet Coke, Pepsi and coffee, and see how many cans fit in a day. |

### `starbucks-doubleshot-energy`

| | Before | After |
|---|---|---|
| Title | Starbucks Doubleshot Energy Caffeine: 135 mg in a 15 oz Can | Starbucks Doubleshot Energy Caffeine: 135 mg vs Red Bull |
| Description | A 15 oz can of Starbucks Doubleshot Energy, Coffee has 135 mg of caffeine, less than a Monster or Red Bull of similar size, built from real espresso. | A 15 oz can of Starbucks Doubleshot Energy has 135 mg of caffeine. See how it compares with Red Bull, Monster and coffee, and how many cans fit in a day. |

### `diet-coke`

| | Before | After |
|---|---|---|
| Title | Diet Coke Caffeine: 46 mg per Can, More Than Regular Coke | Diet Coke Caffeine: 46 mg a Can (vs Coke, Pepsi and Coffee) |
| Description | A 12 oz can of Diet Coke has 46 mg of caffeine, 12 mg more than regular Coca-Cola. How it compares with Pepsi, Mountain Dew and a cup of coffee. | A 12 oz can of Diet Coke has 46 mg of caffeine, 12 mg more than regular Coke. Compare it with Pepsi and coffee, and see how many cans fit in your day. |

### `starbucks-caramel-macchiato`

| | Before | After |
|---|---|---|
| Title | Caffeine in Starbucks Caramel Macchiato: 75–150 mg | Starbucks Caramel Macchiato Caffeine: 150 mg Grande, All Sizes |
| Description | A Grande Starbucks Caramel Macchiato has 150 mg of caffeine. It is steamed milk and vanilla syrup marked with espresso, not a traditional espresso macchiato. | A Grande Starbucks Caramel Macchiato has 150 mg of caffeine. See every size from Short to Venti, how it compares with coffee, and how many fit in a day. |

### `pepsi`

| | Before | After |
|---|---|---|
| Title | Pepsi Caffeine: 38 mg per 12 oz Can, Diet and Zero Sugar | Pepsi Caffeine: 38 mg a Can (vs Coke, Diet Pepsi, Coffee) |
| Description | A 12 oz can of Pepsi has 38 mg of caffeine; Pepsi Zero Sugar has 38 mg and Diet Pepsi 35 mg. How Pepsi compares with Coke, Mountain Dew and coffee. | A 12 oz can of Pepsi has 38 mg of caffeine; Diet Pepsi has 35 mg. Compare it with Coke and coffee, check bottle labels, and see how many cans fit in a day. |

### `starbucks-pink-drink`

| | Before | After |
|---|---|---|
| Title | Pink Drink Caffeine: 50 mg in a Grande, 125 mg as Energy | Pink Drink Caffeine: 50 mg Grande (All Sizes, vs Coke) |
| Description | Yes: a Grande Starbucks Pink Drink has about 50 mg of caffeine, up to 100 mg in a Trenta. The caffeine-free and Energy versions, and what they mean for kids. | A Grande Starbucks Pink Drink has about 50 mg of caffeine, more than a Coke. See every size, the caffeine-free and Energy versions, and advice for kids. |

### `starbucks-chai-latte`

| | Before | After |
|---|---|---|
| Title | Starbucks Chai Latte Caffeine: 55 mg in a Grande | Starbucks Chai Latte Caffeine: 55 mg Grande (Sizes + vs Coffee) |
| Description | A Grande Starbucks Chai Latte has 55 mg of caffeine, a Venti 75 mg, an iced Venti 90 mg. Why chai is lighter than coffee but not caffeine-free. | A Grande Starbucks Chai Latte has 55 mg of caffeine. See every size from Short to Venti, how it compares with coffee, and how many fit in your day. |

## Reverting

Each page's old title and description are above. To roll back, restore `seo_title` and `description` in `_caffeine_in/<slug>.md`, or revert the `oct 3` commit.
