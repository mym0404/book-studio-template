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
  font: string;
  lineHeight: number;
  size: number;
};

export const DEFAULT_READER_SETTINGS = {
  font: 'wanted-sans',
  lineHeight: 1.75,
  size: 16,
} satisfies ReaderSettings;

export const applyReaderSettingsToDocument = (settings: ReaderSettings) => {
  document.documentElement.dataset.readerFont = settings.font;
  document.documentElement.dataset.readerLineHeight = String(
    settings.lineHeight,
  );
  document.documentElement.dataset.readerSize = String(settings.size);
};

export const getReaderSettingsFromDocument = () => {
  return {
    font: document.documentElement.dataset.readerFont,
    lineHeight: Number(document.documentElement.dataset.readerLineHeight),
    size: Number(document.documentElement.dataset.readerSize),
  } as ReaderSettings;
};

export const READER_SETTINGS_SCRIPT = `
(() => {
  const storageKey = ${JSON.stringify(READER_SETTINGS_STORAGE_KEY)};
  const defaults = ${JSON.stringify(DEFAULT_READER_SETTINGS)};
  let settings = defaults;

  try {
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      settings = { ...defaults, ...JSON.parse(stored) };
    }
  } catch {}

  document.documentElement.dataset.readerFont = settings.font;
  document.documentElement.dataset.readerLineHeight = String(settings.lineHeight);
  document.documentElement.dataset.readerSize = String(settings.size);
})();
`;
