// Service base URLs as seen from the BROWSER (client calls services directly).
// Override via NEXT_PUBLIC_* at build/run time if ports change.
export const AUTH_URL =
  process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001';
export const TRANSACTION_URL =
  process.env.NEXT_PUBLIC_TRANSACTION_URL ?? 'http://localhost:3002';
export const REPORT_URL =
  process.env.NEXT_PUBLIC_REPORT_URL ?? 'http://localhost:3005';

export const TOKEN_KEY = 'expense_tracker_token';
export const USER_KEY = 'expense_tracker_user';
