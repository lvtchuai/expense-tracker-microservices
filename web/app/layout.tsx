import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/lib/toast';

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'A microservices expense tracker — track spending, import statements, and see monthly reports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
