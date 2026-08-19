import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BRAND_NAME } from '@/lib/branding';

/**
 * Fonts: Stitch "Academic Clarity" pairs Noto Serif (display) with Hanken
 * Grotesk (body). They are loaded with plain <link> tags rather than
 * next/font/google on purpose.
 *
 * next/font downloads the font at BUILD time, which makes every deploy depend
 * on fonts.googleapis.com being reachable. A Google Fonts blip then fails the
 * Netlify build for a purely cosmetic asset. Link tags fetch at runtime with
 * display=swap, so the build never depends on the network and text is always
 * readable in the fallback while the font arrives.
 */

export const metadata: Metadata = {
  title: `${BRAND_NAME} | Practise your UK interview`,
  description:
    'Sit a real mock Pre-CAS credibility interview for your university and find out exactly what to fix before the real one.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: BRAND_NAME },
  // QA-211: /icon-192.png, /icon-512.png and the Apple touch icon all 404'd,
  // so the manifest was valid and unusable.
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0d1b2a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@600;700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
