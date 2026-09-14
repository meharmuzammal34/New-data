const fs = require('fs');
const path = require('path');
const https = require('https');

const urls = [
  'https://web.archive.org/web/20150716114400/http://vacuumcleanerlab.com/hoover-linx-cordless-stick-vacuum-cleaner-review/',
  'https://web.archive.org/web/20150713233955/http://vacuumcleanerlab.com/eureka-3670g-mighty-mite-canister-vacuum-review/',
  'https://web.archive.org/web/20150715070639/http://vacuumcleanerlab.com/dyson-dc41-animal-bagless-vacuum-cleaner-review/',
  'https://web.archive.org/web/20150715081257/http://vacuumcleanerlab.com/dyson-dc35-vacuum-cleaner-review/',
  'https://web.archive.org/web/20150914193411/http://vacuumcleanerlab.com/bissell-bolt-2-in-1-lightweight-cordless-vacuum-review/',
  'https://web.archive.org/web/20150914171552/http://vacuumcleanerlab.com/bissell-cleanview-upright-vacuum-with-onepass-review/',
  'https://web.archive.org/web/20151004232207/http://vacuumcleanerlab.com/bissell-powerglide-pet-bagless-upright-vacuum-with-lift-off-technology-review/',
  'https://web.archive.org/web/20150914232346/http://vacuumcleanerlab.com/dyson-dc44-animal-vacuum-refurbished-review/',
  'https://web.archive.org/web/20150916203646/http://vacuumcleanerlab.com/dyson-v6-cordless-vacuum-review/',
  'https://web.archive.org/web/20151004221259/http://vacuumcleanerlab.com/dyson-v6-trigger-same-as-dyson-dc58-handheld-review/',
  'https://web.archive.org/web/20150916192634/http://vacuumcleanerlab.com/eureka-as2113a-as-one-bagless-upright-vacuum-review/',
  'https://web.archive.org/web/20150916170946/http://vacuumcleanerlab.com/hoover-air-cordless-series-3-0-bh50140-bagless-upright-vacuum-cleaner-review/',
  'https://web.archive.org/web/20150916194903/http://vacuumcleanerlab.com/hoover-anniversary-windtunnel-self-propelled-bagged-upright-u6485900-vacuum-cleaner-review/',
  'https://web.archive.org/web/20150916194617/http://vacuumcleanerlab.com/hoover-platinum-collection-lightweight-bagged-upright-with-canister-review/',
  'https://web.archive.org/web/20151004232204/http://vacuumcleanerlab.com/kenmore-kenmore-canister-vacuum-cleaner-progressive-blueberry-21614-review/',
  'https://web.archive.org/web/20151005182547/http://vacuumcleanerlab.com/shark-navigator-lift-away-vacuum-nv352-review/',
  'https://web.archive.org/web/20151005182252/http://vacuumcleanerlab.com/shark-rocket-truepet-ultra-light-upright-hv322-review/',
  'https://web.archive.org/web/20151004232201/http://vacuumcleanerlab.com/shark-rotator-nv752-powered-lift-away-truepet-vacuum-bordeaux-review/'
];

const rawDir = path.join(__dirname, '../data/archive_raw');
if (!fs.existsSync(rawDir)) {
  fs.mkdirSync(rawDir, { recursive: true });
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirect = res.headers.location;
        if (!redirect.startsWith('http')) {
          redirect = 'https://web.archive.org' + redirect;
        }
        return fetchUrl(redirect).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function run() {
  console.log(`Starting fetch of ${urls.length} articles...`);
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    const match = u.match(/vacuumcleanerlab\.com\/([^\/]+)\/?/);
    const slug = match ? match[1] : `article-${i}`;
    const targetFile = path.join(rawDir, `${slug}.html`);

    if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 1000) {
      console.log(`[${i + 1}/${urls.length}] Already cached: ${slug}`);
      continue;
    }

    try {
      console.log(`[${i + 1}/${urls.length}] Fetching ${slug}...`);
      const html = await fetchUrl(u);
      fs.writeFileSync(targetFile, html);
      console.log(`[${i + 1}/${urls.length}] Saved ${slug} (${html.length} bytes)`);
      // Sleep slightly between requests to be gentle to archive.org
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error(`Error fetching ${slug}:`, err.message);
    }
  }
  console.log('All downloads completed!');
}

run();
