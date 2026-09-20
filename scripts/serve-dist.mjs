import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const argumentsList = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = argumentsList.indexOf(flag);
  return index >= 0 && argumentsList[index + 1] ? argumentsList[index + 1] : fallback;
};

const host = valueAfter('--host', '127.0.0.1');
const port = Number(valueAfter('--port', '4321'));
const root = resolve('dist');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

const fileFor = (requestUrl) => {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${host}:${port}`).pathname);
  const requested = resolve(root, `.${pathname}`);
  if (requested !== root && !requested.startsWith(`${root}${sep}`)) return null;

  const candidates = pathname.endsWith('/')
    ? [resolve(requested, 'index.html')]
    : [requested, resolve(requested, 'index.html')];

  return candidates.find((candidate) => {
    try { return statSync(candidate).isFile(); } catch { return false; }
  }) ?? null;
};

createServer((request, response) => {
  const file = fileFor(request.url ?? '/');
  const target = file ?? resolve(root, '404.html');
  const status = file ? 200 : 404;

  response.writeHead(status, {
    'Content-Type': contentTypes[extname(target)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(target).pipe(response);
}).listen(port, host, () => {
  process.stdout.write(`Serving dist at http://${host}:${port}\n`);
});
