import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const failures = [];
const advisories = [];

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const item = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(item) : item;
});

const getAttribute = (tag, name) => tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'))?.[1];
const hasAttribute = (tag, name) => new RegExp(`\\s${name}(?:\\s|=|>)`, 'i').test(tag);
const internalTarget = (url) => {
  const pathname = decodeURIComponent(url.split(/[?#]/, 1)[0]);
  if (pathname === '/') return path.join(dist, 'index.html');
  const direct = path.join(dist, pathname);
  if (path.extname(pathname)) return direct;
  return path.join(direct, 'index.html');
};

if (!fs.existsSync(dist)) {
  console.error('dist/ is missing. Run the build before the site audit.');
  process.exit(1);
}

const htmlFiles = walk(dist).filter((file) => file.endsWith('.html'));
const pageTitles = new Map();
let imageCount = 0;
let structuredDataCount = 0;
let externalLinkCount = 0;

for (const file of htmlFiles) {
  const relative = path.relative(dist, file);
  const html = fs.readFileSync(file, 'utf8');
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const descriptions = html.match(/<meta\s+[^>]*name=["']description["'][^>]*>/gi) ?? [];
  const canonicals = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi) ?? [];
  const h1s = html.match(/<h1(?:\s[^>]*)?>/gi) ?? [];
  const images = html.match(/<img\s[^>]*>/gi) ?? [];
  const jsonLd = [...html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  if (!title) failures.push(`${relative}: missing title`);
  if (descriptions.length !== 1) failures.push(`${relative}: expected one meta description, found ${descriptions.length}`);
  if (canonicals.length !== 1) failures.push(`${relative}: expected one canonical URL, found ${canonicals.length}`);
  if (relative !== '404.html' && h1s.length !== 1) failures.push(`${relative}: expected one h1, found ${h1s.length}`);
  if (!/property=["']og:image["']/i.test(html)) failures.push(`${relative}: missing Open Graph image`);
  if (!/rel=["']manifest["']/i.test(html)) failures.push(`${relative}: missing web app manifest link`);
  if (!/rel=["']apple-touch-icon["']/i.test(html)) failures.push(`${relative}: missing Apple touch icon`);

  if (title && title.length > 65) advisories.push(`${relative}: title is ${title.length} characters and may be truncated`);
  const description = descriptions[0] ? getAttribute(descriptions[0], 'content') : undefined;
  if (description && description.length > 170) advisories.push(`${relative}: description is ${description.length} characters and may be rewritten`);

  if (title) {
    if (pageTitles.has(title) && relative !== '404.html') failures.push(`${relative}: duplicate title also used by ${pageTitles.get(title)}`);
    pageTitles.set(title, relative);
  }

  for (const image of images) {
    imageCount += 1;
    if (!hasAttribute(image, 'alt')) failures.push(`${relative}: image missing alt attribute`);
    if (!getAttribute(image, 'width') || !getAttribute(image, 'height')) failures.push(`${relative}: image missing intrinsic width or height`);
    const source = getAttribute(image, 'src');
    if (source && /\.(?:avif|jpe?g|png|webp)$/i.test(source) && !getAttribute(image, 'srcset')) {
      failures.push(`${relative}: raster image missing responsive srcset (${source})`);
    }
  }

  for (const match of jsonLd) {
    structuredDataCount += 1;
    try { JSON.parse(match[1]); } catch { failures.push(`${relative}: invalid JSON-LD`); }
  }

  const tags = html.match(/<(?:a|img|script|link)\s[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const url = getAttribute(tag, 'href') ?? getAttribute(tag, 'src');
    if (url?.startsWith('http')) {
      externalLinkCount += 1;
      if (url.startsWith('http://')) advisories.push(`${relative}: external link does not use HTTPS (${url})`);
    }
    if (!url?.startsWith('/') || url.startsWith('//')) continue;
    const target = internalTarget(url);
    if (!fs.existsSync(target)) failures.push(`${relative}: broken internal target ${url}`);
  }
}

for (const required of ['robots.txt', 'sitemap-index.xml', 'site.webmanifest', 'favicon-32x32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
  if (!fs.existsSync(path.join(dist, required))) failures.push(`missing ${required}`);
}

for (const file of walk(path.join(dist, 'assets')).filter((item) => /\.(?:avif|jpe?g|png|webp)$/i.test(item))) {
  const size = fs.statSync(file).size;
  if (size > 650_000) failures.push(`${path.relative(dist, file)}: image exceeds 650 KB performance budget`);
}

for (const file of walk(path.join(dist, '_astro')).filter((item) => /\.js$/i.test(item))) {
  const size = fs.statSync(file).size;
  if (size > 1_100_000) failures.push(`${path.relative(dist, file)}: JavaScript exceeds 1.1 MB performance budget`);
  else if (size > 500_000) advisories.push(`${path.relative(dist, file)}: JavaScript exceeds the preferred 500 KB budget`);
}

if (failures.length) {
  console.error(`Site audit failed with ${failures.length} issue(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

if (advisories.length) {
  console.warn(`Site audit advisories (${advisories.length}):\n- ${advisories.join('\n- ')}`);
}

console.log(`Site audit passed: ${htmlFiles.length} HTML pages, ${imageCount} rendered images, ${structuredDataCount} JSON-LD blocks, ${externalLinkCount} external references, and no broken internal targets.`);
