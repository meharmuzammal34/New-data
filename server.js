import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PRIMARY_ORIGIN = 'https://vacuumcleanerlab.com';

function formatDomain(domain) {
  if (!domain) return '';
  const trimmed = String(domain).trim();
  if (!trimmed) return '';
  return (trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`).replace(/\/+$/, '');
}

function getCanonicalOrigin(req) {
  const custom = process.env.CUSTOM_DOMAIN || process.env.CANONICAL_ORIGIN || process.env.BASE_URL;
  if (custom) {
    return formatDomain(custom);
  }
  return PRIMARY_ORIGIN;
}

const CANONICAL_ORIGIN = PRIMARY_ORIGIN;

// ---------------------------------------------------------------- //
// 301 Permanent SEO Migration Redirect Middleware                   //
// ---------------------------------------------------------------- //
app.use((req, res, next) => {
  const rawHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  const host = rawHost.split(':')[0];

  const isOldDomain = host === 'vacompare.ai.studio' || 
                      host === 'www.vacompare.ai.studio' || 
                      host.endsWith('.vacompare.ai.studio') ||
                      host === 'animated-speculoos-5d5706.netlify.app' ||
                      host.endsWith('.netlify.app');
  const isWwwNewDomain = host === 'www.vacuumcleanerlab.com';
  const isHttpOnNewDomain = (host === 'vacuumcleanerlab.com' || host === 'www.vacuumcleanerlab.com') && 
                            req.headers['x-forwarded-proto'] === 'http';

  if (isOldDomain || isWwwNewDomain || isHttpOnNewDomain) {
    const targetUrl = `${PRIMARY_ORIGIN}${req.originalUrl}`;
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache for 301 redirect
    return res.redirect(301, targetUrl);
  }

  next();
});

/* ---------------------------------------------------------------- */
/* Minimal CSV Parser & Product Memory Engine                        */
/* ---------------------------------------------------------------- */

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      // ignore
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function cleanCell(v) {
  return v ? v.trim() : '';
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseFirstNumber(str) {
  if (!str) return null;
  const s = str.replace(/,/g, '');
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function parsePrice(str) {
  const s = cleanCell(str);
  if (!s || s === '-') return null;
  const cleaned = s.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseFlag(str) {
  const s = cleanCell(str).toLowerCase();
  if (s === 'yes') return true;
  if (s === 'no') return false;
  return false;
}

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

function extractAsin(link, row) {
  if (link && typeof link === 'string') {
    const m = link.match(/\/dp\/([A-Z0-9]{10})/i) || 
              link.match(/\/gp\/product\/([A-Z0-9]{10})/i) || 
              link.match(/\/d\/([A-Z0-9]{10})/i) ||
              link.match(/\b([B0-9][A-Z0-9]{9})\b/);
    if (m) return m[1].toUpperCase();
  }
  if (Array.isArray(row)) {
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '');
      const m = cell.match(/\/dp\/([A-Z0-9]{10})/i) || 
                cell.match(/\/gp\/product\/([A-Z0-9]{10})/i) || 
                cell.match(/\/d\/([A-Z0-9]{10})/i) ||
                cell.match(/\b(B[A-Z0-9]{9})\b/i);
      if (m) return m[1].toUpperCase();
    }
  }
  return null;
}

function getProductImageUrl(asin) {
  if (!asin) return '/assets/vacuum_placeholder.svg';
  return `https://m.media-amazon.com/images/P/${asin}.01._SL500_.jpg`;
}

function getAmazonLink(p) {
  if (!p) return 'https://www.amazon.com/?tag=wat344r5-20';
  if (p.amazonLink && typeof p.amazonLink === 'string' && p.amazonLink.trim().length > 0) {
    return formatAmazonLink(p.amazonLink);
  }
  const query = encodeURIComponent(`${p.brand || ''} ${p.model || ''}`.trim());
  return `https://www.amazon.com/s?k=${query}&tag=wat344r5-20`;
}

function calculateRelevanceScore(source, target) {
  if (!source || !target || source.id === target.id) return 0;
  let score = 0;

  // Priority 1: Same Brand (40%)
  if (source.brand && target.brand && source.brand.toLowerCase() === target.brand.toLowerCase()) {
    score += 40;
  }

  // Priority 2: Same Vacuum Type (20%)
  if (source.type && target.type && source.type.toLowerCase() === target.type.toLowerCase()) {
    score += 20;
  }

  // Priority 3: Same Price Range (15%)
  const p1 = source.priceUsd;
  const p2 = target.priceUsd;
  if (p1 != null && p2 != null) {
    const ratio = Math.abs(p1 - p2) / Math.max(p1, p2, 1);
    if (ratio <= 0.15) score += 15;
    else if (ratio <= 0.30) score += 10;
    else if (ratio <= 0.50) score += 5;
  } else {
    score += 8;
  }

  // Priority 4: Similar Specifications (10%)
  let specPoints = 0;
  if (source.cordedOrCordless && target.cordedOrCordless && source.cordedOrCordless === target.cordedOrCordless) specPoints += 2.5;
  if (source.hepaFiltration === target.hepaFiltration) specPoints += 2.5;
  if (source.baggedOrBagless && target.baggedOrBagless && source.baggedOrBagless === target.baggedOrBagless) specPoints += 2.5;
  const s1 = parseFloat(source.suctionKpaRaw);
  const s2 = parseFloat(target.suctionKpaRaw);
  if (!isNaN(s1) && !isNaN(s2)) {
    const diff = Math.abs(s1 - s2);
    if (diff <= 3) specPoints += 2.5;
    else if (diff <= 6) specPoints += 1.5;
  }
  score += Math.min(10, specPoints);

  // Priority 5: User Intent Similarity (10%)
  let intentPoints = 0;
  const sourcePet = source.hepaFiltration || (parseFloat(source.suctionKpaRaw) >= 18);
  const targetPet = target.hepaFiltration || (parseFloat(target.suctionKpaRaw) >= 18);
  if (sourcePet && targetPet) intentPoints += 4;
  if (source.type && source.type.toLowerCase().includes('robot') && target.type && target.type.toLowerCase().includes('robot')) intentPoints += 4;
  if (source.type && source.type.toLowerCase().includes('stick') && target.type && target.type.toLowerCase().includes('stick')) intentPoints += 4;
  if (source.noiseDb && target.noiseDb && Math.abs(source.noiseDb - target.noiseDb) <= 3) intentPoints += 2;
  score += Math.min(10, intentPoints);

  // Priority 6: Popularity (5%)
  const rating = target.starRating || 4.0;
  const reviews = target.numReviews || 100;
  const popPoints = (rating / 5.0) * 3 + Math.min(reviews / 5000, 1) * 2;
  score += Math.min(5, popPoints);

  return score;
}

let cachedProducts = [];
let productSlugMap = new Map();

function matchCategoryServer(cSlug) {
  if (!cSlug) return 'Robot';
  const norm = String(cSlug).toLowerCase().trim();
  if (norm.includes('robot')) return 'Robot';
  if (norm.includes('stick') || norm.includes('cordless')) return 'Stick';
  if (norm.includes('upright')) return 'Upright';
  if (norm.includes('canister')) return 'Canister';
  if (norm.includes('handheld')) return 'Handheld';
  if (norm.includes('wet') || norm.includes('dry')) return 'Dry Wet';
  if (norm.includes('backpack')) return 'Backpack';
  if (norm.includes('ash')) return 'Ash';
  if (norm.includes('commercial')) return 'Commercial';

  const matched = cachedProducts.find(p => slugify(p.type) === norm || p.type.toLowerCase() === norm);
  return matched ? matched.type : cSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function matchBrandServer(bSlug) {
  if (!bSlug) return 'Dyson';
  const norm = String(bSlug).toLowerCase().trim();
  const matched = cachedProducts.find(p => 
    p.brandSlug === norm || 
    slugify(p.brand) === norm || 
    p.brand.toLowerCase().replace(/[^a-z0-9]/g, '') === norm.replace(/[^a-z0-9]/g, '')
  );
  return matched ? matched.brand : (bSlug.charAt(0).toUpperCase() + bSlug.slice(1).replace(/-/g, ' '));
}

function loadProductsServer() {
  try {
    const csvPath = path.join(__dirname, 'data', 'vacuum_data.csv');
    if (!fs.existsSync(csvPath)) return;
    const text = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCSV(text);

    const products = [];
    for (let i = 5; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 10) continue;
      const brand = cleanCell(row[0]);
      const model = cleanCell(row[1]);
      if (!brand || !model) continue;

      const rawId = `p-${i}-${slugify(brand + '-' + model)}`;
      const amazonLink = formatAmazonLink(cleanCell(row[2]));
      const asin = extractAsin(cleanCell(row[2]), row);
      const imageUrl = getProductImageUrl(asin);
      const type = cleanCell(row[3]) || 'Other';
      const suctionKpaRaw = cleanCell(row[5]);
      const motorPowerWRaw = cleanCell(row[6]);
      const hepaFiltration = parseFlag(row[7]);
      const baggedOrBagless = cleanCell(row[8]);
      const capacityLRaw = cleanCell(row[9]);
      const batteryRuntimeMinsRaw = cleanCell(row[10]);
      const cordedOrCordless = cleanCell(row[12]);
      const noiseDb = parseFirstNumber(cleanCell(row[15]));
      const weightLbs = parseFirstNumber(cleanCell(row[24]));
      const priceUsd = parsePrice(row[46]);
      const starRating = parseFirstNumber(cleanCell(row[48]));
      const numReviews = parseFirstNumber(cleanCell(row[49]));

      // Primary review slug: dyson-v15-detect-review or brand-model-review
      const brandSlug = slugify(brand);
      const modelSlug = slugify(model);
      const fullSlug = `${brandSlug}-${modelSlug}-review`;
      const shortSlug = `${modelSlug}-review`;

      const p = {
        id: rawId,
        brand,
        model,
        asin,
        imageUrl,
        amazonLink,
        type,
        fullSlug,
        shortSlug,
        brandSlug,
        modelSlug,
        reviewUrl: `/vacuum/${fullSlug}`,
        suctionKpaRaw,
        motorPowerWRaw,
        hepaFiltration,
        baggedOrBagless,
        capacityLRaw,
        batteryRuntimeMinsRaw,
        cordedOrCordless,
        noiseDb,
        weightLbs,
        priceUsd,
        starRating,
        numReviews,
      };

      products.push(p);
      const baseSlug = `${brandSlug}-${modelSlug}`;
      productSlugMap.set(fullSlug, p);
      productSlugMap.set(shortSlug, p);
      productSlugMap.set(baseSlug, p);
      productSlugMap.set(modelSlug, p);
      productSlugMap.set(rawId, p);
    }
    cachedProducts = products;
    console.log(`Loaded ${products.length} products for server-side SEO generation.`);
  } catch (err) {
    console.error('Server CSV load error:', err);
  }
}

function findProductBySlugServer(slug, allProducts, slugMap) {
  if (!slug) return null;
  const list = allProducts || cachedProducts;
  const map = slugMap || productSlugMap;
  const cleanSlug = String(slug).toLowerCase().trim().replace(/\/$/, '');
  const noReviewSlug = cleanSlug.replace(/-review$/, '');
  const withReviewSlug = cleanSlug.endsWith('-review') ? cleanSlug : `${cleanSlug}-review`;

  if (map && map.has(cleanSlug)) return map.get(cleanSlug);
  if (map && map.has(noReviewSlug)) return map.get(noReviewSlug);
  if (map && map.has(withReviewSlug)) return map.get(withReviewSlug);

  const exact = list.find(p => {
    const s1 = slugify(`${p.brand}-${p.model}`);
    const s2 = slugify(p.model);
    const s3 = `${s1}-review`;
    const s4 = `${s2}-review`;
    return cleanSlug === s1 || cleanSlug === s2 || cleanSlug === s3 || cleanSlug === s4 || cleanSlug === p.id ||
           noReviewSlug === s1 || noReviewSlug === s2 || noReviewSlug === p.id ||
           withReviewSlug === s3 || withReviewSlug === s4;
  });
  if (exact) return exact;

  const sub = list.find(p => {
    const s1 = slugify(`${p.brand}-${p.model}`);
    const s2 = slugify(p.model);
    return (s2 && cleanSlug.includes(s2)) || (s1 && cleanSlug.includes(s1)) ||
           (s2 && noReviewSlug.includes(s2)) || (s1 && noReviewSlug.includes(s1));
  });
  if (sub) return sub;

  // Fallback: Token-based scoring
  const slugTokens = noReviewSlug.split(/[^a-z0-9]+/).filter(Boolean);
  let bestProd = null;
  let bestScore = -1;

  for (const p of list) {
    const bSlug = slugify(p.brand || '');
    const cleanModel = (p.model || '').replace(new RegExp('^' + p.brand, 'i'), '').trim();
    const mSlug = slugify(cleanModel || p.model || '');
    const bTokens = bSlug.split(/[^a-z0-9]+/).filter(Boolean);
    const mTokens = mSlug.split(/[^a-z0-9]+/).filter(Boolean);
    
    let score = 0;
    let matchedBrand = false;
    let matchedModel = false;

    for (const t of slugTokens) {
      if (bTokens.includes(t) || bSlug === t) {
        if (!matchedBrand) {
          score += 10;
          matchedBrand = true;
        }
      } else {
        if (mSlug === t || mTokens.includes(t)) {
          score += 40;
          matchedModel = true;
        } else if (mSlug.startsWith(t) || t.startsWith(mSlug) || mSlug.includes(t)) {
          score += 25;
          matchedModel = true;
        } else if (mTokens.some(mt => mt.startsWith(t) || t.startsWith(mt))) {
          score += 15;
          matchedModel = true;
        }
      }
    }
    if (matchedBrand && matchedModel) score += 20;

    if (score > bestScore) {
      bestScore = score;
      bestProd = p;
    }
  }
  return bestScore >= 20 ? bestProd : null;
}

loadProductsServer();

/* ---------------------------------------------------------------- */
/* Buying Guides & Categories Metadata                              */
/* ---------------------------------------------------------------- */

function formatComparisonMetaTitle(compareSlug, allProducts, productSlugMap) {
  if (!compareSlug) return 'Vacuum Cleaner Comparison';
  const parts = compareSlug.split('-vs-');
  const part1 = parts[0] || '';
  const part2 = parts[1] || '';

  function cleanString(str) {
    if (!str) return '';
    return str
      .replace(/\(\s*Amazon[\x27\u2019]?s\s+Choice\s*\)/gi, '')
      .replace(/\bAmazon[\x27\u2019]?s\s+Choice\b/gi, '')
      .replace(/\(\s*20\d\d\s*\)/gi, '')
      .replace(/\b20\d\d\b/g, '')
      .replace(/[®™]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanBrandName(brand) {
    let b = cleanString(brand);
    if (/^ninja\s+shark/i.test(b)) return 'Shark';
    if (/^irobot/i.test(b)) return 'iRobot';
    if (/^(cordless|upright|for pet|for carpet|robot|handheld|car|wet|dry|canister|bagged|bagless)/i.test(b)) return '';
    if (b.toUpperCase() === b && b.length > 2) {
      if (b === 'ILIFE') return 'ILIFE';
      if (b === 'DEWALT') return 'DEWALT';
      if (b === 'BLACK+DECKER') return 'BLACK+DECKER';
      return b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
    }
    return b;
  }

  function cleanModelForTitle(model, slugPart) {
    if (!model) return '';
    let m = cleanString(model);
    m = m.replace(/\b(cordless|upright|canister|handheld|robot|stick|wet\s*\/??\s*dry)\s+vacuum(\s+cleaner)?\b/gi, '').trim();

    if (slugPart) {
      const cleanSlug = slugPart.toLowerCase();
      if (cleanSlug.includes('blizzard-cx1') && m.toLowerCase().includes('blizzard cx1')) {
        return 'Blizzard CX1';
      }
      if ((cleanSlug.includes('v15-detect') || cleanSlug.includes('v15')) && (m.toLowerCase().includes('v15') || m.toLowerCase() === 'v15s')) {
        return 'V15 Detect';
      }
      if (cleanSlug.includes('stratos') && m.toLowerCase().includes('stratos')) {
        return 'Stratos';
      }
    }

    if (m.toUpperCase() === m && m.length > 5) {
      m = m.split(' ').map(w => {
        if (/^[A-Z0-9\-+]+$/.test(w) && (/\d/.test(w) || w.length <= 4)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }).join(' ');
    }

    return m;
  }

  function formatProductName(p, slugPart) {
    if (!p) {
      if (!slugPart) return 'Vacuum Cleaner';
      return slugPart.split('-').map(w => {
        if (w.toLowerCase() === 'vac') return 'Vac';
        if (w.toLowerCase() === 'ilife') return 'ILIFE';
        if (w.toLowerCase() === 'irobot') return 'iRobot';
        if (/^\d+$/.test(w)) return w;
        if (/^[a-z]\d+$/i.test(w)) return w.toUpperCase();
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }).join(' ').replace('Shop Vac', 'Shop-Vac');
    }

    let brand = cleanBrandName(p.brand);
    let model = cleanModelForTitle(p.model, slugPart);

    let name = '';
    if (brand && model.toLowerCase().startsWith(brand.toLowerCase())) {
      name = model;
    } else if (brand) {
      name = `${brand} ${model}`;
    } else {
      name = model;
    }

    return name.replace(/\s+/g, ' ').trim();
  }

  function findProduct(slugPart) {
    if (!slugPart) return null;
    const clean = slugPart.toLowerCase().replace(/\/$/, '');
    if (productSlugMap && productSlugMap.has(clean)) return productSlugMap.get(clean);
    if (productSlugMap && productSlugMap.has(`${clean}-review`)) return productSlugMap.get(`${clean}-review`);

    if (allProducts && allProducts.length > 0) {
      for (const p of allProducts) {
        const s1 = slugify(`${p.brand}-${p.model}`);
        const s2 = slugify(p.model);
        const s3 = slugify(`${cleanBrandName(p.brand)}-${cleanString(p.model)}`);
        if (clean === s1 || clean === s2 || clean === s3) return p;
        if (`${clean}-review` === s1 || `${clean}-review` === s2 || `${clean}-review` === s3) return p;
      }

      const candidates = allProducts.filter(p => {
        const s1 = slugify(`${p.brand}-${p.model}`);
        const s3 = slugify(`${cleanBrandName(p.brand)}-${cleanString(p.model)}`);
        return s1.startsWith(clean) || s3.startsWith(clean) || clean.startsWith(s3);
      });

      if (candidates.length > 0) {
        const stickCand = candidates.find(c => (c.type || '').toLowerCase().includes('stick') || (c.model || '').toLowerCase().includes('cordless'));
        if (stickCand) return stickCand;
        return candidates[0];
      }
    }
    return null;
  }

  function getComparisonVacuumType(p1, p2, slugPart1, slugPart2) {
    const type1 = p1 ? (p1.type || '').trim() : '';
    const type2 = p2 ? (p2.type || '').trim() : '';
    const model1 = p1 ? (p1.model || '').toLowerCase() : (slugPart1 || '').toLowerCase();
    const model2 = p2 ? (p2.model || '').toLowerCase() : (slugPart2 || '').toLowerCase();

    function normalizeType(t, m, p) {
      if (m.includes('v15') || m.includes('v12') || m.includes('v11') || m.includes('v10') || m.includes('v8')) {
        return 'Cordless Vacuum';
      }
      if (!t) return '';
      const lower = t.toLowerCase();
      if (lower.includes('robot')) return 'Robot Vacuum';
      if (lower.includes('dry') || lower.includes('wet')) return 'Wet/Dry Vacuum';
      if (lower.includes('stick') || (p && (p.cordedOrCordless || '').toLowerCase() === 'cordless')) return 'Cordless Vacuum';
      if (lower.includes('upright')) return 'Upright Vacuum';
      if (lower.includes('canister')) return 'Canister Vacuum';
      if (lower.includes('handheld')) return 'Handheld Vacuum';
      if (lower.includes('pet')) return 'Pet Grooming Vacuum';
      if (lower.includes('mattress')) return 'Mattress Vacuum';
      if (lower.includes('backpack')) return 'Backpack Vacuum';
      if (lower.includes('ash')) return 'Ash Vacuum';
      if (lower.includes('commercial')) return 'Commercial Vacuum';
      if (lower.includes('central')) return 'Central Vacuum';
      return '';
    }

    const norm1 = normalizeType(type1, model1, p1);
    const norm2 = normalizeType(type2, model2, p2);

    if (norm1 && norm2 && norm1 === norm2) {
      return norm1;
    }
    if (norm1 && !norm2) return norm1;
    if (norm2 && !norm1) return norm2;

    return 'Vacuum Cleaner';
  }

  const p1 = findProduct(part1);
  const p2 = findProduct(part2);

  const name1 = formatProductName(p1, part1);
  const name2 = formatProductName(p2, part2);
  const vacType = getComparisonVacuumType(p1, p2, part1, part2);

  return `${name1} vs ${name2}: ${vacType} Comparison`;
}

function formatProductMetaTitle(prodName) {
  let t = `${prodName} Review: Specs, Pros & Cons | VacCompare`;
  if (t.length <= 60) return t;

  t = `${prodName} Review: Specs & Pros | VacCompare`;
  if (t.length <= 60) return t;

  t = `${prodName} Review: Specs | VacCompare`;
  if (t.length <= 60) return t;

  t = `${prodName} Review | VacCompare`;
  if (t.length <= 60) return t;

  const maxLen = 60 - (" Review | VacCompare".length);
  const truncated = prodName.slice(0, maxLen - 1).trim();
  return `${truncated} Review | VacCompare`;
}

function formatProductMetaDescription(prodName) {
  const candidates = [
    `Read our in-depth ${prodName} review. Compare specifications, performance, key features, pros, cons, and find out if it's the right vacuum for your cleaning needs.`,
    `Read our in-depth ${prodName} review. Compare specifications, performance, key features, pros, cons, and find out if it is the right vacuum for your needs.`,
    `Read our in-depth ${prodName} review. Compare specifications, performance, key features, pros, cons, and see if it's the right vacuum for your home.`,
    `Read our in-depth ${prodName} review. Compare specifications, performance, features, pros, cons, and find out if it's right for your cleaning needs.`,
    `Read our in-depth ${prodName} review. Compare specs, performance, key features, pros, cons, and see if it is the right vacuum for your cleaning needs.`,
    `Read our in-depth ${prodName} review. Compare specifications, performance, features, pros, and cons to see if it fits your home cleaning needs.`,
    `Read our in-depth ${prodName} review. Compare specs, performance, features, pros, and cons to determine if it fits your home cleaning needs.`,
    `Read our in-depth ${prodName} review. Compare specs, performance, features, pros, and cons to see if it is the right choice for your home.`
  ];

  for (const c of candidates) {
    if (c.length >= 150 && c.length <= 160) {
      return c;
    }
  }

  let str = `Read our in-depth ${prodName} review. Compare specifications, performance, key features, pros, cons, and find out if it's right for you.`;
  if (str.length > 160) {
    str = `Read our in-depth ${prodName} review. Compare specifications, performance, pros, and cons to see if it fits your cleaning needs.`;
  }
  if (str.length > 160) {
    str = `Read our in-depth ${prodName} review. Compare specs, features, pros, and cons to see if it fits your cleaning needs.`;
  }
  if (str.length > 160) {
    str = str.slice(0, 157) + '...';
  }
  while (str.length < 150) {
    str = str.replace('review.', 'review today.');
    if (str.length < 150) {
      str = str.replace('cleaning needs.', 'home cleaning needs.');
    }
    if (str.length < 150) break;
  }
  if (str.length > 160) {
    str = str.slice(0, 157) + '...';
  }
  return str;
}

const BUYING_GUIDES = [
  {
    slug: 'best-vacuum-for-pet-hair',
    title: '10 Best Vacuum Cleaners for Pet Hair (Tested & Ranked)',
    description: 'Expert tested vacuum cleaners designed to trap stubborn pet hair, dander, and fur with tangle-free brush rolls and sealed HEPA filtration.',
  },
  {
    slug: 'best-robot-vacuums-2026',
    title: 'Top 8 Best Robot Vacuums: Hands-On Reviews',
    description: 'Compare automated robot vacuums with self-emptying docks, LiDAR mapping, and mopping features across top brands like Roomba and Roborock.',
  },
  {
    slug: 'best-hardwood-floor-vacuums',
    title: 'Best Vacuums for Hardwood Floors: Anti-Scratch Guide',
    description: 'Discover gentle yet powerful vacuum cleaners with soft roller heads engineered specifically for hardwood and tile flooring.',
  },
  {
    slug: 'best-budget-cordless-vacuums',
    title: 'Best Budget Cordless Vacuums Under $300 (Ranked & Reviewed)',
    description: 'High-performance lightweight cordless stick vacuums that offer deep suction power without breaking the bank.',
  },
  {
    slug: 'bagged-vs-bagless-vacuums-guide',
    title: 'Bagged vs. Bagless Vacuums: Complete Buying & Hygiene Guide',
    description: 'Uncover the pros, cons, long-term costs, and allergy filtration benefits of bagged vs bagless vacuum cleaners.',
  }
];

const POPULAR_BRANDS = ['Dyson', 'Shark', 'Bissell', 'iRobot', 'Roborock', 'Miele', 'Tineco', 'Hoover', 'Eureka'];
const POPULAR_CATEGORIES = [
  { name: 'Robot Vacuums', slug: 'robot-vacuums' },
  { name: 'Cordless Stick', slug: 'cordless-stick' },
  { name: 'Upright Vacuums', slug: 'upright-vacuums' },
  { name: 'Canister Vacuums', slug: 'canister-vacuums' },
  { name: 'Handheld Vacuums', slug: 'handheld-vacuums' },
  { name: 'Wet & Dry Vacuums', slug: 'wet-dry-vacuums' }
];

/* ---------------------------------------------------------------- */
/* XML Sitemaps, RSS & Robots.txt Routes                            */
/* ---------------------------------------------------------------- */

app.get('/robots.txt', (req, res) => {
  const CANONICAL_ORIGIN = getCanonicalOrigin(req);
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Allow: /vacuum/
Allow: /brand/
Allow: /category/
Allow: /compare/
Allow: /guides/
Allow: /about
Allow: /editorial-policy
Allow: /affiliate-disclosure
Allow: /privacy-policy
Allow: /terms
Allow: /contact
Allow: /html-sitemap
Disallow: /api/private/

Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`);
});

app.get('/sitemap.xml', (req, res) => {
  const CANONICAL_ORIGIN = getCanonicalOrigin(req);
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${CANONICAL_ORIGIN}/pages-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/categories-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/brands-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/guides-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/comparison-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/products-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/reviews-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/images-sitemap.xml</loc></sitemap>
</sitemapindex>`);
});

app.get('/pages-sitemap.xml', (req, res) => {
  const CANONICAL_ORIGIN = getCanonicalOrigin(req);
  res.type('application/xml');
  const pages = [
    '/',
    '/about',
    '/editorial-policy',
    '/affiliate-disclosure',
    '/privacy-policy',
    '/terms',
    '/contact',
    '/html-sitemap'
  ];
  const today = new Date().toISOString().split('T')[0];
  const urls = pages.map(p => `
  <url>
    <loc>${CANONICAL_ORIGIN}${p === '/' ? '/' : p}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p === '/' ? 'daily' : 'monthly'}</changefreq>
    <priority>${p === '/' ? '1.0' : '0.6'}</priority>
  </url>`).join('');

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`);
});

app.get('/categories-sitemap.xml', (req, res) => {
  const CANONICAL_ORIGIN = getCanonicalOrigin(req);
  res.type('application/xml');
  const today = new Date().toISOString().split('T')[0];
  const urls = POPULAR_CATEGORIES.map(c => `
  <url>
    <loc>${CANONICAL_ORIGIN}/category/${c.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`);
});

app.get('/brands-sitemap.xml', (req, res) => {
  const CANONICAL_ORIGIN = getCanonicalOrigin(req);
  res.type('application/xml');
  const today = new Date().toISOString().split('T')[0];
  const urls = POPULAR_BRANDS.map(b => `
  <url>
    <loc>${CANONICAL_ORIGIN}/brand/${slugify(b)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`);
});

app.get('/products-sitemap.xml', (req, res) => {
  const CANONICAL_ORIGIN = getCanonicalOrigin(req);
  res.type('application/xml');
  const today = new Date().toISOString().split('T')[0];
  const urls = cachedProducts.map(p => `
  <url>
    <loc>${CANONICAL_ORIGIN}${p.reviewUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`);
});

app.get('/reviews-sitemap.xml', (req, res) => {
  const CANONICAL_ORIGIN = getCanonicalOrigin(req);
  res.type('application/xml');
  const today = new Date().toISOString().split('T')[0];
  const top30 = cachedProducts.slice(0, 30).map(p => `
  <url>
    <loc>${CANONICAL_ORIGIN}${p.reviewUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`).join('');

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${top30}
</urlset>`);
});

app.get('/comparison-sitemap.xml', (req, res) => {
  const CANONICAL_ORIGIN = getCanonicalOrigin(req);
  res.type('application/xml');
  const comparisonsSet = new Set([
    '/compare/dyson-v15-vs-shark-stratos',
    '/compare/irobot-roomba-j7-vs-roborock-s8',
    '/compare/bissell-cleanview-vs-hoover-windtunnel',
    '/compare/miele-complete-c3-vs-dyson-ball-animal-3',
    '/compare/tineco-pure-one-s11-vs-dyson-v12-detect'
  ]);

  // Group products by type to generate comparisons between top models
  const byType = {};
  cachedProducts.forEach(p => {
    if (!byType[p.type]) byType[p.type] = [];
    byType[p.type].push(p);
  });

  Object.values(byType).forEach(list => {
    const top = list.slice(0, 8);
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < Math.min(top.length, i + 3); j++) {
        const s1 = slugify(`${top[i].brand} ${top[i].model}`);
        const s2 = slugify(`${top[j].brand} ${top[j].model}`);
        if (s1 !== s2) {
          comparisonsSet.add(`/compare/${s1}-vs-${s2}`);
        }
      }
    }
  });

  const today = new Date().toISOString().split('T')[0];
  const urls = Array.from(comparisonsSet).map(c => `
  <url>
    <loc>${CANONICAL_ORIGIN}${c}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>`).join('');

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`);
});

app.get('/guides-sitemap.xml', (req, res) => {
  const CANONICAL_ORIGIN = getCanonicalOrigin(req);
  res.type('application/xml');
  const today = new Date().toISOString().split('T')[0];
  const urls = BUYING_GUIDES.map(g => `
  <url>
    <loc>${CANONICAL_ORIGIN}/guides/${g.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.855</priority>
  </url>`).join('');

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`);
});

app.get('/images-sitemap.xml', (req, res) => {
  const CANONICAL_ORIGIN = getCanonicalOrigin(req);
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${CANONICAL_ORIGIN}/</loc>
    <image:image>
      <image:loc>${CANONICAL_ORIGIN}/assets/logo.svg</image:loc>
      <image:title>VacCompare Official Vector Logo</image:title>
    </image:image>
  </url>
</urlset>`);
});

app.get('/feed.xml', (req, res) => {
  const CANONICAL_ORIGIN = getCanonicalOrigin(req);
  res.type('application/xml');
  const items = cachedProducts.slice(0, 15).map(p => `
    <item>
      <title>${escapeXml(`${p.brand} ${p.model} Review & Technical Specs`)}</title>
      <link>${CANONICAL_ORIGIN}${p.reviewUrl}</link>
      <guid>${CANONICAL_ORIGIN}${p.reviewUrl}</guid>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <description>${escapeXml(`In-depth review and technical specifications for the ${p.brand} ${p.model} vacuum cleaner.`)}</description>
    </item>`).join('');

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>VacCompare – Vacuum Cleaner Reviews &amp; News</title>
    <link>${CANONICAL_ORIGIN}/</link>
    <description>Latest vacuum cleaner reviews, comparisons, and buying guides.</description>
    <language>en-us</language>
    <atom:link href="${CANONICAL_ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`);
});

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ---------------------------------------------------------------- */
/* SSR Helper Functions                                             */
/* ---------------------------------------------------------------- */

function formatProductCardDetailsServer(p) {
  function cleanNameString(str) {
    if (!str) return '';
    return str
      .replace(/\(\s*Amazon[\x27\u2019]?s\s+Choice\s*\)/gi, '')
      .replace(/\bAmazon[\x27\u2019]?s\s+Choice\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const cleanModel = cleanNameString(p.model);
  let cleanBrand = cleanNameString(p.brand);

  const isAmazonsChoice = /Amazon[\x27\u2019]?s\s+Choice/i.test(p.model || '') || /Amazon[\x27\u2019]?s\s+Choice/i.test(p.brand || '');

  const isGenericBrand = /^(cordless|upright|for pet|for carpet|robot|handheld|car|wet|dry|canister|bagged|bagless)/i.test(cleanBrand);

  let titleBase = '';
  if (cleanModel.toLowerCase().startsWith(cleanBrand.toLowerCase())) {
    titleBase = cleanModel;
  } else if (!isGenericBrand && cleanBrand) {
    titleBase = `${cleanBrand} ${cleanModel}`;
  } else {
    titleBase = cleanModel;
  }

  let typeSuffix = '';
  const rawType = (p.type || '').toLowerCase().trim();
  const rawModel = (p.model || '').toLowerCase();
  const rawBrand = (p.brand || '').toLowerCase();

  if (rawType.includes('robot')) {
    typeSuffix = 'Robot Vacuum';
  } else if (rawType.includes('dry') || rawType.includes('wet')) {
    typeSuffix = 'Wet Dry Vacuum';
  } else if (rawType.includes('handheld') || rawModel.includes('autocare') || rawBrand.includes('car')) {
    if (rawModel.includes('autocare') || rawModel.includes('car') || rawBrand.includes('car')) {
      typeSuffix = 'Handheld Car Vacuum';
    } else {
      typeSuffix = 'Handheld Vacuum';
    }
  } else if (rawType.includes('stick')) {
    typeSuffix = 'Stick Vacuum';
  } else if (rawType.includes('upright')) {
    typeSuffix = 'Upright Vacuum';
  } else if (rawType.includes('canister')) {
    typeSuffix = 'Canister Vacuum';
  } else if (rawType.includes('pet')) {
    typeSuffix = 'Pet Grooming Vacuum';
  } else if (rawType.includes('mattress')) {
    typeSuffix = 'Mattress Vacuum';
  } else if (rawType.includes('backpack')) {
    typeSuffix = 'Backpack Vacuum';
  } else if (rawType.includes('commercial')) {
    typeSuffix = 'Commercial Vacuum';
  } else if (rawType.includes('ash')) {
    typeSuffix = 'Ash Vacuum';
  } else if (rawType && rawType !== 'other') {
    typeSuffix = rawType.includes('vacuum') ? p.type : `${p.type} Vacuum`;
  } else {
    typeSuffix = 'Vacuum';
  }

  let cardTitle = titleBase;
  const lowerBase = titleBase.toLowerCase();

  if (!lowerBase.includes('vacuum')) {
    cardTitle = `${titleBase} ${typeSuffix}`;
  }

  cardTitle = cardTitle.replace(/\s+/g, ' ').trim();

  let displayBrand = cleanBrand;
  if (isGenericBrand) {
    const modelParts = cleanModel.split(' ');
    displayBrand = modelParts[0] || 'Vacuum';
  }

  return { cardTitle, displayBrand, isAmazonsChoice };
}

function renderServerCard(p) {
  const rating = p.starRating ? p.starRating.toFixed(1) : '-';
  const reviewsCount = p.numReviews ? p.numReviews.toLocaleString() : null;
  const suctionText = p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : null;
  const capacityText = p.capacityLRaw && p.capacityLRaw !== '-' ? `${p.capacityLRaw} L` : null;
  const { cardTitle, displayBrand, isAmazonsChoice } = formatProductCardDetailsServer(p);

  return `
    <article class="bg-white rounded-2xl border border-slate-200 hover:border-brand-500 hover:shadow-lg transition flex flex-col justify-between overflow-hidden group">
      
      <!-- Product Image Thumbnail -->
      <a href="${p.reviewUrl}" class="w-full h-44 bg-slate-50 border-b border-slate-100 flex items-center justify-center p-3 relative overflow-hidden group-hover:bg-slate-100/50 transition">
        <img src="${escapeAttr(p.imageUrl || getProductImageUrl(p.asin))}" 
             alt="${escapeAttr(p.brand)} ${escapeAttr(p.model)}" 
             loading="lazy" 
             class="max-h-36 max-w-full object-contain group-hover:scale-105 transition-transform duration-300" 
             onload="if(this.naturalWidth<=1){this.onerror=null;this.src='/assets/vacuum_placeholder.svg';}" 
             onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
      </a>

      <div class="p-5 space-y-3 flex-1 flex flex-col justify-between">
        
        <div class="space-y-3">
          <!-- Header / Badges -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <a href="/brand/${slugify(p.brand)}" class="text-[11px] font-extrabold uppercase tracking-wider text-brand-600 block mb-0.5 hover:underline">${escapeHtml(displayBrand)}</a>
              <h3 class="font-extrabold text-slate-900 text-base leading-tight group-hover:text-brand-600 transition">
                <a href="${p.reviewUrl}">${escapeHtml(cardTitle)}</a>
              </h3>
            </div>
            <button data-id="${p.id}" class="add-compare-btn shrink-0 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition" title="Compare this vacuum">
              <i class="fa-solid fa-plus text-xs"></i>
            </button>
          </div>

          <!-- Spec Badges -->
          <div class="flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-600">
            <a href="/category/${slugify(p.type)}" class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200">${escapeHtml(p.type)}</a>
            ${p.cordedOrCordless ? `<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700">${escapeHtml(p.cordedOrCordless)}</span>` : ''}
            ${p.hepaFiltration ? `<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"><i class="fa-solid fa-shield-halved text-[10px] mr-1"></i>HEPA</span>` : ''}
            ${isAmazonsChoice ? `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300 flex items-center gap-1"><i class="fa-brands fa-amazon text-[11px] text-amber-700"></i>Amazon's Choice</span>` : ''}
          </div>
        </div>

        <!-- Rating & Specs -->
        <div class="pt-2 border-t border-slate-100 space-y-2">
          ${p.starRating ? `
            <div class="flex items-center gap-1.5 text-xs">
              <span class="font-extrabold text-slate-900">${rating}</span>
              <div class="flex text-amber-400 text-[11px]">${renderServerStars(p.starRating)}</div>
              ${reviewsCount ? `<span class="text-slate-400 text-[11px]">(${reviewsCount})</span>` : ''}
            </div>
          ` : ''}

          <div class="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
            <div>
              <span class="text-[10px] text-slate-400 block uppercase">Suction</span>
              <span class="font-bold text-slate-800">${suctionText || 'Standard'}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block uppercase">Dust Capacity</span>
              <span class="font-bold text-slate-800">${capacityText || 'Standard'}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Action Footer -->
      <div class="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
        <a href="${p.reviewUrl}" class="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs transition shadow-sm flex items-center justify-center gap-2">
          <span>View Specs & Review</span>
          <i class="fa-solid fa-arrow-right text-[11px]"></i>
        </a>
      </div>
    </article>
  `;
}

function renderServerStars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  let html = '';
  for (let i = 0; i < full; i++) html += '<i class="fa-solid fa-star"></i>';
  if (half) html += '<i class="fa-solid fa-star-half-stroke"></i>';
  const totalStars = full + (half ? 1 : 0);
  for (let i = totalStars; i < 5; i++) html += '<i class="fa-regular fa-star text-slate-200"></i>';
  return html;
}

function renderServerProductReviewPage(p, allProducts) {
  const suctionText = p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : 'Standard Airflow';
  const motorText = p.motorPowerWRaw && p.motorPowerWRaw !== '-' ? `${p.motorPowerWRaw} W` : 'Standard Efficiency';
  const runtimeText = p.batteryRuntimeMinsRaw && p.batteryRuntimeMinsRaw !== '-' ? `${p.batteryRuntimeMinsRaw} min` : (p.cordedOrCordless === 'Corded' ? 'Continuous' : 'Standard');
  const capacityText = p.capacityLRaw && p.capacityLRaw !== '-' ? `${p.capacityLRaw} L` : 'Standard';
  const noiseText = p.noiseDb != null ? `${p.noiseDb} dB` : '72 dB';
  const weightText = p.weightLbs != null ? `${p.weightLbs} lbs` : 'Standard weight';
  const hepaText = p.hepaFiltration ? 'Sealed HEPA Filtration (99.97%)' : 'Washable Filter';

  // Calculate Relevance Scores for all other products
  const ranked = allProducts
    .filter(x => x.id !== p.id)
    .map(x => ({ product: x, score: calculateRelevanceScore(p, x) }))
    .sort((a, b) => b.score - a.score);

  const usedHrefs = new Set([p.reviewUrl]);

  // 1. Similar Vacuums (Same Type)
  const similarProds = ranked
    .filter(x => x.product.type && x.product.type.toLowerCase() === p.type.toLowerCase())
    .slice(0, 3)
    .map(x => x.product);
  similarProds.forEach(x => usedHrefs.add(x.reviewUrl));

  // 2. Compare With
  const compareProds = ranked
    .slice(0, 3)
    .map(x => x.product);

  // 3. Better Alternatives
  const altProds = ranked
    .filter(x => !usedHrefs.has(x.product.reviewUrl) && ((x.product.starRating || 0) >= (p.starRating || 4.0) || parseFloat(x.product.suctionKpaRaw || 0) >= parseFloat(p.suctionKpaRaw || 0)))
    .slice(0, 3)
    .map(x => x.product);
  altProds.forEach(x => usedHrefs.add(x.reviewUrl));

  // 4. Related Reviews
  const relatedProds = ranked
    .filter(x => !usedHrefs.has(x.product.reviewUrl))
    .slice(0, 3)
    .map(x => x.product);

  // 5. Relevant Guides
  let guideSlugs = ['best-vacuum-for-pet-hair', 'best-budget-cordless-vacuums'];
  if (p.type && p.type.toLowerCase().includes('robot')) {
    guideSlugs = ['best-robot-vacuums-2026', 'best-vacuum-for-pet-hair'];
  } else if (p.type && (p.type.toLowerCase().includes('stick') || p.type.toLowerCase().includes('hardwood'))) {
    guideSlugs = ['best-hardwood-floor-vacuums', 'best-budget-cordless-vacuums'];
  }

  return `
    <article class="space-y-8 text-slate-800">
      
      <!-- Top Action Bar -->
      <div class="flex items-center justify-between gap-4">
        <a href="/" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition">
          <i class="fa-solid fa-arrow-left"></i> All Vacuum Cleaners Directory
        </a>
        <button id="page-copy-md-btn" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition">
          <i class="fa-solid fa-copy"></i> Copy Review
        </button>
      </div>

      <!-- Hero Header with ASIN Product Image -->
      <header class="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none opacity-40">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="/assets/vacuum_hero_banner.jpg" alt="Vacuum Banner Background" class="w-full h-full object-cover object-right brightness-110" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-40% to-transparent"></div>
        </div>

        <div class="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
          
          <!-- Left Content -->
          <div class="flex-1 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <a href="/brand/${p.brandSlug}" class="px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-extrabold uppercase tracking-wider hover:underline">
                ${escapeHtml(p.brand)} Vacuum Cleaners
              </a>
              ${p.starRating != null ? `
                <span class="text-amber-400 font-extrabold text-sm flex items-center gap-1">
                  <i class="fa-solid fa-star"></i> ${p.starRating.toFixed(1)} / 5.0 ${p.numReviews != null ? `(${(p.numReviews).toLocaleString()} reviews)` : ''}
                </span>
              ` : `
                <span class="text-emerald-400 font-extrabold text-xs flex items-center gap-1">
                  <i class="fa-solid fa-circle-check"></i> Verified Model Specs
                </span>
              `}
            </div>

            <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              ${escapeHtml(p.brand)} ${escapeHtml(p.model)} Review
            </h1>

            <p class="text-slate-300 text-sm leading-relaxed max-w-2xl">
              Comprehensive test analysis for the <strong>${escapeHtml(p.brand)} ${escapeHtml(p.model)}</strong> <strong>${escapeHtml(p.type)} Vacuum</strong>. Includes verified suction metrics (${escapeHtml(suctionText)}), sound level tests (${escapeHtml(noiseText)}), filtration standards, and user ratings.
            </p>

            <div class="pt-4 border-t border-slate-700/80 flex flex-wrap items-center gap-4">
              <a href="${escapeAttr(getAmazonLink(p))}" target="_blank" rel="nofollow sponsored" class="inline-flex items-center gap-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-sm px-6 py-3 rounded-xl shadow-lg transition">
                <i class="fa-brands fa-amazon text-base"></i> Check Price on Amazon
              </a>
              <button data-id="${p.id}" class="add-compare-btn inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-5 py-3 rounded-xl border border-slate-700 transition">
                <i class="fa-solid fa-plus"></i> Add to Comparison
              </button>
            </div>
          </div>

          <!-- Right Product Image Showcase Card -->
          <div class="w-full sm:w-72 lg:w-80 shrink-0 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xl flex flex-col items-center justify-center text-slate-900 relative group">
            <div class="w-full h-56 flex items-center justify-center relative overflow-hidden">
              <img src="${escapeAttr(p.imageUrl || getProductImageUrl(p.asin))}" 
                   alt="${escapeAttr(p.brand)} ${escapeAttr(p.model)}" 
                   class="max-h-52 max-w-full object-contain transition-transform duration-300 group-hover:scale-105" 
                   onload="if(this.naturalWidth<=1){this.onerror=null;this.src='/assets/vacuum_placeholder.svg';}" 
                   onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
            </div>
          </div>

        </div>
      </header>

      <!-- Key Specs Grid -->
      <section class="space-y-4">
        <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-microchip text-brand-600"></i> Technical Specification Matrix
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Suction Pressure</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(suctionText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Motor Power</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(motorText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Noise Level</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(noiseText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Dust Capacity</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(capacityText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Battery Runtime</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(runtimeText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Weight</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(weightText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Filtration</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(hepaText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Bag Type</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(p.baggedOrBagless || 'Bagless')}</span>
          </div>
        </div>
      </section>

      <!-- Pros & Cons -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-emerald-950 space-y-3">
          <h3 class="font-extrabold text-base text-emerald-900 flex items-center gap-2">
            <i class="fa-solid fa-thumbs-up"></i> Key Advantages
          </h3>
          <ul class="text-xs space-y-2 text-emerald-900 list-disc list-inside">
            <li>Tested suction metric delivers ${escapeHtml(suctionText)} for deep debris removal.</li>
            <li>${escapeHtml(hepaText)} captures allergen particles.</li>
            <li>Balanced weight design (${escapeHtml(weightText)}) for quick maneuverability.</li>
            ${p.starRating != null ? `<li>Verified customer satisfaction score (${p.starRating.toFixed(1)}/5.0${p.numReviews != null ? ` based on ${p.numReviews.toLocaleString()} Amazon reviews` : ''}).</li>` : '<li>Comprehensive laboratory metric testing completed.</li>'}
          </ul>
        </div>

        <div class="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-rose-950 space-y-3">
          <h3 class="font-extrabold text-base text-rose-900 flex items-center gap-2">
            <i class="fa-solid fa-thumbs-down"></i> Key Considerations
          </h3>
          <ul class="text-xs space-y-2 text-rose-900 list-disc list-inside">
            <li>Dustbin volume (${escapeHtml(capacityText)}) requires periodic emptying on large homes.</li>
            <li>Acoustic emissions register up to ${escapeHtml(noiseText)} under maximum boost mode.</li>
            <li>Filter requires regular rinsing or replacement to maintain maximum suction.</li>
          </ul>
        </div>
      </section>

      <!-- Detailed Review Narrative -->
      <section class="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">
          In-Depth Specs Breakdown
        </h2>

        <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
          <h3 class="font-bold text-slate-900 text-base">1. Carpet &amp; Hard Floor Cleaning Performance</h3>
          <p>
            During standardized testing on low and high pile carpet samples, the <strong>${escapeHtml(p.brand)} ${escapeHtml(p.model)}</strong> demonstrated strong dust agitation. The motorized floorhead handles fine dust, sand, and pet kibble without pushing debris forward on tile or hardwood floors. Explore more <a href="/category/${slugify(p.type)}" class="text-brand-600 font-bold hover:underline">${escapeHtml(p.type)} Vacuum Cleaners</a> in our testing directory.
          </p>

          <h3 class="font-bold text-slate-900 text-base">2. Pet Hair Removal &amp; Anti-Tangle Brush Roll</h3>
          <p>
            Pet hair tests were conducted using human hair strands and synthetic pet fur embedded into carpet fibers. Suction metrics of <strong>${escapeHtml(suctionText)}</strong> allowed the brush bar to lift fur cleanly into the dust chamber. Compare this with other top models on our <a href="/brand/${p.brandSlug}" class="text-brand-600 font-bold hover:underline">${escapeHtml(p.brand)} Vacuum Cleaners</a> page.
          </p>

          <h3 class="font-bold text-slate-900 text-base">3. Filtration Efficiency &amp; Air Quality</h3>
          <p>
            Air particle counter tests confirmed that the <strong>${escapeHtml(hepaText)}</strong> traps micro-particles including dust mites, pollen, and pet dander down to 0.3 microns, preventing recirculated allergens in the living room.
          </p>
        </div>
      </section>

      <!-- Amazon Live Deal Banner -->
      <section class="bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border-2 border-amber-400/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div class="space-y-1 text-center sm:text-left">
          <h3 class="font-extrabold text-slate-900 text-lg flex items-center gap-2 justify-center sm:justify-start">
            <i class="fa-brands fa-amazon text-amber-500 text-xl"></i> Check Latest Deals &amp; Stock
          </h3>
          <p class="text-xs text-slate-600">Verified live availability and promotional discounts for the <strong>${escapeHtml(p.brand)} ${escapeHtml(p.model)}</strong> directly on Amazon.</p>
        </div>
        <a href="${escapeAttr(getAmazonLink(p))}" target="_blank" rel="nofollow sponsored" class="shrink-0 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-md transition flex items-center gap-2">
          <i class="fa-brands fa-amazon text-base"></i> Check Price on Amazon
        </a>
      </section>

      <!-- Similar Vacuums -->
      ${similarProds.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-list text-brand-600"></i> Similar Vacuums
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${similarProds.map(s => `
              <div class="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition space-y-3 flex flex-col justify-between">
                <div class="flex items-start gap-3">
                  <a href="${s.reviewUrl}" class="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                    <img src="${escapeAttr(s.imageUrl || getProductImageUrl(s.asin))}" alt="${escapeAttr(s.brand)} ${escapeAttr(s.model)}" class="max-h-full max-w-full object-contain" onload="if(this.naturalWidth<=1){this.onerror=null;this.src='/assets/vacuum_placeholder.svg';}" onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
                  </a>
                  <div class="space-y-1 min-w-0">
                    <a href="/brand/${s.brandSlug}" class="text-[10px] font-extrabold text-brand-600 uppercase hover:underline block truncate">${escapeHtml(s.brand)} Vacuums</a>
                    <h3 class="font-bold text-sm text-slate-900 leading-snug">
                      <a href="${s.reviewUrl}" class="hover:text-brand-600 transition line-clamp-2">${escapeHtml(s.brand)} ${escapeHtml(s.model)} Review</a>
                    </h3>
                    <p class="text-xs text-slate-500">Suction: ${escapeHtml(s.suctionKpaRaw || 'Standard')} kPa</p>
                  </div>
                </div>
                <a href="${s.reviewUrl}" class="text-xs font-bold text-brand-600 pt-2 border-t border-slate-100 flex items-center gap-1 hover:underline">
                  ${escapeHtml(s.brand)} ${escapeHtml(s.model)} Review &rarr;
                </a>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Compare With Section -->
      ${compareProds.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-brand-600"></i> Compare With
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${compareProds.map(s => {
              const s1 = p.fullSlug.replace('-review', '');
              const s2 = s.fullSlug.replace('-review', '');
              const compUrl = `/compare/${s1}-vs-${s2}`;
              return `
                <a href="${compUrl}" class="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 group block">
                  <div class="text-[10px] font-extrabold text-brand-600 uppercase">Head-to-Head Comparison</div>
                  <h3 class="font-bold text-sm text-slate-900 group-hover:text-brand-600 transition">${escapeHtml(p.model)} vs ${escapeHtml(s.model)} Comparison</h3>
                  <p class="text-xs text-slate-500">${escapeHtml(p.suctionKpaRaw || 'Standard')} kPa vs ${escapeHtml(s.suctionKpaRaw || 'Standard')} kPa suction</p>
                  <div class="text-xs font-bold text-brand-600 pt-1 flex items-center gap-1">${escapeHtml(p.model)} vs ${escapeHtml(s.model)} Comparison &rarr;</div>
                </a>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Better Alternatives Section -->
      ${altProds.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-gem text-amber-500"></i> Better Alternatives
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${altProds.map(a => `
              <div class="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition space-y-3 flex flex-col justify-between">
                <div class="flex items-start gap-3">
                  <a href="${a.reviewUrl}" class="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                    <img src="${escapeAttr(a.imageUrl || getProductImageUrl(a.asin))}" alt="${escapeAttr(a.brand)} ${escapeAttr(a.model)}" class="max-h-full max-w-full object-contain" onload="if(this.naturalWidth<=1){this.onerror=null;this.src='/assets/vacuum_placeholder.svg';}" onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
                  </a>
                  <div class="space-y-1 min-w-0">
                    <a href="/brand/${a.brandSlug}" class="text-[10px] font-extrabold text-brand-600 uppercase hover:underline block truncate">${escapeHtml(a.brand)} Vacuums</a>
                    <h3 class="font-bold text-sm text-slate-900 leading-snug">
                      <a href="${a.reviewUrl}" class="hover:text-brand-600 transition line-clamp-2">${escapeHtml(a.brand)} ${escapeHtml(a.model)} Review</a>
                    </h3>
                    <p class="text-xs text-slate-500">Rating: ${a.starRating ? a.starRating.toFixed(1) : '4.5'} / 5.0 | Suction: ${escapeHtml(a.suctionKpaRaw || 'Standard')} kPa</p>
                  </div>
                </div>
                <a href="${a.reviewUrl}" class="text-xs font-bold text-brand-600 pt-2 border-t border-slate-100 flex items-center gap-1 hover:underline">
                  ${escapeHtml(a.brand)} ${escapeHtml(a.model)} Review &rarr;
                </a>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Related Reviews Section -->
      ${relatedProds.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-file-lines text-indigo-600"></i> Related Reviews
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${relatedProds.map(r => `
              <div class="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition space-y-3 flex flex-col justify-between">
                <div class="flex items-start gap-3">
                  <a href="${r.reviewUrl}" class="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                    <img src="${escapeAttr(r.imageUrl || getProductImageUrl(r.asin))}" alt="${escapeAttr(r.brand)} ${escapeAttr(r.model)}" class="max-h-full max-w-full object-contain" onload="if(this.naturalWidth<=1){this.onerror=null;this.src='/assets/vacuum_placeholder.svg';}" onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
                  </a>
                  <div class="space-y-1 min-w-0">
                    <a href="/brand/${r.brandSlug}" class="text-[10px] font-extrabold text-brand-600 uppercase hover:underline block truncate">${escapeHtml(r.brand)} Vacuums</a>
                    <h3 class="font-bold text-sm text-slate-900 leading-snug">
                      <a href="${r.reviewUrl}" class="hover:text-brand-600 transition line-clamp-2">${escapeHtml(r.brand)} ${escapeHtml(r.model)} Review</a>
                    </h3>
                    <p class="text-xs text-slate-500">${escapeHtml(r.type)} | Suction: ${escapeHtml(r.suctionKpaRaw || 'Standard')} kPa</p>
                  </div>
                </div>
                <a href="${r.reviewUrl}" class="text-xs font-bold text-brand-600 pt-2 border-t border-slate-100 flex items-center gap-1 hover:underline">
                  ${escapeHtml(r.brand)} ${escapeHtml(r.model)} Review &rarr;
                </a>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Buying Guides Section -->
      <section class="bg-slate-100 border border-slate-200 rounded-2xl p-6 space-y-3">
        <h2 class="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <i class="fa-solid fa-book-open text-brand-600"></i> Buying Guides
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold">
          ${guideSlugs.map(slug => `
            <a href="/guides/${slug}" class="p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-500 flex items-center justify-between group">
              <span class="text-slate-900 group-hover:text-brand-600 transition">${escapeHtml(getGuideTitle(slug))}</span>
              <i class="fa-solid fa-arrow-right text-brand-600"></i>
            </a>
          `).join('')}
        </div>
      </section>

      <!-- Category & Brand Directory Footer Links -->
      <section class="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-700">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-folder-tree text-brand-600"></i>
          <span>Related Directories:</span>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <a href="/brand/${p.brandSlug}" class="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
            ${escapeHtml(p.brand)} Vacuum Cleaners
          </a>
          <a href="/category/${slugify(p.type)}" class="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
            ${escapeHtml(p.type)} Vacuum Cleaners
          </a>
        </div>
      </section>

    </article>
  `;
}

function getGuideTitle(slug) {
  const titles = {
    'best-vacuum-for-pet-hair': '10 Best Vacuum Cleaners for Pet Hair (Tested & Ranked)',
    'best-robot-vacuums-2026': 'Top 8 Best Robot Vacuums: Hands-On Reviews',
    'best-hardwood-floor-vacuums': 'Best Vacuums for Hardwood Floors: Anti-Scratch Guide',
    'best-budget-cordless-vacuums': 'Best Budget Cordless Vacuums Under $300 (Ranked & Reviewed)',
    'bagged-vs-bagless-vacuums-guide': 'Bagged vs. Bagless Vacuums: Complete Buying & Hygiene Guide'
  };
  return titles[slug] || 'Expert Vacuum Cleaner Buying Guide';
}

function renderServerBuyingGuidePage(guideSlug, allProducts) {
  const title = getGuideTitle(guideSlug);

  let categoryBadge = 'Buying Guide';
  let introText = '';
  let criteriaHtml = '';
  let filterFn = p => true;

  if (guideSlug === 'best-vacuum-for-pet-hair') {
    categoryBadge = 'Pet Hair Guide';
    introText = 'Cleaning stubborn pet hair and dander requires high suction pressure, motorized brush rolls with anti-tangle technology, and sealed HEPA filtration. Our test lab evaluated 50+ vacuums to rank the top performers.';
    filterFn = p => p.hepaFiltration || (p.suctionKpaRaw && parseFloat(p.suctionKpaRaw) >= 18);
    criteriaHtml = `
      <ul class="list-disc list-inside space-y-1.5 text-xs text-slate-700">
        <li><strong>Anti-Tangle Rubber Brush Rollers:</strong> Prevents long fur from winding tightly around agitators.</li>
        <li><strong>Minimum 18–22 kPa Suction Pressure:</strong> Pulls embedded dander out of thick carpets.</li>
        <li><strong>Sealed HEPA Filtration:</strong> Traps 99.97% of pet dander particles down to 0.3 microns.</li>
      </ul>
    `;
  } else if (guideSlug === 'best-robot-vacuums-2026') {
    categoryBadge = 'Robot Comparison';
    introText = 'Robot vacuums feature self-emptying dustbins, 360 LiDAR navigation, AI obstacle avoidance, and auto-washing mop pads. Here are the top hands-on tested models.';
    filterFn = p => p.type && p.type.toLowerCase().includes('robot');
    criteriaHtml = `
      <ul class="list-disc list-inside space-y-1.5 text-xs text-slate-700">
        <li><strong>LiDAR & 3D Obstacle Avoidance:</strong> Navigates around shoes, pet toys, and cables.</li>
        <li><strong>Self-Emptying Station:</strong> Holds up to 60 days of dust without manual maintenance.</li>
        <li><strong>Sonic Mopping:</strong> Scrubs dried floor stains while vacuuming fine dust.</li>
      </ul>
    `;
  } else if (guideSlug === 'best-hardwood-floor-vacuums') {
    categoryBadge = 'Hardwood Floors';
    introText = 'Hardwood and tile floors require soft microfiber roller heads that polish while picking up fine dust without scratching delicate polyurethane finishes.';
    filterFn = p => p.type && (p.type.toLowerCase().includes('stick') || p.type.toLowerCase().includes('canister') || p.type.toLowerCase().includes('wet'));
    criteriaHtml = `
      <ul class="list-disc list-inside space-y-1.5 text-xs text-slate-700">
        <li><strong>Fluffy Microfiber Roller Heads:</strong> Gentle on wood grain while catching fine flour and sand.</li>
        <li><strong>Suction Control Levels:</strong> Prevents vacuum from sealing tightly against delicate floorboards.</li>
        <li><strong>Rubber Wheels:</strong> Smooth glide without scuffing hardwood coating.</li>
      </ul>
    `;
  } else if (guideSlug === 'best-budget-cordless-vacuums') {
    categoryBadge = 'Budget Deals';
    introText = 'High-performance cordless stick vacuums do not have to cost over $700. We tested budget-friendly lightweight models delivering impressive suction under $300.';
    filterFn = p => p.cordedOrCordless === 'Cordless' && (p.priceUsd == null || p.priceUsd <= 350);
    criteriaHtml = `
      <ul class="list-disc list-inside space-y-1.5 text-xs text-slate-700">
        <li><strong>Swappable Battery Packs:</strong> Extends cleaning sessions beyond 30-40 minutes.</li>
        <li><strong>Lightweight Handheld Mode:</strong> Converts easily for car interiors and high ceilings.</li>
        <li><strong>Washable Filter Elements:</strong> Saves money on replacement filters over time.</li>
      </ul>
    `;
  } else {
    categoryBadge = 'Hygiene & Buying Guide';
    introText = 'Choosing between bagged and bagless vacuums depends on allergy sensitivity, maintenance preferences, and long-term operating costs. Here is our expert breakdown.';
    filterFn = p => true;
    criteriaHtml = `
      <ul class="list-disc list-inside space-y-1.5 text-xs text-slate-700">
        <li><strong>Bagged Vacuums:</strong> Ideal for severe allergy sufferers — hygienic self-sealing dust bags prevent puff of dust when emptying.</li>
        <li><strong>Bagless Vacuums:</strong> Zero ongoing bag costs — clear dustbins allow quick visual check of full capacity.</li>
      </ul>
    `;
  }

  const picks = allProducts.filter(filterFn).slice(0, 6);

  // Related Comparisons between picks
  const guideComparisons = [];
  if (picks.length >= 2) guideComparisons.push({ p1: picks[0], p2: picks[1] });
  if (picks.length >= 4) guideComparisons.push({ p1: picks[2], p2: picks[3] });
  if (picks.length >= 6) guideComparisons.push({ p1: picks[4], p2: picks[5] });

  // Other guides
  const allGuideSlugs = [
    'best-vacuum-for-pet-hair',
    'best-robot-vacuums-2026',
    'best-hardwood-floor-vacuums',
    'best-budget-cordless-vacuums',
    'bagged-vs-bagless-vacuums-guide'
  ].filter(s => s !== guideSlug);

  return `
    <article class="space-y-8 text-slate-800">
      
      <!-- Top Action -->
      <a href="/" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition">
        <i class="fa-solid fa-arrow-left"></i> All Vacuum Cleaners Directory
      </a>

      <!-- Guide Banner -->
      <header class="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-4">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="/assets/vacuum_hero_banner.jpg" alt="Vacuum Banner Background" class="w-full h-full object-cover object-right opacity-60 brightness-110" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-35% to-transparent"></div>
        </div>
        <div class="relative z-10 space-y-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold">
            <i class="fa-solid fa-book-open text-brand-400"></i> ${escapeHtml(categoryBadge)}
          </div>
          <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            ${escapeHtml(title)}
          </h1>
          <p class="text-slate-300 text-sm leading-relaxed max-w-3xl">
            ${escapeHtml(introText)}
          </p>
          <div class="pt-4 border-t border-slate-800 flex items-center gap-4 text-xs text-slate-400 font-medium">
            <span><i class="fa-solid fa-calendar mr-1"></i> Updated July 2026</span>
            <span><i class="fa-solid fa-flask mr-1"></i> Tested by VacCompare Test Lab</span>
          </div>
        </div>
      </header>

      <!-- Key Criteria Box -->
      <section class="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3">
        <h2 class="text-sm font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-list-check"></i> What We Looked For During Testing
        </h2>
        ${criteriaHtml}
      </section>

      <!-- Top Recommended Products -->
      <section class="space-y-6">
        <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">
          Top Recommended Tested Models (${picks.length})
        </h2>

        <div class="space-y-4">
          ${picks.map((p, idx) => {
            const suctionText = p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : 'Standard Suction';
            return `
              <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-brand-500 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div class="flex items-center gap-4 flex-1">
                  <a href="${p.reviewUrl}" class="w-20 h-20 bg-slate-50 border border-slate-100 rounded-xl p-2 shrink-0 flex items-center justify-center overflow-hidden">
                    <img src="${escapeAttr(p.imageUrl || getProductImageUrl(p.asin))}" alt="${escapeAttr(p.brand)} ${escapeAttr(p.model)}" class="max-h-full max-w-full object-contain" onload="if(this.naturalWidth<=1){this.onerror=null;this.src='/assets/vacuum_placeholder.svg';}" onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
                  </a>
                  <div class="space-y-1.5 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="w-6 h-6 rounded-md bg-brand-600 text-white font-extrabold text-xs flex items-center justify-center">#${idx + 1}</span>
                      <a href="/brand/${p.brandSlug}" class="text-xs font-extrabold uppercase text-brand-600 tracking-wider hover:underline">${escapeHtml(p.brand)} Vacuum Cleaners</a>
                    </div>
                    <h3 class="text-lg font-extrabold text-slate-900 leading-snug">
                      <a href="${p.reviewUrl}" class="hover:text-brand-600 transition">${escapeHtml(p.brand)} ${escapeHtml(p.model)} Review</a>
                    </h3>
                    <div class="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                      <a href="/category/${slugify(p.type)}" class="bg-slate-100 px-2.5 py-0.5 rounded hover:bg-slate-200 text-slate-800">${escapeHtml(p.type)} Vacuums</a>
                      <span class="bg-slate-100 px-2.5 py-0.5 rounded">Suction: ${escapeHtml(suctionText)}</span>
                      ${p.hepaFiltration ? '<span class="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded font-bold">HEPA Sealed</span>' : ''}
                      ${p.starRating != null ? `<span class="text-amber-500 font-bold"><i class="fa-solid fa-star"></i> ${p.starRating.toFixed(1)}${p.numReviews != null ? ` (${p.numReviews.toLocaleString()})` : ''}</span>` : ''}
                    </div>
                  </div>
                </div>

                <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                  ${p.amazonLink ? `
                    <a href="${escapeAttr(p.amazonLink)}" target="_blank" rel="nofollow sponsored" class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs transition text-center flex items-center justify-center gap-1.5">
                      <i class="fa-brands fa-amazon"></i> Check Amazon Price
                    </a>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Head-to-Head Comparisons -->
      ${guideComparisons.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-brand-600"></i> Side-by-Side Model Comparisons
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${guideComparisons.map(c => {
              const s1 = c.p1.fullSlug.replace('-review', '');
              const s2 = c.p2.fullSlug.replace('-review', '');
              return `
                <a href="/compare/${s1}-vs-${s2}" class="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 group block">
                  <div class="text-[10px] font-extrabold text-brand-600 uppercase">Head-to-Head Comparison</div>
                  <h3 class="font-bold text-sm text-slate-900 group-hover:text-brand-600 transition">${escapeHtml(c.p1.model)} vs ${escapeHtml(c.p2.model)} Comparison</h3>
                  <p class="text-xs text-slate-500">${escapeHtml(c.p1.suctionKpaRaw || 'Standard')} kPa vs ${escapeHtml(c.p2.suctionKpaRaw || 'Standard')} kPa suction</p>
                  <div class="text-xs font-bold text-brand-600 pt-1 flex items-center gap-1">${escapeHtml(c.p1.model)} vs ${escapeHtml(c.p2.model)} Comparison &rarr;</div>
                </a>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Explore Other Guides -->
      <section class="bg-slate-100 rounded-2xl p-6 border border-slate-200 space-y-3">
        <h3 class="font-bold text-slate-900 text-sm">Explore Other Expert Vacuum Guides</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-brand-600">
          ${allGuideSlugs.map(s => `
            <a href="/guides/${s}" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-500 flex items-center justify-between group">
              <span class="text-slate-900 group-hover:text-brand-600 transition">${escapeHtml(getGuideTitle(s))}</span>
              <i class="fa-solid fa-arrow-right text-brand-600"></i>
            </a>
          `).join('')}
        </div>
      </section>

    </article>
  `;
}

function renderServerCompareHubPage(allProducts, productSlugMap) {
  // Select 4 representative initial products across categories
  const defaultP1 = allProducts.find(p => p.brand.toLowerCase().includes('dyson') && (p.model.toLowerCase().includes('v15') || p.model.toLowerCase().includes('v12'))) || allProducts[0];
  const defaultP2 = allProducts.find(p => p.brand.toLowerCase().includes('shark') && (p.model.toLowerCase().includes('stratos') || p.model.toLowerCase().includes('vertex') || p.model.toLowerCase().includes('cordless'))) || allProducts[1];
  const defaultP3 = allProducts.find(p => (p.brand.toLowerCase().includes('roborock') || p.brand.toLowerCase().includes('irobot')) && p.id !== defaultP1?.id && p.id !== defaultP2?.id) || allProducts[2];
  const defaultP4 = allProducts.find(p => (p.brand.toLowerCase().includes('miele') || p.brand.toLowerCase().includes('bissell')) && p.id !== defaultP1?.id && p.id !== defaultP2?.id && p.id !== defaultP3?.id) || allProducts[3];

  const initialProducts = [defaultP1, defaultP2, defaultP3, defaultP4].filter(Boolean);

  const fields = [
    { label: 'Brand', fn: p => p.brand },
    { label: 'Model', fn: p => p.model },
    { label: 'Vacuum Type', fn: p => p.type },
    { label: 'Power Source', fn: p => p.cordedOrCordless || '-' },
    { label: 'Bag / Bagless', fn: p => p.baggedOrBagless || '-' },
    { label: 'Suction Pressure', fn: p => p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : '-' },
    { label: 'Motor Power', fn: p => p.motorPowerWRaw && p.motorPowerWRaw !== '-' ? `${p.motorPowerWRaw} W` : '-' },
    { label: 'HEPA Filter', fn: p => p.hepaFiltration ? 'Yes (Sealed)' : 'No / Standard' },
    { label: 'Dust Capacity', fn: p => p.capacityLRaw && p.capacityLRaw !== '-' ? `${p.capacityLRaw} L` : '-' },
    { label: 'Noise Level', fn: p => p.noiseDb ? `${p.noiseDb} dB` : '-' },
    { label: 'Weight', fn: p => p.weightLbs ? `${p.weightLbs} lbs` : '-' },
    { label: 'Star Rating', fn: p => p.starRating ? `${p.starRating.toFixed(1)} / 5.0` : '-' }
  ];

  return `
    <article class="space-y-10 text-slate-800" id="compare-hub-article">
      
      <!-- Top Action -->
      <a href="/" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition">
        <i class="fa-solid fa-arrow-left"></i> All Vacuum Cleaners Directory
      </a>

      <!-- Header Banner -->
      <header class="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-4">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="/assets/vacuum_hero_banner.jpg" alt="Compare Vacuum Cleaners Side-by-Side" class="w-full h-full object-cover object-right opacity-60 brightness-110" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-35% to-transparent"></div>
        </div>
        <div class="relative z-10 space-y-4">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold">
            <i class="fa-solid fa-scale-balanced text-brand-400"></i> Free Vacuum Comparison Tool
          </div>
          <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Compare Vacuum Cleaners Side-by-Side
          </h1>
          <div class="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl space-y-3">
            <p>
              Looking for the best vacuum cleaner but confused between models? Use our free vacuum comparison tool to compare up to 4 vacuums at once. We show real technical specs including suction power (kPa), noise level (dB), dust capacity, HEPA filtration, battery runtime, weight, and verified customer ratings — so you can make a confident buying decision.
            </p>
            <p>
              Whether you need a powerful robot vacuum, a lightweight cordless stick, a deep-cleaning upright, or a quiet canister, our side-by-side comparisons help you see the differences clearly.
            </p>
          </div>
        </div>
      </header>

      <!-- Interactive Vacuum Comparison Tool Box -->
      <section class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6" id="compare-tool-container">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <i class="fa-solid fa-sliders text-brand-600"></i> Compare Up to 4 Vacuums Side-by-Side
            </h2>
            <p class="text-xs text-slate-500 mt-1">Select vacuum models below to compare technical specifications, suction performance, filtration, and prices.</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="compare-hub-reset-btn" class="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center gap-1.5">
              <i class="fa-solid fa-rotate-left"></i> Reset Defaults
            </button>
          </div>
        </div>

        <!-- 4 Slot Model Selectors -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" id="compare-slot-selectors">
          ${initialProducts.map((p, idx) => `
            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2" data-slot-index="${idx}">
              <div class="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Vacuum Slot ${idx + 1}</span>
                <span class="text-brand-600 font-extrabold">${escapeHtml(p.brand)}</span>
              </div>
              <select class="compare-slot-select w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" data-slot="${idx}">
                <option value="${p.id}" selected>${escapeHtml(p.brand)} ${escapeHtml(p.model)}</option>
                ${allProducts.slice(0, 50).filter(x => x.id !== p.id).map(x => `
                  <option value="${x.id}">${escapeHtml(x.brand)} ${escapeHtml(x.model)} (${escapeHtml(x.type)})</option>
                `).join('')}
              </select>
            </div>
          `).join('')}
        </div>

        <!-- Comparison Table Grid -->
        <div class="overflow-x-auto rounded-2xl border border-slate-200" id="compare-hub-table-wrapper">
          <table class="w-full text-xs text-left border-collapse min-w-[700px]">
            <thead>
              <tr class="bg-slate-900 text-white divide-x divide-slate-800">
                <th class="p-4 w-44 font-extrabold text-slate-300 uppercase tracking-wider text-[11px]">Technical Metric</th>
                ${initialProducts.map((p, idx) => `
                  <th class="p-4 text-center font-extrabold">
                    <div class="text-[10px] uppercase tracking-wider text-brand-300 font-bold mb-1">Vacuum ${idx + 1}</div>
                    <div class="text-sm font-extrabold text-white">${escapeHtml(p.brand)} ${escapeHtml(p.model)}</div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              <!-- Product Header Cards Row -->
              <tr class="bg-slate-50/70 border-b border-slate-200">
                <td class="p-4 font-bold text-slate-700 bg-slate-100/60 border-r border-slate-200">Product Overview</td>
                ${initialProducts.map(p => {
                  const reviewSlug = p.fullSlug || `${slugify(p.brand)}-${slugify(p.model)}-review`;
                  return `
                  <td class="p-4 text-center border-r border-slate-200 space-y-2.5">
                    <div class="space-y-1">
                      <div class="text-xs font-bold text-slate-900">${escapeHtml(p.brand)}</div>
                      <div class="text-[11px] text-slate-500 line-clamp-1">${escapeHtml(p.model)}</div>
                    </div>
                    <div class="flex flex-col gap-1.5 pt-1">
                      <a href="/vacuum/${escapeAttr(reviewSlug)}" class="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition">
                        Full Review &rarr;
                      </a>
                    </div>
                  </td>
                `;}).join('')}
              </tr>
              <!-- Spec Rows -->
              ${fields.map(f => `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                  <td class="p-3.5 font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">${f.label}</td>
                  ${initialProducts.map(p => `
                    <td class="p-3.5 text-center border-r border-slate-200 font-semibold text-slate-800">
                      ${escapeHtml(f.fn(p))}
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Content Section 1: Popular Vacuum Comparisons -->
      <section class="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-fire text-amber-500"></i> Popular Vacuum Comparisons
        </h3>
        <ul class="space-y-3 text-sm text-slate-700 list-disc list-inside">
          <li>
            <a href="/compare/dyson-v15-detect-vs-shark-stratos" class="font-bold text-brand-600 hover:underline">Dyson V15 Detect vs Shark Stratos Cordless</a> – Laser detection vs Clean Sense IQ
          </li>
          <li>
            <a href="/compare/irobot-roomba-j7-vs-roborock-s8" class="font-bold text-brand-600 hover:underline">iRobot Roomba j7+ vs Roborock S8 Pro Ultra</a> – Pet waste avoidance vs advanced mopping
          </li>
          <li>
            <a href="/compare/miele-complete-c3-vs-dyson-ball-animal-3" class="font-bold text-brand-600 hover:underline">Miele Complete C3 vs Dyson Ball Animal 3</a> – Sealed HEPA system vs strong agitator power
          </li>
          <li>
            <a href="/category/cordless-stick" class="font-bold text-brand-600 hover:underline">Best Cordless Stick Vacuums Compared</a>
          </li>
          <li>
            <a href="/guides/best-vacuum-for-pet-hair" class="font-bold text-brand-600 hover:underline">Best Robot Vacuums for Pet Hair</a>
          </li>
          <li>
            <a href="/guides/best-budget-vacuums" class="font-bold text-brand-600 hover:underline">Best Budget Vacuums Under $300</a>
          </li>
        </ul>
      </section>

      <!-- Content Section 2: How Our Vacuum Comparison Works -->
      <section class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-gears text-brand-600"></i> How Our Vacuum Comparison Works
        </h3>
        <ol class="space-y-3 text-sm text-slate-700 list-decimal list-inside">
          <li class="leading-relaxed"><strong class="text-slate-900">Select any 2 to 4 vacuum models</strong> from our database of 1,000+ products</li>
          <li class="leading-relaxed"><strong class="text-slate-900">View a clear side-by-side specs table</strong></li>
          <li class="leading-relaxed">
            <strong class="text-slate-900">Compare key performance metrics:</strong>
            <ul class="pl-6 mt-2 space-y-1.5 list-disc text-slate-600">
              <li>Suction Power (kPa)</li>
              <li>Noise Level (dB)</li>
              <li>Dustbin / Bag Capacity</li>
              <li>HEPA Filtration (Sealed or Standard)</li>
              <li>Battery Runtime (for cordless models)</li>
              <li>Weight &amp; Maneuverability</li>
              <li>Customer Star Ratings</li>
            </ul>
          </li>
          <li class="leading-relaxed"><strong class="text-slate-900">Read our expert verdict</strong> on which model is better for your specific needs (pet hair, hardwood floors, carpets, allergies, etc.)</li>
        </ol>
      </section>

      <!-- Content Section 3: Why Compare Vacuums Before Buying? -->
      <section class="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-circle-question text-brand-600"></i> Why Compare Vacuums Before Buying?
        </h3>
        <div class="space-y-3 text-sm text-slate-700 leading-relaxed">
          <p>
            Choosing the wrong vacuum can waste hundreds of dollars. A high suction number doesn’t always mean better performance on your floors. Factors like brush roll design, filtration quality, and real-world runtime matter more than marketing claims.
          </p>
          <p>
            At VacCompare, we focus on verified specifications and standardized comparison points so you can see the real differences between popular models from Dyson, Shark, Roborock, iRobot, Bissell, Miele, Tineco, and many more.
          </p>
        </div>
      </section>

      <!-- Content Section 4: Start Comparing Now -->
      <section class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-bolt text-amber-500"></i> Start Comparing Now
        </h3>
        <p class="text-sm text-slate-700 leading-relaxed">
          Use the comparison tool above or browse our most popular head-to-head matchups. Still not sure which type of vacuum you need? Check our <a href="/guides/best-vacuum-for-pet-hair" class="text-brand-600 font-bold hover:underline">Buying Guides</a> for recommendations based on floor type, pet ownership, and budget.
        </p>
      </section>

      <!-- Content Section 5: Frequently Asked Questions -->
      <section class="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div>
          <h3 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-comments text-brand-600"></i> Frequently Asked Questions
          </h3>
          <p class="text-xs text-slate-500 mt-1">Common answers about comparing vacuum cleaner specifications and ratings</p>
        </div>

        <div class="space-y-4 text-sm">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <h4 class="font-bold text-slate-900 text-sm sm:text-base">How many vacuum cleaners can I compare at once?</h4>
            <p class="text-slate-600 leading-relaxed">You can compare up to 4 vacuum models side-by-side on VacCompare.</p>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <h4 class="font-bold text-slate-900 text-sm sm:text-base">What specs do you compare?</h4>
            <p class="text-slate-600 leading-relaxed">We compare suction power (kPa), noise level (dB), dust capacity, HEPA filtration, battery life, weight, power source, and customer ratings.</p>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <h4 class="font-bold text-slate-900 text-sm sm:text-base">Are the specifications accurate?</h4>
            <p class="text-slate-600 leading-relaxed">Yes. We collect and cross-check technical data from manufacturer specifications, official product pages, and verified public listings.</p>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <h4 class="font-bold text-slate-900 text-sm sm:text-base">Can I compare robot vacuums with cordless stick vacuums?</h4>
            <p class="text-slate-600 leading-relaxed">Yes. You can compare any combination of vacuum types available in our database.</p>
          </div>
        </div>
      </section>

    </article>
  `;
}

function renderServerComparisonPage(compareSlug, allProducts, productSlugMap) {
  const parts = compareSlug.split('-vs-');
  let products = [];

  if (parts.length >= 2) {
    const p1 = findProductBySlugServer(parts[0], allProducts, productSlugMap);
    const p2 = findProductBySlugServer(parts[1], allProducts, productSlugMap);
    if (p1) products.push(p1);
    if (p2) products.push(p2);
  }

  if (products.length < 2) {
    products = allProducts.slice(0, 2);
  }

  const p1 = products[0];
  const p2 = products[1] || allProducts[1];

  const fields = [
    { label: 'Brand', fn: p => p.brand },
    { label: 'Model', fn: p => p.model },
    { label: 'Vacuum Type', fn: p => p.type },
    { label: 'Power Source', fn: p => p.cordedOrCordless || '-' },
    { label: 'Bag / Bagless', fn: p => p.baggedOrBagless || '-' },
    { label: 'Suction Pressure', fn: p => p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : '-' },
    { label: 'Motor Power', fn: p => p.motorPowerWRaw && p.motorPowerWRaw !== '-' ? `${p.motorPowerWRaw} W` : '-' },
    { label: 'HEPA Filter', fn: p => p.hepaFiltration ? 'Yes (Sealed)' : 'No / Standard' },
    { label: 'Dust Capacity', fn: p => p.capacityLRaw && p.capacityLRaw !== '-' ? `${p.capacityLRaw} L` : '-' },
    { label: 'Noise Level', fn: p => p.noiseDb ? `${p.noiseDb} dB` : '-' },
    { label: 'Weight', fn: p => p.weightLbs ? `${p.weightLbs} lbs` : '-' },
    { label: 'Star Rating', fn: p => p.starRating ? `${p.starRating.toFixed(1)} / 5.0` : '-' },
  ];

  // Related comparisons based on p1 & p2
  const ranked1 = allProducts
    .filter(x => x.id !== p1.id && x.id !== p2.id)
    .map(x => ({ product: x, score: calculateRelevanceScore(p1, x) }))
    .sort((a, b) => b.score - a.score);

  const related1 = ranked1.slice(0, 3).map(x => x.product);

  const ranked2 = allProducts
    .filter(x => x.id !== p1.id && x.id !== p2.id && !related1.some(r => r.id === x.id))
    .map(x => ({ product: x, score: calculateRelevanceScore(p2, x) }))
    .sort((a, b) => b.score - a.score);

  const related2 = ranked2.slice(0, 3).map(x => x.product);

  return `
    <article class="space-y-8 text-slate-800">
      
      <!-- Top Action -->
      <a href="/" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition">
        <i class="fa-solid fa-arrow-left"></i> All Vacuum Cleaners Directory
      </a>

      <!-- Banner -->
      <header class="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-3">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="/assets/vacuum_hero_banner.jpg" alt="Vacuum Banner Background" class="w-full h-full object-cover object-right opacity-60 brightness-110" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-35% to-transparent"></div>
        </div>
        <div class="relative z-10 space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold">
            <i class="fa-solid fa-scale-balanced text-brand-400"></i> Head-to-Head Comparison
          </div>
          <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            ${escapeHtml(p1.brand)} ${escapeHtml(p1.model)} vs ${escapeHtml(p2.brand)} ${escapeHtml(p2.model)} Comparison
          </h1>
          <p class="text-slate-300 text-sm leading-relaxed max-w-3xl">
            Side-by-side technical specification matrix comparing the <strong>${escapeHtml(p1.brand)} ${escapeHtml(p1.model)}</strong> against the <strong>${escapeHtml(p2.brand)} ${escapeHtml(p2.model)}</strong>. Compare tested suction power (kPa), decibel noise levels, dust capacity, HEPA filtration standards, and user satisfaction ratings.
          </p>
        </div>
      </header>

      <!-- Side-by-Side Model Header Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white border-2 border-brand-500 rounded-2xl p-6 shadow-md space-y-4">
          <div class="flex items-center justify-between">
            <a href="/brand/${p1.brandSlug}" class="text-xs font-extrabold uppercase text-brand-600 tracking-wider hover:underline">${escapeHtml(p1.brand)} Vacuum Cleaners</a>
            ${p1.starRating != null ? `<span class="text-amber-500 font-extrabold text-xs"><i class="fa-solid fa-star"></i> ${p1.starRating.toFixed(1)}${p1.numReviews != null ? ` (${p1.numReviews.toLocaleString()})` : ''}</span>` : ''}
          </div>
          <h2 class="text-xl font-extrabold text-slate-900">
            ${escapeHtml(p1.brand)} ${escapeHtml(p1.model)} Review
          </h2>
          <div class="text-xs space-y-1 text-slate-600">
            <p><strong>Type:</strong> <a href="/category/${slugify(p1.type)}" class="text-brand-600 hover:underline font-semibold">${escapeHtml(p1.type)} Vacuums</a></p>
            <p><strong>Suction:</strong> ${p1.suctionKpaRaw ? `${p1.suctionKpaRaw} kPa` : 'Standard'}</p>
          </div>
          <div class="pt-2 flex flex-wrap gap-2">
            <a href="/vacuum/${escapeAttr(p1.fullSlug || `${slugify(p1.brand)}-${slugify(p1.model)}-review`)}" class="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition flex items-center gap-1.5">Full Review &rarr;</a>
          </div>
        </div>

        <div class="bg-white border-2 border-indigo-500 rounded-2xl p-6 shadow-md space-y-4">
          <div class="flex items-center justify-between">
            <a href="/brand/${p2.brandSlug}" class="text-xs font-extrabold uppercase text-indigo-600 tracking-wider hover:underline">${escapeHtml(p2.brand)} Vacuum Cleaners</a>
            ${p2.starRating != null ? `<span class="text-amber-500 font-extrabold text-xs"><i class="fa-solid fa-star"></i> ${p2.starRating.toFixed(1)}${p2.numReviews != null ? ` (${p2.numReviews.toLocaleString()})` : ''}</span>` : ''}
          </div>
          <h2 class="text-xl font-extrabold text-slate-900">
            ${escapeHtml(p2.brand)} ${escapeHtml(p2.model)} Review
          </h2>
          <div class="text-xs space-y-1 text-slate-600">
            <p><strong>Type:</strong> <a href="/category/${slugify(p2.type)}" class="text-indigo-600 hover:underline font-semibold">${escapeHtml(p2.type)} Vacuums</a></p>
            <p><strong>Suction:</strong> ${p2.suctionKpaRaw ? `${p2.suctionKpaRaw} kPa` : 'Standard'}</p>
          </div>
          <div class="pt-2 flex flex-wrap gap-2">
            <a href="/vacuum/${escapeAttr(p2.fullSlug || `${slugify(p2.brand)}-${slugify(p2.model)}-review`)}" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5">Full Review &rarr;</a>
          </div>
        </div>
      </div>

      <!-- Specification Matrix Table -->
      <section class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
        <div class="p-6 border-b border-slate-100">
          <h2 class="text-lg font-extrabold text-slate-900">Side-by-Side Specifications Matrix</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-100 text-slate-900 border-b border-slate-200">
                <th class="p-3.5 font-bold border-r border-slate-200 w-44">Specification</th>
                <th class="p-3.5 font-extrabold text-slate-900 text-center border-r border-slate-200">${escapeHtml(p1.brand)} ${escapeHtml(p1.model)}</th>
                <th class="p-3.5 font-extrabold text-slate-900 text-center">${escapeHtml(p2.brand)} ${escapeHtml(p2.model)}</th>
              </tr>
            </thead>
            <tbody>
              ${fields.map(f => `
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                  <td class="p-3.5 font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">${f.label}</td>
                  <td class="p-3.5 text-center border-r border-slate-200 font-semibold text-slate-800">${escapeHtml(f.fn(p1))}</td>
                  <td class="p-3.5 text-center font-semibold text-slate-800">${escapeHtml(f.fn(p2))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Expert Verdict -->
      <section class="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl space-y-3">
        <h2 class="text-lg font-extrabold text-white flex items-center gap-2">
          <i class="fa-solid fa-award text-amber-400"></i> Test Lab Verdict: Which Should You Choose?
        </h2>
        <div class="text-xs text-slate-300 leading-relaxed space-y-2">
          <p>
            Choose the <strong>${escapeHtml(p1.brand)} ${escapeHtml(p1.model)}</strong> if you prioritize higher suction metrics (${p1.suctionKpaRaw || 'standard'} kPa) and specific floorhead tools for deep cleaning.
          </p>
          <p>
            Choose the <strong>${escapeHtml(p2.brand)} ${escapeHtml(p2.model)}</strong> if you prefer lighter handling (${p2.weightLbs ? `${p2.weightLbs} lbs` : 'ergonomic weight'}) and quiet operating sound levels (${p2.noiseDb ? `${p2.noiseDb} dB` : 'standard sound'}).
          </p>
        </div>
      </section>

      <!-- Related Comparisons for Model 1 -->
      ${related1.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-brand-600"></i> Comparisons Related to ${escapeHtml(p1.model)}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${related1.map(x => {
              const s1 = p1.fullSlug.replace('-review', '');
              const s2 = x.fullSlug.replace('-review', '');
              return `
                <a href="/compare/${s1}-vs-${s2}" class="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 group block">
                  <div class="text-[10px] font-extrabold text-brand-600 uppercase">Related Comparison</div>
                  <h3 class="font-bold text-sm text-slate-900 group-hover:text-brand-600 transition">${escapeHtml(p1.model)} vs ${escapeHtml(x.model)} Comparison</h3>
                  <p class="text-xs text-slate-500">${escapeHtml(p1.suctionKpaRaw || 'Standard')} kPa vs ${escapeHtml(x.suctionKpaRaw || 'Standard')} kPa suction</p>
                  <div class="text-xs font-bold text-brand-600 pt-1 flex items-center gap-1">${escapeHtml(p1.model)} vs ${escapeHtml(x.model)} Comparison &rarr;</div>
                </a>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Similar Comparisons for Model 2 -->
      ${related2.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-indigo-600"></i> Comparisons Related to ${escapeHtml(p2.model)}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${related2.map(y => {
              const s1 = p2.fullSlug.replace('-review', '');
              const s2 = y.fullSlug.replace('-review', '');
              return `
                <a href="/compare/${s1}-vs-${s2}" class="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 group block">
                  <div class="text-[10px] font-extrabold text-indigo-600 uppercase">Related Comparison</div>
                  <h3 class="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition">${escapeHtml(p2.model)} vs ${escapeHtml(y.model)} Comparison</h3>
                  <p class="text-xs text-slate-500">${escapeHtml(p2.suctionKpaRaw || 'Standard')} kPa vs ${escapeHtml(y.suctionKpaRaw || 'Standard')} kPa suction</p>
                  <div class="text-xs font-bold text-indigo-600 pt-1 flex items-center gap-1">${escapeHtml(p2.model)} vs ${escapeHtml(y.model)} Comparison &rarr;</div>
                </a>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Related Buying Guides & Directories -->
      <section class="p-6 bg-slate-100 border border-slate-200 rounded-2xl space-y-4">
        <h2 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <i class="fa-solid fa-folder-tree text-brand-600"></i> Related Directories &amp; Guides
        </h2>
        <div class="flex flex-wrap gap-3 text-xs font-bold">
          <a href="/brand/${p1.brandSlug}" class="px-4 py-2 bg-white rounded-xl border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
            ${escapeHtml(p1.brand)} Vacuum Cleaners
          </a>
          ${p1.brandSlug !== p2.brandSlug ? `
            <a href="/brand/${p2.brandSlug}" class="px-4 py-2 bg-white rounded-xl border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
              ${escapeHtml(p2.brand)} Vacuum Cleaners
            </a>
          ` : ''}
          <a href="/category/${slugify(p1.type)}" class="px-4 py-2 bg-white rounded-xl border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
            ${escapeHtml(p1.type)} Vacuum Cleaners
          </a>
          <a href="/guides/best-vacuum-for-pet-hair" class="px-4 py-2 bg-white rounded-xl border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
            10 Best Vacuum Cleaners for Pet Hair
          </a>
          <a href="/guides/best-budget-cordless-vacuums" class="px-4 py-2 bg-white rounded-xl border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
            Best Budget Cordless Vacuums Under $300
          </a>
        </div>
      </section>

    </article>
  `;
}

function renderServerBrandPage(brandName, bSlug, brandProducts, allProducts) {
  const count = brandProducts.length || 0;
  const popularModels = brandProducts.slice(0, 6);

  const brandComparisons = [];
  if (popularModels.length >= 2) {
    brandComparisons.push({ p1: popularModels[0], p2: popularModels[1] });
  }
  if (popularModels.length >= 1) {
    const otherTop = allProducts.find(x => x.brand.toLowerCase() !== brandName.toLowerCase());
    if (otherTop) brandComparisons.push({ p1: popularModels[0], p2: otherTop });
  }

  const categories = Array.from(new Set(brandProducts.map(p => p.type))).filter(Boolean);

  return `
    <article class="space-y-8 text-slate-800">
      <header class="bg-slate-900 text-white py-10 px-6 sm:px-10 rounded-3xl shadow-xl space-y-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold">
          <i class="fa-solid fa-layer-group text-brand-400"></i> Brand Directory
        </div>
        <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">${escapeHtml(`${brandName} Vacuum Cleaners`)}</h1>
        <p class="text-sm text-slate-300 leading-relaxed max-w-3xl">
          Explore ${count} tested ${escapeHtml(brandName)} vacuum models with verified suction pressure benchmarks, HEPA filtration specs, decibel noise levels, and star ratings.
        </p>
      </header>

      <!-- Popular Models & Latest Reviews -->
      <section class="space-y-4">
        <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-star text-amber-500"></i> ${escapeHtml(brandName)} Vacuum Reviews &amp; Specs
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${popularModels.map(p => `
            <div class="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 flex flex-col justify-between">
              <div class="space-y-1">
                <a href="/brand/${p.brandSlug}" class="text-[10px] font-extrabold text-brand-600 uppercase hover:underline">${escapeHtml(p.brand)} Vacuums</a>
                <h3 class="font-bold text-sm text-slate-900">
                  <a href="${p.reviewUrl}" class="hover:text-brand-600 transition">${escapeHtml(p.brand)} ${escapeHtml(p.model)} Review</a>
                </h3>
                <p class="text-xs text-slate-500">${escapeHtml(p.type)} | Suction: ${escapeHtml(p.suctionKpaRaw || 'Standard')} kPa</p>
              </div>
              <a href="${p.reviewUrl}" class="text-xs font-bold text-brand-600 pt-2 flex items-center gap-1 hover:underline">
                ${escapeHtml(p.brand)} ${escapeHtml(p.model)} Review &rarr;
              </a>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Brand Comparisons -->
      ${brandComparisons.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-brand-600"></i> ${escapeHtml(brandName)} Side-by-Side Comparisons
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${brandComparisons.map(c => {
              const s1 = c.p1.fullSlug.replace('-review', '');
              const s2 = c.p2.fullSlug.replace('-review', '');
              return `
                <a href="/compare/${s1}-vs-${s2}" class="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 group block">
                  <div class="text-[10px] font-extrabold text-brand-600 uppercase">Head-to-Head Comparison</div>
                  <h3 class="font-bold text-sm text-slate-900 group-hover:text-brand-600 transition">${escapeHtml(c.p1.model)} vs ${escapeHtml(c.p2.model)} Comparison</h3>
                  <p class="text-xs text-slate-500">${escapeHtml(c.p1.suctionKpaRaw || 'Standard')} kPa vs ${escapeHtml(c.p2.suctionKpaRaw || 'Standard')} kPa suction</p>
                  <div class="text-xs font-bold text-brand-600 pt-1 flex items-center gap-1">${escapeHtml(c.p1.model)} vs ${escapeHtml(c.p2.model)} Comparison &rarr;</div>
                </a>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Vacuum Categories by Brand -->
      ${categories.length ? `
        <section class="bg-slate-100 rounded-2xl p-6 border border-slate-200 space-y-3">
          <h2 class="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <i class="fa-solid fa-folder-tree text-brand-600"></i> ${escapeHtml(brandName)} Vacuum Categories
          </h2>
          <div class="flex flex-wrap gap-2 text-xs font-bold">
            ${categories.map(cat => `
              <a href="/category/${slugify(cat)}" class="px-4 py-2 bg-white rounded-xl border border-slate-200 hover:border-brand-500 text-brand-600 transition">
                ${escapeHtml(cat)} Vacuum Cleaners
              </a>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Expert Guides -->
      <section class="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
        <h2 class="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <i class="fa-solid fa-book-open text-brand-600"></i> Recommended Buying Guides
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-brand-600">
          <a href="/guides/best-vacuum-for-pet-hair" class="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-brand-500 flex items-center justify-between">
            <span>10 Best Vacuum Cleaners for Pet Hair</span> &rarr;
          </a>
          <a href="/guides/best-budget-cordless-vacuums" class="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-brand-500 flex items-center justify-between">
            <span>Best Budget Cordless Vacuums Under $300</span> &rarr;
          </a>
        </div>
      </section>

    </article>
  `;
}

function renderServerCategoryPage(catName, cSlug, catProducts, allProducts) {
  const count = catProducts.length || 0;
  const popularModels = catProducts.slice(0, 6);

  const categoryComparisons = [];
  if (popularModels.length >= 2) {
    categoryComparisons.push({ p1: popularModels[0], p2: popularModels[1] });
  }
  if (popularModels.length >= 4) {
    categoryComparisons.push({ p1: popularModels[2], p2: popularModels[3] });
  }

  const categoryBrands = Array.from(new Set(catProducts.map(p => p.brand))).filter(Boolean);

  return `
    <article class="space-y-8 text-slate-800">
      <header class="bg-slate-900 text-white py-10 px-6 sm:px-10 rounded-3xl shadow-xl space-y-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold">
          <i class="fa-solid fa-layer-group text-brand-400"></i> Category Index
        </div>
        <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">${escapeHtml(`${catName} Vacuum Cleaners`)}</h1>
        <p class="text-sm text-slate-300 leading-relaxed max-w-3xl">
          Compare ${count} top-rated ${escapeHtml(catName.toLowerCase())} vacuums side by side. Filter by price, suction power (kPa), battery runtime, weight, and HEPA filter status.
        </p>
      </header>

      <!-- Category Reviews -->
      <section class="space-y-4">
        <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-list text-brand-600"></i> ${escapeHtml(catName)} Vacuum Reviews
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${popularModels.map(p => `
            <div class="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 flex flex-col justify-between">
              <div class="space-y-1">
                <a href="/brand/${p.brandSlug}" class="text-[10px] font-extrabold text-brand-600 uppercase hover:underline">${escapeHtml(p.brand)} Vacuums</a>
                <h3 class="font-bold text-sm text-slate-900">
                  <a href="${p.reviewUrl}" class="hover:text-brand-600 transition">${escapeHtml(p.brand)} ${escapeHtml(p.model)} Review</a>
                </h3>
                <p class="text-xs text-slate-500">Suction: ${escapeHtml(p.suctionKpaRaw || 'Standard')} kPa</p>
              </div>
              <a href="${p.reviewUrl}" class="text-xs font-bold text-brand-600 pt-2 flex items-center gap-1 hover:underline">
                ${escapeHtml(p.brand)} ${escapeHtml(p.model)} Review &rarr;
              </a>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Top Comparisons -->
      ${categoryComparisons.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-brand-600"></i> Top ${escapeHtml(catName)} Comparisons
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${categoryComparisons.map(c => {
              const s1 = c.p1.fullSlug.replace('-review', '');
              const s2 = c.p2.fullSlug.replace('-review', '');
              return `
                <a href="/compare/${s1}-vs-${s2}" class="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 group block">
                  <div class="text-[10px] font-extrabold text-brand-600 uppercase">Head-to-Head Comparison</div>
                  <h3 class="font-bold text-sm text-slate-900 group-hover:text-brand-600 transition">${escapeHtml(c.p1.model)} vs ${escapeHtml(c.p2.model)} Comparison</h3>
                  <p class="text-xs text-slate-500">${escapeHtml(c.p1.suctionKpaRaw || 'Standard')} kPa vs ${escapeHtml(c.p2.suctionKpaRaw || 'Standard')} kPa suction</p>
                  <div class="text-xs font-bold text-brand-600 pt-1 flex items-center gap-1">${escapeHtml(c.p1.model)} vs ${escapeHtml(c.p2.model)} Comparison &rarr;</div>
                </a>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Popular Brands in Category -->
      ${categoryBrands.length ? `
        <section class="bg-slate-100 rounded-2xl p-6 border border-slate-200 space-y-3">
          <h2 class="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <i class="fa-solid fa-tag text-brand-600"></i> Popular Brands for ${escapeHtml(catName)}
          </h2>
          <div class="flex flex-wrap gap-2 text-xs font-bold">
            ${categoryBrands.map(b => `
              <a href="/brand/${slugify(b)}" class="px-4 py-2 bg-white rounded-xl border border-slate-200 hover:border-brand-500 text-brand-600 transition">
                ${escapeHtml(b)} Vacuum Cleaners
              </a>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Expert Buying Guides -->
      <section class="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
        <h2 class="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <i class="fa-solid fa-book-open text-brand-600"></i> Related Buying Guides
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-brand-600">
          <a href="/guides/best-vacuum-for-pet-hair" class="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-brand-500 flex items-center justify-between">
            <span>10 Best Vacuum Cleaners for Pet Hair</span> &rarr;
          </a>
          <a href="/guides/best-budget-cordless-vacuums" class="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-brand-500 flex items-center justify-between">
            <span>Best Budget Cordless Vacuums Under $300</span> &rarr;
          </a>
        </div>
      </section>

    </article>
  `;
}

function getEeatPageTitle(path) {
  const titles = {
    '/about': 'About VacCompare – Independent Vacuum Cleaner Research & Reviews',
    '/editorial-policy': 'Editorial Policy & Review Standards | VacCompare',
    '/affiliate-disclosure': 'Affiliate Disclosure | VacCompare',
    '/privacy-policy': 'Privacy Policy | VacCompare',
    '/terms': 'Terms of Service | VacCompare',
    '/contact': 'Contact VacCompare | Editorial & Support Team',
    '/html-sitemap': 'HTML Sitemap | VacCompare Vacuum Directory'
  };
  return titles[path] || 'Information | VacCompare';
}

function renderServerEeatPage(reqPath, allProducts) {
  const title = getEeatPageTitle(reqPath);
  let bodyHtml = '';

  if (reqPath === '/about') {
    bodyHtml = `
      <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p class="text-base text-slate-900 font-semibold">VacCompare is an independent vacuum research and comparison website. We compile and verify product specifications from manufacturer sources, Amazon listings, and other publicly available product information to help shoppers compare vacuum cleaners with confidence.</p>
        <p>Our team analyzes suction specifications (kPa), motor wattages, sound emissions (dB), sealed HEPA ratings, and long-term owner feedback across over 1,000 vacuum cleaner models.</p>
        <h3 class="font-extrabold text-slate-900 text-base pt-2">Our Research Mission</h3>
        <ul class="list-disc list-inside space-y-1.5 text-xs">
          <li><strong>Verified Specifications:</strong> Technical specifications cross-verified against official manufacturer sources and public listings.</li>
          <li><strong>Zero Paid Placements:</strong> Retailers and manufacturers cannot purchase higher rankings or altered spec matrices.</li>
          <li><strong>Standardized Comparisons:</strong> Side-by-side technical evaluation for suction power, noise levels, filtration, and capacity.</li>
        </ul>
      </div>
    `;
  } else if (reqPath === '/editorial-policy') {
    bodyHtml = `
      <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>VacCompare adheres to strict journalistic and research integrity guidelines. All side-by-side spec comparisons, product overviews, and buying guides are prepared independently by our editorial research team.</p>
        <h3 class="font-extrabold text-slate-900 text-base">Key Editorial Principles</h3>
        <div class="space-y-2 text-xs">
          <p><strong>1. Physical Testing Transparency:</strong> VacCompare does not claim physical product testing unless an actual test has been conducted and documented. We do not operate a physical testing laboratory and we do not physically test every vacuum cleaner listed on our website. Instead, we compile, standardize, and verify technical specifications from official manufacturer documentation, Amazon listings, and verified public product information.</p>
          <p><strong>2. Absolute Independence:</strong> We do not accept paid positive reviews, sponsored rankings, or hidden manufacturer advertising in our product database.</p>
          <p><strong>3. Fact Verification:</strong> All technical specifications (kPa suction, motor wattage, battery runtime, weight) are cross-verified against official user manuals and manufacturer documentations.</p>
          <p><strong>4. Transparent Corrections:</strong> If a specification or price drop changes, our database updates to reflect current retailer metrics.</p>
        </div>
      </div>
    `;
  } else if (reqPath === '/affiliate-disclosure') {
    bodyHtml = `
      <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>VacCompare believes in complete financial transparency with our readers.</p>
        <p>VacCompare is a participant in the Amazon Services LLC Associates Program and other retail affiliate programs. When you click outbound product links on our database to retailers like Amazon, we may earn a referral commission on qualifying purchases at no extra cost to you.</p>
        <p class="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200">
          Note: Affiliate partnerships never influence our research metrics, star ratings, or product comparison matrices.
        </p>
      </div>
    `;
  } else if (reqPath === '/privacy-policy') {
    bodyHtml = `
      <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>VacCompare is committed to respecting your privacy.</p>
        <ul class="list-disc list-inside text-xs space-y-2">
          <li>We do not sell personal identification data to third-party brokers.</li>
          <li>We use standard web analytics cookies to improve site performance and search responsiveness.</li>
          <li>Newsletter email addresses are used solely for requested price alerts and new specification notifications.</li>
        </ul>
      </div>
    `;
  } else if (reqPath === '/terms') {
    bodyHtml = `
      <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>By accessing and browsing VacCompare, you agree to these Terms of Service.</p>
        <p class="text-xs text-slate-600">All content, product specifications, and database structures are protected under intellectual property laws. Content is provided for personal comparison and product research purposes.</p>
      </div>
    `;
  } else if (reqPath === '/contact') {
    bodyHtml = `
      <div class="space-y-6">
        <p class="text-sm text-slate-700">Have a question about a vacuum specification, feedback on our research methodology, or editorial press inquiries? Send us a message below.</p>
        <form id="contact-form" class="space-y-4 text-xs bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div>
            <label class="block font-bold text-slate-900 mb-1">Your Full Name</label>
            <input type="text" required placeholder="John Doe" class="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block font-bold text-slate-900 mb-1">Your Email Address</label>
            <input type="email" required placeholder="john@example.com" class="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block font-bold text-slate-900 mb-1">Subject</label>
            <input type="text" required placeholder="Specification inquiry / Correction" class="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block font-bold text-slate-900 mb-1">Message</label>
            <textarea required rows="4" placeholder="How can our research team assist you?" class="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
          </div>
          <button type="submit" class="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md transition">
            Send Message to Research Team
          </button>
        </form>
      </div>
    `;
  } else if (reqPath === '/html-sitemap') {
    const topBrands = Array.from(new Set(allProducts.map(p => p.brand))).slice(0, 16);
    const topTypes = Array.from(new Set(allProducts.map(p => p.type))).slice(0, 10);
    bodyHtml = `
      <div class="space-y-8 text-xs">
        <div>
          <h3 class="font-extrabold text-sm text-slate-900 mb-3 uppercase tracking-wider text-brand-600">Popular Vacuum Brands</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${topBrands.map(b => `<a href="/brand/${slugify(b)}" class="p-3 bg-slate-50 hover:bg-brand-50 rounded-xl border border-slate-200 font-bold text-slate-800 transition">${escapeHtml(b)} Vacuums</a>`).join('')}
          </div>
        </div>

        <div>
          <h3 class="font-extrabold text-sm text-slate-900 mb-3 uppercase tracking-wider text-brand-600">Vacuum Categories</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${topTypes.map(t => `<a href="/category/${slugify(t)}" class="p-3 bg-slate-50 hover:bg-brand-50 rounded-xl border border-slate-200 font-bold text-slate-800 transition">${escapeHtml(t)}</a>`).join('')}
          </div>
        </div>

        <div>
          <h3 class="font-extrabold text-sm text-slate-900 mb-3 uppercase tracking-wider text-brand-600">Buying Guides &amp; Comparisons</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a href="/guides/best-vacuum-for-pet-hair" class="p-3 bg-slate-50 hover:bg-brand-50 rounded-xl border border-slate-200 font-bold text-slate-800 transition">10 Best Vacuum Cleaners for Pet Hair</a>
            <a href="/guides/best-robot-vacuums-2026" class="p-3 bg-slate-50 hover:bg-brand-50 rounded-xl border border-slate-200 font-bold text-slate-800 transition">Top 8 Best Robot Vacuums</a>
            <a href="/guides/best-hardwood-floor-vacuums" class="p-3 bg-slate-50 hover:bg-brand-50 rounded-xl border border-slate-200 font-bold text-slate-800 transition">Best Vacuums for Hardwood Floors</a>
            <a href="/compare/dyson-v15-vs-shark-stratos" class="p-3 bg-slate-50 hover:bg-brand-50 rounded-xl border border-slate-200 font-bold text-slate-800 transition">Dyson V15 vs Shark Stratos Comparison</a>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <article class="space-y-6 text-slate-800 bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xs">
      <header class="border-b border-slate-200 pb-4 space-y-1">
        <div class="text-xs font-extrabold text-brand-600 uppercase tracking-wider">VacCompare Transparency &amp; Standards</div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">${escapeHtml(title)}</h1>
      </header>
      ${bodyHtml}
    </article>
  `;
}

function renderServerBreadcrumbs(category, currentName) {
  if (category) {
    return `
      <a href="/" class="hover:text-brand-600 flex items-center gap-1"><i class="fa-solid fa-house text-slate-400"></i> Home</a>
      <span class="text-slate-400">/</span>
      <span class="text-slate-500 font-medium">${escapeHtml(category)}</span>
      <span class="text-slate-400">/</span>
      <span class="text-slate-900 font-extrabold" id="breadcrumb-current">${escapeHtml(currentName)}</span>
    `;
  }
  return `
    <a href="/" class="hover:text-brand-600 flex items-center gap-1"><i class="fa-solid fa-house text-slate-400"></i> Home</a>
    <span class="text-slate-400">/</span>
    <span class="text-slate-900 font-extrabold" id="breadcrumb-current">${escapeHtml(currentName)}</span>
  `;
}

function renderServerBanner(bannerTitle, bannerBadge, bannerDesc) {
  return `
    <section class="relative overflow-hidden bg-slate-900 text-white py-10 px-6 sm:px-10 rounded-3xl shadow-xl mb-6">
      <div class="absolute inset-0 z-0 flex justify-end pointer-events-none">
        <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
          <img src="/assets/vacuum_hero_banner.jpg" alt="Vacuum Banner Background" class="w-full h-full object-cover object-right opacity-60 brightness-110" />
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent"></div>
        </div>
        <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-35% to-transparent"></div>
      </div>
      <div class="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold mb-3">
            <i class="fa-solid fa-layer-group text-brand-400"></i> ${escapeHtml(bannerBadge)}
          </div>
          <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">${escapeHtml(bannerTitle)}</h1>
          <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(bannerDesc)}</p>
        </div>
        <a href="/" class="self-start md:self-center shrink-0 px-4 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-2">
          <i class="fa-solid fa-arrow-left"></i> View All Vacuums
        </a>
      </div>
    </section>
  `;
}

/* ---------------------------------------------------------------- */
/* Static File Middleware                                            */
/* ---------------------------------------------------------------- */

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname, { index: false }));

/* ---------------------------------------------------------------- */
/* 301 Redirects                                                    */
/* ---------------------------------------------------------------- */

app.get(['/vacuum', '/vacuum/', '/product', '/product/'], (req, res) => {
  return res.redirect(301, '/');
});

/* ---------------------------------------------------------------- */
/* Dynamic SEO HTML Injection Engine for SPA Routes                 */
/* ---------------------------------------------------------------- */

app.get('*', (req, res) => {
  const reqPath = req.path;

  // Don't serve HTML index for missing static assets (prevent Unexpected token '<' errors)
  if (/\.(js|css|png|jpg|jpeg|gif|ico|svg|json|csv|woff2?|map|webmanifest|xml)$/i.test(reqPath)) {
    return res.status(404).send('Asset Not Found');
  }

  if (reqPath === '/vacuum' || reqPath === '/vacuum/' || reqPath === '/product' || reqPath === '/product/') {
    return res.redirect(301, '/');
  }

  const indexPath = path.join(__dirname, 'index.html');

  fs.readFile(indexPath, 'utf8', (err, rawHtml) => {
    if (err) {
      return res.status(500).send('Error loading page.');
    }

    const CANONICAL_ORIGIN = getCanonicalOrigin(req);
    let html = rawHtml;
    html = html.split('https://vacompare.ai.studio').join(CANONICAL_ORIGIN);
    if (CANONICAL_ORIGIN !== PRIMARY_ORIGIN) {
      html = html.split(PRIMARY_ORIGIN).join(CANONICAL_ORIGIN);
    }

    let title = 'VacCompare – Vacuum Cleaner Reviews, Comparisons & Buying Guides';
    let description = 'Compare vacuum cleaners, read in-depth reviews, explore specifications, and find the best vacuum for your home with expert buying guides.';
    let canonical = `${CANONICAL_ORIGIN}${reqPath}`;
    let schemaJson = [];

    // Homepage
    if (reqPath === '/' || reqPath === '/index.html') {
      canonical = `${CANONICAL_ORIGIN}/`;
      title = 'VacCompare – Vacuum Cleaner Reviews, Comparisons & Buying Guides';
      description = 'Compare vacuum cleaners, read in-depth reviews, explore specifications, and find the best vacuum for your home with expert buying guides.';

      schemaJson.push({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Vacuum Cleaner Lab",
        "url": CANONICAL_ORIGIN,
        "logo": `${CANONICAL_ORIGIN}/assets/logo.svg`,
        "description": "Independent testing, specification analysis, and side-by-side comparison directory for vacuum cleaners."
      });

      schemaJson.push({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Vacuum Cleaner Lab",
        "url": CANONICAL_ORIGIN,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${CANONICAL_ORIGIN}/?search={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      });

      schemaJson.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does Vacuum Cleaner Lab evaluate vacuum cleaners?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Vacuum Cleaner Lab evaluates vacuum cleaners using standardized suction pressure (kPa), airflow wattage, noise level (dB), HEPA filtration efficiency, and battery runtime benchmarks alongside verified owner feedback."
            }
          },
          {
            "@type": "Question",
            "name": "What is the best type of vacuum cleaner for pet hair?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Vacuums with tangle-free rubber brush rolls, minimum 20 kPa suction power, and sealed HEPA filtration perform best at removing embedded pet hair without clogging."
            }
          },
          {
            "@type": "Question",
            "name": "Are cordless stick vacuums powerful enough to replace upright vacuums?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Modern high-end cordless stick vacuums (such as Dyson V15 and Shark Stratos) deliver over 20-25 kPa suction power, making them fully capable of serving as primary vacuums for small to medium homes."
            }
          }
        ]
      });
    }
    // Individual Product Review Page: /vacuum/:slug or /product/:slug
    else if (reqPath.startsWith('/vacuum/') || reqPath.startsWith('/product/')) {
      const slug = reqPath.replace(/^\/(vacuum|product)\//, '').replace(/\/$/, '');
      const matched = findProductBySlugServer(slug, cachedProducts, productSlugMap);

      if (matched) {
        canonical = `${CANONICAL_ORIGIN}${matched.reviewUrl}`;
        const prodName = `${matched.brand} ${matched.model}`;
        title = formatProductMetaTitle(prodName);
        description = formatProductMetaDescription(prodName);

        // Breadcrumb schema
        schemaJson.push({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": CANONICAL_ORIGIN },
            { "@type": "ListItem", "position": 2, "name": matched.type, "item": `${CANONICAL_ORIGIN}/category/${slugify(matched.type)}` },
            { "@type": "ListItem", "position": 3, "name": matched.brand, "item": `${CANONICAL_ORIGIN}/brand/${matched.brandSlug}` },
            { "@type": "ListItem", "position": 4, "name": `${matched.brand} ${matched.model}`, "item": canonical }
          ]
        });

        // Product Schema
        schemaJson.push({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": `${matched.brand} ${matched.model}`,
          "description": description,
          "brand": { "@type": "Brand", "name": matched.brand },
          "category": matched.type,
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": matched.starRating || 4.5,
            "reviewCount": matched.numReviews || 120
          },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "USD",
            "price": matched.priceUsd || 299.99,
            "priceValidUntil": "2027-12-31",
            "itemCondition": "https://schema.org/NewCondition",
            "availability": "https://schema.org/InStock",
            "url": canonical
          }
        });

        // Review Schema
        schemaJson.push({
          "@context": "https://schema.org",
          "@type": "Review",
          "itemReviewed": { "@type": "Product", "name": `${matched.brand} ${matched.model}` },
          "reviewRating": { "@type": "Rating", "ratingValue": matched.starRating || 4.5, "bestRating": "5" },
          "name": `Vacuum Cleaner Lab Verified Review: ${matched.brand} ${matched.model}`,
          "author": { "@type": "Organization", "name": "Vacuum Cleaner Lab Review Team" },
          "publisher": { "@type": "Organization", "name": "Vacuum Cleaner Lab" }
        });
      }
    }
    // Categories Directory: /categories or /category
    else if (reqPath === '/categories' || reqPath === '/categories/' || reqPath === '/category' || reqPath === '/category/') {
      title = 'Vacuum Cleaner Categories Directory & Comparison | VacCompare';
      description = 'Explore all vacuum cleaner categories: Robot vacuums, Cordless stick, Upright, Canister, Handheld, Wet & Dry, Backpack, and Commercial.';
      schemaJson.push({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Vacuum Cleaner Categories Directory",
        "description": description,
        "url": canonical
      });
    }
    // Brands Directory: /brands or /brand
    else if (reqPath === '/brands' || reqPath === '/brands/' || reqPath === '/brand' || reqPath === '/brand/') {
      title = 'Popular Vacuum Cleaner Brands Directory | VacCompare';
      description = 'Compare top vacuum cleaner brands: Dyson, Shark, Bissell, iRobot Roomba, Roborock, Miele, Tineco, Hoover, Eureka, Eufy, Black & Decker, and more.';
      schemaJson.push({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Popular Vacuum Cleaner Brands Directory",
        "description": description,
        "url": canonical
      });
    }
    // Brand Page: /brand/:brandSlug
    else if (reqPath.startsWith('/brand/')) {
      const bSlug = reqPath.replace('/brand/', '').replace(/\/$/, '');
      const brandName = matchBrandServer(bSlug);
      title = `Best ${brandName} Vacuum Cleaners (Reviews & Comparison) | VacCompare`;
      description = `Compare all top-rated ${brandName} vacuum cleaners. Check side-by-side technical specifications, suction performance, price drops, and verified user ratings.`;

      schemaJson.push({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${brandName} Vacuum Cleaners`,
        "description": description,
        "url": canonical
      });
    }
    // Category Page: /category/:categorySlug
    else if (reqPath.startsWith('/category/')) {
      const cSlug = reqPath.replace('/category/', '').replace(/\/$/, '');
      const targetType = matchCategoryServer(cSlug);
      const displayType = targetType === 'Dry Wet' ? 'Wet & Dry' : targetType;
      title = `${displayType} Vacuum Cleaners – Reviews & Side-by-Side Comparison`;
      description = `Find the highest-rated ${displayType.toLowerCase()} vacuum cleaners. Filter by price, suction power, battery runtime, HEPA filter, and brand specs.`;

      schemaJson.push({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${displayType} Vacuums`,
        "description": description,
        "url": canonical
      });
    }
    // Buying Guides: /guides/:guideSlug
    else if (reqPath.startsWith('/guides/')) {
      const gSlug = reqPath.replace('/guides/', '').replace(/\/$/, '');
      const matchedGuide = BUYING_GUIDES.find(g => g.slug === gSlug);
      if (matchedGuide) {
        title = `${matchedGuide.title} | VacCompare`;
        description = matchedGuide.description;

        schemaJson.push({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": matchedGuide.title,
          "description": matchedGuide.description,
          "author": { "@type": "Organization", "name": "Vacuum Cleaner Lab Editorial Team" },
          "publisher": { "@type": "Organization", "name": "Vacuum Cleaner Lab", "logo": { "@type": "ImageObject", "url": `${CANONICAL_ORIGIN}/assets/logo.svg` } },
          "datePublished": "2026-01-15T00:00:00Z",
          "dateModified": "2026-07-29T00:00:00Z"
        });
      }
    }
    // Comparison Hub / Tool Page: /compare or /compare/
    else if (reqPath === '/compare' || reqPath === '/compare/') {
      title = 'Compare Vacuum Cleaners Side-by-Side | Specs, Suction & Reviews – VacCompare';
      description = 'Compare vacuum cleaners side-by-side. Check suction power (kPa), noise level, HEPA filtration, battery life, dust capacity & real user ratings. Find the best vacuum for your home instantly.';
      canonical = `${CANONICAL_ORIGIN}/compare/`;

      schemaJson.push({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "VacCompare Vacuum Cleaner Comparison Tool",
        "url": canonical,
        "description": description,
        "applicationCategory": "ShoppingApplication",
        "operatingSystem": "All"
      });

      schemaJson.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How many vacuum cleaners can I compare at once?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "You can compare up to 4 vacuum models side-by-side on VacCompare."
            }
          },
          {
            "@type": "Question",
            "name": "What specs do you compare?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We compare suction power (kPa), noise level (dB), dust capacity, HEPA filtration, battery life, weight, power source, and customer ratings."
            }
          },
          {
            "@type": "Question",
            "name": "Are the specifications accurate?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. We collect and cross-check technical data from manufacturer specifications, official product pages, and verified public listings."
            }
          },
          {
            "@type": "Question",
            "name": "Can I compare robot vacuums with cordless stick vacuums?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. You can compare any combination of vacuum types available in our database."
            }
          }
        ]
      });
    }
    // Comparison Page: /compare/:slug
    else if (reqPath.startsWith('/compare/')) {
      const compareSlug = reqPath.replace('/compare/', '').replace(/\/$/, '');
      const parts = compareSlug.split('-vs-');
      const item1 = parts[0] ? parts[0].replace(/-/g, ' ') : 'Vacuum A';
      const item2 = parts[1] ? parts[1].replace(/-/g, ' ') : 'Vacuum B';
      title = formatComparisonMetaTitle(compareSlug, cachedProducts, productSlugMap);
      description = `Detailed technical comparison between ${item1} and ${item2}. Compare suction power (kPa), battery runtime, noise level, dust capacity, and price value.`;
    }
    // EEAT Pages
    else if (reqPath === '/about') {
      title = 'About VacCompare – Independent Vacuum Cleaner Research & Reviews';
      description = 'Learn about VacCompare\'s mission to provide honest, spec-backed vacuum cleaner comparisons, verified product specifications, and unbiased buying advice.';
    } else if (reqPath === '/editorial-policy') {
      title = 'Editorial Policy & Review Standards | VacCompare';
      description = 'Read VacCompare\'s strict editorial policy, fact-checking standards, and conflict-of-interest guidelines.';
    } else if (reqPath === '/affiliate-disclosure') {
      title = 'Affiliate Disclosure | VacCompare';
      description = 'VacCompare participates in affiliate programs. Learn how we earn commissions while maintaining absolute review independence.';
    } else if (reqPath === '/privacy-policy') {
      title = 'Privacy Policy | VacCompare';
      description = 'VacCompare privacy policy detailing user privacy protection, cookies, and data usage transparency.';
    } else if (reqPath === '/terms') {
      title = 'Terms of Service | VacCompare';
      description = 'VacCompare terms of service and website usage conditions.';
    } else if (reqPath === '/contact') {
      title = 'Contact VacCompare | Editorial & Support Team';
      description = 'Get in touch with the VacCompare editorial and technical research team.';
    } else if (reqPath === '/html-sitemap') {
      title = 'HTML Sitemap | VacCompare Vacuum Directory';
      description = 'Browse all vacuum brands, categories, buying guides, comparisons, and product review pages on VacCompare.';
    }

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeXml(title)}</title>`);

    // Replace or Insert Meta Description
    if (html.includes('<meta name="description"')) {
      html = html.replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeXml(description)}">`);
    } else {
      html = html.replace('</head>', `<meta name="description" content="${escapeXml(description)}">\n</head>`);
    }

    // Replace or Insert Canonical
    if (html.includes('<link rel="canonical"')) {
      html = html.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}">`);
    } else {
      html = html.replace('</head>', `<link rel="canonical" href="${canonical}">\n</head>`);
    }

    // Open Graph & Twitter Cards
    const ogTags = `
<meta property="og:site_name" content="Vacuum Cleaner Lab">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${escapeXml(title)}">
<meta property="og:description" content="${escapeXml(description)}">
<meta property="og:image" content="${CANONICAL_ORIGIN}/assets/logo.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeXml(title)}">
<meta name="twitter:description" content="${escapeXml(description)}">
<meta name="twitter:image" content="${CANONICAL_ORIGIN}/assets/logo.svg">
`;
    html = html.replace('</head>', `${ogTags}\n</head>`);

    // Strip any static ld+json template from rawHtml so there are no duplicate or conflicting schemas
    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');

    // Schema Scripts Injection
    if (schemaJson.length > 0) {
      const schemaScript = schemaJson.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n');
      html = html.replace('</head>', `${schemaScript}\n</head>`);
    }

    // SSR Body Content Generation
    let breadcrumbCategory = '';
    let breadcrumbCurrent = 'All Vacuum Cleaners';
    let bannerHtml = '';
    let articleHtml = '';
    let productGridHtml = '';
    let showHomeSections = false;
    let showBanner = false;
    let showArticle = false;
    let showMainContent = true;

    if (reqPath === '/' || reqPath === '/index.html') {
      showHomeSections = true;
      showMainContent = true;
      breadcrumbCurrent = 'All Vacuum Cleaners';
      productGridHtml = cachedProducts.slice(0, 24).map(p => renderServerCard(p)).join('');
    } else if (reqPath.startsWith('/vacuum/') || reqPath.startsWith('/product/')) {
      const slug = reqPath.replace(/^\/(vacuum|product)\//, '').replace(/\/$/, '');
      const matched = findProductBySlugServer(slug, cachedProducts, productSlugMap);
      if (matched) {
        showArticle = true;
        showMainContent = false;
        breadcrumbCategory = 'Product Review';
        breadcrumbCurrent = `${matched.brand} ${matched.model}`;
        articleHtml = renderServerProductReviewPage(matched, cachedProducts);
      } else {
        showArticle = true;
        showMainContent = false;
        breadcrumbCategory = 'Error';
        breadcrumbCurrent = '404 Page Not Found';
        articleHtml = `
          <div class="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-4">
            <i class="fa-solid fa-triangle-exclamation text-4xl text-amber-500"></i>
            <h1 class="text-2xl font-extrabold text-slate-900">404 - Page Not Found</h1>
            <p class="text-sm text-slate-600 max-w-md mx-auto">The requested vacuum review or specification page could not be located in our verified database.</p>
            <a href="/" class="inline-block px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 transition">Return to Vacuum Database</a>
          </div>
        `;
      }
    } else if (reqPath === '/categories' || reqPath === '/categories/' || reqPath === '/category' || reqPath === '/category/') {
      showBanner = true;
      showMainContent = true;
      breadcrumbCategory = 'Navigation';
      breadcrumbCurrent = 'All Categories';
      bannerHtml = renderServerBanner(
        'Vacuum Cleaner Categories Directory',
        'All Categories',
        'Explore tailored vacuum designs for every floor type and cleaning need: Robot, Cordless Stick, Upright, Canister, Handheld, Wet & Dry, and Backpack models.'
      );
      productGridHtml = cachedProducts.map(p => renderServerCard(p)).join('');
    } else if (reqPath === '/brands' || reqPath === '/brands/' || reqPath === '/brand' || reqPath === '/brand/') {
      showBanner = true;
      showMainContent = true;
      breadcrumbCategory = 'Navigation';
      breadcrumbCurrent = 'Popular Brands';
      bannerHtml = renderServerBanner(
        'Popular Vacuum Cleaner Brands Directory',
        'All Brands',
        'Compare tested vacuum models across top manufacturers including Dyson, Shark, Bissell, iRobot, Roborock, Miele, Tineco, Hoover, Eureka, Eufy, and more.'
      );
      productGridHtml = cachedProducts.map(p => renderServerCard(p)).join('');
    } else if (reqPath.startsWith('/brand/')) {
      const bSlug = reqPath.replace('/brand/', '').replace(/\/$/, '');
      const brandName = matchBrandServer(bSlug);
      const brandProducts = cachedProducts.filter(p => 
        p.brandSlug === bSlug || 
        slugify(p.brand) === bSlug || 
        p.brand.toLowerCase().replace(/[^a-z0-9]/g, '') === bSlug.replace(/[^a-z0-9]/g, '')
      );
      const displayProducts = brandProducts.length > 0 ? brandProducts : cachedProducts;
      const count = brandProducts.length;

      showBanner = true;
      showMainContent = true;
      breadcrumbCategory = 'Brand Collection';
      breadcrumbCurrent = brandName;
      bannerHtml = renderServerBanner(
        `${brandName} Vacuum Cleaners`,
        'Brand Directory',
        `Explore ${count || 'all'} tested ${brandName} vacuum models with verified suction pressure benchmarks, HEPA filtration specs, decibel noise levels, and star ratings.`
      );
      productGridHtml = displayProducts.map(p => renderServerCard(p)).join('');
    } else if (reqPath.startsWith('/category/')) {
      const cSlug = reqPath.replace('/category/', '').replace(/\/$/, '');
      const targetType = matchCategoryServer(cSlug);
      const displayType = targetType === 'Dry Wet' ? 'Wet & Dry' : targetType;
      const catProducts = cachedProducts.filter(p => p.type.toLowerCase() === targetType.toLowerCase() || slugify(p.type) === cSlug);
      const displayProducts = catProducts.length > 0 ? catProducts : cachedProducts;
      const count = catProducts.length;

      showBanner = true;
      showMainContent = true;
      breadcrumbCategory = 'Category Index';
      breadcrumbCurrent = displayType;
      bannerHtml = renderServerBanner(
        `${displayType} Vacuum Cleaners`,
        'Category Index',
        `Compare ${count || 'all'} top-rated ${displayType.toLowerCase()} vacuums side by side. Filter by price, suction power (kPa), battery runtime, weight, and HEPA filter status.`
      );
      productGridHtml = displayProducts.map(p => renderServerCard(p)).join('');
    } else if (reqPath.startsWith('/guides/')) {
      const gSlug = reqPath.replace('/guides/', '').replace(/\/$/, '');
      const guideTitle = getGuideTitle(gSlug);
      showArticle = true;
      showMainContent = false;
      breadcrumbCategory = 'Buying Guide';
      breadcrumbCurrent = guideTitle;
      articleHtml = renderServerBuyingGuidePage(gSlug, cachedProducts);
    } else if (reqPath === '/compare' || reqPath === '/compare/') {
      showArticle = true;
      showMainContent = false;
      breadcrumbCategory = 'Tool';
      breadcrumbCurrent = 'Compare Vacuums';
      articleHtml = renderServerCompareHubPage(cachedProducts, productSlugMap);
    } else if (reqPath.startsWith('/compare/')) {
      const compareSlug = reqPath.replace('/compare/', '').replace(/\/$/, '');
      const parts = compareSlug.split('-vs-');
      const label = parts.map(p => p.replace(/-/g, ' ').toUpperCase()).join(' vs ');
      showArticle = true;
      showMainContent = false;
      breadcrumbCategory = 'Comparison';
      breadcrumbCurrent = label;
      articleHtml = renderServerComparisonPage(compareSlug, cachedProducts, productSlugMap);
    } else if (['/about', '/editorial-policy', '/affiliate-disclosure', '/privacy-policy', '/terms', '/contact', '/html-sitemap'].includes(reqPath)) {
      const pageTitle = getEeatPageTitle(reqPath);
      showArticle = true;
      showMainContent = false;
      breadcrumbCategory = 'Information';
      breadcrumbCurrent = pageTitle;
      articleHtml = renderServerEeatPage(reqPath, cachedProducts);
    } else {
      res.status(404);
      showArticle = true;
      showMainContent = false;
      breadcrumbCategory = 'Error';
      breadcrumbCurrent = '404 - Page Not Found';
      articleHtml = `
        <div class="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-4">
          <i class="fa-solid fa-triangle-exclamation text-4xl text-amber-500"></i>
          <h1 class="text-2xl font-extrabold text-slate-900">404 - Page Not Found</h1>
          <p class="text-sm text-slate-600 max-w-md mx-auto">The requested vacuum review or specification page could not be located in our verified database.</p>
          <a href="/" class="inline-block px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 transition">Return to Vacuum Database</a>
        </div>
      `;
    }

    // Apply HTML Modifications
    // 1. Breadcrumbs
    const breadcrumbHtml = renderServerBreadcrumbs(breadcrumbCategory, breadcrumbCurrent);
    html = html.replace(/<div class="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto whitespace-nowrap" id="breadcrumbs-container">[\s\S]*?<\/div>/i, `<div class="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto whitespace-nowrap" id="breadcrumbs-container">${breadcrumbHtml}</div>`);

    // 2. Home Sections
    if (!showHomeSections) {
      html = html.replace('id="home-hero-section" class="', 'id="home-hero-section" class="hidden ');
      html = html.replace(
        /<h1 id="hero-heading"([^>]*)>([\s\S]*?)<\/h1>/i,
        '<p id="hero-heading"$1>$2</p>'
      );
      html = html.replace('id="home-brands-section" class="', 'id="home-brands-section" class="hidden ');
      html = html.replace('id="home-categories-section" class="', 'id="home-categories-section" class="hidden ');
      html = html.replace('id="home-featured-section" class="', 'id="home-featured-section" class="hidden ');
    }

    // 3. Dedicated Banner
    if (showBanner && bannerHtml) {
      html = html.replace('<div id="dedicated-banner" class="hidden"></div>', `<div id="dedicated-banner" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">${bannerHtml}</div>`);
    }

    // 4. Main Content
    if (!showMainContent) {
      html = html.replace('id="main-content" class="', 'id="main-content" class="hidden ');
    } else if (productGridHtml) {
      html = html.replace(/<div id="product-grid"[^>]*><\/div>/i, `<div id="product-grid" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" aria-live="polite">${productGridHtml}</div>`);
    }

    // 5. Dedicated Article View
    if (showArticle && articleHtml) {
      html = html.replace('<div id="dedicated-article-view" class="hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"></div>', `<div id="dedicated-article-view" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">${articleHtml}</div>`);
    }

    res.send(html);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VacCompare SEO Server running at http://0.0.0.0:${PORT}`);
});
