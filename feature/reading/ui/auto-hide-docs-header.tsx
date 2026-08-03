'use client';

import { Header } from 'fumadocs-ui/layouts/docs/slots/header';
import { usePathname } from 'next/navigation';
import { type ComponentProps, createContext, useEffect, useState } from 'react';

type ScrollDirection = 'down' | 'up';

const HEADER_VISIBLE_RANGE_PX = 56;
const SCROLL_DIRECTION_THRESHOLD_PX = 12;

export const MobileReaderPopoverContext = createContext<
  ((open: boolean) => void) | undefined
>(undefined);

export const AutoHideDocsHeader = (props: ComponentProps<'header'>) => {
  const pathname = usePathname();
  const [isReaderPopoverOpen, setIsReaderPopoverOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let animationFrame: number | undefined;
    let direction: ScrollDirection | undefined;
    let distance = 0;
    let position = Math.max(0, window.scrollY);

    setIsVisible(true);

    const updateVisibility = () => {
      animationFrame = undefined;

      if (window.location.pathname !== pathname) return;

      const nextPosition = Math.max(0, window.scrollY);
      const delta = nextPosition - position;
      position = nextPosition;

      if (isReaderPopoverOpen || nextPosition <= HEADER_VISIBLE_RANGE_PX) {
        direction = undefined;
        distance = 0;
        setIsVisible(true);
        return;
      }

      if (delta === 0) return;

      const nextDirection: ScrollDirection = delta > 0 ? 'down' : 'up';

      if (nextDirection !== direction) {
        direction = nextDirection;
        distance = 0;
      }

      distance += Math.abs(delta);

      if (distance < SCROLL_DIRECTION_THRESHOLD_PX) return;

      distance = 0;
      setIsVisible(direction === 'up');
    };

    const handleScroll = () => {
      if (animationFrame !== undefined) return;

      animationFrame = window.requestAnimationFrame(updateVisibility);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);

      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [isReaderPopoverOpen, pathname]);

  return (
    <MobileReaderPopoverContext.Provider value={setIsReaderPopoverOpen}>
      <Header {...props} data-reader-hidden={isVisible ? undefined : 'true'} />
    </MobileReaderPopoverContext.Provider>
  );
};
