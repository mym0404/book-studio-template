import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { SESSION_COOKIE_NAME } from '../../feature/auth/constants';

test.beforeAll(async () => {
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

test('registers and reuses the owner passkey', async ({ context, page }) => {
  const setupToken = process.env.OWNER_SETUP_TOKEN;
  if (!setupToken) throw new Error('E2E setup token is not configured');

  await context.credentials.install();
  await page.goto('/sign-in');
  await page.getByLabel('Owner setup token').fill(setupToken);
  await page.getByRole('button', { name: 'Set up owner passkey' }).click();

  await expect(page).toHaveURL('/docs/sample-book');
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
