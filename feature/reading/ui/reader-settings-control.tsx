'use client';

import { Popover } from '@base-ui/react/popover';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Type } from 'lucide-react';
import { useContext, useEffect, useId, useState } from 'react';
import {
  DEFAULT_READER_SETTINGS,
  READER_FONT_OPTIONS,
  READER_LINE_HEIGHT_OPTIONS,
  READER_SIZE_OPTIONS,
  type ReaderSettings,
} from '@/feature/reading/model/reader-settings';
import { MobileReaderPopoverContext } from '@/feature/reading/ui/auto-hide-docs-header';
import styles from '@/feature/reading/ui/reader-settings.module.css';
import { useReaderSettings } from '@/feature/reading/ui/reader-settings-provider';

const RADIO_OPTION_CLASS =
  'group flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-fd-accent/50 data-checked:border-fd-primary data-checked:bg-fd-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

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

  const updateFont = (font: ReaderSettings['font']) => {
    updateSettings({ ...settings, font });
  };

  const updateSize = (size: ReaderSettings['size']) => {
    updateSettings({ ...settings, size });
  };

  const updateLineHeight = (lineHeight: ReaderSettings['lineHeight']) => {
    updateSettings({ ...settings, lineHeight });
  };

  return (
    <div className={'ms-auto flex items-center'}>
      <Popover.Root onOpenChange={setOpen} open={open}>
        <Popover.Trigger
          aria-label={'Reader settings'}
          className={
            'inline-flex size-8 items-center justify-center rounded-md text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring'
          }
          title={'Reader settings'}
        >
          <Type aria-hidden={true} className={'size-4'} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            align={'end'}
            className={'z-50'}
            collisionPadding={8}
            side={'bottom'}
            sideOffset={8}
          >
            <Popover.Popup
              className={
                'w-[min(18rem,calc(100vw-1rem))] origin-[var(--transform-origin)] rounded-xl border bg-fd-popover p-4 text-fd-popover-foreground shadow-xl outline-none transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none'
              }
            >
              <Popover.Title className={'text-sm font-semibold'}>
                Reader settings
              </Popover.Title>

              <div className={'mt-4'}>
                <div
                  className={
                    'mb-2 text-xs font-medium text-fd-muted-foreground'
                  }
                  id={fontLabelId}
                >
                  Font
                </div>
                <RadioGroup<ReaderSettings['font']>
                  aria-labelledby={fontLabelId}
                  className={'grid gap-2'}
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
                      <span
                        className={
                          'flex size-4 shrink-0 items-center justify-center rounded-full border border-fd-muted-foreground group-data-checked:border-fd-primary'
                        }
                      >
                        <Radio.Indicator
                          className={'size-2 rounded-full bg-fd-primary'}
                        />
                      </span>
                      {option.label}
                    </Radio.Root>
                  ))}
                </RadioGroup>
              </div>

              <div className={'mt-4'}>
                <div
                  className={
                    'mb-2 text-xs font-medium text-fd-muted-foreground'
                  }
                  id={sizeLabelId}
                >
                  Text size (px)
                </div>
                <RadioGroup<ReaderSettings['size']>
                  aria-labelledby={sizeLabelId}
                  className={'grid grid-cols-5 gap-1.5'}
                  onValueChange={updateSize}
                  value={settings.size}
                >
                  {READER_SIZE_OPTIONS.map((option) => (
                    <Radio.Root
                      aria-label={`${option.value} pixels`}
                      className={
                        'flex cursor-pointer justify-center rounded-md border px-1 py-2 text-sm tabular-nums transition-colors hover:bg-fd-accent/50 data-checked:border-fd-primary data-checked:bg-fd-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring'
                      }
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

              <div className={'mt-4'}>
                <div
                  className={
                    'mb-2 text-xs font-medium text-fd-muted-foreground'
                  }
                  id={lineHeightLabelId}
                >
                  Line height
                </div>
                <RadioGroup<ReaderSettings['lineHeight']>
                  aria-labelledby={lineHeightLabelId}
                  className={'grid grid-cols-3 gap-1.5'}
                  onValueChange={updateLineHeight}
                  value={settings.lineHeight}
                >
                  {READER_LINE_HEIGHT_OPTIONS.map((option) => (
                    <Radio.Root
                      className={
                        'flex cursor-pointer justify-center rounded-md border px-1 py-2 text-sm transition-colors hover:bg-fd-accent/50 data-checked:border-fd-primary data-checked:bg-fd-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring'
                      }
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
                className={
                  'mt-4 w-full rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-fd-accent disabled:pointer-events-none disabled:opacity-50'
                }
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
