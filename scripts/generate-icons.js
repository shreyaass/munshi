import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const svgPath = path.resolve('assets/munshi-icon-E-dark.svg');
const svgBuffer = fs.readFileSync(svgPath);

function renderPng(width, height) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

// 1. Render PWA / Web icons
const webIcons = [
  { file: 'apps/app/public/icons/favicon-32.png', size: 32 },
  { file: 'apps/app/public/icons/favicon-64.png', size: 64 },
  { file: 'apps/app/public/icons/apple-touch-icon.png', size: 180 },
  { file: 'apps/app/public/icons/icon-192.png', size: 192 },
  { file: 'apps/app/public/icons/icon-512.png', size: 512 },
  { file: 'apps/app/public/icons/maskable-512.png', size: 512 },
];

for (const { file, size } of webIcons) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, renderPng(size, size));
  console.log(`Generated ${file} (${size}x${size})`);
}

// 2. Render Android Mipmap icons
const androidRes = 'apps/app/android/app/src/main/res';
const mipmaps = [
  { folder: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
  { folder: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
  { folder: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
  { folder: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
  { folder: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
];

for (const { folder, iconSize, fgSize } of mipmaps) {
  const targetDir = path.join(androidRes, folder);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const iconPng = renderPng(iconSize, iconSize);
  fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), iconPng);
  fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), iconPng);

  const fgPng = renderPng(fgSize, fgSize);
  fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), fgPng);

  console.log(`Generated Android ${folder}: launcher (${iconSize}px), foreground (${fgSize}px)`);
}

console.log('All icons generated successfully!');
