import { Suspense } from 'react';
import { RedefinirSenhaForm } from './redefinir-senha-form';

export const metadata = {
  title: 'Nova senha · CONECTAR',
};

export default function RedefinirSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="text-sm text-[var(--color-text-secondary)]">Carregando…</div>
        }
      >
        <RedefinirSenhaForm />
      </Suspense>
    </div>
  );
}
