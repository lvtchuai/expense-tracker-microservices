import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/lib/toast';

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'A microservices expense tracker — track spending, import statements, and see monthly reports.',
};

// Runs before paint to set the saved theme, avoiding a flash of the wrong one.
const noFlashTheme = `(function(){try{var t=localStorage.getItem('expense_tracker_theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
