import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { getLayoutTabs } from 'fumadocs-ui/layouts/shared';
import {
  AutoHideDocsHeader,
  ReaderSettingsProvider,
} from '@/components/reader-settings';
import readerStyles from '@/components/reader-settings.module.css';
import { requireOwnerPage } from '@/lib/auth/session';
import { baseOptions } from '@/lib/layout.shared';
import { getPageTreeWithSavedPages } from '@/lib/source';

export const dynamic = 'force-dynamic';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  await requireOwnerPage();

  const tree = getPageTreeWithSavedPages();
  const tabs = getLayoutTabs(tree, {
    transform: (option) => ({
      ...option,
      icon: undefined,
      title: <span className="book-tab-title">{option.title}</span>,
    }),
  });

  return (
    <ReaderSettingsProvider>
      <DocsLayout
        containerProps={{ className: readerStyles.readerLayout }}
        slots={{ header: AutoHideDocsHeader }}
        tabs={tabs}
        tree={tree}
        {...baseOptions()}
      >
        {children}
      </DocsLayout>
    </ReaderSettingsProvider>
  );
}
