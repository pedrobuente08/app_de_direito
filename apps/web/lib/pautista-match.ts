/** Rotulos possíveis do usuário logado no campo texto `audiencia.pautista`. */
export function rotulosPautistaUsuario(
  nome: string | null | undefined,
  email: string,
): Set<string> {
  const out = new Set<string>()
  const n = nome?.trim().toUpperCase()
  if (n) out.add(n)
  const local = email.split('@')[0]?.trim().toUpperCase()
  if (local) out.add(local)
  out.add(email.trim().toUpperCase())
  return out
}

export function audienciaAtribuidaAoUsuario(
  pautistaCampo: string | null | undefined,
  nome: string | null | undefined,
  email: string,
): boolean {
  const atrib = (pautistaCampo ?? '').trim().toUpperCase()
  if (!atrib) return false
  return rotulosPautistaUsuario(nome, email).has(atrib)
}
