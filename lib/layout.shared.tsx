import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';
import { ReaderSettingsControl } from '@/components/reader-settings';
import { appName } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={24} height={24} />
          <span>{appName}</span>
        </span>
      ),
      children: <ReaderSettingsControl />,
      transparentMode: 'top',
    },
  };
}
