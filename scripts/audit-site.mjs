import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const failures = [];

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const item = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(item) : item;
});

const getAttribute = (tag, name) => tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'))?.[1];
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

  if (title) {
    if (pageTitles.has(title) && relative !== '404.html') failures.push(`${relative}: duplicate title also used by ${pageTitles.get(title)}`);
    pageTitles.set(title, relative);
  }

  for (const image of images) {
    imageCount += 1;
    if (getAttribute(image, 'alt') === undefined) failures.push(`${relative}: image missing alt attribute`);
  }

  for (const match of jsonLd) {
    structuredDataCount += 1;
    try { JSON.parse(match[1]); } catch { failures.push(`${relative}: invalid JSON-LD`); }
  }

  const tags = html.match(/<(?:a|img|script|link)\s[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const url = getAttribute(tag, 'href') ?? getAttribute(tag, 'src');
    if (!url?.startsWith('/') || url.startsWith('//')) continue;
    const target = internalTarget(url);
    if (!fs.existsSync(target)) failures.push(`${relative}: broken internal target ${url}`);
  }
}

for (const required of ['robots.txt', 'sitemap-index.xml']) {
  if (!fs.existsSync(path.join(dist, required))) failures.push(`missing ${required}`);
}

for (const file of walk(path.join(dist, 'assets')).filter((item) => /\.jpe?g$/i.test(item))) {
  const size = fs.statSync(file).size;
  if (size > 650_000) failures.push(`${path.relative(dist, file)}: JPEG exceeds 650 KB performance budget`);
}

if (failures.length) {
  console.error(`Site audit failed with ${failures.length} issue(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Site audit passed: ${htmlFiles.length} HTML pages, ${imageCount} rendered images, ${structuredDataCount} JSON-LD blocks, and no broken internal targets.`);
