'use client';

import { LoaderCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export const SavedAnnotationItem = ({
  comment,
  href,
  id,
  quote,
}: {
  comment?: string;
  href: string;
  id: string;
  quote: string;
}) => {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);
  const removeAnnotation = async () => {
    setError(undefined);
    setIsDeleting(true);

    try {
      const response = await fetch('/api/annotations', {
        body: JSON.stringify({ id }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Could not delete annotation.');

      router.refresh();
    } catch {
      setError('Could not delete annotation.');
      setIsDeleting(false);
    }
  };

  return (
    <div className={'space-y-1'}>
      <div
        className={
          'flex items-start gap-3 rounded-xl border bg-fd-card px-3 py-2.5'
        }
      >
        <Link
          className={
            'flex min-w-0 flex-1 items-start rounded-lg text-start outline-none transition-colors hover:text-fd-foreground focus-visible:ring-2 focus-visible:ring-fd-ring'
          }
          href={href}
        >
          <span
            className={
              'flex min-w-0 flex-1 flex-col gap-1 text-sm leading-relaxed'
            }
          >
            <span
              className={
                'whitespace-pre-wrap break-words text-fd-muted-foreground'
              }
            >
              {quote}
            </span>
            {comment ? (
              <span
                className={'whitespace-pre-wrap break-words text-fd-foreground'}
              >
                {comment}
              </span>
            ) : undefined}
          </span>
        </Link>
        <button
          aria-label={isDeleting ? 'Deleting annotation' : 'Delete annotation'}
          className={
            'flex size-8 shrink-0 items-center justify-center rounded-lg border text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring disabled:pointer-events-none disabled:opacity-60'
          }
          disabled={isDeleting}
          onClick={removeAnnotation}
          title={'Delete annotation'}
          type={'button'}
        >
          {isDeleting ? (
            <LoaderCircle
              aria-hidden={'true'}
              className={'size-4 animate-spin'}
            />
          ) : (
            <Trash2 aria-hidden={'true'} className={'size-4'} />
          )}
        </button>
      </div>
      {error ? (
        <p className={'text-sm text-red-600 dark:text-red-400'} role={'alert'}>
          {error}
        </p>
      ) : undefined}
    </div>
  );
};
