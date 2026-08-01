import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://eluaapp.com'),
  title: 'Elua — Turn your business photos into ready-to-post content',
  description:
    'Elua turns your work photos into complete social posts for small service businesses — caption, CTA, DM reply, hashtags, and posting direction, written for you.',
  openGraph: {
    title: 'Elua — Turn your business photos into ready-to-post content',
    description:
      'Upload a photo from a job. Get the caption, CTA, DM reply, and hashtags — done.',
    url: 'https://eluaapp.com',
    siteName: 'Elua',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Elua — photo-to-post workspace for service businesses',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Elua — Turn your business photos into ready-to-post content',
    description:
      'Upload a photo from a job. Get the caption, CTA, DM reply, and hashtags — done.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}