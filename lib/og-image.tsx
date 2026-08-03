/* biome-ignore-all lint/performance/noImgElement: Next Image is not supported when rendering this Open Graph image. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { appName } from './shared';

export const ogImageSize = {
  width: 1200,
  height: 630,
};

export const ogImageContentType = 'image/png';

export const createBrandOgImage = async ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => {
  const logoData = await readFile(
    join(process.cwd(), 'public/logo.png'),
    'base64',
  );
  const accentColor = 'rgb(166, 211, 239)';

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '56px 64px',
        color: 'white',
        backgroundColor: '#0c0c0c',
        borderBottom: '18px solid rgba(166, 211, 239, 0.35)',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: title.length > 52 ? 56 : 68,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-2px',
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            display: 'flex',
            marginTop: '20px',
            paddingBottom: '24px',
            color: 'rgba(240, 240, 240, 0.8)',
            fontSize: 38,
            lineHeight: 1.3,
            borderBottom: '8px dashed rgba(166, 211, 239, 0.35)',
          }}
        >
          {description}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          marginTop: 'auto',
          color: accentColor,
        }}
      >
        <img
          src={`data:image/png;base64,${logoData}`}
          alt=""
          width={64}
          height={64}
          style={{ objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', fontSize: 46, fontWeight: 600 }}>
          {appName}
        </div>
      </div>
    </div>,
    ogImageSize,
  );
};
