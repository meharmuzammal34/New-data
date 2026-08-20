# VacCompare — Vacuum Cleaner Comparison Website

A fully client-side static website for browsing, filtering, and comparing vacuum
cleaners (uprights, sticks, robots, canisters, handhelds, wet/dry, and more)
using a real-world product dataset exported from a spreadsheet.

## ✅ Currently Implemented Features

- **Data pipeline**: A custom CSV parser (`js/csvParser.js`) reads
  `data/vacuum_data.csv` (the uploaded spreadsheet export) and a loader
  (`js/dataLoader.js`) maps its fixed 52-column layout into clean JS product
  objects (brand, model, type, suction, motor power, HEPA, capacity, battery
  runtime, cord type/length, noise, dimensions, weight, tool/feature flags,
  robot-specific features, price, rating, review count, product/brand links).
- **Product grid** with pagination (24 per page), showing brand, model, type
  badge, star rating & review count, key specs, price, and quick actions
  ("Details" and "View on Amazon").
- **Search** by brand/model name (debounced, live-filtering).
- **Sidebar filters**:
  - Vacuum Type (Robot, Stick, Upright, Canister, Handheld, Dry Wet, etc.) with counts
  - Brand (searchable checkbox list) with counts
  - Price range (min/max inputs + quick presets)
  - Bag type (Bagged / Bagless / Both)
  - Power source (Corded / Cordless)
  - HEPA filtration toggle
  - Minimum star rating pills
  - "Reset all" and per-chip removal of active filters
- **Sorting**: Relevance, Price (asc/desc), Rating, Most Reviewed, Suction
  Power, Name A–Z.
- **Compare feature**: Select up to 4 products via checkboxes on cards; a
  sticky bottom tray shows selections; "Compare Now" opens a full side-by-side
  comparison modal/table covering ~25 spec rows (price, suction, motor power,
  capacity, battery, noise, weight, dimensions, tools, robot vacuum features,
  etc.), with per-item removal and Amazon links.
- **Product detail modal**: Full spec breakdown for a single product,
  including robot-vacuum-specific features when applicable.
- **Responsive design**: Mobile-collapsible filter panel, responsive grid
  (1/2/3 columns), mobile-friendly compare tray and modals.
- **Hero stats**: Live counts of total products, brands, vacuum types, and
  average price, computed from the loaded dataset.

## 📍 Functional Entry Points

Single-page app — everything lives at:

- `/index.html` — the entire application (no query params required).
  - Client-side only state: search text, active filters, sort, and page are
    kept in-memory (not persisted in the URL/localStorage in this version).

No backend/API routes are used; all data comes from the static file:

- `data/vacuum_data.csv` — source dataset (loaded via `fetch()` at runtime).

## 🗂 Data Model

Each parsed product row becomes an object like:

```js
{
  id, brand, model, amazonLink, type,
  suctionKpa, suctionKpaRaw,
  motorPowerW, motorPowerWRaw,
  hepaFiltration,           // true | false | null
  baggedOrBagless,          // raw string, normalized via normalizeBag()
  capacityL, capacityLRaw,
  batteryRuntimeMins, batteryRuntimeMinsRaw,
  cordedOrCordless, cordLengthFt,
  noiseDb,
  dimensions: { widthIn, depthIn, heightIn, widthCm, depthCm, heightCm },
  weightLbs, weightKg,
  features: { creviceTool, upholsteryTool, petTool, extensionWand,
              swivelSteering, washableFilter, automaticRewind,
              adjustablePowerLevels },   // each true | false | null
  amps, voltage, stationCapacityL,
  robotFeatures: { wifiApp, selfEmptying, homeMapping,
                    moppingFeature, obstacleAvoidance }, // true | false | null
  priceUsd, priceUsdRaw,
  currentlyOnAmazon, starRating, numReviews,
  brandWebsiteLink, priceBrandRaw
}
```

No database/Table API is used — the dataset is static and read-only, so a
plain CSV fetched client-side was the simplest, fastest approach.

## 🚧 Not Yet Implemented / Known Limitations

- No persisted "saved comparisons" or shareable comparison URLs.
- No image assets for products (the source spreadsheet has no image URLs) —
  cards are spec-focused rather than photo-focused.
- No user accounts, reviews, or write-back functionality (this is a read-only
  comparison tool over a fixed dataset).
- Some spreadsheet rows have inconsistent/missing values (e.g. "-", ranges
  like "30-50", or CFM-based suction instead of kPa) — these are shown as-is
  (raw string) when they can't be safely parsed to a single number, rather
  than guessed at.

## 🔭 Recommended Next Steps

1. Add product images (would require sourcing image URLs per model).
2. Persist filters/sort/compare selection in the URL query string for
   shareable/bookmarkable searches.
3. Add a "Best value" or "Editor's pick" curated section using the "Top
   Picks" rows already present at the top of the source spreadsheet.
4. Add unit toggle (metric/imperial) for dimensions and weight.
5. Add analytics on which filters/comparisons are most used, to guide dataset
   curation.

## 🌐 Public URLs

- This is deployed via the **Publish** tab in the builder once you're ready
  to go live. No other public URLs exist yet (development/preview only).

## 🛠 Tech Stack

- Plain HTML5 + vanilla JavaScript (no build step)
- Tailwind CSS (via CDN) for styling/layout
- Font Awesome (via CDN) for icons
- Google Fonts (Inter)
- Custom CSV parser — no external CSV library dependency

## 📁 Project Structure

```
index.html              Main (and only) page — full app markup
css/style.css            Custom styles layered on top of Tailwind utilities
js/csvParser.js          Generic RFC4180-ish CSV parser
js/dataLoader.js         Fetches + maps the CSV into product objects
js/app.js                All application logic: filters, sort, pagination,
                         compare tray/modal, product detail modal
data/vacuum_data.csv     Source dataset (uploaded spreadsheet export)
```
