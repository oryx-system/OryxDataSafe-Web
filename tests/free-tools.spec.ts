import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { driveDownloadUrl, latestToolRelease, toolReleases } from '../data/freeTools';

test('latest release uses the newest verified file and keeps Google checks intact', () => {
  expect(latestToolRelease('modbus-check')).toBeUndefined();
  expect(driveDownloadUrl('')).toBeNull();
  expect(driveDownloadUrl('https://drive.google.com/file/d/test/view')).toBeNull();
  toolReleases['test-only'] = [
    { version: 'test-new', driveFileId: 'test_file_new', changes: { added: ['test'], improved: [], fixed: [] } },
    { version: 'test-old', driveFileId: 'test_file_old', changes: { added: [], improved: [], fixed: [] } },
  ];
  try {
    const latest = latestToolRelease('test-only')!;
    expect(latest.version).toBe('test-new');
    const url = new URL(driveDownloadUrl(latest.driveFileId)!);
    expect(url.origin + url.pathname).toBe('https://drive.google.com/uc');
    expect([...url.searchParams.keys()].sort()).toEqual(['export', 'id']);
    expect(url.searchParams.get('export')).toBe('download');
    expect(url.searchParams.get('id')).toBe('test_file_new');
  } finally { delete toolReleases['test-only']; }
});

test('free tools catalog and detail work across languages, history and narrow screens', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const labels = {
    ko: { heading: '무료 도구', detail: '소개 및 변경 내역', back: '무료 도구 목록', pending: '다운로드 준비 중' },
    en: { heading: 'Free tools', detail: 'Overview and release notes', back: 'All free tools', pending: 'Download coming soon' },
    ru: { heading: 'Бесплатные утилиты', detail: 'Описание и изменения', back: 'Все бесплатные утилиты', pending: 'Загрузка готовится' },
  };
  for (const language of ['ko', 'en', 'ru'] as const) {
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
    await expect(section.getByRole('button', { name: labels[language].pending })).toBeDisabled();
    await expect(section.locator('a[href*="drive.google.com"]')).toHaveCount(0);
    const evidence = join(process.env.QA_EVIDENCE_DIR || 'review/free-tools-qa', 'screenshots');
    await mkdir(evidence, { recursive: true });
    await section.screenshot({ path: join(evidence, `${testInfo.project.name}-${language}-catalog.png`) });
    await section.getByRole('link', { name: labels[language].detail }).click();
    await expect(page).toHaveURL(/#free-tools\/modbus-check$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Modbus Check', exact: true })).toBeVisible();
    await expect(page.locator('.tool-releases')).toHaveCount(0);
    await expect(page.getByRole('button', { name: labels[language].pending })).toBeDisabled();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Modbus Check' })).toBeVisible();
    const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
    await page.screenshot({ path: join(evidence, `${testInfo.project.name}-${language}-detail.png`), fullPage: true });
    await page.getByRole('link', { name: labels[language].back, exact: true }).click();
    await expect(page.locator('#free-tools-heading')).toBeInViewport();
    await expect(page).not.toHaveTitle(/Modbus Check/);
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Modbus Check' })).toBeVisible();
  }
  await page.goto('/#free-tools/unknown');
  await expect(page.locator('.tool-detail h1')).toBeVisible();
  await expect(page.locator('.tool-download')).toHaveCount(0);
  expect(errors).toEqual([]);
});
