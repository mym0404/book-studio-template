import { requireOwnerPage } from '@/lib/auth/session';
import {
  createBrandOgImage,
  ogImageContentType,
  ogImageSize,
} from '@/lib/og-image';
import { appDescription, appName } from '@/lib/shared';

export const dynamic = 'force-dynamic';

export const alt = `${appName} logo and introduction`;
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function OpenGraphImage() {
  await requireOwnerPage();

  return createBrandOgImage({
    title: appName,
    description: appDescription,
  });
}
