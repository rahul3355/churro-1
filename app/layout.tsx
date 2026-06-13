import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Population Surge Calendar - Liverpool',
  description: 'Predict crowd density for the next 30 days around Liverpool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
