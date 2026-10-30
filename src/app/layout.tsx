import type { Metadata, Viewport } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { MongoDBProvider } from '@/lib/mongodb-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { AnimateReveal } from '@/components/animate-reveal';
import { BASE_OPEN_GRAPH, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from '@/lib/site-metadata';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EBF5FB' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
}

const SITE_TITLE = '#leniwakluska - Monitoruj Swój Progres';
const SITE_DESCRIPTION = 'Śledź swoje postępy na siłowni, planuj treningi i osiągaj swoje cele fitness.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.json",
  openGraph: {
    ...BASE_OPEN_GRAPH,
    url: '/',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  // No title/description here: X falls back to each page's og:title/og:description.
  twitter: {
    card: 'summary_large_image',
    images: [DEFAULT_OG_IMAGE],
  },
  appleWebApp: {
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-body antialiased')}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MongoDBProvider>
            {children}
            <Toaster />
            <SonnerToaster />
            <AnimateReveal />
          </MongoDBProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
