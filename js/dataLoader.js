/**
 * Loads and normalizes the vacuum cleaner comparison dataset from the CSV export.
 *
 * The source spreadsheet has a fixed 52-column layout (0-indexed):
 *  0  brand                 1  model                 2  amazonLink
 *  3  type                  4  (spacer)              5  suctionKpa
 *  6  motorPowerW           7  hepaFiltration        8  baggedOrBagless
 *  9  capacityL             10 batteryRuntimeMins    11 (spacer)
 *  12 cordedOrCordless      13 cordLengthFt           14 (spacer)
 *  15 noiseDb               16 (spacer)               17 widthIn
 *  18 depthIn               19 heightIn               20 widthCm
 *  21 depthCm               22 heightCm               23 (spacer)
 *  24 weightLbs             25 weightKg               26 (spacer)
 *  27 creviceTool           28 upholsteryTool         29 petTool
 *  30 extensionWand         31 swivelSteering         32 washableFilter
 *  33 automaticRewind       34 adjustablePowerLevels  35 (spacer)
 *  36 amps                  37 voltage                38 (spacer)
 *  39 stationCapacityL      40 wifiApp                41 selfEmptying
 *  42 homeMapping           43 moppingFeature         44 obstacleAvoidance
 *  45 productLinkLabel      46 priceUsd               47 currentlyOnAmazon
 *  48 starRating            49 numReviews             50 brandWebsiteLink
 *  51 priceBrand
 */

const CSV_PATH = '/data/vacuum_data.csv';
// First 5 parsed rows are sheet title / header / disclaimer / instructions / "Top Picks" divider.
const DATA_START_ROW = 5;

function cleanCell(v) {
  if (v === undefined || v === null) return '';
  return v.trim();
}

/** Extract the first numeric value found in a string (handles thousands commas, ranges, "kPa" suffixes, etc.) */
function parseFirstNumber(str) {
  if (!str) return null;
  const s = str.replace(/,/g, '');
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  return parseFloat(m[0]);
}

/** Parse a Yes/No/"-" style flag cell into true/false/null */
function parseFlag(str) {
  const s = cleanCell(str).toLowerCase();
  if (s === 'yes') return true;
  if (s === 'no') return false;
  return null; // '-' or blank => not applicable / unknown
}

/** Parse a currency string like "$349.99" or "$1,599.99" into a number */
function parsePrice(str) {
  const s = cleanCell(str);
  if (!s || s === '-') return null;
  const cleaned = s.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Formats any Amazon link to ensure the affiliate tag=wat344r5-20 is set */
function formatAmazonLink(url, tag = 'wat344r5-20') {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  try {
    const fullUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(fullUrl);
    if (parsed.hostname.includes('amazon.')) {
      parsed.searchParams.set('tag', tag);
      return parsed.toString();
    }
    return trimmed;
  } catch (e) {
    if (/amazon\./i.test(trimmed)) {
      if (/([?&])tag=[^&]*/i.test(trimmed)) {
        return trimmed.replace(/([?&])tag=[^&]*/i, `$1tag=${tag}`);
      } else if (trimmed.includes('?')) {
        return trimmed.endsWith('?') || trimmed.endsWith('&')
          ? `${trimmed}tag=${tag}`
          : `${trimmed}&tag=${tag}`;
      } else {
        return `${trimmed}?tag=${tag}`;
      }
    }
    return trimmed;
  }
}

function mapRowToProduct(row, index) {
  const get = (i) => cleanCell(row[i]);

  const brand = get(0);
  const model = get(1);
  if (!model) return null; // divider / section-header row, not a real product

  const type = get(3) || 'Other';

  const product = {
    id: `p-${index}-${slugify(brand + '-' + model)}`,
    brand,
    model,
    amazonLink: formatAmazonLink(get(2)),
    type,
    suctionKpa: parseFirstNumber(get(5)),
    suctionKpaRaw: get(5),
    motorPowerW: parseFirstNumber(get(6)),
    motorPowerWRaw: get(6),
    hepaFiltration: parseFlag(get(7)),
    baggedOrBagless: get(8),
    capacityL: parseFirstNumber(get(9)),
    capacityLRaw: get(9),
    batteryRuntimeMins: parseFirstNumber(get(10)),
    batteryRuntimeMinsRaw: get(10),
    cordedOrCordless: get(12),
    cordLengthFt: parseFirstNumber(get(13)),
    noiseDb: parseFirstNumber(get(15)),
    dimensions: {
      widthIn: parseFirstNumber(get(17)),
      depthIn: parseFirstNumber(get(18)),
      heightIn: parseFirstNumber(get(19)),
      widthCm: parseFirstNumber(get(20)),
      depthCm: parseFirstNumber(get(21)),
      heightCm: parseFirstNumber(get(22)),
    },
    weightLbs: parseFirstNumber(get(24)),
    weightKg: parseFirstNumber(get(25)),
    features: {
      creviceTool: parseFlag(get(27)),
      upholsteryTool: parseFlag(get(28)),
      petTool: parseFlag(get(29)),
      extensionWand: parseFlag(get(30)),
      swivelSteering: parseFlag(get(31)),
      washableFilter: parseFlag(get(32)),
      automaticRewind: parseFlag(get(33)),
      adjustablePowerLevels: parseFlag(get(34)),
    },
    amps: parseFirstNumber(get(36)),
    voltage: get(37),
    stationCapacityL: parseFirstNumber(get(39)),
    robotFeatures: {
      wifiApp: parseFlag(get(40)),
      selfEmptying: parseFlag(get(41)),
      homeMapping: parseFlag(get(42)),
      moppingFeature: parseFlag(get(43)),
      obstacleAvoidance: parseFlag(get(44)),
    },
    priceUsd: parsePrice(get(46)),
    priceUsdRaw: get(46),
    currentlyOnAmazon: parseFlag(get(47)),
    starRating: parseFirstNumber(get(48)),
    numReviews: parseFirstNumber(get(49)),
    brandWebsiteLink: formatAmazonLink(get(50)),
    priceBrandRaw: get(51),
  };

  return product;
}

async function loadProducts() {
  const res = await fetch(CSV_PATH);
  if (!res.ok) throw new Error(`Failed to load CSV: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);

  const products = [];
  for (let i = DATA_START_ROW; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 10) continue;
    const brandCell = cleanCell(row[0]);
    if (!brandCell) continue;
    const product = mapRowToProduct(row, i);
    if (product) products.push(product);
  }
  return products;
}
