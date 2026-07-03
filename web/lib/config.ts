// Service base URLs as seen from the BROWSER (client calls services directly).
// Override via NEXT_PUBLIC_* at build/run time if ports change.
export const AUTH_URL =
  process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001';
export const TRANSACTION_URL =
  process.env.NEXT_PUBLIC_TRANSACTION_URL ?? 'http://localhost:3002';
export const REPORT_URL =
  process.env.NEXT_PUBLIC_REPORT_URL ?? 'http://localhost:3005';
export const GROUP_URL =
  process.env.NEXT_PUBLIC_GROUP_URL ?? 'http://localhost:3006';
export const NOTIFICATION_URL =
  process.env.NEXT_PUBLIC_NOTIFICATION_URL ?? 'http://localhost:3003';

export const TOKEN_KEY = 'expense_tracker_token';
export const USER_KEY = 'expense_tracker_user';
