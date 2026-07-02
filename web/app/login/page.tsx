'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, storedUser, token } from '@/lib/api';
import { useToast } from '@/lib/toast';

const FEATURES = [
  { icon: '📊', title: 'Monthly reports', text: 'Charts by category and by day, with month-over-month comparison.' },
  { icon: '📥', title: 'CSV import', text: 'Upload a bank statement — rows are processed asynchronously.' },
  { icon: '🔔', title: 'Instant tracking', text: 'Every transaction fires an event across the services in real time.' },
];

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
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
      toast(
        mode === 'login' ? 'Welcome back!' : 'Account created — welcome!',
        'ok',
      );
      router.replace('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="auth-shell fade-in">
        {/* Brand panel */}
        <div className="auth-brand">
          <div className="brand" style={{ fontSize: 20 }}>
            <span className="logo">💸</span> Expense Tracker
          </div>
          <p className="auth-tagline">
            Track spending, import statements, and understand where your money
            goes — powered by a small fleet of microservices.
          </p>
          <div className="auth-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="auth-feature">
                <span className="auth-feature-icon">{f.icon}</span>
                <div>
                  <strong>{f.title}</strong>
                  <div className="hint">{f.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form panel */}
        <div className="auth-form">
          <h1 className="title">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="subtitle" style={{ marginBottom: 22 }}>
            {mode === 'login'
              ? 'Welcome back — pick up where you left off.'
              : 'Start tracking in under a minute.'}
          </p>

          {error && (
            <div className="error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

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
                autoComplete="email"
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
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
              />
            </div>
            <button type="submit" disabled={loading} className="btn-block">
              {loading
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in →'
                  : 'Create account →'}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 18, fontSize: 14 }}>
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have one? '}
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
    </div>
  );
}
