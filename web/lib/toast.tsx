'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

type Kind = 'ok' | 'err' | 'info';
interface Toast {
  id: number;
  kind: Kind;
  message: string;
}

const ToastCtx = createContext<{
  toast: (message: string, kind?: Kind) => void;
}>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, kind: Kind = 'info') => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const icon = (k: Kind) => (k === 'ok' ? '✅' : k === 'err' ? '⚠️' : 'ℹ️');

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="toast-wrap">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span>{icon(t.kind)}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx).toast;
}
