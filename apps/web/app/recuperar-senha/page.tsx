import Link from 'next/link';

export const metadata = {
  title: 'Recuperar senha · CONECTAR',
};

export default function RecuperarSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="animate-fade-in-up w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-md)]">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Recuperar senha
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          O envio de e-mail com link de redefinição ainda não está ligado ao backend
          (fila SMTP + token temporário). Quando estiver pronto, você informará seu
          e-mail aqui e receberá as instruções.
        </p>
        <p className="mt-4 text-sm text-[var(--color-text-tertiary)]">
          Por enquanto, peça ao administrador do escritório uma nova senha ou use o
          usuário criado pelo seed local.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block text-sm font-medium text-[var(--color-brand)] hover:text-[var(--color-brand-hover)]"
        >
          ← Voltar ao login
        </Link>
      </div>
    </div>
  );
}
