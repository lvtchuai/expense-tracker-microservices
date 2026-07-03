'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GroupSummary, groupApi } from '@/lib/api';
import { useRequireAuth } from '@/lib/useAuth';
import { useToast } from '@/lib/toast';
import { money } from '@/lib/format';
import { TopBar } from '../components/TopBar';

export default function GroupsPage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const toast = useToast();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroups(await groupApi.list());
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const g = await groupApi.create(name.trim());
      toast('Group created.', 'ok');
      router.push(`/groups/${g.id}`);
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setCreating(false);
    }
  }

  if (!ready) return null;

  return (
    <>
      <TopBar user={user} />
      <div className="container grid fade-in" style={{ gap: 22 }}>
        <div className="page-head">
          <h1 className="title">👥 Groups</h1>
          <p className="subtitle">
            Share expenses with family, roommates, or a trip — split costs and
            see who owes whom.
          </p>
        </div>

        <div className="card">
          <h3 className="section-title">➕ New group</h3>
          <form onSubmit={create} className="row" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label>Group name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Trip to Da Lat, Apartment 4B"
              />
            </div>
            <button type="submit" disabled={creating} style={{ flex: '0 0 auto' }}>
              {creating ? 'Creating…' : 'Create group'}
            </button>
          </form>
        </div>

        {loading ? (
          <div className="card">
            <div className="skeleton" style={{ height: 60 }} />
          </div>
        ) : groups.length === 0 ? (
          <div className="card">
            <div className="empty">
              <span className="emoji">👥</span>
              No groups yet — create one above to start splitting expenses.
            </div>
          </div>
        ) : (
          <div className="grid grid-2">
            {groups.map((g) => (
              <button
                key={g.id}
                className="card card-hover group-card"
                onClick={() => router.push(`/groups/${g.id}`)}
              >
                <div className="group-card-name">{g.name}</div>
                <div className="hint" style={{ marginTop: 6 }}>
                  {g.memberCount} member{g.memberCount !== 1 ? 's' : ''} · total{' '}
                  {money(g.totalSpent)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
