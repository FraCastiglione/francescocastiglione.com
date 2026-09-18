import { expect, test } from '@playwright/test';

test('homepage keeps its portrait, styling, and interactive map', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Francesco Castiglione' })).toBeVisible();

  const portrait = page.locator('.personal-hero__portrait img');
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.personal-hero__grid')).toHaveCSS('display', 'grid');

  const map = page.locator('[data-project-map]');
  await map.scrollIntoViewIfNeeded();
  await expect(map.locator('.maplibregl-canvas')).toBeVisible({ timeout: 20_000 });
});

test('map failure still leaves a usable project-list link', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
      apply(target, context, args) {
        if (args[0] === 'webgl2') return null;
        return Reflect.apply(target, context, args);
      },
    });
  });
  await page.goto('/');
  const map = page.locator('[data-project-map]');
  await map.scrollIntoViewIfNeeded();
  await expect(page.locator('[data-map-error]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-map-error] a')).toHaveAttribute('href', '/projects/');
});

test('CV keeps its portrait, profile cards, and language certificate link', async ({ page }) => {
  await page.goto('/cv/');
  const portrait = page.locator('.cv-hero__portrait img');
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.cv-snapshot article')).toHaveCount(3);
  await expect(page.locator('#languages').getByRole('heading', { name: 'Slovene' })).toBeVisible();
  await expect(page.locator('#languages').getByRole('link', { name: /Slovene course transcript/ })).toHaveAttribute('href', /\/certificates\/#certificate-/);
});

test('certificate and article remain reachable', async ({ page, request }) => {
  await page.goto('/certificates/');
  const certificate = page.getByRole('heading', { name: /Intensive Slovene for Erasmus\+ Students/ });
  await expect(certificate).toBeVisible();
  const pdf = page.locator('#certificate-intensive-slovene-erasmus-students-2026').getByRole('link', { name: /View PDF/ });
  const response = await request.get(await pdf.getAttribute('href') ?? '');
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('application/pdf');

  await page.goto('/news/a-first-step-into-slovene-and-life-in-slovenia/');
  await expect(page.getByRole('heading', { level: 1, name: 'A first step into Slovene and life in Slovenia' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'my CV' })).toHaveAttribute('href', '/cv/#languages');
});

test('mobile navigation opens and reaches the CV', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Open navigation').click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'CV' })).toBeVisible();
});
