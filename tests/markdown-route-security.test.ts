import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('private Markdown route', () => {
  const route = readFileSync(
    resolve('app/llms.mdx/docs/[[...slug]]/route.ts'),
    'utf8',
  );
  const nextConfig = readFileSync(resolve('next.config.mjs'), 'utf8');

  it('enforces authorization and disables shared caching', () => {
    assert.match(route, /export const dynamic = 'force-dynamic'/);
    assert.match(route, /requireOwnerRequest\(request\)/);
    assert.match(route, /withPrivateNoStore\(/);
    assert.doesNotMatch(route, /generateStaticParams/);
    assert.doesNotMatch(route, /export const revalidate/);
    assert.match(nextConfig, /'\/llms\.mdx\/:path\*'/);
  });
});
