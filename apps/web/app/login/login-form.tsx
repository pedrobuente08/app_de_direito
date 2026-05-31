'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { loginRequest } from '@/lib/api';

export function LoginForm() {
  const searchParams = useSearchParams();
  const senhaAlterada = searchParams.get('senhaAlterada') === '1';
  const [email, setEmail] = useState('admin@seed.conectar.local');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await loginRequest(email, senha);
      const dest = searchParams.get('from') ?? '/painel';
      // Navegação completa: garante que cookies da sessão (Set-Cookie) sejam enviados na próxima rota (middleware).
      window.location.assign(dest.startsWith('/') ? dest : `/${dest}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in-up w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-md)]">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
        CONECTAR
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Entre com o e-mail do escritório.
      </p>

      {senhaAlterada ? (
        <p
          role="status"
          className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
        >
          Senha alterada com sucesso. Entre com a nova senha.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-[var(--color-text-secondary)]"
          >
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="senha"
              className="block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Senha
            </label>
            <Link
              href="/recuperar-senha"
              className="text-xs font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)]"
            >
              Esqueci minha senha
            </Link>
          </div>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(ev) => setSenha(ev.target.value)}
            className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
            required
          />
        </div>
        {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-md)] bg-[var(--color-brand)] py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-brand-hover)] disabled:opacity-60"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
        Precisa cadastrar o escritório na plataforma?{' '}
        <Link
          href="/cadastro"
          className="font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)]"
        >
          Cadastro do escritório
        </Link>
      </p>
    </div>
  );
}
