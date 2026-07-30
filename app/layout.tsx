import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'Elua',
  description: 'AI growth engine for creators',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}      <Analytics />
    </body>
      </html>
    </ClerkProvider>
  );
}