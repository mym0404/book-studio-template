import { readFile } from 'node:fs/promises';
import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import postgres from 'postgres';
import { SESSION_COOKIE_NAME } from '../../feature/auth/constants';

test.beforeEach(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('E2E database is not configured');

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const migration = await readFile('db/migrations/001_initial.sql', 'utf8');

    await sql.unsafe(migration);
    await sql.unsafe(
      'TRUNCATE auth_challenges, auth_sessions, owner_auth RESTART IDENTITY CASCADE',
    );
  } finally {
    await sql.end();
  }
});

const registerOwner = async ({
  context,
  page,
}: {
  context: BrowserContext;
  page: Page;
}) => {
  const setupToken = process.env.OWNER_SETUP_TOKEN;
  if (!setupToken) throw new Error('E2E setup token is not configured');

  await context.credentials.install();
  await page.goto('/sign-in');
  await page.getByLabel('Owner setup token').fill(setupToken);
  await page.getByRole('button', { name: 'Set up owner passkey' }).click();

  await expect(page).toHaveURL('/docs/sample-book', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
};

test('registers and reuses the owner passkey', async ({ context, page }) => {
  await registerOwner({ context, page });

  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === SESSION_COOKIE_NAME,
    ),
  ).toBe(true);

  await context.clearCookies();
  await page.goto('/docs/sample-book');
  await expect(page).toHaveURL('/sign-in');

  await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
  await expect(page).toHaveURL('/docs/sample-book');
});

test('hides the mobile table of contents while scrolling', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 417, height: 733 });
  await registerOwner({ context, page });

  const toc = page.locator('[data-toc-popover]');
  const tocTrigger = page.locator('[data-toc-popover-trigger]');

  await tocTrigger.click();
  await expect(tocTrigger).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.move(200, 600);
  await page.mouse.wheel(0, 400);
  await expect(toc).toHaveCSS('opacity', '0');

  await page.mouse.wheel(0, -300);
  await expect(toc).toHaveCSS('opacity', '1');
  await tocTrigger.click();
  await expect(tocTrigger).toHaveAttribute('aria-expanded', 'false');
  await page.mouse.move(200, 600);
  await page.mouse.wheel(0, 300);
  await expect(toc).toHaveCSS('opacity', '0');
});
