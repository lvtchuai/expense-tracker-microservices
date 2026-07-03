'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AuthUser } from '@/lib/api';
import { logout } from '@/lib/useAuth';
import { useTheme } from '@/lib/useTheme';
import { NotificationBell } from './NotificationBell';

function initials(user: AuthUser | null): string {
  const src = user?.displayName || user?.email || '?';
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
}

export function TopBar({ user }: { user: AuthUser | null }) {
  const router = useRouter();
  const path = usePathname();
  const { theme, toggle } = useTheme();

  const link = (href: string, label: string, icon: string) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        router.push(href);
      }}
      className={`nav-link ${path === href ? 'active' : ''}`}
    >
      <span>{icon}</span>
      <span className="nav-label">{label}</span>
    </a>
  );

  return (
    <div className="topbar">
      <div className="brand">
        <span className="logo">💸</span>
        <span className="brand-text">Expense Tracker</span>
      </div>
      <div className="nav">
        {link('/dashboard', 'Dashboard', '🏠')}
        {link('/groups', 'Groups', '👥')}
        {link('/reports', 'Reports', '📊')}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginLeft: 8,
            paddingLeft: 14,
            borderLeft: '1px solid var(--border)',
          }}
        >
          <button
            className="bell-btn"
            onClick={toggle}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <NotificationBell />
          <div className="avatar" title={user?.email ?? ''}>
            {initials(user)}
          </div>
          <button
            className="btn-ghost"
            style={{ padding: '7px 12px' }}
            onClick={() => logout(router)}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
