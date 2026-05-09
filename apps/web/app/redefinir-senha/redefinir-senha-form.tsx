'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { redefinirSenhaRequest } from '@/lib/api';

const MIN_SENHA = 8;

export function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!tokenFromUrl) {
      setErro('Link inválido ou incompleto. Solicite um novo e-mail em «Esqueci minha senha».');
      return;
    }
    if (novaSenha.length < MIN_SENHA) {
      setErro(`A senha deve ter pelo menos ${MIN_SENHA} caracteres.`);
      return;
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await redefinirSenhaRequest(tokenFromUrl, novaSenha);
      router.replace('/login?senhaAlterada=1');
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  if (!tokenFromUrl) {
    return (
      <div className="animate-fade-in-up w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-md)]">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Link inválido
        </h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          Abra o link enviado por e-mail ou solicite uma nova recuperação de senha.
        </p>
        <Link
          href="/recuperar-senha"
          className="mt-6 inline-block text-sm font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)]"
        >
          Solicitar novo link
        </Link>
        <Link
          href="/login"
          className="mt-3 block text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ← Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-md)]">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
        Nova senha
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Escolha uma senha forte para sua conta.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="novaSenha"
            className="block text-xs font-medium text-[var(--color-text-secondary)]"
          >
            Nova senha
          </label>
          <input
            id="novaSenha"
            type="password"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(ev) => setNovaSenha(ev.target.value)}
            minLength={MIN_SENHA}
            className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm outline-none ring-[hsl(var(--ring))] focus:ring-2"
            required
          />
        </div>
        <div>
          <label
            htmlFor="confirmar"
            className="block text-xs font-medium text-[var(--color-text-secondary)]"
          >
            Confirmar senha
          </label>
          <input
            id="confirmar"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(ev) => setConfirmar(ev.target.value)}
            minLength={MIN_SENHA}
            className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm outline-none ring-[hsl(var(--ring))] focus:ring-2"
            required
          />
        </div>
        {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-md)] bg-[var(--color-brand)] py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-brand-hover)] disabled:opacity-60"
        >
          {loading ? 'Salvando…' : 'Redefinir senha'}
        </button>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)]"
      >
        ← Voltar ao login
      </Link>
    </div>
  );
}
