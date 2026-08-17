import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GlyphBrain — Tu Segundo Cerebro',
  description: 'Base de conocimiento en forma de red neuronal interactiva con IA',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GlyphBrain',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#4FD1C5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-screen bg-gb-bg text-gb-text antialiased">
        {children}
      </body>
    </html>
  );
}
