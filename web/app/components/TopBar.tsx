'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AuthUser } from '@/lib/api';
import { logout } from '@/lib/useAuth';

export function TopBar({ user }: { user: AuthUser | null }) {
  const router = useRouter();
  const path = usePathname();

  const link = (href: string, label: string) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        router.push(href);
      }}
      className={`btn btn-ghost`}
      style={
        path === href ? { borderColor: 'var(--accent)', color: 'var(--text)' } : {}
      }
    >
      {label}
    </a>
  );

  return (
    <div className="topbar">
      <div className="brand">💸 Expense Tracker</div>
      <div className="nav">
        {link('/dashboard', 'Dashboard')}
        {link('/reports', 'Reports')}
        <span className="muted" style={{ margin: '0 8px', fontSize: 14 }}>
          {user?.displayName || user?.email}
        </span>
        <button className="btn-ghost" onClick={() => logout(router)}>
          Logout
        </button>
      </div>
    </div>
  );
}
