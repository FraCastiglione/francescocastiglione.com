import { spawn } from 'node:child_process';

const audit = spawn('pnpm', ['audit', '--audit-level=moderate'], {
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';

for (const stream of [audit.stdout, audit.stderr]) {
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    output += chunk;
    process.stderr.write(chunk);
  });
}

audit.on('error', (error) => {
  console.error(`Unable to start the dependency audit: ${error.message}`);
  process.exitCode = 1;
});

audit.on('close', (code) => {
  if (code === 0) return;

  const serviceUnavailable =
    /ERR_PNPM_AUDIT_BAD_RESPONSE/.test(output) ||
    /audit endpoint[\s\S]*responded with 5\d{2}/i.test(output);

  if (serviceUnavailable) {
    console.warn(
      '::warning::The npm security-audit service is temporarily unavailable. Dependabot alerts remain active; no audit result was suppressed.',
    );
    return;
  }

  process.exitCode = code || 1;
});
