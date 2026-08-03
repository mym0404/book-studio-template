import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { getLayoutTabs } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';
import { requireOwnerPage } from '@/feature/auth/session';
import { appName } from '@/feature/common/app';
import { getPageTreeWithSavedPages } from '@/feature/library/source';
import { AutoHideDocsHeader } from '@/feature/reading/ui/auto-hide-docs-header';
import readerStyles from '@/feature/reading/ui/reader-settings.module.css';
import { ReaderSettingsControl } from '@/feature/reading/ui/reader-settings-control';
import { ReaderSettingsProvider } from '@/feature/reading/ui/reader-settings-provider';

export const dynamic = 'force-dynamic';

const Layout = async ({ children }: LayoutProps<'/docs'>) => {
  await requireOwnerPage();

  const tree = getPageTreeWithSavedPages();
  const tabs = getLayoutTabs(tree, {
    transform: (option) => ({
      ...option,
      icon: undefined,
      title: <span className={'book-tab-title'}>{option.title}</span>,
    }),
  });

  return (
    <ReaderSettingsProvider>
      <DocsLayout
        containerProps={{ className: readerStyles.readerLayout }}
        nav={{
          title: (
            <span className={'flex items-center gap-2'}>
              <Image src={'/logo.png'} alt={''} width={24} height={24} />
              <span>{appName}</span>
            </span>
          ),
          children: <ReaderSettingsControl />,
          transparentMode: 'top',
        }}
        slots={{ header: AutoHideDocsHeader }}
        tabs={tabs}
        tree={tree}
      >
        {children}
      </DocsLayout>
    </ReaderSettingsProvider>
  );
};

export default Layout;
