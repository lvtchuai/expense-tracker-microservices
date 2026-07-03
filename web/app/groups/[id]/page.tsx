'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GroupDetail, groupApi, storedUser } from '@/lib/api';
import { useRequireAuth } from '@/lib/useAuth';
import { useToast } from '@/lib/toast';
import { money } from '@/lib/format';
import { TopBar } from '../../components/TopBar';
import { AmountInput } from '../../components/AmountInput';

export default function GroupDetailPage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setGroup(await groupApi.detail(params.id));
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setLoading(false);
    }
  }, [params.id, toast]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function doSettle(from: string, to: string, amount: number) {
    try {
      setGroup(await groupApi.settle(params.id, from, to, amount));
      toast('Payment recorded.', 'ok');
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  }

  async function deleteEntry(entryId: string) {
    try {
      setGroup(await groupApi.deleteEntry(params.id, entryId));
      toast('Removed.', 'info');
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  }

  async function removeMember(memberId: string) {
    try {
      setGroup(await groupApi.removeMember(params.id, memberId));
      toast('Member removed.', 'info');
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  }

  async function deleteGroup() {
    if (!confirm('Delete this group and all its expenses? This cannot be undone.'))
      return;
    try {
      await groupApi.deleteGroup(params.id);
      toast('Group deleted.', 'info');
      router.push('/groups');
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  }

  if (!ready) return null;

  const nameOf = (userId: string) =>
    group?.members.find((m) => m.userId === userId)?.displayName ||
    group?.members.find((m) => m.userId === userId)?.email ||
    userId.slice(0, 6);

  const myId = storedUser.get()?.id;

  return (
    <>
      <TopBar user={user} />
      <div className="container grid fade-in" style={{ gap: 22 }}>
        <div className="page-head" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-ghost" onClick={() => router.push('/groups')}>
            ← Back
          </button>
          <div>
            <h1 className="title" style={{ margin: 0 }}>
              {loading ? '…' : `👥 ${group?.name}`}
            </h1>
            {group && (
              <p className="subtitle" style={{ margin: 0 }}>
                {group.members.length} members ·{' '}
                {group.expenses.length} expenses
              </p>
            )}
          </div>
        </div>

        {loading || !group ? (
          <div className="card">
            <div className="skeleton" style={{ height: 120 }} />
          </div>
        ) : (
          <>
            {/* Balances — the highlight */}
            <div className="card">
              <h3 className="section-title">💰 Who owes whom</h3>
              {group.balances.settlements.length === 0 ? (
                <div className="empty" style={{ padding: 24 }}>
                  <span className="emoji">✅</span>All settled up!
                </div>
              ) : (
                <div className="grid" style={{ gap: 8 }}>
                  {group.balances.settlements.map((s, i) => (
                    <div key={i} className="settle-row">
                      <span className="neg">{nameOf(s.from)}</span>
                      <span className="settle-arrow">→ owes →</span>
                      <span className="pos">{nameOf(s.to)}</span>
                      <span className="settle-amount">{money(s.amount)}</span>
                      <button
                        className="btn-ghost settle-btn"
                        onClick={() => doSettle(s.from, s.to, Number(s.amount))}
                      >
                        Mark paid
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Per-member summary: paid / share / net */}
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th style={{ textAlign: 'right' }}>Paid</th>
                      <th style={{ textAlign: 'right' }}>Share</th>
                      <th style={{ textAlign: 'right' }}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.balances.perMember.map((m) => (
                      <tr key={m.userId}>
                        <td>{m.displayName}</td>
                        <td style={{ textAlign: 'right' }} className="muted">
                          {money(m.paid)}
                        </td>
                        <td style={{ textAlign: 'right' }} className="muted">
                          {money(m.share)}
                        </td>
                        <td
                          style={{ textAlign: 'right', fontWeight: 600 }}
                          className={
                            m.net > 0.005
                              ? 'pos'
                              : m.net < -0.005
                                ? 'neg'
                                : 'muted'
                          }
                        >
                          {m.net > 0.005 ? '+' : m.net < -0.005 ? '−' : ''}
                          {money(Math.abs(m.net))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
                Paid = what they fronted · Share = their part of expenses · Net =
                owed (+) or owes (−).
              </p>
            </div>

            <div className="grid grid-2">
              <MembersCard
                group={group}
                myId={myId}
                onChanged={setGroup}
                onRemove={removeMember}
              />
              <AddExpenseCard
                group={group}
                myId={myId}
                onChanged={setGroup}
              />
            </div>

            {/* Expense + payment history */}
            <div className="card">
              <h3 className="section-title">🧾 Activity</h3>
              {group.expenses.length === 0 ? (
                <div className="empty">
                  <span className="emoji">🧾</span>No expenses yet.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Paid by</th>
                        <th>Split among</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.expenses.map((e) => (
                        <tr key={e.id}>
                          <td className="muted">
                            {e.occurredAt.slice(0, 10)}
                          </td>
                          <td>
                            {e.kind === 'payment' && (
                              <span
                                className="badge badge-income"
                                style={{ marginRight: 6 }}
                              >
                                payment
                              </span>
                            )}
                            {e.description}
                          </td>
                          <td>{nameOf(e.paidBy)}</td>
                          <td className="muted">
                            {e.kind === 'payment'
                              ? `→ ${nameOf(e.participantIds[0])}`
                              : e.participantIds.map(nameOf).join(', ')}
                          </td>
                          <td
                            style={{ textAlign: 'right', fontWeight: 600 }}
                          >
                            {money(e.amount)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-danger"
                              onClick={() => deleteEntry(e.id)}
                              title="Delete"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Danger zone: owner can delete the group */}
            {group.ownerId === myId && (
              <div className="card danger-zone">
                <div>
                  <strong>Delete group</strong>
                  <div className="hint">
                    Permanently remove this group and all its expenses.
                  </div>
                </div>
                <button className="btn-danger-solid" onClick={deleteGroup}>
                  Delete group
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function MembersCard({
  group,
  myId,
  onChanged,
  onRemove,
}: {
  group: GroupDetail;
  myId?: string;
  onChanged: (g: GroupDetail) => void;
  onRemove: (memberId: string) => void;
}) {
  const isOwner = group.ownerId === myId;
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      onChanged(await groupApi.addMember(group.id, email.trim()));
      toast('Member added.', 'ok');
      setEmail('');
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3 className="section-title">👤 Members</h3>
      <div className="grid" style={{ gap: 8, marginBottom: 16 }}>
        {group.members.map((m) => (
          <div key={m.userId} className="member-row">
            <div className="avatar">
              {(m.displayName || m.email)[0]?.toUpperCase()}
            </div>
            <div>
              <div>{m.displayName || m.email}</div>
              <div className="hint">{m.email}</div>
            </div>
            {m.userId === group.ownerId ? (
              <span className="badge badge-income" style={{ marginLeft: 'auto' }}>
                owner
              </span>
            ) : (
              (isOwner || m.userId === myId) && (
                <button
                  className="btn-danger"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => onRemove(m.userId)}
                  title={m.userId === myId ? 'Leave group' : 'Remove'}
                >
                  {m.userId === myId ? 'Leave' : 'Remove'}
                </button>
              )
            )}
          </div>
        ))}
      </div>
      <form onSubmit={add} className="row" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label>Add member by email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
          />
        </div>
        <button type="submit" disabled={busy} style={{ flex: '0 0 auto' }}>
          {busy ? '…' : 'Add'}
        </button>
      </form>
      <p className="hint" style={{ marginTop: 8, marginBottom: 0 }}>
        The person must already have an account.
      </p>
    </div>
  );
}

function AddExpenseCard({
  group,
  myId,
  onChanged,
}: {
  group: GroupDetail;
  myId?: string;
  onChanged: (g: GroupDetail) => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState(myId ?? group.members[0]?.userId ?? '');
  const [participants, setParticipants] = useState<string[]>(
    group.members.map((m) => m.userId),
  );
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setParticipants((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast('Enter an amount.', 'err');
    if (participants.length === 0)
      return toast('Pick at least one participant.', 'err');
    setBusy(true);
    try {
      const g = await groupApi.addExpense(group.id, {
        paidBy,
        amount: amt,
        description: description.trim() || 'Expense',
        participantIds: participants,
      });
      onChanged(g);
      toast('Expense added.', 'ok');
      setAmount('');
      setDescription('');
    } catch (err) {
      toast((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }

  const perHead =
    Number(amount) && participants.length
      ? Number(amount) / participants.length
      : 0;

  return (
    <div className="card">
      <h3 className="section-title">➕ Add shared expense</h3>
      <form onSubmit={add}>
        <div className="field">
          <label>Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Hotel, Dinner"
          />
        </div>
        <div className="row" style={{ marginBottom: 15 }}>
          <div>
            <label>Amount</label>
            <AmountInput value={amount} onChange={setAmount} />
          </div>
          <div>
            <label>Paid by</label>
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {group.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName || m.email}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Split evenly among</label>
          <div className="chips">
            {group.members.map((m) => (
              <button
                key={m.userId}
                type="button"
                className={`chip ${participants.includes(m.userId) ? 'chip-on' : ''}`}
                onClick={() => toggle(m.userId)}
              >
                {m.displayName || m.email}
              </button>
            ))}
          </div>
          {perHead > 0 && (
            <p className="hint" style={{ marginTop: 8, marginBottom: 0 }}>
              {money(perHead)} each ({participants.length} people)
            </p>
          )}
        </div>
        <button type="submit" disabled={busy} className="btn-block">
          {busy ? 'Adding…' : 'Add expense'}
        </button>
      </form>
    </div>
  );
}
