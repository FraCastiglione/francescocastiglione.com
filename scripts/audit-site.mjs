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
const pageIds = new Map();
let imageCount = 0;
let structuredDataCount = 0;

for (const file of htmlFiles) {
  const relative = path.relative(dist, file);
  const html = fs.readFileSync(file, 'utf8');
  pageIds.set(relative, new Set([...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1])));
}

for (const file of htmlFiles) {
  const relative = path.relative(dist, file);
  const html = fs.readFileSync(file, 'utf8');
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const descriptions = html.match(/<meta\s+[^>]*name=["']description["'][^>]*>/gi) ?? [];
  const canonicals = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi) ?? [];
  const h1s = html.match(/<h1(?:\s[^>]*)?>/gi) ?? [];
  const images = html.match(/<img\s[^>]*>/gi) ?? [];
  const jsonLd = [...html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const embeddedJson = [...html.matchAll(/<script\s+[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  if (!title) failures.push(`${relative}: missing title`);
  if (descriptions.length !== 1) failures.push(`${relative}: expected one meta description, found ${descriptions.length}`);
  if (canonicals.length !== 1) failures.push(`${relative}: expected one canonical URL, found ${canonicals.length}`);
  if (relative !== '404.html' && h1s.length !== 1) failures.push(`${relative}: expected one h1, found ${h1s.length}`);
  if (!/property=["']og:image["']/i.test(html)) failures.push(`${relative}: missing Open Graph image`);
  if (!/rel=["']stylesheet["']/i.test(html)) failures.push(`${relative}: missing stylesheet`);

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

  for (const match of embeddedJson) {
    try { JSON.parse(match[1]); } catch { failures.push(`${relative}: invalid embedded JSON`); }
  }

  const tags = html.match(/<(?:a|img|script|link)\s[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const url = getAttribute(tag, 'href') ?? getAttribute(tag, 'src');
    if (!url || url.startsWith('//')) continue;
    if (/^javascript:/i.test(url)) failures.push(`${relative}: unsafe JavaScript URL`);
    if (/<a\b/i.test(tag) && /\starget=["']_blank["']/i.test(tag) && !/\brel=["'][^"']*\b(?:noopener|noreferrer)\b/i.test(tag)) {
      failures.push(`${relative}: external tab link missing rel protection`);
    }
    if (!url.startsWith('/') && !url.startsWith('#')) continue;
    const target = url.startsWith('#') ? file : internalTarget(url);
    if (!fs.existsSync(target)) {
      failures.push(`${relative}: broken internal target ${url}`);
      continue;
    }
    if (!/<a\b/i.test(tag) || !url.includes('#')) continue;
    const fragment = decodeURIComponent(url.split('#')[1]?.split('?')[0] ?? '');
    if (!fragment) continue;
    const targetPage = path.relative(dist, target);
    if (!pageIds.get(targetPage)?.has(fragment)) failures.push(`${relative}: missing anchor target ${url}`);
  }
}

const criticalPages = {
  'index.html': ['class="personal-hero"', 'class="personal-hero__portrait"', 'data-project-map', 'class="section latest-news"'],
  'cv/index.html': ['class="cv-hero"', 'class="cv-snapshot"', 'class="education-grid"', 'id="languages"'],
  'projects/index.html': ['data-project-explorer', 'data-project-map'],
  'certificates/index.html': ['data-certificate-explorer'],
  'news/index.html': ['data-news-explorer'],
};

for (const [relative, markers] of Object.entries(criticalPages)) {
  const file = path.join(dist, relative);
  if (!fs.existsSync(file)) {
    failures.push(`${relative}: missing critical page`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  for (const marker of markers) if (!html.includes(marker)) failures.push(`${relative}: missing critical page marker ${marker}`);
}

const workerFiles = walk(path.join(dist, '_astro')).filter((file) => /maplibre-gl-worker-.*\.js$/.test(file));
if (workerFiles.length !== 1 || fs.statSync(workerFiles[0]).size === 0) failures.push('map worker: expected one non-empty bundled worker');

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
