const origin = process.env.SITE_ORIGIN ?? 'https://francescocastiglione.com';
const failures = [];

const check = async (path, expectedType) => {
  const response = await fetch(new URL(path, origin), { redirect: 'manual' });
  if (!response.ok) failures.push(`${path}: expected a successful response, received ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes(expectedType)) failures.push(`${path}: expected ${expectedType}, received ${contentType || 'no content type'}`);
};

await Promise.all([
  check('/', 'text/html'),
  check('/robots.txt', 'text/plain'),
  check('/sitemap-index.xml', 'xml'),
  check('/site.webmanifest', 'manifest+json'),
]);

const httpUrl = new URL(origin);
httpUrl.protocol = 'http:';
const httpResponse = await fetch(httpUrl, { redirect: 'manual' });
const location = httpResponse.headers.get('location') ?? '';
if (![301, 302, 307, 308].includes(httpResponse.status) || !location.startsWith('https://')) {
  failures.push(`HTTP origin does not redirect to HTTPS (received ${httpResponse.status}${location ? ` -> ${location}` : ''})`);
}

const missingSecurityHeaders = ['strict-transport-security', 'x-content-type-options']
  .filter((header) => !httpResponse.headers.has(header));
if (missingSecurityHeaders.length) {
  console.warn(`Advisory: hosting does not expose ${missingSecurityHeaders.join(', ')}. GitHub Pages may control these headers.`);
}

if (failures.length) {
  console.error(`Live-site audit failed with ${failures.length} issue(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Live-site audit passed for ${origin}: core files respond correctly and HTTP redirects to HTTPS.`);
