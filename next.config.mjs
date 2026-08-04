import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output:
    process.env.BOOK_STUDIO_OUTPUT === 'standalone' ? 'standalone' : undefined,
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/books/*': ['./content-assets/books/**/*'],
    '/public-assets/*': ['./content-assets/books/**/*'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
      ...[
        '/docs/:path*',
        '/api/search',
        '/books/:path*',
        '/llms.mdx/:path*',
      ].map((source) => ({
        source,
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store',
          },
        ],
      })),
      ...['/public/:path*', '/public-assets/:path*'].map((source) => ({
        source,
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      })),
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/docs/sample-book',
        permanent: false,
      },
      {
        source: '/docs',
        destination: '/docs/sample-book',
        permanent: false,
      },
    ];
  },
};

export default withMDX(config);
