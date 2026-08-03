import { cn } from 'cnfast';
import { Card as DefaultCard } from 'fumadocs-ui/components/card';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps } from 'react';

type MdxCardProps = ComponentProps<typeof DefaultCard> & {
  variant?: 'default' | 'error' | 'warning';
};

const cardVariantClassNames = {
  default: undefined,
  error: 'border-red-500/50 bg-red-500/10',
  warning: 'border-amber-500/50 bg-amber-500/10',
};

export const MdxCard = ({
  variant = 'default',
  className,
  ...props
}: MdxCardProps) => (
  <DefaultCard
    {...props}
    className={cn(cardVariantClassNames[variant], className)}
  />
);

export const MdxImage = (props: ComponentProps<'img'>) => {
  if (typeof props.src === 'string' && props.src.startsWith('/books/')) {
    return (
      // biome-ignore lint/performance/noImgElement: Protected images are served by an authenticated route and cannot use Next image optimization.
      <img
        {...props}
        alt={props.alt ?? ''}
        className={'h-auto max-w-full rounded-lg'}
      />
    );
  }

  const DefaultImage = defaultMdxComponents.img;

  if (!DefaultImage) return null;

  return <DefaultImage {...props} />;
};

export const getMDXComponents = (components?: MDXComponents) =>
  ({
    ...defaultMdxComponents,
    Card: MdxCard,
    img: MdxImage,
    ...components,
  }) satisfies MDXComponents;

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
