import {
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
} from 'fumadocs-ui/layouts/docs/page';
import { BookOpen, Globe, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  getBookTitle,
  getPageTitle,
  getSavedHighlightGroups,
  getSavedHighlightsMarkdown,
  getSavedHighlightsMarkdownVersion,
} from '@/feature/annotations/logic/saved-highlights';
import { getAnnotationsForBook } from '@/feature/annotations/repositories/annotations';
import { SavedHighlights } from '@/feature/annotations/ui/saved-highlights';
import { requireOwnerPage } from '@/feature/auth/session';
import { docsContentRoute } from '@/feature/common/app';
import { isBookSlug } from '@/feature/library/books';
import { getBookPageUrls } from '@/feature/library/source';
import { getReadingProgressForBook } from '@/feature/reading/repositories/reading-progress';
import { getPublicPageUrl } from '@/feature/sharing/public-page';
import { getPublishedPageUrlsForBook } from '@/feature/sharing/repositories/public-pages';
import { SharePageButton } from '@/feature/sharing/ui/share-page-button';

const SavedItem = ({
  children,
  href,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  href: string;
  icon: LucideIcon;
  title: string;
}) => (
  <Link
    className={
      'flex items-center gap-3 rounded-xl border bg-fd-card px-3 py-2.5 text-start transition-colors hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring'
    }
    href={href}
  >
    <span
      className={
        'flex size-8 shrink-0 items-center justify-center rounded-lg bg-fd-secondary text-fd-muted-foreground'
      }
    >
      <Icon aria-hidden={'true'} className={'size-4'} />
    </span>
    <span className={'flex min-w-0 flex-1 flex-col gap-0.5'}>
      <span className={'truncate text-sm font-medium text-fd-foreground'}>
        {title}
      </span>
      {children}
    </span>
  </Link>
);

const SavedSection = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => {
  const id = `saved-${title.toLowerCase().replaceAll(' ', '-')}`;

  return (
    <section className={'flex flex-col gap-3'} aria-labelledby={id}>
      <h2 className={'text-lg font-semibold'} id={id}>
        {title}
      </h2>
      {children}
    </section>
  );
};

const SavedPage = async (props: PageProps<'/docs/[bookSlug]/saved'>) => {
  await requireOwnerPage();

  const { bookSlug } = await props.params;

  if (!isBookSlug(bookSlug)) notFound();

  const [progress, annotations, publishedPageUrls] = await Promise.all([
    getReadingProgressForBook({ bookSlug }),
    getAnnotationsForBook({ bookSlug }),
    getPublishedPageUrlsForBook({ bookSlug }),
  ]);
  const bookTitle = getBookTitle({ bookSlug });

  if (!bookTitle) notFound();

  const annotationGroups = getSavedHighlightGroups({
    annotations,
    bookSlug,
  });
  const markdown = getSavedHighlightsMarkdown({
    bookTitle,
    groups: annotationGroups,
  });
  const markdownVersion = getSavedHighlightsMarkdownVersion({ markdown });
  const markdownUrl = `${docsContentRoute}/${bookSlug}/saved/content.md?v=${markdownVersion}`;
  const publishedPages = getBookPageUrls({ bookSlug })
    .filter((pageUrl) => publishedPageUrls.includes(pageUrl))
    .map((pageUrl) => ({ pageUrl, title: getPageTitle({ pageUrl }) }));

  return (
    <DocsPage
      footer={{ enabled: false }}
      tableOfContent={{ enabled: false }}
      tableOfContentPopover={{ enabled: false }}
    >
      <DocsTitle>Saved</DocsTitle>
      <DocsDescription
        className={annotationGroups.length > 0 ? 'mb-0' : undefined}
      >
        Your reading progress, published pages, and annotations in this book.
      </DocsDescription>
      {annotationGroups.length > 0 ? (
        <div className={'flex flex-row items-center gap-2 border-b pb-6'}>
          <MarkdownCopyButton markdownUrl={markdownUrl}>
            Copy Highlights
          </MarkdownCopyButton>
        </div>
      ) : undefined}
      <div className={'flex flex-col gap-10 pb-8'}>
        <SavedSection title={'Last read'}>
          {progress ? (
            <SavedItem
              href={progress.pageUrl}
              icon={BookOpen}
              title={progress.pageTitle ?? progress.pageUrl}
            >
              <span className={'truncate text-sm text-fd-muted-foreground'}>
                {progress.selector?.exact}
              </span>
            </SavedItem>
          ) : (
            <p className={'text-sm text-fd-muted-foreground'}>
              No saved reading position yet.
            </p>
          )}
        </SavedSection>

        <SavedSection title={'Published'}>
          {publishedPages.length > 0 ? (
            <div className={'flex flex-col gap-2'}>
              {publishedPages.map(({ pageUrl, title }) => (
                <div className={'flex items-center gap-2'} key={pageUrl}>
                  <div className={'min-w-0 flex-1'}>
                    <SavedItem
                      href={getPublicPageUrl({ pageUrl })}
                      icon={Globe}
                      title={title}
                    >
                      <span
                        className={'truncate text-sm text-fd-muted-foreground'}
                      >
                        {getPublicPageUrl({ pageUrl })}
                      </span>
                    </SavedItem>
                  </div>
                  <SharePageButton
                    initialIsPublic
                    pageUrl={pageUrl}
                    publicUrl={getPublicPageUrl({ pageUrl })}
                    unpublishOnly
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className={'text-sm text-fd-muted-foreground'}>
              No published pages yet.
            </p>
          )}
        </SavedSection>

        <SavedHighlights groups={annotationGroups} />
      </div>
    </DocsPage>
  );
};

export default SavedPage;
