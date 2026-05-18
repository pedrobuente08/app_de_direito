'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cadastroEscritorioRequest } from '@/lib/api';

export function CadastroEscritorioForm() {
  const [nomeEscritorio, setNomeEscritorio] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [nomeAdmin, setNomeAdmin] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaConfirm, setSenhaConfirm] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha !== senhaConfirm) {
      setErro('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      await cadastroEscritorioRequest({
        nomeEscritorio: nomeEscritorio.trim(),
        ...(cnpj.trim()
          ? { cnpj: cnpj.trim() }
          : {}),
        nomeAdmin: nomeAdmin.trim(),
        email: email.trim(),
        senha,
      });
      window.location.assign('/intimacoes');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="nomeEscritorio"
          className="block text-xs font-medium text-[var(--color-text-secondary)]"
        >
          Nome do escritório
        </label>
        <input
          id="nomeEscritorio"
          type="text"
          autoComplete="organization"
          value={nomeEscritorio}
          onChange={(ev) => setNomeEscritorio(ev.target.value)}
          className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
          required
          minLength={2}
          maxLength={200}
          placeholder="Ex.: Silva & Associados Advocacia"
        />
      </div>

      <div>
        <label
          htmlFor="cnpj"
          className="block text-xs font-medium text-[var(--color-text-secondary)]"
        >
          CNPJ <span className="font-normal text-[var(--color-text-tertiary)]">(opcional)</span>
        </label>
        <input
          id="cnpj"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={cnpj}
          onChange={(ev) => setCnpj(ev.target.value)}
          className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
          placeholder="Somente números ou com pontuação"
        />
      </div>

      <div className="border-t border-[var(--color-border-default)] pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Primeiro administrador
        </p>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="nomeAdmin"
              className="block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Nome completo
            </label>
            <input
              id="nomeAdmin"
              type="text"
              autoComplete="name"
              value={nomeAdmin}
              onChange={(ev) => setNomeAdmin(ev.target.value)}
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
              required
              minLength={2}
              maxLength={200}
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              E-mail de acesso
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
              required
            />
          </div>
          <div>
            <label
              htmlFor="senha"
              className="block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Senha (mín. 8 caracteres)
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(ev) => setSenha(ev.target.value)}
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
              required
              minLength={8}
            />
          </div>
          <div>
            <label
              htmlFor="senhaConfirm"
              className="block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Confirmar senha
            </label>
            <input
              id="senhaConfirm"
              type="password"
              autoComplete="new-password"
              value={senhaConfirm}
              onChange={(ev) => setSenhaConfirm(ev.target.value)}
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
              required
              minLength={8}
            />
          </div>
        </div>
      </div>

      {erro ? (
        <p className="text-sm text-[var(--urgencia-vencida-text)]">{erro}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-[var(--radius-md)] bg-[var(--color-brand)] py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-brand-hover)] disabled:opacity-60"
      >
        {loading ? 'Cadastrando…' : 'Criar escritório e entrar'}
      </button>

      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        Já tem acesso?{' '}
        <Link
          href="/login"
          className="font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)]"
        >
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
