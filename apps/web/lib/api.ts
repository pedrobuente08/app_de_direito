import type {
  Audiencia,
  Comarca,
  Comunicacao,
  DashAudiencias,
  DashPendenciaStatus,
  DashTeseReuVara,
  DashVara,
  EscritorioConfig,
  ExtracaoPendente,
  ExtracaoPendenteDetalhe,
  AuthMe,
  ImportResult,
  OabEscuta,
  Pendencia,
  Procedente,
  PatchProcessoPayload,
  Processo,
  ProcessoCampos,
  ProcessosListResponse,
  Reu,
  UploadPdfResult,
  Usuario,
} from '@/lib/types'

/**
 * Base das chamadas à API Nest (`/api/*` no upstream).
 *
 * - `/backend` ou vazio: rewrite no `next.config.mjs` (mesmo domínio do Next).
 * - URL absoluta **de outro host** no browser: usa `/api/bff` (Route Handler repassa ao Nest e
 *   devolve `Set-Cookie` no domínio do front — necessário para login/middleware com API em outro subdomínio).
 */
function resolveApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE?.trim()
  const normalized = raw ? raw.replace(/\/$/, '') : ''

  if (typeof window !== 'undefined' && normalized) {
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      try {
        if (new URL(normalized).origin !== window.location.origin) {
          return '/api/bff'
        }
      } catch {
        /* URL inválida */
      }
    }
  }

  if (normalized) return normalized
  return '/backend'
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${resolveApiBase()}${p}`
}

export type LoginResponse = {
  user: {
    id: string
    nome: string | null
    email: string
    perfil: string
    escritorioId: string
  }
  accessToken: string
}

export type CadastroEscritorioPayload = {
  nomeEscritorio: string
  cnpj?: string
  nomeAdmin: string
  email: string
  senha: string
}

function parseApiErrorMessage(body: Record<string, unknown>): string {
  const m = body.message
  if (typeof m === 'string') return m
  if (Array.isArray(m)) return m.map(String).join(' ')
  return 'Algo deu errado.'
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), { credentials: 'include', ...init })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    throw new Error(parseApiErrorMessage(body))
  }
  return res.json() as Promise<T>
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function cadastroEscritorioRequest(
  payload: CadastroEscritorioPayload,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/cadastro-escritorio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function loginRequest(
  email: string,
  senha: string,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  })
}

export async function logoutRequest(): Promise<void> {
  await apiFetch<void>('/auth/logout', { method: 'POST' })
}

export async function getAuthMe(): Promise<AuthMe> {
  return apiFetch<AuthMe>('/auth/me')
}

/** Solicita e-mail com link para `/redefinir-senha?token=…` (resposta genérica por segurança). */
export async function recuperarSenhaRequest(
  email: string,
): Promise<{ ok: boolean; message?: string }> {
  return apiFetch<{ ok: boolean; message?: string }>('/auth/recuperar-senha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  })
}

export async function redefinirSenhaRequest(
  token: string,
  novaSenha: string,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/auth/redefinir-senha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token.trim(), novaSenha }),
  })
}

// ─── Processos ───────────────────────────────────────────────────────────────

function processosQueryString(
  query?: Record<string, string | number | undefined>,
): string {
  if (!query) {
    return ''
  }
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === '') {
      continue
    }
    sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export async function getProcessos(
  query?: Record<string, string | number | undefined>,
): Promise<ProcessosListResponse> {
  return apiFetch<ProcessosListResponse>(
    `/processos${processosQueryString(query)}`,
  )
}

export async function patchProcesso(
  id: string,
  payload: PatchProcessoPayload,
): Promise<Processo> {
  return apiFetch<Processo>(`/processos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function uploadPdf(file: File): Promise<UploadPdfResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(apiUrl('/processos/upload-pdf'), {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    throw new Error(parseApiErrorMessage(body))
  }
  return res.json() as Promise<UploadPdfResult>
}

// ─── Extração pendente ────────────────────────────────────────────────────────

export async function getExtracoesPendentes(): Promise<ExtracaoPendente[]> {
  return apiFetch<ExtracaoPendente[]>('/extracao-pendente')
}

export async function getExtracaoPendente(id: string): Promise<ExtracaoPendenteDetalhe> {
  return apiFetch<ExtracaoPendenteDetalhe>(`/extracao-pendente/${id}`)
}

export async function aplicarExtracaoPendente(
  id: string,
  campos?: Partial<ProcessoCampos>,
): Promise<{ processo: Processo }> {
  return apiFetch<{ processo: Processo }>(`/extracao-pendente/${id}/aplicar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campos ? { campos } : {}),
  })
}

// ─── Usuários ─────────────────────────────────────────────────────────────────

export async function getUsuarios(): Promise<Usuario[]> {
  return apiFetch<Usuario[]>('/usuarios')
}

export async function criarUsuario(payload: {
  nome: string
  email: string
  perfil: string
  senha: string
}): Promise<Usuario> {
  return apiFetch<Usuario>('/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function editarUsuario(
  id: string,
  payload: Partial<{ nome: string; email: string; perfil: string; senha: string }>,
): Promise<Usuario> {
  return apiFetch<Usuario>(`/usuarios/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// ─── Comarcas ─────────────────────────────────────────────────────────────────

export async function getComarcas(): Promise<Comarca[]> {
  return apiFetch<Comarca[]>('/comarcas')
}

export async function criarComarca(payload: {
  codigo: string
  nome: string
  abreviado: string
}): Promise<Comarca> {
  return apiFetch<Comarca>('/comarcas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function editarComarca(
  id: string,
  payload: Partial<{ codigo: string; nome: string; abreviado: string }>,
): Promise<Comarca> {
  return apiFetch<Comarca>(`/comarcas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deletarComarca(id: string): Promise<void> {
  await apiFetch<void>(`/comarcas/${id}`, { method: 'DELETE' })
}

// ─── Réus ─────────────────────────────────────────────────────────────────────

export async function getReus(): Promise<Reu[]> {
  return apiFetch<Reu[]>('/reus')
}

export async function criarReu(payload: {
  nomeCanonico: string
  aliases: string[]
}): Promise<Reu> {
  return apiFetch<Reu>('/reus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function editarReu(
  id: string,
  payload: Partial<{ nomeCanonico: string; aliases: string[] }>,
): Promise<Reu> {
  return apiFetch<Reu>(`/reus/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deletarReu(id: string): Promise<void> {
  await apiFetch<void>(`/reus/${id}`, { method: 'DELETE' })
}

export async function sugerirMergeReu(texto: string): Promise<{ id: string; nomeCanonico: string; score: number }[]> {
  return apiFetch('/reus/sugerir-merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  })
}

export async function adicionarAliasReu(reuId: string, alias: string): Promise<Reu> {
  return apiFetch<Reu>(`/reus/${reuId}/aliases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aliases: [alias] }),
  })
}

// ─── Escritório ───────────────────────────────────────────────────────────────

export async function getEscritorioConfig(): Promise<EscritorioConfig> {
  const perfil = await apiFetch<{ config?: EscritorioConfig | null }>('/config')
  return (perfil.config ?? {}) as EscritorioConfig
}

export async function salvarEscritorioConfig(
  payload: Partial<EscritorioConfig>,
): Promise<EscritorioConfig> {
  return apiFetch<EscritorioConfig>('/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// ─── Pendências ───────────────────────────────────────────────────────────────

export async function getPendencias(): Promise<Pendencia[]> {
  return apiFetch<Pendencia[]>('/pendencias')
}

export async function criarPendencia(payload: {
  processoId: string
  tipo: string
  dataLimite?: string | null
  responsavel?: string | null
  observacao?: string | null
}): Promise<Pendencia> {
  return apiFetch<Pendencia>('/pendencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function cumprirPendencia(id: string, status?: string): Promise<void> {
  await apiFetch<void>(`/pendencias/${id}/cumprir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(status ? { status } : {}),
  })
}

// ─── Audiências ───────────────────────────────────────────────────────────────

export async function getAudiencias(): Promise<Audiencia[]> {
  return apiFetch<Audiencia[]>('/audiencias')
}

export async function criarAudiencia(payload: {
  processoId: string
  data: string
  tipo?: string | null
  hora?: string | null
  pautista?: string | null
  link?: string | null
  obsPre?: string | null
}): Promise<Audiencia> {
  return apiFetch<Audiencia>('/audiencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function finalizarAudiencia(
  id: string,
  body: {
    obsPos: string
    status?: string
    autorPresenca?: string
    motivoAusencia?: string
  },
): Promise<void> {
  await apiFetch<void>(`/audiencias/${id}/finalizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── Procedentes ──────────────────────────────────────────────────────────────

export async function getProcedentes(): Promise<Procedente[]> {
  return apiFetch<Procedente[]>('/procedentes')
}

export async function atualizarProcedente(
  processoId: string,
  payload: Partial<{
    familiaSituacao: string
    situacao: string
    responsavel: string | null
    obsCurta: string | null
    valorRecebido: string | null
    dataRecebimento: string | null
  }>,
): Promise<Procedente> {
  return apiFetch<Procedente>(`/procedentes/${processoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** Processos com sentença procedente/parcial/acordo mas sem linha no funil — cria as linhas. */
export async function sincronizarProcedentesEmFalta(): Promise<{ criadas: number }> {
  return apiFetch<{ criadas: number }>('/procedentes/sincronizar-em-falta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
}

export type CenarioSegundoGrau = 'A' | 'B' | 'C' | 'D'

export type RegistrarSegundoGrauPayload = {
  processoId: string
  cenario: CenarioSegundoGrau
  data: string
  valor?: string | null
  observacoes?: string | null
  turma?: string | null
}

/** E4 — decisão de 2º grau (cenários A–D do PLANO_AJUSTES). */
export async function registrarSegundoGrau(
  payload: RegistrarSegundoGrauPayload,
): Promise<{ cenario: string; sentencas: unknown[] }> {
  return apiFetch<{ cenario: string; sentencas: unknown[] }>(
    '/recursos/segundo-grau',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}

// ─── Dashboards ───────────────────────────────────────────────────────────────

export async function getDashVaras(): Promise<DashVara[]> {
  return apiFetch<DashVara[]>('/dashboards/varas')
}

export async function getDashPendencias(): Promise<DashPendenciaStatus[]> {
  return apiFetch<DashPendenciaStatus[]>('/dashboards/pendencias')
}

export async function getDashAudiencias(): Promise<DashAudiencias> {
  return apiFetch<DashAudiencias>('/dashboards/audiencias')
}

export async function getDashTeseReuVara(filters?: {
  materia?: string
  reu?: string
  vara?: string
}): Promise<DashTeseReuVara[]> {
  const params = new URLSearchParams()
  if (filters?.materia) params.set('materia', filters.materia)
  if (filters?.reu) params.set('reu', filters.reu)
  if (filters?.vara) params.set('vara', filters.vara)
  const qs = params.toString()
  return apiFetch<DashTeseReuVara[]>(`/dashboards/tese-reu-vara${qs ? `?${qs}` : ''}`)
}

// ─── Comunicações ─────────────────────────────────────────────────────────────

export async function getComunicacoes(): Promise<Comunicacao[]> {
  return apiFetch<Comunicacao[]>('/comunicacoes')
}

export async function getOabs(): Promise<OabEscuta[]> {
  return apiFetch<OabEscuta[]>('/comunicacoes/oabs')
}

export async function cadastrarOab(oab: string): Promise<OabEscuta> {
  return apiFetch<OabEscuta>('/comunicacoes/oab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oab }),
  })
}

// ─── Importação ───────────────────────────────────────────────────────────────

export async function importarProcessosCsv(csv: string): Promise<ImportResult> {
  return apiFetch<ImportResult>('/import/processos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv }),
  })
}
