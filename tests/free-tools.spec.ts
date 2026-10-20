import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { freeTools, githubReleaseDownloadUrl, latestToolRelease, toolReleases, type ToolRelease } from '../data/freeTools';
import { toolGuides } from '../data/toolGuides';
import { freeToolTranslations } from '../i18n/freeTools';
import { toolGuideTranslations } from '../i18n/toolGuides';

const guideHeading = '사용 안내';
const guideIntroduction = '설치와 연결 설정부터 데이터 확인·기록까지, 사용 전에 알아둘 내용을 안내합니다.';
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
  await expect(scope.locator('.tool-download a')).toHaveCount(1);
  await expect(scope.getByRole('link', { name: translateFreeTool('최신 버전 다운로드', language), exact: true })).toHaveAttribute('href', publishedModbusRelease.download.url);
  await expect(scope.locator('.tool-download')).toContainText(publishedModbusRelease.version);
  await expect(scope.locator('.tool-download')).toContainText(translateFreeTool('사전 공개', language));
  await expect(scope.locator('.tool-download button')).toHaveCount(0);
  const notice = latestToolRelease('modbus-check')!.notice!;
  await expect(scope.locator('.tool-release-notice')).toHaveText(translateFreeTool(notice, language));
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

test('catalog, release notices and every guide section have complete English and Russian translations', () => {
  const sources = new Set([guideHeading, guideIntroduction]);
  expect(toolGuides['modbus-check'].length).toBeGreaterThan(0);
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
    ...['사전 공개', '공식 릴리스 안내'].map(source => ({ source, translations: freeToolTranslations[source] })),
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
    await expect(guide.getByRole('heading', { level: 2, name: translateGuide(guideHeading, language), exact: true })).toBeVisible();
    await expect(guide.locator('.section-heading > p').last()).toHaveText(translateGuide(guideIntroduction, language));
    await expect(guide.locator('.tool-guide-section')).toHaveCount(guideSections.length);
    await expect(guide.locator('.tool-guide-section').nth(0)).toHaveAttribute('aria-labelledby', 'tool-guide-benefits');
    await expect(guide.locator('.tool-guide-section').nth(1)).toHaveAttribute('aria-labelledby', 'tool-guide-quick-start');
    const quickStart = guide.locator('.tool-guide-section[aria-labelledby="tool-guide-quick-start"]');
    await expect(quickStart.locator(':scope > ol')).toHaveCount(1);
    await expect(quickStart.locator(':scope > ol > li')).toHaveCount(5);
    await expect(quickStart.locator(':scope > ul')).toHaveCount(0);
    await expect(guide.locator('.tool-guide-section[aria-labelledby="tool-guide-benefits"] > ul')).toHaveCount(1);
    await expect(guide.locator('.tool-guide-section h3')).toHaveText(guideSections.map(section => translateGuide(section.title, language)));
    await expect(guide.locator('.tool-guide-section > p')).toHaveText(guideSections.flatMap(section => section.paragraphs.map(source => translateGuide(source, language))));
    await expect(guide.locator('.tool-guide-section li')).toHaveText(guideSections.flatMap(section => (section.items ?? []).map(source => translateGuide(source, language))));
    await expect(guide.locator('img, video, iframe, canvas')).toHaveCount(0);
    expect(await page.locator('.tool-detail > section').evaluateAll(sections => sections.map(section => section.getAttribute('aria-labelledby')))).toEqual(['tool-guide-heading', 'tool-changelog-heading']);
    if (language !== 'ko') await expect(guide).not.toContainText(/[가-힣]/);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Modbus Check' })).toBeVisible();
    await expectGuideFits(page);
    await guide.getByRole('heading', { level: 3 }).first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(evidence, `${testInfo.project.name}-${language}-detail.png`) });
    const firstParagraph = guide.locator('.tool-guide-section p').first();
    const normalFontSize = await firstParagraph.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    expect(await firstParagraph.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeCloseTo(normalFontSize * 2, 1);
    await expectGuideFits(page);
    await expect(guide.locator('.tool-guide-section')).toHaveCount(guideSections.length);
    await guide.getByRole('heading', { level: 3 }).last().scrollIntoViewIfNeeded();
    await expect(guide.getByRole('heading', { level: 3 }).last()).toBeInViewport();
    await page.locator('#tool-changelog-heading').scrollIntoViewIfNeeded();
    await expect(page.locator('#tool-changelog-heading')).toBeInViewport();
    await expectPublishedDownload(page.locator('.tool-detail'), language);
    if (language === 'ru') {
      await guide.getByRole('heading', { level: 3 }).first().scrollIntoViewIfNeeded();
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
    ko: { download: '최신 버전 다운로드', detail: '소개 및 변경 내역', added: '추가', improved: '개선', fixed: '수정', note: '설치 파일은 GitHub Releases에서 다운로드됩니다.' },
    en: { download: 'Download latest version', detail: 'Overview and release notes', added: 'Added', improved: 'Improved', fixed: 'Fixed', note: 'The installer is downloaded from GitHub Releases.' },
    ru: { download: 'Скачать последнюю версию', detail: 'Описание и изменения', added: 'Добавлено', improved: 'Улучшено', fixed: 'Исправлено', note: 'Установщик загружается из GitHub Releases.' },
  };
  for (const language of ['ko', 'en', 'ru'] as const) {
    fixtureReleases = releaseFixtures;
    await page.goto('/#free-tools');
    await page.evaluate(value => localStorage.setItem('oryx-language', value), language);
    await page.reload();
    const catalog = page.locator('#free-tools');
    await expect(catalog.getByRole('link', { name: labels[language].download, exact: true })).toHaveAttribute('href', releaseFixtures[0].download.url);
    await expect(catalog.locator('.tool-download')).toContainText('test-new');
    await expect(catalog.getByText(labels[language].note, { exact: true })).toBeVisible();
    await expect(catalog.locator('a[href*="drive.google.com"]')).toHaveCount(0);
    await catalog.getByRole('link', { name: labels[language].detail, exact: true }).click();
    const detail = page.locator('.tool-detail');
    await expect(detail.getByRole('link', { name: labels[language].download, exact: true })).toHaveAttribute('href', releaseFixtures[0].download.url);
    await expect(detail.getByText(labels[language].note, { exact: true })).toBeVisible();
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
