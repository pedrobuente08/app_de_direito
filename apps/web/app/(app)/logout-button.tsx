'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logoutRequest } from '@/lib/api';

type Props = {
  variant?: 'default' | 'sidebar';
};

export function LogoutButton({ variant = 'default' }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleLogout() {
    setErro(null);
    setLoading(true);
    try {
      await logoutRequest();
      router.replace('/login');
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao sair.');
    } finally {
      setLoading(false);
    }
  }

  const isSidebar = variant === 'sidebar';

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={
          isSidebar
            ? 'flex w-full items-center justify-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-60'
            : 'flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-hover)] disabled:opacity-60'
        }
      >
        {loading ? (
          <span>Saindo…</span>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            <span>Sair</span>
          </>
        )}
      </button>
      {erro ? (
        <p
          className={`text-xs ${isSidebar ? 'text-red-300' : 'text-[var(--urgencia-vencida-text)]'}`}
        >
          {erro}
        </p>
      ) : null}
    </div>
  );
}
