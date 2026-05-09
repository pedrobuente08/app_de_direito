'use client';

import Link from 'next/link';
import { useState } from 'react';
import { recuperarSenhaRequest } from '@/lib/api';

export function RecuperarSenhaForm() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await recuperarSenhaRequest(email);
      setEnviado(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar solicitação.');
    } finally {
      setLoading(false);
    }
  }

  if (enviado) {
    return (
      <div className="animate-fade-in-up w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-md)]">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Verifique seu e-mail
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Se existir uma conta para o e-mail informado, você receberá em instantes um link
          para redefinir a senha (válido por cerca de 1 hora).
        </p>
        <p className="mt-3 text-sm text-[var(--color-text-tertiary)]">
          Não recebeu? Confira a caixa de spam ou tente outro endereço.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block text-sm font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)]"
        >
          ← Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-md)]">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
        Recuperar senha
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.
      </p>

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
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
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
          {loading ? 'Enviando…' : 'Enviar link'}
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
