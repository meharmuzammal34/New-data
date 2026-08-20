import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, 'favicon.svg');
const svgBuffer = fs.readFileSync(svgPath);

const targets = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

function createIco(png32Buffer, png16Buffer) {
  // ICO header: 6 bytes
  const header = Buffer.from([0, 0, 1, 0, 2, 0]); // 2 images

  // Dir entry 1: 16x16
  const dir16 = Buffer.alloc(16);
  dir16[0] = 16;
  dir16[1] = 16;
  dir16[2] = 0;
  dir16[3] = 0;
  dir16.writeUInt16LE(1, 4);
  dir16.writeUInt16LE(32, 6);
  dir16.writeUInt32LE(png16Buffer.length, 8);
  dir16.writeUInt32LE(6 + 16 + 16, 12); // Offset: 38

  // Dir entry 2: 32x32
  const dir32 = Buffer.alloc(16);
  dir32[0] = 32;
  dir32[1] = 32;
  dir32[2] = 0;
  dir32[3] = 0;
  dir32.writeUInt16LE(1, 4);
  dir32.writeUInt16LE(32, 6);
  dir32.writeUInt32LE(png32Buffer.length, 8);
  dir32.writeUInt32LE(6 + 16 + 16 + png16Buffer.length, 12);

  return Buffer.concat([header, dir16, dir32, png16Buffer, png32Buffer]);
}

async function generate() {
  const pngBuffers = {};

  for (const item of targets) {
    const buf = await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png()
      .toBuffer();

    pngBuffers[item.size] = buf;

    // Save to root and public
    fs.writeFileSync(path.join(__dirname, item.name), buf);
    fs.writeFileSync(path.join(__dirname, 'public', item.name), buf);
    console.log(`Generated ${item.name} (${item.size}x${item.size})`);
  }

  // Create favicon.ico using 16x16 and 32x32 PNGs
  const icoBuffer = createIco(pngBuffers[32], pngBuffers[16]);
  fs.writeFileSync(path.join(__dirname, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(__dirname, 'public', 'favicon.ico'), icoBuffer);
  console.log('Generated favicon.ico');

  // Ensure favicon.svg and site.webmanifest exist in public as well
  const webmanifestContent = fs.readFileSync(path.join(__dirname, 'site.webmanifest'), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'public', 'site.webmanifest'), webmanifestContent);
  fs.writeFileSync(path.join(__dirname, 'public', 'favicon.svg'), svgBuffer);
  console.log('Copied site.webmanifest and favicon.svg to public/');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
