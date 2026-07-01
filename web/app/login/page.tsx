'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, storedUser, token } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await authApi.login(email, password)
          : await authApi.register(email, password, displayName || undefined);
      token.set(res.accessToken);
      storedUser.set(res.user);
      router.replace('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card" style={{ width: 380, maxWidth: '100%' }}>
        <h1 className="title">💸 Expense Tracker</h1>
        <p className="subtitle">
          {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <label>Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setError('');
              setMode(mode === 'login' ? 'register' : 'login');
            }}
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </a>
        </p>
      </div>
    </div>
  );
}
