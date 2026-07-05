import { expect, test } from '@playwright/test';
import { mockJikan } from './fixtures';

test.describe('Seasonal Random Anime (e2e, mocked Jikan)', () => {
  test.beforeEach(async ({ page }) => {
    await mockJikan(page);
    await page.goto('./');
  });

  test('loads the season and shows default match count', async ({ page }) => {
    await expect(page.getByText('🎌 Seasonal Random Anime')).toBeVisible();
    // Defaults match only "Default Match" (TV, 12 eps, Action, 24 min).
    await expect(page.getByTestId('match-count')).toHaveText('1');
  });

  test('filter interactions update the match count', async ({ page }) => {
    await expect(page.getByTestId('match-count')).toHaveText('1');
    await page.getByRole('button', { name: 'All' }).click();
    await expect(page.getByTestId('match-count')).toHaveText('4');
    await page.getByRole('button', { name: 'None' }).click();
    await expect(page.getByTestId('match-count')).toHaveText('0');
    await page.getByRole('button', { name: 'Defaults' }).click();
    await expect(page.getByTestId('match-count')).toHaveText('1');
    await page.getByLabel('TV', { exact: true }).uncheck();
    await expect(page.getByTestId('match-count')).toHaveText('0');
  });

  test('picks a random anime and renders the full card', async ({ page }) => {
    await expect(page.getByTestId('match-count')).toHaveText('1');
    await page.getByRole('button', { name: 'Pick Random Anime' }).click();
    const card = page.getByTestId('anime-card');
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card.getByText('Default Match')).toBeVisible();
    await expect(card.getByText('📈 Statistics')).toBeVisible();
    await expect(card.getByText('Studio E2E')).toBeVisible();
    await expect(card.getByRole('link', { name: 'View on MyAnimeList' })).toHaveAttribute(
      'href',
      'https://myanimelist.net/anime/1'
    );
    await expect(card.getByRole('link', { name: '🎬 Watch Trailer' })).toBeVisible();
  });

  test('cycles gallery images on click', async ({ page }) => {
    await page.getByRole('button', { name: 'Pick Random Anime' }).click();
    const card = page.getByTestId('anime-card');
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card.locator('.image-counter')).toContainText('1 /');
    await card.locator('.anime-image').click();
    await expect(card.locator('.image-counter')).toContainText('2 /');
  });

  test('avoids continuations when picking', async ({ page }) => {
    await mockJikan(page, { prequelIds: [2, 3, 4] });
    await page.goto('./');
    await page.getByRole('button', { name: 'All' }).click();
    await expect(page.getByTestId('match-count')).toHaveText('4');
    await page.getByRole('button', { name: 'Pick Random Anime' }).click();
    const card = page.getByTestId('anime-card');
    await expect(card).toBeVisible({ timeout: 20000 });
    await expect(card.getByText('Default Match')).toBeVisible();
  });

  test('shows a notice when no titles match filters', async ({ page }) => {
    await page.getByRole('button', { name: 'None' }).click();
    await page.getByRole('button', { name: 'Pick Random Anime' }).click();
    await expect(page.getByText('No titles match your current filters')).toBeVisible();
  });

  test('switching season reloads data', async ({ page }) => {
    await expect(page.getByTestId('match-count')).toHaveText('1');
    await page.getByLabel('Select Season').selectOption('winter');
    await expect(page.getByText(/Winter \d{4}/).first()).toBeVisible();
    await expect(page.getByTestId('match-count')).toHaveText('1');
  });

  test('sidebar toggle collapses the settings panel', async ({ page }) => {
    const toggle = page.getByRole('button', { name: '☰' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('links to the legacy version', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Legacy version' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/seasonal-random-anime/legacy/');
  });
});
