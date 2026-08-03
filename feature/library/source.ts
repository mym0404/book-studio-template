import { docs } from 'collections/server';
import type * as PageTree from 'fumadocs-core/page-tree';
import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { Bookmark } from 'lucide-react';
import { createElement } from 'react';
import { docsContentRoute, docsRoute } from '@/feature/common/app';

export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

/** Adds the protected virtual Saved view to each book without authoring an MDX page. */
const addSavedPages = (node: PageTree.Node): PageTree.Node => {
  if (node.type !== 'folder') return node;

  const children = node.children.map(addSavedPages);

  if (!node.root) return { ...node, children };

  const indexPage = node.children.find(
    (child): child is PageTree.Item => child.type === 'page',
  );

  if (!indexPage) return { ...node, children };

  return {
    ...node,
    index: node.index ?? indexPage,
    children: [
      {
        $id: `saved:${indexPage.url}`,
        icon: createElement(Bookmark),
        name: 'Saved',
        type: 'page',
        url: `${indexPage.url}/saved`,
      },
      ...children,
    ],
  };
};

export const getPageTreeWithSavedPages = (): PageTree.Root => {
  const tree = source.getPageTree();

  return {
    ...tree,
    children: tree.children.map(addSavedPages),
  };
};

export const getBookPageUrls = ({ bookSlug }: { bookSlug: string }) => {
  const bookUrl = `${docsRoute}/${bookSlug}`;
  const book = source
    .getPageTree()
    .children.find(
      (node): node is PageTree.Folder =>
        node.type === 'folder' &&
        node.root === true &&
        (node.index?.url === bookUrl ||
          node.children.some(
            (child) => child.type === 'page' && child.url === bookUrl,
          )),
    );

  if (!book) return [];

  return book.children.flatMap((node) =>
    node.type === 'page' ? [node.url] : [],
  );
};

export const getPageMarkdownUrl = (page: (typeof source)['$inferPage']) => {
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join('/')}`,
  };
};

export const getLLMText = async (page: (typeof source)['$inferPage']) => {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
};
