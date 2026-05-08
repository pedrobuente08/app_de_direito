import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function HomePage() {
  const token = cookies().get('conectar_token')?.value;
  if (token) {
    redirect('/intimacoes');
  }
  redirect('/login');
}
