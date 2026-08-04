import { Card, Cards } from 'fumadocs-ui/components/card';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { requireOwnerPage } from '@/feature/auth/session';
import { appName } from '@/feature/common/app';
import { getBooks } from '@/feature/library/books';

const NotFound = async () => {
  await requireOwnerPage();

  const books = getBooks().filter(({ unlisted }) => !unlisted);

  return (
    <main
      className={
        'mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10'
      }
    >
      <div className={'mb-10 max-w-2xl'}>
        <div className={'mb-6 flex items-center gap-3'}>
          <Image src={'/logo.png'} alt={''} width={36} height={36} />
          <span className={'font-semibold text-fd-foreground'}>{appName}</span>
        </div>
        <p
          className={
            'mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-fd-muted-foreground'
          }
        >
          404 · Page not found
        </p>
        <h1
          className={
            'text-3xl font-bold tracking-tight text-fd-foreground sm:text-5xl'
          }
        >
          This page is not in your library.
        </h1>
        <p className={'mt-4 text-base text-fd-muted-foreground sm:text-lg'}>
          Choose a book to keep reading.
        </p>
      </div>

      {books.length > 0 ? (
        <section aria-labelledby={'book-list-title'}>
          <h2
            className={'mb-4 text-sm font-semibold text-fd-muted-foreground'}
            id={'book-list-title'}
          >
            Your books
          </h2>
          <Cards className={'grid-cols-1 sm:grid-cols-2'}>
            {books.map(({ description, icon, title, url }) => (
              <Card
                className={
                  'group flex min-h-44 flex-col p-5 [&>div:last-child]:mt-auto'
                }
                description={description}
                href={url}
                icon={icon}
                key={url}
                title={title}
              >
                <span
                  className={
                    'mt-auto inline-flex items-center gap-1.5 pt-6 font-medium text-fd-foreground'
                  }
                >
                  Open book
                  <ArrowRight
                    aria-hidden={'true'}
                    className={
                      'size-4 transition-transform group-hover:translate-x-0.5'
                    }
                  />
                </span>
              </Card>
            ))}
          </Cards>
        </section>
      ) : (
        <p className={'text-sm text-fd-muted-foreground'}>
          There are no books in this library yet.
        </p>
      )}
    </main>
  );
};

export default NotFound;
