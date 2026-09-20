import { spawn } from 'node:child_process';

const retryDelays = [0, 5_000, 15_000];

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function runAudit() {
  return new Promise((resolve) => {
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
      resolve({ code: 1, output, startError: error });
    });

    audit.on('close', (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

function isTemporaryServiceFailure(output) {
  return (
    /ERR_PNPM_AUDIT_BAD_RESPONSE/.test(output) ||
    /audit endpoint[\s\S]*responded with 5\d{2}/i.test(output) ||
    /\b(?:EAI_AGAIN|ECONNRESET|ETIMEDOUT|ECONNREFUSED)\b/.test(output)
  );
}

for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
  if (retryDelays[attempt] > 0) {
    console.warn(
      `::notice::Retrying the npm security audit in ${retryDelays[attempt] / 1_000} seconds (attempt ${attempt + 1} of ${retryDelays.length}).`,
    );
    await wait(retryDelays[attempt]);
  }

  const result = await runAudit();

  if (result.startError) {
    console.error(`Unable to start the dependency audit: ${result.startError.message}`);
    process.exitCode = 1;
    break;
  }

  if (result.code === 0) break;

  if (!isTemporaryServiceFailure(result.output)) {
    process.exitCode = result.code;
    break;
  }

  if (attempt === retryDelays.length - 1) {
    console.warn(
      '::warning::The npm security-audit service remained unavailable after three attempts. Dependabot alerts remain active; no vulnerability result was suppressed.',
    );
  }
}
