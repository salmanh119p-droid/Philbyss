import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Philbys Operations Dashboard',
  description: 'Invoice tracking and engineer payroll management for Philbys Group Ltd',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
