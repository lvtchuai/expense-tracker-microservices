'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser, storedUser, token } from './api';

/** Redirects to /login if there's no token. Returns the stored user. */
export function useRequireAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token.get()) {
      router.replace('/login');
      return;
    }
    setUser(storedUser.get());
    setReady(true);
  }, [router]);

  return { user, ready };
}

export function logout(router: ReturnType<typeof useRouter>) {
  token.clear();
  router.replace('/login');
}
