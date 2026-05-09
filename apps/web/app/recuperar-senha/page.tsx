import { RecuperarSenhaForm } from './recuperar-senha-form';

export const metadata = {
  title: 'Recuperar senha · CONECTAR',
};

export default function RecuperarSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <RecuperarSenhaForm />
    </div>
  );
}
