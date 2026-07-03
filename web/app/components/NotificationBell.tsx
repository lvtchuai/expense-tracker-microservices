'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationDTO, notifApi, token } from '@/lib/api';

const ICON: Record<string, string> = {
  group_member_added: '👥',
  group_expense_added: '🧾',
  group_settled: '💰',
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    if (!token.get()) return;
    try {
      setUnread((await notifApi.unreadCount()).count);
    } catch {
      /* ignore polling errors */
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      setItems(await notifApi.list(20));
    } catch {
      /* ignore */
    }
  }, []);

  // Poll unread count every 20s.
  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 20000);
    return () => clearInterval(t);
  }, [refreshCount]);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await loadList();
  }

  async function openItem(n: NotificationDTO) {
    if (!n.read) {
      try {
        await notifApi.markRead(n.id);
        setUnread((c) => Math.max(0, c - 1));
        setItems((list) =>
          list.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
        );
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function markAll() {
    try {
      await notifApi.markAllRead();
      setUnread(0);
      setItems((list) => list.map((x) => ({ ...x, read: true })));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="bell-wrap" ref={wrapRef}>
      <button className="bell-btn" onClick={toggle} aria-label="Notifications">
        🔔
        {unread > 0 && (
          <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button className="bell-markall" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          <div className="bell-list">
            {items.length === 0 ? (
              <div className="empty" style={{ padding: 28 }}>
                <span className="emoji">🔔</span>No notifications yet.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  className={`bell-item ${n.read ? '' : 'bell-unread'}`}
                  onClick={() => openItem(n)}
                >
                  <span className="bell-icon">{ICON[n.type] ?? '🔔'}</span>
                  <span className="bell-body">
                    <span className="bell-title">{n.title}</span>
                    <span className="bell-text">{n.body}</span>
                    <span className="bell-time">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="bell-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
