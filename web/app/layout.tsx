import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'Microservices expense tracker dashboard',
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
