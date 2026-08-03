export const READER_SETTINGS_STORAGE_KEY = 'book-studio:reader-settings';

export const READER_FONT_OPTIONS = [
  { label: 'Wanted Sans', value: 'wanted-sans' },
  { label: 'System Sans', value: 'system-sans' },
  { label: 'System Serif', value: 'system-serif' },
] as const;

export const READER_SIZE_OPTIONS = [14, 16, 18, 20, 22] as const;

export const READER_LINE_HEIGHT_OPTIONS = [
  { label: 'Compact', value: 1.5 },
  { label: 'Default', value: 1.75 },
  { label: 'Relaxed', value: 2 },
] as const;

export type ReaderSettings = {
  font: (typeof READER_FONT_OPTIONS)[number]['value'];
  lineHeight: (typeof READER_LINE_HEIGHT_OPTIONS)[number]['value'];
  size: (typeof READER_SIZE_OPTIONS)[number];
};

export const DEFAULT_READER_SETTINGS = {
  font: 'wanted-sans',
  lineHeight: 1.75,
  size: 16,
} satisfies ReaderSettings;

export const isReaderSettings = (value: unknown): value is ReaderSettings =>
  typeof value === 'object' &&
  value !== null &&
  'font' in value &&
  READER_FONT_OPTIONS.some(({ value: font }) => font === value.font) &&
  'lineHeight' in value &&
  READER_LINE_HEIGHT_OPTIONS.some(
    ({ value: lineHeight }) => lineHeight === value.lineHeight,
  ) &&
  'size' in value &&
  READER_SIZE_OPTIONS.some((size) => size === value.size);

export const applyReaderSettingsToDocument = (settings: ReaderSettings) => {
  document.documentElement.dataset.readerFont = settings.font;
  document.documentElement.dataset.readerLineHeight = String(
    settings.lineHeight,
  );
  document.documentElement.dataset.readerSize = String(settings.size);
};

export const getReaderSettingsFromDocument = () => {
  const settings = {
    font: document.documentElement.dataset.readerFont,
    lineHeight: Number(document.documentElement.dataset.readerLineHeight),
    size: Number(document.documentElement.dataset.readerSize),
  };

  return isReaderSettings(settings) ? settings : DEFAULT_READER_SETTINGS;
};

export const READER_SETTINGS_SCRIPT = `
(() => {
  const storageKey = ${JSON.stringify(READER_SETTINGS_STORAGE_KEY)};
  const defaults = ${JSON.stringify(DEFAULT_READER_SETTINGS)};
  const fonts = ${JSON.stringify(READER_FONT_OPTIONS.map(({ value }) => value))};
  const lineHeights = ${JSON.stringify(READER_LINE_HEIGHT_OPTIONS.map(({ value }) => value))};
  const sizes = ${JSON.stringify(READER_SIZE_OPTIONS)};
  let settings = defaults;

  try {
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      const parsed = JSON.parse(stored);
      const candidate = typeof parsed === 'object' && parsed !== null
        ? { ...defaults, ...parsed }
        : defaults;

      if (
        fonts.includes(candidate.font) &&
        lineHeights.includes(candidate.lineHeight) &&
        sizes.includes(candidate.size)
      ) {
        settings = candidate;
      }
    }
  } catch {}

  document.documentElement.dataset.readerFont = settings.font;
  document.documentElement.dataset.readerLineHeight = String(settings.lineHeight);
  document.documentElement.dataset.readerSize = String(settings.size);
})();
`;
