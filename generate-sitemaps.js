import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CANONICAL_ORIGIN = 'https://vacuumcleanerlab.com';
const today = new Date().toISOString().split('T')[0];

function cleanCell(v) {
  return v ? String(v).trim() : '';
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

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(cell);
        cell = '';
      } else if (c === '\r') {
        if (next === '\n') i++;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else if (c === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += c;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const BUYING_GUIDES = [
  {
    slug: 'best-vacuum-for-pet-hair',
    title: '10 Best Vacuum Cleaners for Pet Hair (Tested & Ranked)',
    description: 'Expert tested vacuum cleaners designed to trap stubborn pet hair, dander, and fur with tangle-free brush rolls and sealed HEPA filtration.'
  },
  {
    slug: 'best-robot-vacuums-2026',
    title: 'Top 8 Best Robot Vacuums: Hands-On Reviews',
    description: 'Compare automated robot vacuums with self-emptying docks, LiDAR mapping, and mopping features across top brands like Roomba and Roborock.'
  },
  {
    slug: 'best-hardwood-floor-vacuums',
    title: 'Best Vacuums for Hardwood Floors: Anti-Scratch Guide',
    description: 'Discover gentle yet powerful vacuum cleaners with soft roller heads engineered specifically for hardwood and tile flooring.'
  },
  {
    slug: 'best-budget-cordless-vacuums',
    title: 'Best Budget Cordless Vacuums Under $300 (Ranked & Reviewed)',
    description: 'High-performance lightweight cordless stick vacuums that offer deep suction power without breaking the bank.'
  },
  {
    slug: 'bagged-vs-bagless-vacuums-guide',
    title: 'Bagged vs. Bagless Vacuums: Complete Buying & Hygiene Guide',
    description: 'Uncover the pros, cons, long-term costs, and allergy filtration benefits of bagged vs bagless vacuum cleaners.'
  }
];

const POPULAR_BRANDS = [
  'Dyson', 'Shark', 'Bissell', 'iRobot', 'Roborock',
  'Miele', 'Tineco', 'Hoover', 'Eureka'
];

const POPULAR_CATEGORIES = [
  { name: 'Robot Vacuums', slug: 'robot-vacuums' },
  { name: 'Cordless Stick', slug: 'cordless-stick' },
  { name: 'Upright Vacuums', slug: 'upright-vacuums' },
  { name: 'Canister Vacuums', slug: 'canister-vacuums' },
  { name: 'Handheld Vacuums', slug: 'handheld-vacuums' },
  { name: 'Wet & Dry Vacuums', slug: 'wet-dry-vacuums' }
];

const PAGES = [
  '/',
  '/about',
  '/editorial-policy',
  '/affiliate-disclosure',
  '/privacy-policy',
  '/terms',
  '/contact',
  '/html-sitemap'
];

// Load products
const csvPath = path.join(__dirname, 'data', 'vacuum_data.csv');
const text = fs.readFileSync(csvPath, 'utf8');
const rows = parseCSV(text);

const products = [];
for (let i = 5; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length < 10) continue;
  const brand = cleanCell(row[0]);
  const model = cleanCell(row[1]);
  if (!brand || !model) continue;

  const type = cleanCell(row[3]) || 'Other';
  const brandSlug = slugify(brand);
  const modelSlug = slugify(model);
  const fullSlug = `${brandSlug}-${modelSlug}-review`;
  const suctionKpaRaw = cleanCell(row[5]);
  const starRating = parseFirstNumber(cleanCell(row[48]));

  products.push({
    id: `p-${i}-${slugify(brand + '-' + model)}`,
    brand,
    model,
    type,
    brandSlug,
    modelSlug,
    fullSlug,
    reviewUrl: `/vacuum/${fullSlug}`,
    suctionKpaRaw,
    starRating
  });
}

console.log(`Loaded ${products.length} products for sitemap generation.`);

// 1. Pages sitemap
const pagesUrls = PAGES.map(p => `  <url>
    <loc>${CANONICAL_ORIGIN}${p === '/' ? '/' : p}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p === '/' ? 'daily' : 'monthly'}</changefreq>
    <priority>${p === '/' ? '1.0' : '0.6'}</priority>
  </url>`).join('\n');

const pagesSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pagesUrls}
</urlset>`;

// 2. Categories sitemap
const categoriesUrls = POPULAR_CATEGORIES.map(c => `  <url>
    <loc>${CANONICAL_ORIGIN}/category/${c.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n');

const categoriesSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${categoriesUrls}
</urlset>`;

// 3. Brands sitemap
const brandsUrls = POPULAR_BRANDS.map(b => `  <url>
    <loc>${CANONICAL_ORIGIN}/brand/${slugify(b)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n');

const brandsSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${brandsUrls}
</urlset>`;

// 4. Buying guides sitemap
const guidesUrls = BUYING_GUIDES.map(g => `  <url>
    <loc>${CANONICAL_ORIGIN}/guides/${g.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`).join('\n');

const guidesSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${guidesUrls}
</urlset>`;

// 5. Comparisons sitemap
const comparisonsSet = new Set([
  '/compare/dyson-v15-vs-shark-stratos',
  '/compare/irobot-roomba-j7-vs-roborock-s8',
  '/compare/bissell-cleanview-vs-hoover-windtunnel',
  '/compare/miele-complete-c3-vs-dyson-ball-animal-3',
  '/compare/tineco-pure-one-s11-vs-dyson-v12-detect'
]);

const byType = {};
products.forEach(p => {
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

const comparisonUrls = Array.from(comparisonsSet).map(c => `  <url>
    <loc>${CANONICAL_ORIGIN}${c}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>`).join('\n');

const comparisonSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${comparisonUrls}
</urlset>`;

// 6. Products sitemap
const productsUrls = products.map(p => `  <url>
    <loc>${CANONICAL_ORIGIN}${p.reviewUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n');

const productsSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${productsUrls}
</urlset>`;

// 7. Reviews sitemap (Top 30 products)
const top30 = products.slice(0, 30);
const reviewsUrls = top30.map(p => `  <url>
    <loc>${CANONICAL_ORIGIN}${p.reviewUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`).join('\n');

const reviewsSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${reviewsUrls}
</urlset>`;

// 8. Images sitemap
const imagesSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${CANONICAL_ORIGIN}/</loc>
    <image:image>
      <image:loc>${CANONICAL_ORIGIN}/assets/logo.svg</image:loc>
      <image:title>Vacuum Cleaner Lab Official Logo</image:title>
    </image:image>
  </url>
</urlset>`;

// 9. Main Sitemap Index (sitemap.xml)
const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${CANONICAL_ORIGIN}/pages-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/categories-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/brands-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/guides-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/comparison-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/products-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/reviews-sitemap.xml</loc></sitemap>
  <sitemap><loc>${CANONICAL_ORIGIN}/images-sitemap.xml</loc></sitemap>
</sitemapindex>`;

// 10. Comprehensive All-In-One Sitemap (sitemap-all.xml)
const allUrls = [
  pagesUrls,
  categoriesUrls,
  brandsUrls,
  guidesUrls,
  comparisonUrls,
  productsUrls
].join('\n');

const sitemapAllXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls}
</urlset>`;

// 11. RSS 2.0 Feed (feed.xml)
const feedItems = products.slice(0, 15).map(p => `    <item>
      <title>${escapeXml(`${p.brand} ${p.model} Review & Technical Specs`)}</title>
      <link>${CANONICAL_ORIGIN}${p.reviewUrl}</link>
      <guid>${CANONICAL_ORIGIN}${p.reviewUrl}</guid>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <description>${escapeXml(`In-depth review and technical specifications for the ${p.brand} ${p.model} vacuum cleaner.`)}</description>
    </item>`).join('\n');

const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Vacuum Cleaner Lab – Vacuum Cleaner Reviews &amp; News</title>
    <link>${CANONICAL_ORIGIN}/</link>
    <description>Latest vacuum cleaner reviews, comparisons, and buying guides.</description>
    <language>en-us</language>
    <atom:link href="${CANONICAL_ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>
${feedItems}
  </channel>
</rss>`;

// 12. Robots.txt
const robotsTxt = `User-agent: *
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

Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml
`;

// Destination directories: root and public
const dirs = [
  __dirname,
  path.join(__dirname, 'public')
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }

  fs.writeFileSync(path.join(d, 'sitemap.xml'), sitemapIndexXml, 'utf8');
  fs.writeFileSync(path.join(d, 'sitemap_index.xml'), sitemapIndexXml, 'utf8');
  fs.writeFileSync(path.join(d, 'sitemap-index.xml'), sitemapIndexXml, 'utf8');
  fs.writeFileSync(path.join(d, 'sitemap-all.xml'), sitemapAllXml, 'utf8');
  fs.writeFileSync(path.join(d, 'pages-sitemap.xml'), pagesSitemapXml, 'utf8');
  fs.writeFileSync(path.join(d, 'categories-sitemap.xml'), categoriesSitemapXml, 'utf8');
  fs.writeFileSync(path.join(d, 'brands-sitemap.xml'), brandsSitemapXml, 'utf8');
  fs.writeFileSync(path.join(d, 'guides-sitemap.xml'), guidesSitemapXml, 'utf8');
  fs.writeFileSync(path.join(d, 'comparison-sitemap.xml'), comparisonSitemapXml, 'utf8');
  fs.writeFileSync(path.join(d, 'products-sitemap.xml'), productsSitemapXml, 'utf8');
  fs.writeFileSync(path.join(d, 'reviews-sitemap.xml'), reviewsSitemapXml, 'utf8');
  fs.writeFileSync(path.join(d, 'images-sitemap.xml'), imagesSitemapXml, 'utf8');
  fs.writeFileSync(path.join(d, 'feed.xml'), feedXml, 'utf8');
  fs.writeFileSync(path.join(d, 'robots.txt'), robotsTxt, 'utf8');
});

console.log('Successfully generated all production sitemaps, robots.txt, and feed.xml in ./ and ./public!');
process.exit(0);
