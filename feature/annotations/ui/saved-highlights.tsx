'use client';

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import { useState } from 'react';
import type { SavedHighlightGroup } from '@/feature/annotations/logic/saved-highlights';
import { getAnnotationAnchorId } from '@/feature/annotations/model/annotation';
import { SavedAnnotationItem } from '@/feature/annotations/ui/saved-annotation-item';

export const SavedHighlights = ({
  groups,
}: {
  groups: SavedHighlightGroup[];
}) => {
  const [isReverseOrder, setIsReverseOrder] = useState(false);
  const orderedGroups = isReverseOrder ? [...groups].reverse() : groups;
  const sortLabel = isReverseOrder
    ? 'Sort from first chapter'
    : 'Sort from last chapter';

  return (
    <section
      aria-labelledby={'saved-highlights'}
      className={'flex flex-col gap-3'}
    >
      <div className={'flex items-center justify-between gap-3'}>
        <h2 className={'text-lg font-semibold'} id={'saved-highlights'}>
          Highlights
        </h2>
        {groups.length > 0 ? (
          <button
            aria-label={sortLabel}
            className={
              'flex size-8 shrink-0 items-center justify-center rounded-lg border text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring'
            }
            onClick={() => setIsReverseOrder((current) => !current)}
            title={sortLabel}
            type={'button'}
          >
            {isReverseOrder ? (
              <ArrowUpNarrowWide aria-hidden={'true'} className={'size-4'} />
            ) : (
              <ArrowDownWideNarrow aria-hidden={'true'} className={'size-4'} />
            )}
          </button>
        ) : undefined}
      </div>

      {groups.length > 0 ? (
        <div className={'flex flex-col gap-6'}>
          {orderedGroups.map((group) => {
            const titleId = `saved-highlights-${group.pageUrl.replaceAll('/', '-')}`;

            return (
              <section
                aria-labelledby={titleId}
                className={'flex flex-col gap-3'}
                key={group.pageUrl}
              >
                <div className={'flex items-center gap-3'}>
                  <span
                    aria-hidden={'true'}
                    className={'h-px flex-1 bg-fd-border'}
                  />
                  <h3
                    className={
                      'max-w-[80%] text-center text-sm font-medium text-fd-muted-foreground'
                    }
                    id={titleId}
                  >
                    {group.title}
                  </h3>
                  <span
                    aria-hidden={'true'}
                    className={'h-px flex-1 bg-fd-border'}
                  />
                </div>
                <div className={'flex flex-col gap-2'}>
                  {group.annotations.map((annotation) => (
                    <SavedAnnotationItem
                      comment={annotation.comment}
                      href={`${annotation.pageUrl}#${getAnnotationAnchorId({ id: annotation.id })}`}
                      id={annotation.id}
                      key={annotation.id}
                      quote={annotation.selector.exact}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className={'text-sm text-fd-muted-foreground'}>No highlights yet.</p>
      )}
    </section>
  );
};
