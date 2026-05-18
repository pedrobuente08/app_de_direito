import { redirect } from 'next/navigation'

/** Rota legada — fila de telemarketing integrada em Pendências. */
export default function TelemarketingRedirectPage() {
  redirect('/pendencias')
}
