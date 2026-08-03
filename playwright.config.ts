import { randomBytes } from 'node:crypto';
import { defineConfig } from '@playwright/test';

const baseURL = 'http://localhost:3100';
const ownerSetupToken =
  process.env.E2E_OWNER_SETUP_TOKEN ?? randomBytes(32).toString('base64url');

Object.assign(process.env, {
  AUTH_MODE: 'passkey',
  DATABASE_URL:
    'postgresql://book_studio:book_studio@localhost:5432/book_studio_e2e',
  E2E_OWNER_SETUP_TOKEN: ownerSetupToken,
  OWNER_SETUP_TOKEN: ownerSetupToken,
  PLAYWRIGHT_NO_COPY_PROMPT: '1',
  SITE_URL: baseURL,
});

export default defineConfig({
  outputDir: 'output/playwright/test-results',
  testDir: 'tests/e2e',
  use: { baseURL },
  webServer: {
    command: 'pnpm exec next dev --port 3100',
    reuseExistingServer: false,
    url: baseURL,
  },
  workers: 1,
});
