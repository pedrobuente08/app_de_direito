import { CadastroEscritorioForm } from './cadastro-form';

export const metadata = {
  title: 'Cadastro do escritório · CONECTAR',
};

export default function CadastroEscritorioPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="animate-fade-in-up w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-md)]">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Cadastro do escritório
        </h1>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Tenant B2B · primeiro administrador
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Cria o <strong className="text-[var(--color-text-primary)]">escritório</strong>{' '}
          na plataforma e o usuário <strong className="text-[var(--color-text-primary)]">administrador</strong>{' '}
          inicial. Demais profissionais são cadastrados depois pelo admin — não há
          cadastro público individual fora deste fluxo.
        </p>

        <CadastroEscritorioForm />
      </div>
    </div>
  );
}
