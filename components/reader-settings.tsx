'use client';

import { Popover } from '@base-ui/react/popover';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Header } from 'fumadocs-ui/layouts/docs/slots/header';
import { Type } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import {
  applyReaderSettingsToDocument,
  DEFAULT_READER_SETTINGS,
  getReaderSettingsFromDocument,
  READER_FONT_OPTIONS,
  READER_LINE_HEIGHT_OPTIONS,
  READER_SETTINGS_STORAGE_KEY,
  READER_SIZE_OPTIONS,
  type ReaderSettings,
} from '@/lib/reader-settings';
import {
  getTextQuoteSelector,
  restoreTextQuoteSelector,
  type TextQuoteSelector,
} from '@/lib/text-quote-selector';
import styles from './reader-settings.module.css';

type ReaderSettingsContextValue = {
  resetSettings: () => void;
  settings: ReaderSettings;
  updateSettings: (settings: ReaderSettings) => void;
};

type ScrollDirection = 'down' | 'up';

const HEADER_VISIBLE_RANGE_PX = 56;
const SCROLL_DIRECTION_THRESHOLD_PX = 12;
const READING_ANCHOR_TOP_PX = 96;
const READING_BLOCK_SELECTOR = 'h2, h3, h4, p, li, blockquote, pre';
const READER_CONTENT_SELECTOR = '[data-reading-content]';
const RADIO_OPTION_CLASS =
  'group flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-fd-accent/50 data-checked:border-fd-primary data-checked:bg-fd-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

const ReaderSettingsContext = createContext<
  ReaderSettingsContextValue | undefined
>(undefined);
const MobileReaderPopoverContext = createContext<
  ((open: boolean) => void) | undefined
>(undefined);

type ReadingPosition = {
  anchor?: {
    element: HTMLElement;
    index: number;
    top: number;
  };
  selector?: TextQuoteSelector;
};

const useReaderSettings = () => {
  const value = useContext(ReaderSettingsContext);

  if (!value) {
    throw new Error(
      'Reader settings must be rendered inside ReaderSettingsProvider.',
    );
  }

  return value;
};

const persistReaderSettings = ({
  settings,
  type,
}: {
  settings: ReaderSettings;
  type: 'remove' | 'save';
}) => {
  try {
    if (type === 'remove') {
      localStorage.removeItem(READER_SETTINGS_STORAGE_KEY);
      return;
    }

    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // The current tab keeps the selected settings when storage is unavailable.
  }
};

const captureReadingPosition = (): ReadingPosition => {
  const root = document.querySelector<HTMLElement>(READER_CONTENT_SELECTOR);

  if (!root) return {};

  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>(READING_BLOCK_SELECTOR),
  )
    .filter((element) => element.textContent?.trim())
    .map((element, index) => ({
      bottom: element.getBoundingClientRect().bottom,
      element,
      index,
      top: element.getBoundingClientRect().top,
    }))
    .filter(
      ({ bottom, top }) =>
        bottom > READING_ANCHOR_TOP_PX && top < window.innerHeight,
    );
  const crossingAnchor = candidates
    .filter(
      ({ bottom, top }) =>
        top <= READING_ANCHOR_TOP_PX && bottom >= READING_ANCHOR_TOP_PX,
    )
    .reduce<(typeof candidates)[number] | undefined>(
      (nearest, candidate) =>
        !nearest || candidate.top > nearest.top ? candidate : nearest,
      undefined,
    );
  const nextVisible = candidates
    .filter(({ top }) => top > READING_ANCHOR_TOP_PX)
    .reduce<(typeof candidates)[number] | undefined>(
      (nearest, candidate) =>
        !nearest || candidate.top < nearest.top ? candidate : nearest,
      undefined,
    );
  const anchor = crossingAnchor ?? nextVisible;

  return {
    anchor: anchor
      ? { element: anchor.element, index: anchor.index, top: anchor.top }
      : undefined,
    selector: getTextQuoteSelector(root),
  };
};

const restoreReadingPosition = ({ anchor, selector }: ReadingPosition) => {
  const root = document.querySelector<HTMLElement>(READER_CONTENT_SELECTOR);

  if (!root) return;

  const currentAnchor =
    anchor?.element.isConnected && root.contains(anchor.element)
      ? anchor.element
      : Array.from(
          root.querySelectorAll<HTMLElement>(READING_BLOCK_SELECTOR),
        ).filter((element) => element.textContent?.trim())[anchor?.index ?? -1];

  if (anchor && currentAnchor) {
    const topDelta = currentAnchor.getBoundingClientRect().top - anchor.top;

    window.scrollTo({ top: Math.max(0, window.scrollY + topDelta) });
    return;
  }

  if (selector) restoreTextQuoteSelector({ root, selector });
};

export const ReaderSettingsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [settings, setSettings] = useState<ReaderSettings>(
    DEFAULT_READER_SETTINGS,
  );
  const restoreFrame = useRef<number | undefined>(undefined);
  const settingsRef = useRef<ReaderSettings>(DEFAULT_READER_SETTINGS);

  useEffect(() => {
    const storedSettings = getReaderSettingsFromDocument();

    settingsRef.current = storedSettings;
    setSettings(storedSettings);

    return () => {
      if (restoreFrame.current !== undefined) {
        window.cancelAnimationFrame(restoreFrame.current);
      }
    };
  }, []);

  const commitSettings = useCallback(
    ({
      nextSettings,
      storageType,
    }: {
      nextSettings: ReaderSettings;
      storageType: 'remove' | 'save';
    }) => {
      if (
        settingsRef.current.font === nextSettings.font &&
        settingsRef.current.lineHeight === nextSettings.lineHeight &&
        settingsRef.current.size === nextSettings.size
      ) {
        return;
      }

      const readingPosition = captureReadingPosition();

      applyReaderSettingsToDocument(nextSettings);
      settingsRef.current = nextSettings;
      setSettings(nextSettings);
      persistReaderSettings({ settings: nextSettings, type: storageType });

      if (restoreFrame.current !== undefined) {
        window.cancelAnimationFrame(restoreFrame.current);
      }

      restoreFrame.current = window.requestAnimationFrame(() => {
        restoreReadingPosition(readingPosition);
        restoreFrame.current = window.requestAnimationFrame(() => {
          restoreFrame.current = undefined;
          restoreReadingPosition(readingPosition);
        });
      });
    },
    [],
  );

  const updateSettings = useCallback(
    (nextSettings: ReaderSettings) => {
      commitSettings({ nextSettings, storageType: 'save' });
    },
    [commitSettings],
  );

  const resetSettings = useCallback(() => {
    commitSettings({
      nextSettings: DEFAULT_READER_SETTINGS,
      storageType: 'remove',
    });
  }, [commitSettings]);

  return (
    <ReaderSettingsContext.Provider
      value={{ resetSettings, settings, updateSettings }}
    >
      {children}
    </ReaderSettingsContext.Provider>
  );
};

export const ReaderSettingsControl = () => {
  const { resetSettings, settings, updateSettings } = useReaderSettings();
  const setMobilePopoverOpen = useContext(MobileReaderPopoverContext);
  const [open, setOpen] = useState(false);
  const fontLabelId = useId();
  const lineHeightLabelId = useId();
  const sizeLabelId = useId();
  const isDefault =
    settings.font === DEFAULT_READER_SETTINGS.font &&
    settings.lineHeight === DEFAULT_READER_SETTINGS.lineHeight &&
    settings.size === DEFAULT_READER_SETTINGS.size;

  useEffect(() => {
    setMobilePopoverOpen?.(open);

    return () => setMobilePopoverOpen?.(false);
  }, [open, setMobilePopoverOpen]);

  const updateFont = (font: string) => {
    updateSettings({ ...settings, font });
  };

  const updateSize = (size: number) => {
    updateSettings({ ...settings, size });
  };

  const updateLineHeight = (lineHeight: number) => {
    updateSettings({ ...settings, lineHeight });
  };

  return (
    <div className="ms-auto flex items-center">
      <Popover.Root onOpenChange={setOpen} open={open}>
        <Popover.Trigger
          aria-label={'Reader settings'}
          className="inline-flex size-8 items-center justify-center rounded-md text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
          title={'Reader settings'}
        >
          <Type aria-hidden={true} className="size-4" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            align={'end'}
            className="z-50"
            collisionPadding={8}
            side={'bottom'}
            sideOffset={8}
          >
            <Popover.Popup className="w-[min(18rem,calc(100vw-1rem))] origin-[var(--transform-origin)] rounded-xl border bg-fd-popover p-4 text-fd-popover-foreground shadow-xl outline-none transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
              <Popover.Title className="text-sm font-semibold">
                Reader settings
              </Popover.Title>

              <div className="mt-4">
                <div
                  className="mb-2 text-xs font-medium text-fd-muted-foreground"
                  id={fontLabelId}
                >
                  Font
                </div>
                <RadioGroup<string>
                  aria-labelledby={fontLabelId}
                  className="grid gap-2"
                  onValueChange={updateFont}
                  value={settings.font}
                >
                  {READER_FONT_OPTIONS.map((option) => (
                    <Radio.Root
                      className={`${RADIO_OPTION_CLASS} ${styles.fontOption}`}
                      data-reader-font-option={option.value}
                      key={option.value}
                      nativeButton
                      render={<button type={'button'} />}
                      value={option.value}
                    >
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-fd-muted-foreground group-data-checked:border-fd-primary">
                        <Radio.Indicator className="size-2 rounded-full bg-fd-primary" />
                      </span>
                      {option.label}
                    </Radio.Root>
                  ))}
                </RadioGroup>
              </div>

              <div className="mt-4">
                <div
                  className="mb-2 text-xs font-medium text-fd-muted-foreground"
                  id={sizeLabelId}
                >
                  Text size (px)
                </div>
                <RadioGroup<number>
                  aria-labelledby={sizeLabelId}
                  className="grid grid-cols-5 gap-1.5"
                  onValueChange={updateSize}
                  value={settings.size}
                >
                  {READER_SIZE_OPTIONS.map((size) => (
                    <Radio.Root
                      aria-label={`${size} pixels`}
                      className="flex cursor-pointer justify-center rounded-md border px-1 py-2 text-sm tabular-nums transition-colors hover:bg-fd-accent/50 data-checked:border-fd-primary data-checked:bg-fd-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
                      key={size}
                      nativeButton
                      render={<button type={'button'} />}
                      value={size}
                    >
                      {size}
                    </Radio.Root>
                  ))}
                </RadioGroup>
              </div>

              <div className="mt-4">
                <div
                  className="mb-2 text-xs font-medium text-fd-muted-foreground"
                  id={lineHeightLabelId}
                >
                  Line height
                </div>
                <RadioGroup<number>
                  aria-labelledby={lineHeightLabelId}
                  className="grid grid-cols-3 gap-1.5"
                  onValueChange={updateLineHeight}
                  value={settings.lineHeight}
                >
                  {READER_LINE_HEIGHT_OPTIONS.map((option) => (
                    <Radio.Root
                      className="flex cursor-pointer justify-center rounded-md border px-1 py-2 text-sm transition-colors hover:bg-fd-accent/50 data-checked:border-fd-primary data-checked:bg-fd-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
                      key={option.value}
                      nativeButton
                      render={<button type={'button'} />}
                      value={option.value}
                    >
                      {option.label}
                    </Radio.Root>
                  ))}
                </RadioGroup>
              </div>

              <button
                className="mt-4 w-full rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-fd-accent disabled:pointer-events-none disabled:opacity-50"
                disabled={isDefault}
                onClick={resetSettings}
                type={'button'}
              >
                Reset
              </button>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};

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
