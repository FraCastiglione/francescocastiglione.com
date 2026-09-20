import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const siteOrigin = 'https://francescocastiglione.com';
const host = 'francescocastiglione.com';
const key = '1ca315b2fd402dd884eb780f4adcf82f';
const keyLocation = `${siteOrigin}/${key}.txt`;

const fixedRoutes = [
  '/',
  '/about/',
  '/certificates/',
  '/contact/',
  '/cv/',
  '/gallery/',
  '/news/',
  '/projects/',
];

function contentRoutes(directory, prefix) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => `${prefix}${entry.name.replace(/\.md$/, '')}/`);
}

function allRoutes() {
  return [
    ...fixedRoutes,
    ...contentRoutes('src/content/news', '/news/'),
    ...contentRoutes('src/content/projects', '/projects/'),
  ];
}

function changedFiles() {
  const result = spawnSync('git', ['diff', '--name-only', 'HEAD^', 'HEAD'], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    console.warn('::warning::Could not determine changed files; submitting the full sitemap to IndexNow.');
    return null;
  }

  return result.stdout.split('\n').filter(Boolean);
}

function routesForChanges(files) {
  if (!files) return allRoutes();

  const sitewideChange = files.some(
    (file) =>
      file === `public/${key}.txt` ||
      file === 'astro.config.mjs' ||
      file.startsWith('src/components/') ||
      file.startsWith('src/layouts/') ||
      file.startsWith('src/styles/') ||
      file.startsWith('src/content/affiliations/') ||
      file.startsWith('public/assets/'),
  );

  if (sitewideChange) return allRoutes();

  const routes = new Set();

  for (const file of files) {
    const news = file.match(/^src\/content\/news\/(.+)\.md$/);
    if (news) {
      routes.add('/news/');
      routes.add(`/news/${news[1]}/`);
      continue;
    }

    const project = file.match(/^src\/content\/projects\/(.+)\.md$/);
    if (project) {
      routes.add('/projects/');
      routes.add(`/projects/${project[1]}/`);
      continue;
    }

    if (file.startsWith('src/content/certificates/')) {
      routes.add('/certificates/');
      routes.add('/cv/');
      continue;
    }

    if (file.startsWith('src/content/gallery/')) {
      routes.add('/gallery/');
      continue;
    }

    const page = file.match(/^src\/pages\/(about|certificates|contact|cv|gallery\/index|index|news\/index|projects\/index)\.astro$/);
    if (page) {
      const route = page[1].replace(/^index$/, '').replace(/\/index$/, '');
      routes.add(`/${route}${route ? '/' : ''}`);
      continue;
    }

    if (file === 'src/pages/news/[id].astro') {
      for (const route of contentRoutes('src/content/news', '/news/')) routes.add(route);
      continue;
    }

    if (file === 'src/pages/projects/[id].astro') {
      for (const route of contentRoutes('src/content/projects', '/projects/')) routes.add(route);
    }
  }

  return [...routes];
}

const routes = routesForChanges(changedFiles());
const urlList = [...new Set(routes)].sort().map((route) => new URL(route, siteOrigin).href);

if (urlList.length === 0) {
  console.log('No public-page changes to submit to IndexNow.');
  process.exit(0);
}

if (process.env.INDEXNOW_DRY_RUN === 'true') {
  console.log(`IndexNow dry run: ${urlList.length} URL(s) would be submitted.`);
  console.log(urlList.join('\n'));
  process.exit(0);
}

const payload = { host, key, keyLocation, urlList };
const retryDelays = [0, 2_000, 8_000];

for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
  if (retryDelays[attempt] > 0) {
    await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
  }

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (response.status === 200 || response.status === 202) {
      console.log(`Submitted ${urlList.length} changed URL(s) to IndexNow.`);
      process.exit(0);
    }

    if (response.status !== 429 && response.status < 500) {
      throw new Error(`IndexNow rejected the submission with HTTP ${response.status}.`);
    }

    if (attempt === retryDelays.length - 1) {
      throw new Error(`IndexNow remained unavailable with HTTP ${response.status}.`);
    }
  } catch (error) {
    if (attempt === retryDelays.length - 1 || /rejected/.test(error.message)) throw error;
  }
}
