import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
};

/** Resolves only supported files beneath the published book-assets root. */
export const getBookAssetResponse = async ({
  headers,
  path,
}: {
  headers: Record<string, string>;
  path: string[];
}) => {
  const contentRoot = resolve(process.cwd(), 'content-assets/books');
  const filePath = resolve(contentRoot, ...path);
  const contentType = CONTENT_TYPES[extname(filePath).toLowerCase()];

  if (!filePath.startsWith(`${contentRoot}${sep}`) || !contentType) {
    return new Response(null, { headers, status: 404 });
  }

  try {
    const image = await readFile(filePath);

    return new Response(image, {
      headers: {
        ...headers,
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return new Response(null, { headers, status: 404 });
    }

    throw error;
  }
};
