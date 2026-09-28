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
  await expect(page.locator('#languages').getByRole('link', { name: /Slovene course certificate/ })).toHaveAttribute('href', /\/certificates\/#certificate-/);
  await expect(page.locator('#languages').getByRole('link', { name: 'Learning Swedish in Åmål' })).toHaveAttribute('href', '/news/learning-swedish-through-everyday-life-in-amal/');
});

test('Swedish learning story stays connected to the CV, project, and gallery', async ({ page }) => {
  const articlePath = '/news/learning-swedish-through-everyday-life-in-amal/';

  await page.goto(articlePath);
  await expect(page.getByRole('heading', { level: 1, name: 'Learning Swedish through everyday life in Åmål' })).toBeVisible();
  await expect(page.locator('.article-page__cover img')).toHaveAttribute('src', '/assets/gallery/learning-swedish-amal-2023.jpg');
  await expect(page.getByRole('link', { name: 'Seeds of Solidarity', exact: true })).toHaveAttribute('href', '/projects/seeds-of-solidarity/');
  await expect(page.getByRole('link', { name: 'Seeds of Solidarity Youthpass' })).toHaveAttribute('href', '/certificates/#certificate-seeds-of-solidarity-youthpass');

  await page.goto('/projects/seeds-of-solidarity/');
  await expect(page.getByRole('link', { name: 'learning Swedish through study and everyday life in Åmål' })).toHaveAttribute('href', articlePath);
  await expect(page.getByRole('link', { name: 'Learning Swedish through everyday life in Åmål' })).toHaveAttribute('href', articlePath);

  await page.goto('/gallery/');
  await expect(page.getByRole('heading', { level: 2, name: 'Learning Swedish while living in Åmål' })).toBeVisible();
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
  const ialProjects = [
    ['/projects/ial-toscana-erasmus-seville-may-2023/', 'Erasmus+ VET Mobility in Seville — IAL Toscana'],
    ['/projects/ial-toscana-erasmus-prague-may-2023/', 'Erasmus+ VET Mobility in Prague — IAL Toscana'],
    ['/projects/ial-toscana-take-off-seville-february-2024/', 'Take Off Mobility in Seville — IAL Toscana'],
    ['/projects/ial-toscana-erasmus-heraklion-october-2024/', 'Erasmus+ VET Mobility in Heraklion — IAL Toscana'],
    ['/projects/ial-toscana-take-off-heraklion-april-2025/', 'Take Off 2 Mobility in Heraklion — IAL Toscana'],
    ['/projects/ial-toscana-additional-seville-mobility/', 'Additional Student Mobility in Seville — IAL Toscana'],
  ] as const;

  for (const [path, title] of ialProjects) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  }

  await page.goto('/projects/erasmus-vet-mobility-maribor-2024/');
  await expect(page.getByRole('heading', { level: 1, name: 'Erasmus+ VET Mobility in Maribor' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zavod za Novodobno Izobraževanje — Institute for New Age Education' })).toHaveAttribute('href', 'https://www.zni.si/');

  await page.goto('/projects/seville-language-study-program-tudor-language-house/');
  await expect(page.getByRole('heading', { level: 1, name: 'Seville Language Study Programme — Tudor Language House' })).toBeVisible();
  await expect(page.getByText('This was a professional language-study assignment rather than an Erasmus+ project.')).toBeVisible();

  await page.goto('/projects/');
  await expect(page.getByRole('heading', { level: 2, name: 'Explore the work by location.' })).toBeVisible();
  const mapBox = await page.locator('[data-project-map]').boundingBox();
  const cardsBox = await page.locator('.project-grid').boundingBox();
  expect(mapBox?.y).toBeLessThan(cardsBox?.y ?? 0);

  const mapData = JSON.parse(await page.locator('script[type="application/json"]').textContent() ?? '{"features":[]}');
  const projectsAt = (location: string) => mapData.features
    .filter((feature: { properties: { locationLabel: string } }) => feature.properties.locationLabel === location)
    .map((feature: { properties: { projectTitle: string } }) => feature.properties.projectTitle);

  expect(projectsAt('Seville, Spain')).toEqual(expect.arrayContaining([
    'Erasmus+ VET Mobility in Seville — IAL Toscana',
    'Take Off Mobility in Seville — IAL Toscana',
    'Additional Student Mobility in Seville — IAL Toscana',
    'Seville Language Study Programme — Tudor Language House',
  ]));
  expect(projectsAt('Prague, Czechia')).toContain('Erasmus+ VET Mobility in Prague — IAL Toscana');
  expect(projectsAt('Heraklion, Greece')).toEqual(expect.arrayContaining([
    'Erasmus+ VET Mobility in Heraklion — IAL Toscana',
    'Take Off 2 Mobility in Heraklion — IAL Toscana',
  ]));
  expect(projectsAt('Maribor, Slovenia')).toContain('Erasmus+ VET Mobility in Maribor');

  await page.goto('/cv/');
  await expect(page.getByRole('link', { name: 'Seville · Erasmus+' })).toHaveAttribute('href', '/projects/ial-toscana-erasmus-seville-may-2023/');
  await expect(page.getByRole('link', { name: 'Prague · Erasmus+' })).toHaveAttribute('href', '/projects/ial-toscana-erasmus-prague-may-2023/');
  await expect(page.getByRole('link', { name: 'Heraklion · Take Off 2' })).toHaveAttribute('href', '/projects/ial-toscana-take-off-heraklion-april-2025/');
  await expect(page.getByRole('link', { name: 'Maribor mobility' })).toHaveAttribute('href', '/projects/erasmus-vet-mobility-maribor-2024/');
  await expect(page.getByRole('link', { name: 'Seville programme' })).toHaveAttribute('href', '/projects/seville-language-study-program-tudor-language-house/');
});

test('news offers an Interview filter and labels interview stories', async ({ page }) => {
  await page.goto('/news/');
  const typeFilter = page.getByLabel('Type');
  await expect(typeFilter.locator('option[value="interview"]')).toHaveText('Interview');
  await typeFilter.selectOption('interview');

  const visibleCards = page.locator('[data-news-panel="cards"] [data-news-item]:visible');
  await expect(visibleCards).toHaveCount(1);
  await expect(visibleCards.getByRole('heading', { name: 'Sharing my European volunteering experience on Rai Radio 1' })).toBeVisible();
  await expect(visibleCards.locator('.news-card__meta span')).toHaveText('interview');
});

test('Konya project connects the Italian delegation, media coverage, photos, and CV', async ({ page }) => {
  const articlePath = '/news/representing-italy-in-konya-youth-and-rural-development-2021/';

  await page.goto('/projects/youth-and-rural-development-training-model/');
  await expect(page.getByRole('heading', { level: 1, name: 'Youth and Rural Development Education Model' })).toBeVisible();
  await expect(page.getByText('Participant · Italian delegation')).toBeVisible();
  await expect(page.getByRole('link', { name: 'ScambiEuropei' })).toHaveAttribute('href', /scambieuropei\.info/);
  await expect(page.getByRole('link', { name: 'dedicated article about the Italian delegation and the Konya experience' })).toHaveAttribute('href', articlePath);
  await expect(page.getByRole('link', { name: 'Representing the Italian delegation in Konya: youth and rural development' })).toHaveAttribute('href', articlePath);

  await page.goto(articlePath);
  await expect(page.getByRole('heading', { level: 1, name: 'Representing the Italian delegation in Konya: youth and rural development' })).toBeVisible();
  await expect(page.locator('.article-page__cover img')).toHaveAttribute('src', '/assets/gallery/projects/youth-and-rural-development-training-model.jpg');
  await expect(page.locator('.story-photo img')).toHaveCount(3);
  await expect(page.locator('.story-photo img').nth(0)).toHaveAttribute('src', '/assets/gallery/youth-rural-development-podium-konya-2021.jpg');
  await expect(page.locator('.story-photo img').nth(1)).toHaveAttribute('src', '/assets/gallery/youth-rural-development-italian-delegation-konya-2021.jpg');
  await expect(page.locator('.story-photo img').nth(2)).toHaveAttribute('src', '/assets/gallery/youth-rural-development-certificates-konya-2021.jpg');
  await expect(page.getByRole('link', { name: /Turkish National Agency.*official 2020 approval list/ })).toHaveAttribute('href', /ua\.gov\.tr/);
  await expect(page.getByRole('link', { name: /Gazete Anadolu.*report/ })).toHaveAttribute('href', 'https://www.gazeteanadolu.com/kop-tan-kirsal-kalkinma-modeli-egitimi/33296');

  await page.goto('/gallery/');
  await expect(page.getByRole('heading', { level: 2, name: 'At the lectern in Konya' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'The Italian delegation in Konya' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Completing the Konya training' })).toBeVisible();

  await page.goto('/cv/');
  await expect(page.getByRole('link', { name: 'Story and media coverage' })).toHaveAttribute('href', articlePath);
});

test('mobile navigation opens and reaches the CV', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Open navigation').click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'CV' })).toBeVisible();
});
