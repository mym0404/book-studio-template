import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import 'katex/dist/katex.css';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { READER_SETTINGS_SCRIPT } from '@/lib/reader-settings';
import { appDescription, appName, getMetadataBase } from '@/lib/shared';

const wantedSans = localFont({
  src: './fonts/wanted-sans/WantedSansVariable.woff2',
  variable: '--font-wanted-sans',
  display: 'swap',
  weight: '400 1000',
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  applicationName: appName,
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: appDescription,
  robots: {
    follow: false,
    index: false,
    nocache: true,
  },
  openGraph: {
    title: appName,
    description: appDescription,
    siteName: appName,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: appName,
    description: appDescription,
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={wantedSans.variable} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: The request-independent bootstrap applies stored settings before first paint.
          dangerouslySetInnerHTML={{ __html: READER_SETTINGS_SCRIPT }}
          suppressHydrationWarning
        />
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
