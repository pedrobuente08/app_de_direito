import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="text-sm text-[var(--color-text-secondary)]">
            Carregando…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
