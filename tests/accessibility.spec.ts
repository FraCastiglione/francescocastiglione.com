import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const representativePages = [
  '/',
  '/about/',
  '/projects/',
  '/gallery/',
  '/cv/',
  '/certificates/',
  '/news/',
  '/news/a-first-step-into-slovene-and-life-in-slovenia/',
  '/contact/',
];

test('representative pages pass WCAG A and AA automated checks', async ({ page }) => {
  for (const path of representativePages) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations, `${path}\n${JSON.stringify(results.violations, null, 2)}`).toEqual([]);
  }
});

test('pages expose predictable screen-reader landmarks and names', async ({ page }) => {
  for (const path of representativePages) {
    await page.goto(path);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('img:not([alt])')).toHaveCount(0);
  }
});

test('keyboard users can skip navigation and operate gallery filters', async ({ page }) => {
  await page.goto('/gallery/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();

  await page.keyboard.press('Tab');
  const search = page.getByRole('searchbox', { name: 'Search the gallery' });
  await expect(search).toBeFocused();
  await search.fill('Slovene');
  await expect(page.locator('[data-gallery-count]')).toHaveText('2');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Category' })).toBeFocused();
});

test('gallery remains usable on a small screen while images load slowly', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.route(/\.(?:avif|jpe?g|png|webp)(?:\?.*)?$/i, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });

  await page.goto('/gallery/', { waitUntil: 'domcontentloaded' });
  const search = page.getByRole('searchbox', { name: 'Search the gallery' });
  await expect(search).toBeVisible();
  await search.fill('Slovene');
  await expect(page.locator('[data-gallery-count]')).toHaveText('2');
  await expect(page.locator('[data-gallery-item]:visible')).toHaveCount(2);
  expect(await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBeTruthy();

  const firstImage = page.locator('[data-gallery-item]:visible img').first();
  await firstImage.scrollIntoViewIfNeeded();
  await expect.poll(() => firstImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});

test('key page types avoid horizontal overflow across mobile breakpoints', async ({ page }) => {
  const mobilePages = [
    '/',
    '/projects/',
    '/gallery/',
    '/cv/',
    '/certificates/',
    '/news/',
    '/news/a-first-step-into-slovene-and-life-in-slovenia/',
  ];

  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of mobilePages) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        `${path} overflowed at ${width}px`,
      ).toBeTruthy();
    }
  }
});

test('article navigation clearly exposes previous and next stories', async ({ page }) => {
  await page.goto('/news/eu-youth-stakeholders-group-march-2025/');
  const navigation = page.getByRole('navigation', { name: 'More articles' });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: /Previous article/ })).toBeVisible();
  await expect(navigation.getByRole('link', { name: /Next article/ })).toBeVisible();
});

test('LinkedIn contact links carry privacy-friendly conversion events', async ({ page }) => {
  for (const path of ['/', '/cv/', '/contact/']) {
    await page.goto(path);
    const links = page.locator('a[href*="linkedin.com"]');
    expect(await links.count()).toBeGreaterThan(0);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('data-goatcounter-click', /^contact-linkedin:/);
    }
  }
});
