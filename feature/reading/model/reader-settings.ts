import { z } from 'zod';

export const READER_SETTINGS_STORAGE_KEY = 'book-studio:reader-settings';

export const READER_FONT_VALUES = [
  'wanted-sans',
  'system-sans',
  'system-serif',
] as const;
export const READER_SIZE_VALUES = [14, 16, 18, 20, 22] as const;
export const READER_LINE_HEIGHT_VALUES = [1.5, 1.75, 2] as const;

export const readerSettingsSchema = z.object({
  font: z.enum(READER_FONT_VALUES),
  lineHeight: z.literal(READER_LINE_HEIGHT_VALUES),
  size: z.literal(READER_SIZE_VALUES),
});

export type ReaderSettings = z.infer<typeof readerSettingsSchema>;

const READER_FONT_LABELS = {
  'wanted-sans': 'Wanted Sans',
  'system-sans': 'System Sans',
  'system-serif': 'System Serif',
} satisfies Record<ReaderSettings['font'], string>;

const READER_LINE_HEIGHT_LABELS = {
  1.5: 'Compact',
  1.75: 'Default',
  2: 'Relaxed',
} satisfies Record<ReaderSettings['lineHeight'], string>;

export const READER_FONT_OPTIONS = READER_FONT_VALUES.map((value) => ({
  label: READER_FONT_LABELS[value],
  value,
}));

export const READER_SIZE_OPTIONS = READER_SIZE_VALUES.map((value) => ({
  label: String(value),
  value,
}));

export const READER_LINE_HEIGHT_OPTIONS = READER_LINE_HEIGHT_VALUES.map(
  (value) => ({
    label: READER_LINE_HEIGHT_LABELS[value],
    value,
  }),
);

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
  const result = readerSettingsSchema.safeParse({
    font: document.documentElement.dataset.readerFont,
    lineHeight: Number(document.documentElement.dataset.readerLineHeight),
    size: Number(document.documentElement.dataset.readerSize),
  });

  return result.success ? result.data : undefined;
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
