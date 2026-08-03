'use client';

import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const BUTTON_CLASS = buttonVariants({ color: 'secondary', size: 'sm' });

export const SharePageButton = ({
  initialIsPublic,
  pageUrl,
  publicUrl,
  unpublishOnly = false,
}: {
  initialIsPublic: boolean;
  pageUrl: string;
  publicUrl: string;
  unpublishOnly?: boolean;
}) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [notice, setNotice] = useState<{
    text: string;
    type: 'error' | 'status';
  }>();

  const copyPublicLink = async () => {
    const absoluteUrl = new URL(publicUrl, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setNotice({ text: 'Public link copied.', type: 'status' });
    } catch {
      window.prompt('Copy the public link manually.', absoluteUrl);
    }
  };

  const publish = async () => {
    setIsPending(true);
    setNotice(undefined);

    try {
      const response = await fetch('/api/public-pages', {
        body: JSON.stringify({ pageUrl }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      });

      if (!response.ok) throw new Error('Could not share this page.');

      setIsPublic(true);
      await copyPublicLink();
    } catch {
      setNotice({ text: 'Could not share this page.', type: 'error' });
    } finally {
      setIsPending(false);
    }
  };

  const unpublish = async () => {
    setIsPending(true);
    setNotice(undefined);

    try {
      const response = await fetch('/api/public-pages', {
        body: JSON.stringify({ pageUrl }),
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Could not make this page private.');

      setIsPublic(false);
      setNotice({ text: 'Page is private.', type: 'status' });
      if (unpublishOnly) router.refresh();
    } catch {
      setNotice({
        text: 'Could not make this page private.',
        type: 'error',
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      {isPublic ? (
        unpublishOnly ? (
          <button
            className={BUTTON_CLASS}
            disabled={isPending}
            onClick={() => void unpublish()}
            type={'button'}
          >
            Unpublish
          </button>
        ) : (
          <>
            <button
              className={BUTTON_CLASS}
              disabled={isPending}
              onClick={() => void copyPublicLink()}
              type={'button'}
            >
              Copy public link
            </button>
            <button
              className={BUTTON_CLASS}
              disabled={isPending}
              onClick={() => void unpublish()}
              type={'button'}
            >
              Make private
            </button>
          </>
        )
      ) : unpublishOnly ? undefined : (
        <button
          className={BUTTON_CLASS}
          disabled={isPending}
          onClick={() => {
            setNotice(undefined);
            if (
              window.confirm(
                'Anyone with the link can read the full page, all current highlights and comments, and anything you add while it remains public. Share this page?',
              )
            ) {
              void publish();
            }
          }}
          type={'button'}
        >
          Share
        </button>
      )}

      {notice && (
        <div
          aria-live={'polite'}
          className={
            'fixed right-4 bottom-4 z-50 max-w-sm rounded-lg border bg-fd-popover p-3 text-sm shadow-lg'
          }
          role={notice.type === 'error' ? 'alert' : 'status'}
        >
          <p>{notice.text}</p>
        </div>
      )}
    </>
  );
};
