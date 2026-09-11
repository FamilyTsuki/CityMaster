import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const projectRoot = path.resolve(dirname, '..');

const svgPath = path.join(projectRoot, 'public', 'assets', 'images', 'icon.svg');
const imagesDir = path.join(projectRoot, 'public', 'assets', 'images');
const publicDir = path.join(projectRoot, 'public');

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(imagesDir, 'icon-192.png'));

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(imagesDir, 'icon-512.png'));

  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(imagesDir, 'apple-touch-icon.png'));

  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  const padding = 51;
  const innerSize = 512 - (padding * 2);
  const innerBuffer = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }
    }
  })
    .composite([{ input: innerBuffer, top: padding, left: padding }])
    .png()
    .toFile(path.join(imagesDir, 'maskable-icon-512.png'));
}

generateIcons().catch((error) => {
  process.exit(1);
});
