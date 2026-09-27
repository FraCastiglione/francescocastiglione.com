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
  await expect(page.locator('.article-page__cover img')).toHaveAttribute('src', '/assets/gallery/slovene-course-erasmus-participants.jpg');
  await expect(page.locator('.story-photo img')).toHaveAttribute('src', '/assets/gallery/slovene-course-level-one-group.jpg');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /slovene-course-erasmus-participants\.jpg$/);
  await expect(page.getByRole('link', { name: 'my CV' })).toHaveAttribute('href', '/cv/#languages');

  await page.goto('/gallery/');
  await expect(page.getByRole('heading', { level: 2, name: 'Intensive Slovene course for Erasmus+ students', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Learning Slovene together in Ljubljana', exact: true })).toBeVisible();
});

test('Flowrest Youthpass and volunteering media stories stay connected', async ({ page, request }) => {
  await page.goto('/certificates/');
  const flowrestCertificate = page.locator('#certificate-flowrest-youth-exchange-youthpass');
  await expect(flowrestCertificate.getByRole('heading', { name: 'Flowrest Youth Exchange Youthpass' })).toBeVisible();
  const flowrestPdf = flowrestCertificate.getByRole('link', { name: /View PDF/ });
  const pdfResponse = await request.get(await flowrestPdf.getAttribute('href') ?? '');
  expect(pdfResponse.ok()).toBeTruthy();
  expect(pdfResponse.headers()['content-type']).toContain('application/pdf');

  await page.goto('/projects/flowrest/');
  await expect(page.getByRole('heading', { name: 'Documentation connected to this project.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Flowrest Youth Exchange Youthpass' })).toBeVisible();

  await page.goto('/projects/seeds-of-solidarity/');
  await expect(page.getByRole('link', { name: 'library programme and its local media coverage' })).toHaveAttribute(
    'href',
    '/news/volunteering-in-amal-autumn-break-at-the-library/',
  );
  await expect(page.getByRole('link', { name: 'International Volunteer Day interview on Rai Radio 1' })).toHaveAttribute(
    'href',
    '/news/rai-radio-1-interview-international-volunteer-day-2023/',
  );

  await page.goto('/news/volunteering-in-amal-autumn-break-at-the-library/');
  await expect(page.getByRole('heading', { level: 1, name: 'Volunteering in Åmål: autumn-break activities at the library' })).toBeVisible();
  await expect(page.locator('.article-page__cover img')).toHaveAttribute('src', '/assets/gallery/amal-library-eu-volunteering-2022.avif');

  await page.goto('/news/rai-radio-1-interview-international-volunteer-day-2023/');
  await expect(page.getByRole('heading', { level: 1, name: 'Sharing my European volunteering experience on Rai Radio 1' })).toBeVisible();
  await expect(page.locator('.article-page__cover img')).toHaveAttribute('src', '/assets/gallery/rai-radio-1-interview-2023.jpg');
});

test('European Year of Youth sources, media coverage, and affiliations stay connected', async ({ page }) => {
  await page.goto('/news/sharing-my-solidarity-corps-experience-with-europe-direct-genova/');
  await expect(page.getByRole('heading', { level: 1, name: 'Sharing my European Solidarity Corps experience with Europe Direct Genova' })).toBeVisible();
  await expect(page.locator('.article-page__cover img')).toHaveAttribute('src', '/assets/gallery/europe-direct-genova-european-year-of-youth-2022.jpg');
  await expect(page.getByRole('link', { name: 'official event programme' })).toHaveAttribute('href', /Evento%209%20Febbraio\.pdf$/);

  await page.goto('/news/featured-in-la-sicilia-at-the-european-year-of-youth-launch/');
  await expect(page.getByRole('heading', { level: 1, name: 'Featured in La Sicilia at the European Year of Youth launch' })).toBeVisible();
  await expect(page.locator('.article-page__cover img')).toHaveAttribute('src', '/assets/gallery/la-sicilia-youth-card-ambassador-network-2022.png');
  await expect(page.getByRole('link', { name: /Fanpage\.it in a video interview/ })).toHaveAttribute('href', 'https://youmedia.fanpage.it/video/al/YkHQX-Swk_CfzUC4');

  await page.goto('/news/becoming-a-european-year-of-youth-ambassador/');
  await expect(page.getByRole('link', { name: 'dedicated article and newspaper scan' })).toHaveAttribute(
    'href',
    '/news/featured-in-la-sicilia-at-the-european-year-of-youth-launch/',
  );

  await page.goto('/about/#affiliations');
  const academicAffiliations = page.locator('.affiliation-card h3');
  await expect(academicAffiliations.nth(3)).toHaveText('Innovators Community Lab');
  await expect(academicAffiliations.nth(4)).toHaveText('University of Trieste');
  await expect(academicAffiliations.nth(5)).toHaveText('University of Ljubljana School of Economics and Business');
});

test('student-mobility leadership projects appear in the portfolio, map, and CV', async ({ page }) => {
  await page.goto('/projects/ial-toscana-student-mobility-tutoring/');
  await expect(page.getByRole('heading', { level: 1, name: 'Student Mobility Tutoring with IAL Toscana' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'AMT Spain' })).toHaveAttribute('href', 'https://www.amt-spain.com/en/');
  await expect(page.getByRole('link', { name: 'MD-Hellas' })).toHaveAttribute('href', 'https://www.md-hellas.gr/it/home-it/');
  await expect(page.getByRole('link', { name: 'Eppas' })).toHaveAttribute('href', 'https://www.eppas.cz/');

  await page.goto('/projects/erasmus-vet-mobility-maribor-2024/');
  await expect(page.getByRole('heading', { level: 1, name: 'Erasmus+ VET Mobility in Maribor' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zavod za Novodobno Izobraževanje — Institute for New Age Education' })).toHaveAttribute('href', 'https://www.zni.si/');

  await page.goto('/projects/seville-language-study-program-tudor-language-house/');
  await expect(page.getByRole('heading', { level: 1, name: 'Seville Language Study Programme — Tudor Language House' })).toBeVisible();
  await expect(page.getByText('This was a professional language-study assignment rather than an Erasmus+ project.')).toBeVisible();

  await page.goto('/projects/');
  const mapData = (await page.locator('script[type="application/json"]').allTextContents()).join(' ');
  expect(mapData).toContain('Student Mobility Tutoring with IAL Toscana');
  expect(mapData).toContain('Erasmus+ VET Mobility in Maribor');
  expect(mapData).toContain('Seville Language Study Programme — Tudor Language House');
  expect(mapData).toContain('Prague, Czechia');
  expect(mapData).toContain('Heraklion, Greece');
  expect(mapData).toContain('Maribor, Slovenia');

  await page.goto('/cv/');
  await expect(page.getByRole('link', { name: 'Mobility assignments' })).toHaveAttribute('href', '/projects/ial-toscana-student-mobility-tutoring/');
  await expect(page.getByRole('link', { name: 'Maribor mobility' })).toHaveAttribute('href', '/projects/erasmus-vet-mobility-maribor-2024/');
  await expect(page.getByRole('link', { name: 'Seville programme' })).toHaveAttribute('href', '/projects/seville-language-study-program-tudor-language-house/');
});

test('mobile navigation opens and reaches the CV', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Open navigation').click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'CV' })).toBeVisible();
});
