import type { ComponentProps } from 'react';
import { getMDXComponents, MdxCard, MdxImage } from '@/feature/library/ui/mdx';
import { getPublicAssetUrl } from '@/feature/sharing/public-assets';

const isAllowedLink = (href: string) =>
  href.startsWith('#') ||
  href.startsWith('http://') ||
  href.startsWith('https://') ||
  href.startsWith('mailto:') ||
  href.startsWith('tel:');

const PublicMdxLink = ({ href, ...props }: ComponentProps<'a'>) => {
  if (!href || isAllowedLink(href)) {
    return <a {...props} href={href} />;
  }

  return <span className={props.className}>{props.children}</span>;
};

const PublicMdxCard = ({ href, ...props }: ComponentProps<typeof MdxCard>) => (
  <MdxCard
    {...props}
    href={typeof href === 'string' && isAllowedLink(href) ? href : undefined}
  />
);

/**
 * Disables internal and relative links in public MDX, preserves allowed URL
 * schemes, and signs private book assets with the page publication context.
 */
export const getPublicMDXComponents = ({
  assetSecret,
  contentDigest,
  pageUrl,
}: {
  assetSecret: string;
  contentDigest: string;
  pageUrl: string;
}) =>
  getMDXComponents({
    a: PublicMdxLink,
    Card: PublicMdxCard,
    img: (props) => {
      if (typeof props.src !== 'string' || !props.src.startsWith('/books/')) {
        return <MdxImage {...props} />;
      }

      return (
        // biome-ignore lint/performance/noImgElement: Public book images must bypass the Next image cache so unpublishing revokes them immediately.
        <img
          {...props}
          alt={props.alt ?? ''}
          className={'h-auto max-w-full rounded-lg'}
          src={getPublicAssetUrl({
            assetSecret,
            contentDigest,
            pageUrl,
            sourceUrl: props.src,
          })}
        />
      );
    },
  });
