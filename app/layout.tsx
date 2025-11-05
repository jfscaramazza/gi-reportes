import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'Monthly Agent Premiums Report',
  description: 'Upload CSV data to generate premium reports with PDF export',
  keywords: ['reports', 'premiums', 'agents', 'CSV', 'PDF', 'analytics'],
  authors: [{ name: 'Agent Premiums System' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Agent Premiums Report'
  },
  openGraph: {
    title: 'Monthly Agent Premiums Report',
    description: 'Generate premium reports with PDF export',
    type: 'website',
    url: 'http://localhost:3000',
    siteName: 'Agent Premiums Report',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Agent Premiums Report',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Monthly Agent Premiums Report',
    description: 'Generate premium reports with PDF export',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
