import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
} from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import { ReadingProgress } from '@/components/reading-progress';
import { SharePageButton } from '@/components/share-page-button';
import { requireOwnerPage } from '@/lib/auth/session';
import { getPublicPageUrl, getShareablePage } from '@/lib/public-page';
import { isPagePublic } from '@/lib/public-pages';
import {
  getBookSlugForPathname,
  getReadingProgressTarget,
} from '@/lib/reading-progress';
import { appName } from '@/lib/shared';
import { getPageImage, getPageMarkdownUrl, source } from '@/lib/source';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  await requireOwnerPage();

  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const readingProgressTarget = getReadingProgressTarget({
    pathname: page.url,
  });
  const bookSlug = getBookSlugForPathname({ pathname: page.url });
  const shareablePage = getShareablePage({ pageUrl: page.url });
  const publicUrl = shareablePage
    ? getPublicPageUrl({ pageUrl: page.url })
    : undefined;
  const initialIsPublic = shareablePage
    ? await isPagePublic({ pageUrl: page.url })
    : false;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">
        {page.data.description}
      </DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        {publicUrl && (
          <SharePageButton
            initialIsPublic={initialIsPublic}
            pageUrl={page.url}
            publicUrl={publicUrl}
          />
        )}
      </div>
      <DocsBody data-reading-content>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
      <ReadingProgress
        bookSlug={bookSlug}
        isBookChapter={Boolean(readingProgressTarget)}
        pathname={page.url}
      />
    </DocsPage>
  );
}

export async function generateMetadata(
  props: PageProps<'/docs/[[...slug]]'>,
): Promise<Metadata> {
  await requireOwnerPage();

  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const imageUrl = getPageImage(page).url;

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      siteName: appName,
      locale: 'en_US',
      type: 'article',
      images: imageUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.data.title,
      description: page.data.description,
      images: imageUrl,
    },
  };
}
