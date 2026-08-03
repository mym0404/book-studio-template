import { requireOwnerPage } from '@/feature/auth/session';
import { appDescription, appName } from '@/feature/common/app';
import {
  createBrandOgImage,
  ogImageContentType,
  ogImageSize,
} from '@/feature/common/ui/brand-og-image';

export const dynamic = 'force-dynamic';

export const alt = `${appName} logo and introduction`;
export const size = ogImageSize;
export const contentType = ogImageContentType;

const OpenGraphImage = async () => {
  await requireOwnerPage();

  return createBrandOgImage({
    title: appName,
    description: appDescription,
  });
};

export default OpenGraphImage;
