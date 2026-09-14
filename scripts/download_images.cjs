const fs = require('fs');
const path = require('path');
const https = require('https');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/parsed_reviews.json')));
const assetsDir = path.join(__dirname, '../assets/reviews');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      return resolve(true);
    }
    if (!url) return resolve(false);

    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirect = res.headers.location;
        if (!redirect.startsWith('http')) redirect = 'https://web.archive.org' + redirect;
        return download(redirect, dest).then(resolve);
      }
      if (res.statusCode !== 200) {
        return resolve(false);
      }
      const ws = fs.createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', () => ws.close(() => resolve(true)));
    }).on('error', () => resolve(false));
  });
}

async function run() {
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const dest = path.join(assetsDir, `${item.slug}.jpg`);
    process.stdout.write(`[${i+1}/${data.length}] Downloading ${item.slug}... `);
    const ok = await download(item.mainImgUrl, dest);
    if (ok) {
      const size = fs.existsSync(dest) ? fs.statSync(dest).size : 0;
      console.log(`OK (${size} bytes)`);
      item.localImage = `/assets/reviews/${item.slug}.jpg`;
    } else {
      console.log(`FAILED, using placeholder`);
      item.localImage = `/assets/vacuum_placeholder.svg`;
    }
    await new Promise(r => setTimeout(r, 400));
  }

  fs.writeFileSync(path.join(__dirname, '../data/parsed_reviews.json'), JSON.stringify(data, null, 2));
  console.log('Finished downloading all images and updated data/parsed_reviews.json!');
}

run();
