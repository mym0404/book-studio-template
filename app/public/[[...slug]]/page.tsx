import { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import {
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getAnnotations } from '@/feature/annotations/repositories/annotations';
import { PublicPageAnnotations } from '@/feature/annotations/ui/public-page-annotations';
import { docsRoute } from '@/feature/common/app';
import { source } from '@/feature/library/source';
import readerStyles from '@/feature/reading/ui/reader-settings.module.css';
import { ReaderSettingsControl } from '@/feature/reading/ui/reader-settings-control';
import { ReaderSettingsProvider } from '@/feature/reading/ui/reader-settings-provider';
import { getPublicAssetContentDigest } from '@/feature/sharing/public-assets';
import { getShareablePage } from '@/feature/sharing/public-page';
import { getPublicPageAssetSecret } from '@/feature/sharing/repositories/public-pages';
import { getPublicMDXComponents } from '@/feature/sharing/ui/public-mdx';

export const dynamic = 'force-dynamic';

const getPublishedPage = cache(async (slugPath: string) => {
  const shareablePage = getShareablePage({
    pageUrl: `${docsRoute}/${slugPath}`,
  });
  const assetSecret = shareablePage
    ? await getPublicPageAssetSecret({ pageUrl: shareablePage.page.url })
    : undefined;

  if (!shareablePage || !assetSecret) {
    return undefined;
  }

  return { assetSecret, page: shareablePage.page };
});

const PublicPage = async (props: PageProps<'/public/[[...slug]]'>) => {
  const params = await props.params;
  const publishedPage = await getPublishedPage(params.slug?.join('/') ?? '');

  if (!publishedPage) notFound();

  const { assetSecret, page } = publishedPage;

  const bookTitle = source.getPage([page.slugs[0]])?.data.title;

  if (typeof bookTitle !== 'string') notFound();

  const [annotations, processedContent] = await Promise.all([
    getAnnotations({ pageUrl: page.url }),
    page.data.getText('processed'),
  ]);
  const contentDigest = getPublicAssetContentDigest({
    content: processedContent,
  });
  const MDX = page.data.body;

  return (
    <ReaderSettingsProvider>
      <main
        className={`${readerStyles.readerLayout} mx-auto min-h-screen w-full max-w-4xl px-4 py-10 md:px-8 md:py-16`}
      >
        <div className={'mb-6 flex items-center justify-end gap-2'}>
          <ReaderSettingsControl />
          <ThemeSwitch />
        </div>
        <article className={'flex flex-col gap-5'}>
          <header className={'flex flex-col gap-2'}>
            <DocsTitle>{bookTitle}</DocsTitle>
            {page.data.title !== bookTitle && (
              <h2 className={'text-xl font-semibold'}>{page.data.title}</h2>
            )}
            <DocsDescription className={'mb-0'}>
              {page.data.description}
            </DocsDescription>
          </header>
          {page.data.toc.length > 0 && (
            <InlineTOC defaultOpen={true} items={page.data.toc} />
          )}
          <DocsBody data-reading-content={true}>
            <MDX
              components={getPublicMDXComponents({
                assetSecret,
                contentDigest,
                pageUrl: page.url,
              })}
            />
          </DocsBody>
        </article>
        <PublicPageAnnotations annotations={annotations} />
      </main>
    </ReaderSettingsProvider>
  );
};

export const generateMetadata = async (
  props: PageProps<'/public/[[...slug]]'>,
): Promise<Metadata> => {
  const params = await props.params;
  const publishedPage = await getPublishedPage(params.slug?.join('/') ?? '');

  if (!publishedPage) notFound();

  const { page } = publishedPage;

  return {
    description: page.data.description,
    openGraph: {
      description: page.data.description,
      title: page.data.title,
      type: 'article',
    },
    title: page.data.title,
    twitter: {
      card: 'summary',
      description: page.data.description,
      title: page.data.title,
    },
  };
};

export default PublicPage;
