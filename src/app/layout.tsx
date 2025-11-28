import type { Metadata, Viewport } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { MongoDBProvider } from '@/lib/mongodb-provider';
import { ThemeProvider } from '@/components/theme-provider';

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

export const metadata: Metadata = {
  title: 'GymProgress - Monitoruj Swój Progres',
  description: 'Śledź swoje postępy na siłowni, planuj treningi i osiągaj swoje cele fitness.',
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
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
          </MongoDBProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
