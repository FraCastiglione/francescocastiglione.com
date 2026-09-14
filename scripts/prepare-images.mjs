import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const assetRoot = path.join(root, 'public', 'assets');
const manifestPath = path.join(root, 'src', 'data', 'image-manifest.json');
const responsiveWidths = [480, 800, 1200];
const rasterPattern = /\.(?:avif|jpe?g|png|webp)$/i;
const generatedPattern = /\.w\d+\.webp$/i;

const walk = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const item = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(item) : item;
  }));
  return nested.flat();
};

const files = (await walk(assetRoot))
  .filter((file) => rasterPattern.test(file) && !generatedPattern.test(file))
  .sort();

const manifest = {};
for (const file of files) {
  const metadata = await sharp(file).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Unable to read dimensions for ${file}`);

  const publicPath = `/${path.relative(path.join(root, 'public'), file).split(path.sep).join('/')}`;
  const variants = [];
  for (const width of responsiveWidths.filter((candidate) => candidate < metadata.width)) {
    const extension = path.extname(file);
    const output = `${file.slice(0, -extension.length)}.w${width}.webp`;
    await sharp(file)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toFile(output);
    variants.push({
      src: `/${path.relative(path.join(root, 'public'), output).split(path.sep).join('/')}`,
      width,
    });
  }

  manifest[publicPath] = {
    width: metadata.width,
    height: metadata.height,
    sources: [...variants, { src: publicPath, width: metadata.width }],
  };
}

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const mark = path.join(root, 'public', 'brand', 'european-superhero-mark.svg');
const icons = [
  ['favicon-32x32.png', 32],
  ['favicon-96x96.png', 96],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];
for (const [filename, size] of icons) {
  await sharp(mark, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, 'public', filename));
}

console.log(`Prepared ${files.length} source images and ${icons.length} app icons.`);
