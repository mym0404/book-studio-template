'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  applyReaderSettingsToDocument,
  DEFAULT_READER_SETTINGS,
  getReaderSettingsFromDocument,
  READER_SETTINGS_STORAGE_KEY,
  type ReaderSettings,
} from '@/feature/reading/model/reader-settings';
import {
  READING_ANCHOR_TOP_PX,
  READING_BLOCK_SELECTOR,
  READING_CONTENT_SELECTOR,
} from '@/feature/reading/model/reading-content';
import {
  getTextQuoteSelector,
  restoreTextQuoteSelector,
  type TextQuoteSelector,
} from '@/feature/reading/model/text-quote-selector';

type ReaderSettingsContextValue = {
  resetSettings: () => void;
  settings: ReaderSettings;
  updateSettings: (settings: ReaderSettings) => void;
};

type ReadingPosition = {
  anchor?: {
    element: HTMLElement;
    index: number;
    top: number;
  };
  selector?: TextQuoteSelector;
};

const ReaderSettingsContext = createContext<
  ReaderSettingsContextValue | undefined
>(undefined);

export const useReaderSettings = () => {
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
  const root = document.querySelector<HTMLElement>(READING_CONTENT_SELECTOR);

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
  const root = document.querySelector<HTMLElement>(READING_CONTENT_SELECTOR);

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
    const documentSettings = getReaderSettingsFromDocument();
    const nextSettings = documentSettings ?? DEFAULT_READER_SETTINGS;

    if (!documentSettings) applyReaderSettingsToDocument(nextSettings);

    settingsRef.current = nextSettings;
    setSettings(nextSettings);

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

      // Typography can reflow once for styles and again after font metrics settle.
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
