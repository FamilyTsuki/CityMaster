import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const source = 'public/assets/images/icone.png';
const publicDir = 'public';
const imagesDir = 'public/assets/images';

async function generate() {
  console.log('Generating icons from', source);

  const png32Buffer = await sharp(source).resize(32, 32).toBuffer();
  await fs.promises.writeFile(path.join(publicDir, 'favicon.png'), png32Buffer);
  await fs.promises.writeFile(path.join(publicDir, 'favicon2.png'), png32Buffer);

  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(1, 4);
  icoHeader.writeUInt8(32, 6);
  icoHeader.writeUInt8(32, 7);
  icoHeader.writeUInt8(0, 8);
  icoHeader.writeUInt8(0, 9);
  icoHeader.writeUInt16LE(1, 10);
  icoHeader.writeUInt16LE(32, 12);
  icoHeader.writeUInt32LE(png32Buffer.length, 14);
  icoHeader.writeUInt32LE(22, 18);
  const icoBuffer = Buffer.concat([icoHeader, png32Buffer]);
  await fs.promises.writeFile(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Generated favicons (32x32) PNG & ICO');

  const png180Buffer = await sharp(source).resize(180, 180).toBuffer();
  await fs.promises.writeFile(path.join(imagesDir, 'apple-touch-icon.png'), png180Buffer);
  console.log('Generated apple-touch-icon.png (180x180)');

  const png192Buffer = await sharp(source).resize(192, 192).toBuffer();
  await fs.promises.writeFile(path.join(imagesDir, 'icon-192.png'), png192Buffer);
  console.log('Generated icon-192.png (192x192)');

  const png512Buffer = await sharp(source).resize(512, 512).toBuffer();
  await fs.promises.writeFile(path.join(imagesDir, 'icon-512.png'), png512Buffer);
  console.log('Generated icon-512.png (512x512)');

  await sharp(source)
    .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 56,
      bottom: 56,
      left: 56,
      right: 56,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .resize(512, 512)
    .toFile(path.join(imagesDir, 'maskable-icon-512.png'));
  console.log('Generated maskable-icon-512.png (512x512)');

  const base64Png = png192Buffer.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <image href="data:image/png;base64,${base64Png}" x="0" y="0" width="192" height="192" />
</svg>`;

  await fs.promises.writeFile(path.join(imagesDir, 'icon.svg'), svgContent);
  await fs.promises.writeFile(path.join(publicDir, 'favicon.svg'), svgContent);
  console.log('Generated SVG favicons with embedded new icon');

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
