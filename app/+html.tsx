import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{
          __html: `
            html, body { height: 100%; margin: 0; background: #000; }
            #root {
              display: flex;
              justify-content: center;
              height: 100%;
              background: #000;
            }
            #root > div {
              width: 100%;
              max-width: 480px;
              height: 100%;
              position: relative;
              overflow: hidden;
              flex-shrink: 0;
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
