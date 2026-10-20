import { test, expect, type Locator, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { freeTools, githubReleaseDownloadUrl, latestToolRelease, toolReleases, type ToolRelease } from '../data/freeTools';
import { toolGuides } from '../data/toolGuides';
import { freeToolTranslations } from '../i18n/freeTools';
import { toolGuideTranslations } from '../i18n/toolGuides';

const detailedGuideUrl = 'https://github.com/oryx-system/OryxDataSafe-Web/blob/main/release/modbus-check/USER_GUIDE.ko.md';
const detailedGuideLabel = 'GitHub 상세 사용법 (한국어)';
const releaseNoticeLabel = '릴리스 안내·알려진 제한 (한국어)';
const translateGuide = (source: string, language: 'ko' | 'en' | 'ru') => language === 'ko' ? source : toolGuideTranslations[source][language];
const translateFreeTool = (source: string, language: 'ko' | 'en' | 'ru') => language === 'ko' ? source : freeToolTranslations[source][language];
// Pinned to the official release handoff; binary bytes are verified separately.
const publishedModbusRelease = {
  version: '0.2.0-rc.7',
  releasedOn: '2026-10-20',
  prerelease: true,
  releaseNotesUrl: 'https://github.com/oryx-system/ModbusCheck-Releases/releases/tag/v0.2.0-rc.7',
  download: {
    url: 'https://github.com/oryx-system/ModbusCheck-Releases/releases/download/v0.2.0-rc.7/ModbusCheck-0.2.0-rc.7-Setup-win-x64.exe',
    sha256: '9b8dd1f9e9718248e4634ff248fe0100226e9a6756e343502a1943665361bc08',
  },
};

async function expectPublishedDownload(scope: Locator, language: 'ko' | 'en' | 'ru') {
  await expect(scope.locator('.tool-download a.button')).toHaveCount(1);
  await expect(scope.getByRole('link', { name: translateFreeTool('최신 버전 다운로드', language), exact: true })).toHaveAttribute('href', publishedModbusRelease.download.url);
  await expect(scope.locator('.tool-download')).toContainText(publishedModbusRelease.version);
  await expect(scope.locator('.tool-download')).toContainText(translateFreeTool('사전 공개', language));
  await expect(scope.locator('.tool-download button')).toHaveCount(0);
  const notice = latestToolRelease('modbus-check')!.notice!;
  await expect(scope.locator('.tool-release-notice')).toContainText(translateFreeTool(notice, language));
  await expect(scope.locator('.tool-release-notice').getByRole('link', { name: translateFreeTool(releaseNoticeLabel, language), exact: true })).toHaveAttribute('href', publishedModbusRelease.releaseNotesUrl);
  await expect(scope.locator('.tool-download a')).toHaveCount(2);
}

async function expectGuideFits(page: Page) {
  const layout = await page.locator('.tool-guide').evaluate(guide => ({
    viewportWidth: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    clipped: Array.from(guide.querySelectorAll('h3, .tool-guide-section p, .tool-guide-section li')).flatMap(element => {
      const node = element as HTMLElement;
      const bounds = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return bounds.left < -1 || bounds.right > innerWidth + 1 || bounds.width <= 0 || bounds.height <= 0
        || node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1
        || parseFloat(style.lineHeight) < parseFloat(style.fontSize) * 1.4
        ? [{ tag: node.tagName, text: node.textContent?.slice(0, 60), left: bounds.left, right: bounds.right }]
        : [];
    }),
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.clipped).toEqual([]);
}

test('catalog, release notices and brief benefits have complete English and Russian translations', () => {
  const sources = new Set<string>();
  expect(toolGuides['modbus-check']).toHaveLength(1);
  expect(toolGuides['modbus-check'][0].id).toBe('benefits');
  expect(toolGuides['modbus-check'][0].paragraphs).toHaveLength(0);
  expect(toolGuides['modbus-check'][0].items).toHaveLength(4);
  expect(toolGuides['modbus-check'][0].ordered).not.toBe(true);
  for (const [slug, sections] of Object.entries(toolGuides)) {
    const ids = sections.map(section => section.id);
    expect(new Set(ids).size, `${slug}: unique section IDs`).toBe(ids.length);
    for (const section of sections) {
      expect(section.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(section.paragraphs.length + (section.items?.length ?? 0)).toBeGreaterThan(0);
      for (const source of [section.title, ...section.paragraphs, ...(section.items ?? [])]) {
        expect(source.trim()).not.toBe('');
        sources.add(source);
      }
    }
  }
  const entries = [
    ...[...sources].map(source => ({ source, translations: toolGuideTranslations[source] })),
    ...freeTools.map(tool => ({ source: tool.description, translations: freeToolTranslations[tool.description] })),
    ...Object.values(toolReleases).flatMap(releases => releases.flatMap(release => [
      ...(release.notice ? [release.notice] : []),
      ...release.changes.added, ...release.changes.improved, ...release.changes.fixed,
    ])).map(source => ({ source, translations: freeToolTranslations[source] })),
    ...['사전 공개', '공식 릴리스 안내', releaseNoticeLabel, detailedGuideLabel].map(source => ({ source, translations: freeToolTranslations[source] })),
  ];
  for (const { source, translations } of entries) for (const language of ['en', 'ru'] as const) {
    const translated = translations?.[language];
    expect(translated, `${language}: ${source}`).toEqual(expect.any(String));
    expect(translated.trim(), `${language}: ${source}`).not.toBe('');
    expect(translated, `${language}: untranslated source`).not.toBe(source);
    expect(translated, `${language}: Korean fallback`).not.toMatch(/[가-힣]/);
  }
});

// Synthetic metadata stays inside the test process and intercepted local responses.
// It is never written to the production release list or requested from GitHub.
const releaseFixtures: ToolRelease[] = [
  {
    version: 'test-new',
    releasedOn: '2026-01-02',
    download: {
      url: 'https://github.com/test-only/modbus-check-fixture/releases/download/test-new/ModbusCheck-test-new.exe',
      sha256: 'a'.repeat(64),
    },
    changes: { added: ['TEST added'], improved: ['TEST improved'], fixed: ['TEST fixed'] },
  },
  {
    version: 'test-old',
    download: {
      url: 'https://github.com/test-only/modbus-check-fixture/releases/download/test-old/ModbusCheck-test-old.exe',
      sha256: 'b'.repeat(64),
    },
    changes: { added: ['TEST previous'], improved: [], fixed: [] },
  },
];

test('only pinned GitHub release assets with SHA256 metadata enable downloads', () => {
  const download = releaseFixtures[0].download;
  expect(githubReleaseDownloadUrl(download)).toBe(download.url);
  expect(githubReleaseDownloadUrl({ ...download, sha256: download.sha256.toUpperCase() })).toBe(download.url);
  const encodedUrl = download.url.replace('/test-new/', '/test-new%2Bwindows/').replace('ModbusCheck-test-new.exe', 'ModbusCheck%20Setup.exe');
  expect(githubReleaseDownloadUrl({ ...download, url: encodedUrl })).toBe(encodedUrl);
  for (const url of [
    '',
    'https://drive.google.com/uc?export=download&id=test',
    download.url.replace('https:', 'http:'),
    download.url.replace('github.com', 'github.com.example.com'),
    download.url.replace('github.com', 'user:password@github.com'),
    download.url.replace('github.com', 'github.com:443'),
    `${download.url}?download=1`,
    `${download.url}#asset`,
    'https://github.com/test-only/modbus-check-fixture/releases/latest/download/ModbusCheck.exe',
    'https://github.com/test-only/modbus-check-fixture/releases/tag/test-new',
    'https://github.com/test-only/modbus-check-fixture/releases/download/test-new/',
    download.url.replace('/test-new/', '/test-new/extra/'),
    download.url.replace('/test-new/', '/./'),
    download.url.replace('/test-new/', '/%2e%2e/'),
    download.url.replace('/test-new/', '/test%2Fnew/'),
    download.url.replace('/test-new/', '/test%5Cnew/'),
    download.url.replace('ModbusCheck-test-new.exe', 'nested%2FModbusCheck.exe'),
    download.url.replace('ModbusCheck-test-new.exe', 'ModbusCheck%0A.exe'),
    download.url.replace('/test-new/', '/invalid%/'),
  ]) {
    expect(githubReleaseDownloadUrl({ ...download, url }), url).toBeNull();
  }
  for (const sha256 of ['', 'a'.repeat(63), 'a'.repeat(65), 'g'.repeat(64), ` ${download.sha256}`]) {
    expect(githubReleaseDownloadUrl({ ...download, sha256 }), `hash: ${sha256}`).toBeNull();
  }
});

test('published rc.7 metadata matches the verified asset and invalid latest metadata stays pending', () => {
  const published = latestToolRelease('modbus-check')!;
  expect(published).toMatchObject(publishedModbusRelease);
  expect(githubReleaseDownloadUrl(published.download)).toBe(publishedModbusRelease.download.url);
  expect(published.notice?.trim()).not.toBe('');
  expect(published.notice).toEqual(expect.any(String));
  expect(latestToolRelease('unknown')).toBeUndefined();
  toolReleases['test-only'] = [];
  try {
    expect(latestToolRelease('test-only')).toBeUndefined();
    toolReleases['test-only'] = releaseFixtures;
    expect(latestToolRelease('test-only')).toBe(releaseFixtures[0]);
    toolReleases['test-only'] = [
      { ...releaseFixtures[0], download: { ...releaseFixtures[0].download, sha256: '' } },
      releaseFixtures[1],
    ];
    expect(latestToolRelease('test-only')).toBeUndefined();
    toolReleases['test-only'][0] = {
      ...releaseFixtures[0],
      download: { ...releaseFixtures[0].download, url: 'https://example.com/unverified.exe' },
    };
    expect(latestToolRelease('test-only')).toBeUndefined();
  } finally { delete toolReleases['test-only']; }
});

test('free tools catalog and detail work across languages, history and narrow screens', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let assetRequests = 0;
  await page.route(publishedModbusRelease.download.url, async route => {
    assetRequests += 1;
    await route.abort();
  });
  const modbus = freeTools.find(tool => tool.slug === 'modbus-check')!;
  const labels = {
    ko: { heading: '무료 도구', detail: '소개 및 변경 내역', back: '무료 도구 목록' },
    en: { heading: 'Free tools', detail: 'Overview and release notes', back: 'All free tools' },
    ru: { heading: 'Бесплатные утилиты', detail: 'Описание и изменения', back: 'Все бесплатные утилиты' },
  };
  for (const language of ['ko', 'en', 'ru'] as const) {
    const description = language === 'ko' ? modbus.description : freeToolTranslations[modbus.description][language];
    await page.goto('/#free-tools');
    await page.evaluate(value => localStorage.setItem('oryx-language', value), language);
    await page.reload();
    const section = page.locator('#free-tools');
    const menu = page.locator('.menu-trigger');
    if (await menu.isVisible()) {
      await menu.click();
      await page.locator('#mobile-menu a[href="#free-tools"]').click();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    } else {
      await page.locator('.desktop-nav a[href="#free-tools"]').click();
    }
    await expect(section.getByRole('heading', { name: labels[language].heading, exact: true })).toBeVisible();
    await expect(section.locator('article')).toHaveCount(1);
    await expect(section.locator('.tool-card').getByText(description, { exact: true })).toBeVisible();
    await expectPublishedDownload(section, language);
    await expect(section.locator('a[href*="drive.google.com"]')).toHaveCount(0);
    const evidence = join(process.env.QA_EVIDENCE_DIR || 'review/free-tools-qa', 'screenshots');
    await mkdir(evidence, { recursive: true });
    await section.screenshot({ path: join(evidence, `${testInfo.project.name}-${language}-catalog.png`) });
    await section.getByRole('link', { name: labels[language].detail }).click();
    await expect(page).toHaveURL(/#free-tools\/modbus-check$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Modbus Check', exact: true })).toBeVisible();
    await expect(page.locator('.tool-lead')).toHaveText(description);
    await expectPublishedDownload(page.locator('.tool-detail'), language);
    const history = page.locator('.tool-history-details');
    await expect(history).not.toHaveAttribute('open');
    await history.locator('summary').click();
    await expect(history).toHaveAttribute('open', '');
    const releases = page.locator('.tool-releases > li');
    await expect(releases).toHaveCount(toolReleases['modbus-check'].length);
    await expect(releases.first().locator('h3')).toContainText(publishedModbusRelease.version);
    await expect(releases.first().locator('h3')).toContainText(translateFreeTool('사전 공개', language));
    await expect(releases.first().locator('time')).toHaveAttribute('datetime', publishedModbusRelease.releasedOn);
    await expect(releases.first().locator('.tool-checksum code')).toHaveText(publishedModbusRelease.download.sha256);
    await expect(releases.first().getByRole('link', { name: translateFreeTool('공식 릴리스 안내', language), exact: true })).toHaveAttribute('href', publishedModbusRelease.releaseNotesUrl);
    await expect(releases.locator('.tool-change li')).toHaveText(toolReleases['modbus-check'].flatMap(release => [
      ...release.changes.added, ...release.changes.improved, ...release.changes.fixed,
    ].map(source => translateFreeTool(source, language))));
    const guide = page.locator('.tool-guide');
    const guideSections = toolGuides['modbus-check'];
    await expect(guide.locator('.section-heading h2')).toBeVisible();
    await expect(guide.locator('.section-heading h2')).toHaveText(translateGuide(guideSections[0].title, language));
    await expect(guide.locator('.tool-guide-section')).toHaveCount(1);
    await expect(guide.locator('.tool-guide-section > p, h3')).toHaveCount(0);
    await expect(guide.locator('.tool-guide-section')).toHaveAttribute('aria-labelledby', 'tool-guide-benefits');
    await expect(guide.locator('ol, #tool-guide-quick-start')).toHaveCount(0);
    await expect(guide.locator('.tool-guide-section li')).toHaveCount(4);
    await expect(guide.locator('.tool-guide-section[aria-labelledby="tool-guide-benefits"] > ul')).toHaveCount(1);
    await expect(guide.locator('#tool-guide-benefits')).toHaveText(translateGuide(guideSections[0].title, language));
    await expect(guide.locator('.tool-guide-section > p')).toHaveText(guideSections.flatMap(section => section.paragraphs.map(source => translateGuide(source, language))));
    await expect(guide.locator('.tool-guide-section li')).toHaveText(guideSections.flatMap(section => (section.items ?? []).map(source => translateGuide(source, language))));
    await expect(guide.locator(`a[href="${detailedGuideUrl}"]`)).toHaveCount(1);
    await expect(guide.locator(`a[href="${detailedGuideUrl}"]`)).toBeVisible();
    await expect(guide.getByRole('link', { name: translateFreeTool(detailedGuideLabel, language), exact: true })).toHaveAttribute('href', detailedGuideUrl);
    await expect(guide.locator('img, video, iframe, canvas')).toHaveCount(0);
    expect(await page.locator('.tool-detail > section').evaluateAll(sections => sections.map(section => section.getAttribute('aria-labelledby')))).toEqual(['tool-guide-heading', 'tool-changelog-heading']);
    if (language !== 'ko') await expect(guide).not.toContainText(/[가-힣]/);
    await expectGuideFits(page);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Modbus Check' })).toBeVisible();
    await expectGuideFits(page);
    await guide.locator('#tool-guide-heading').scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(evidence, `${testInfo.project.name}-${language}-detail.png`) });
    const firstBenefit = guide.locator('.tool-guide-section li').first();
    const normalFontSize = await firstBenefit.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    expect(await firstBenefit.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeCloseTo(normalFontSize * 2, 1);
    await expectGuideFits(page);
    await expect(guide.locator('.tool-guide-section')).toHaveCount(guideSections.length);
    await guide.locator('.tool-guide-section li').last().scrollIntoViewIfNeeded();
    await expect(guide.locator('.tool-guide-section li').last()).toBeInViewport();
    await page.locator('#tool-changelog-heading').scrollIntoViewIfNeeded();
    await expect(page.locator('#tool-changelog-heading')).toBeInViewport();
    await expectPublishedDownload(page.locator('.tool-detail'), language);
    if (language === 'ru') {
      await firstBenefit.scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(evidence, `${testInfo.project.name}-${language}-guide-200-percent.png`) });
    }
    await page.evaluate(() => document.documentElement.style.fontSize = '');
    await page.getByRole('link', { name: labels[language].back, exact: true }).click();
    await expect(page.locator('#free-tools-heading')).toBeInViewport();
    await expect(page).not.toHaveTitle(/Modbus Check/);
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Modbus Check' })).toBeVisible();
  }
  await page.goto('/#free-tools/unknown');
  await expect(page.locator('.tool-detail h1')).toBeVisible();
  await expect(page.locator('.tool-download')).toHaveCount(0);
  await expect(page.locator('.tool-guide')).toHaveCount(0);
  expect(assetRequests).toBe(0);
  expect(errors).toEqual([]);
});

test('local release fixtures cover shared downloads, translated history and pending fallbacks', async ({ page }) => {
  test.skip(Boolean(process.env.E2E_BASE_URL), 'Synthetic release metadata is only injected into the local Vite module.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let releaseModuleRequests = 0;
  let assetRequests = 0;
  let fixtureReleases = releaseFixtures;
  await page.route('https://github.com/**', async route => {
    assetRequests += 1;
    await route.abort();
  });
  await page.route(/\/data\/freeTools\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    const source = await response.text();
    releaseModuleRequests += 1;
    await route.fulfill({
      response,
      body: `${source}\ntoolReleases['modbus-check'] = ${JSON.stringify(fixtureReleases)};\n`,
    });
  });
  const labels = {
    ko: { download: '최신 버전 다운로드', detail: '소개 및 변경 내역', added: '추가', improved: '개선', fixed: '수정' },
    en: { download: 'Download latest version', detail: 'Overview and release notes', added: 'Added', improved: 'Improved', fixed: 'Fixed' },
    ru: { download: 'Скачать последнюю версию', detail: 'Описание и изменения', added: 'Добавлено', improved: 'Улучшено', fixed: 'Исправлено' },
  };
  for (const language of ['ko', 'en', 'ru'] as const) {
    fixtureReleases = releaseFixtures;
    await page.goto('/#free-tools');
    await page.evaluate(value => localStorage.setItem('oryx-language', value), language);
    await page.reload();
    const catalog = page.locator('#free-tools');
    await expect(catalog.getByRole('link', { name: labels[language].download, exact: true })).toHaveAttribute('href', releaseFixtures[0].download.url);
    await expect(catalog.locator('.tool-download')).toContainText('test-new');
    await expect(catalog.locator('.tool-release-notice')).toHaveCount(0);
    await expect(catalog.locator('a[href*="drive.google.com"]')).toHaveCount(0);
    await catalog.getByRole('link', { name: labels[language].detail, exact: true }).click();
    const detail = page.locator('.tool-detail');
    await expect(detail.getByRole('link', { name: labels[language].download, exact: true })).toHaveAttribute('href', releaseFixtures[0].download.url);
    await expect(detail.locator('.tool-release-notice')).toHaveCount(0);
    await expect(detail.locator('.tool-history-details')).not.toHaveAttribute('open');
    await detail.locator('.tool-history-details > summary').click();
    const releases = detail.locator('.tool-releases > li');
    await expect(releases).toHaveCount(2);
    await expect(releases.locator('h3')).toHaveText(['test-new', 'test-old']);
    await expect(releases.first().locator('time')).toHaveAttribute('datetime', '2026-01-02');
    await expect(releases.last().locator('time')).toHaveCount(0);
    await expect(releases.first().locator('h4')).toHaveText([labels[language].added, labels[language].improved, labels[language].fixed]);
    await expect(releases.first().locator('.tool-change li')).toHaveText(['TEST added', 'TEST improved', 'TEST fixed']);
    await expect(releases.last().locator('h4')).toHaveText([labels[language].added]);
    await page.reload();
    await expect(page.locator('.tool-download a')).toHaveAttribute('href', releaseFixtures[0].download.url);
    const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
    // A broken newest entry must not silently offer an older installer as latest.
    fixtureReleases = [
      { ...releaseFixtures[0], download: { ...releaseFixtures[0].download, sha256: '' } },
      releaseFixtures[1],
    ];
    await page.reload();
    await expect(page.getByRole('button', { name: translateFreeTool('다운로드 준비 중', language), exact: true })).toBeDisabled();
    await expect(page.locator('.tool-download a')).toHaveCount(0);
    await expect(page.locator('.tool-releases h3')).toHaveText(['test-old']);
  }
  fixtureReleases = [];
  await page.reload();
  await expect(page.getByRole('button', { name: translateFreeTool('다운로드 준비 중', 'ru'), exact: true })).toBeDisabled();
  await expect(page.locator('.tool-download a, .tool-releases')).toHaveCount(0);
  expect(releaseModuleRequests).toBeGreaterThan(0);
  expect(assetRequests).toBe(0);
  expect(errors).toEqual([]);
});

test('live catalog click downloads the verified rc.7 installer', async ({ page }, testInfo) => {
  test.skip(process.env.E2E_BASE_URL !== 'https://oryxdatasafe.co.kr' || testInfo.project.name !== 'desktop-1440', 'Run one real user download only against the production domain in the desktop project.');
  test.setTimeout(120_000);
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  const evidenceRoot = join(process.env.QA_EVIDENCE_DIR || 'review/free-tools-qa', 'downloads');
  await mkdir(evidenceRoot, { recursive: true });
  const temporary = await mkdtemp(join(tmpdir(), 'modbus-live-download-'));
  const evidence: Record<string, unknown> = {
    sourcePage: 'https://oryxdatasafe.co.kr/#free-tools',
    url: publishedModbusRelease.download.url,
    browserErrors,
    outcome: 'pending',
  };
  try {
    await page.addInitScript(() => localStorage.setItem('oryx-language', 'ko'));
    await page.goto('/#free-tools');
    const catalog = page.locator('#free-tools');
    const catalogDownload = catalog.getByRole('link', { name: '최신 버전 다운로드', exact: true });
    await expect(catalogDownload).toHaveAttribute('href', publishedModbusRelease.download.url);
    evidence.catalogHref = await catalogDownload.getAttribute('href');
    await catalog.getByRole('link', { name: '소개 및 변경 내역', exact: true }).click();
    const detailDownload = page.locator('.tool-detail .tool-download a.button');
    await expect(detailDownload).toHaveAttribute('href', publishedModbusRelease.download.url);
    evidence.detailHref = await detailDownload.getAttribute('href');
    expect(evidence.detailHref).toBe(evidence.catalogHref);
    await page.getByRole('link', { name: '무료 도구 목록', exact: true }).click();
    await expect(catalogDownload).toBeVisible();
    await catalog.locator('.tool-card').screenshot({ path: join(evidenceRoot, 'live-user-download-catalog.png') });
    evidence.screenshot = 'live-user-download-catalog.png';
    // This page has no request interception: use the actual site's download button.
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 90_000 }),
      catalogDownload.click(),
    ]);
    evidence.filename = download.suggestedFilename();
    await download.saveAs(join(temporary, 'installer.exe'));
    const bytes = await readFile(join(temporary, 'installer.exe'));
    evidence.size = bytes.length;
    evidence.sha256 = createHash('sha256').update(bytes).digest('hex');
    evidence.downloadFailure = await download.failure();
    await download.delete();
    expect(evidence.filename).toBe('ModbusCheck-0.2.0-rc.7-Setup-win-x64.exe');
    expect(evidence.size).toBe(35_030_462);
    expect(evidence.sha256).toBe(publishedModbusRelease.download.sha256);
    expect(evidence.downloadFailure).toBeNull();
    expect(browserErrors).toEqual([]);
    evidence.outcome = 'passed';
  } catch (error) {
    evidence.outcome = 'failed';
    evidence.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await writeFile(join(evidenceRoot, 'live-user-download.json'), `${JSON.stringify(evidence)}\n`);
  }
});
