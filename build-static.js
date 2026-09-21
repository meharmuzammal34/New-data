import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.STATIC_BUILD = 'true';

// Import express app from server.js
const { app } = await import('./server.js');
const { ALL_GUIDES } = await import('./guides-data.js');
const { ALL_REVIEWS } = await import('./reviews-data.js');

function fetchPage(port, urlPath, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${urlPath}`, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && maxRedirects > 0) {
        let redirectTarget = res.headers.location;
        if (redirectTarget.startsWith('http://') || redirectTarget.startsWith('https://')) {
          try {
            redirectTarget = new URL(redirectTarget).pathname;
          } catch (e) {}
        }
        return fetchPage(port, redirectTarget, maxRedirects - 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, html: data });
      });
    }).on('error', reject);
  });
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function buildStaticSite() {
  console.log('--- Starting Static Site Pre-rendering for Netlify & Production ---');

  // Start temporary local server on arbitrary open port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  console.log(`Pre-rendering server active on ephemeral port ${port}`);

  const routes = [
    '/',
    '/guides',
    '/reviews',
    '/categories',
    '/brands',
    '/compare/',
    '/about',
    '/editorial-policy',
    '/affiliate-disclosure',
    '/privacy-policy',
    '/terms',
    '/contact',
    '/html-sitemap',
    // Categories
    '/category/robot-vacuums',
    '/category/cordless-stick',
    '/category/upright-vacuums',
    '/category/canister-vacuums',
    '/category/handheld-vacuums',
    '/category/wet-and-dry',
    '/category/backpack-vacuums',
    // Brands
    '/brand/dyson',
    '/brand/shark',
    '/brand/bissell',
    '/brand/hoover',
    '/brand/irobot',
    '/brand/roborock',
    '/brand/eureka',
    '/brand/miele',
    '/brand/dreame',
    '/brand/tineco',
    // Comparison Pages
    '/compare/dyson-v15-detect-vs-shark-stratos-cordless',
    '/compare/irobot-roomba-j7-vs-roborock-s8-pro-ultra',
    '/compare/miele-complete-c3-vs-dyson-ball-animal-3'
  ];

  // Add all Buying Guides
  for (const guide of ALL_GUIDES) {
    if (guide.slug) {
      routes.push(`/guides/${guide.slug}`);
    }
  }

  // Add all Review Articles
  for (const review of ALL_REVIEWS) {
    if (review.slug) {
      routes.push(`/reviews/${review.slug}`);
    }
  }

  console.log(`Generating static HTML for ${routes.length} key pages...`);

  const destDirs = [__dirname, path.join(__dirname, 'public')];

  for (const r of routes) {
    try {
      const res = await fetchPage(port, r);
      if (res.status !== 200) {
        console.warn(`Warning: Route ${r} returned HTTP status ${res.status}`);
        continue;
      }

      let html = res.html;

      // Determine file output paths
      const cleanPath = r === '/' ? '' : r.replace(/^\/+|\/+$/g, '');

      for (const destDir of destDirs) {
        if (!cleanPath) {
          // Root index.html
          fs.writeFileSync(path.join(destDir, 'index.html'), html, 'utf8');
        } else {
          // Both folder/index.html AND file.html for complete Netlify server compatibility
          const dirPath = path.join(destDir, cleanPath);
          fs.mkdirSync(dirPath, { recursive: true });
          fs.writeFileSync(path.join(dirPath, 'index.html'), html, 'utf8');

          const parentDir = path.dirname(path.join(destDir, cleanPath));
          fs.mkdirSync(parentDir, { recursive: true });
          fs.writeFileSync(path.join(destDir, `${cleanPath}.html`), html, 'utf8');
        }
      }
    } catch (err) {
      console.error(`Error generating static page for ${r}:`, err.message);
    }
  }

  server.close();

  // Synchronize static asset directories to public/
  console.log('Synchronizing static assets to public/...');
  const dirsToSync = ['assets', 'js', 'css', 'data'];
  for (const d of dirsToSync) {
    copyDirRecursive(path.join(__dirname, d), path.join(__dirname, 'public', d));
  }

  // Ensure index.html and redirect files are in public/
  fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(__dirname, 'public', 'index.html'));
  if (fs.existsSync(path.join(__dirname, '_redirects'))) {
    fs.copyFileSync(path.join(__dirname, '_redirects'), path.join(__dirname, 'public', '_redirects'));
  }

  console.log('--- Static Site Pre-rendering Completed Successfully! ---');
}

buildStaticSite().catch(err => {
  console.error('Fatal static build error:', err);
  process.exit(1);
});
