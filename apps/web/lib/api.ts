import type {
  Audiencia,
  Comarca,
  Comunicacao,
  PaginatedComunicacoes,
  ConfirmarBatchItem,
  ConfirmarBatchResult,
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
  PdfPreviewItem,
  CreateSentencaPayload,
  Processo,
  ProcessoCampos,
  ProcessoTimelineResponse,
  ProcessosListResponse,
  Sentenca,
  Reu,
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

export async function getProcesso(id: string): Promise<Processo> {
  return apiFetch<Processo>(`/processos/${id}`)
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

export async function getProcessoTimeline(
  processoId: string,
): Promise<ProcessoTimelineResponse> {
  return apiFetch<ProcessoTimelineResponse>(
    `/processos/${processoId}/timeline`,
  )
}

export async function getSentencas(processoId: string): Promise<Sentenca[]> {
  return apiFetch<Sentenca[]>(
    `/sentencas?processoId=${encodeURIComponent(processoId)}`,
  )
}

export async function createSentenca(
  payload: CreateSentencaPayload,
): Promise<Sentenca> {
  return apiFetch<Sentenca>('/sentencas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function aplicarPosImprocedencia(
  processoId: string,
  payload: import('@/lib/types').PosImprocedenciaPayload,
): Promise<import('@/lib/types').Processo> {
  return apiFetch<import('@/lib/types').Processo>(
    `/processos/${processoId}/pos-improcedencia`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}

export async function aplicarPosExtincao(
  processoId: string,
  payload: import('@/lib/types').PosExtincaoPayload,
): Promise<import('@/lib/types').Processo> {
  return apiFetch<import('@/lib/types').Processo>(
    `/processos/${processoId}/pos-extincao`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}

export async function aplicarPosProcedenteParcial(
  processoId: string,
  payload: import('@/lib/types').PosProcedenteParcialPayload,
): Promise<import('@/lib/types').Processo> {
  return apiFetch<import('@/lib/types').Processo>(
    `/processos/${processoId}/pos-procedente-parcial`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}

export async function sobrestarProcesso(
  processoId: string,
  payload: import('@/lib/types').SobrestarProcessoPayload,
): Promise<import('@/lib/types').Processo> {
  return apiFetch<import('@/lib/types').Processo>(
    `/processos/${processoId}/sobrestar`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}

export async function getProcessoObservacoes(
  processoId: string,
): Promise<import('@/lib/types').ObservacaoItem[]> {
  return apiFetch<import('@/lib/types').ObservacaoItem[]>(
    `/processos/${processoId}/observacoes`,
  )
}

export async function getReprotocoloList(
  subEstado?: string,
): Promise<import('@/lib/types').ReprotocoloLinha[]> {
  const q = subEstado?.trim()
    ? `?subEstado=${encodeURIComponent(subEstado)}`
    : ''
  return apiFetch<import('@/lib/types').ReprotocoloLinha[]>(`/reprotocolo${q}`)
}

export async function getReprotocoloResumo(): Promise<
  import('@/lib/types').ReprotocoloResumo
> {
  return apiFetch<import('@/lib/types').ReprotocoloResumo>('/reprotocolo/resumo')
}

export async function patchReprotocolo(
  processoId: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return apiFetch(`/reprotocolo/${processoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function encerrarPendencia(
  id: string,
  payload: import('@/lib/types').EncerrarPendenciaPayload,
): Promise<void> {
  await apiFetch<void>(`/pendencias/${id}/encerrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function criarAdvogadoAdversario(payload: {
  nomeCanonico: string
  oab?: string
  escritorioAdversarioId?: string | null
  aliases?: string[]
}): Promise<{ id: string; nomeCanonico: string }> {
  return apiFetch('/advogados-adversarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function getRecursos(): Promise<
  import('@/lib/types').RecursoListaItem[]
> {
  return apiFetch<import('@/lib/types').RecursoListaItem[]>('/recursos')
}

export async function getRecursosResumo(): Promise<
  import('@/lib/types').RecursosResumo
> {
  return apiFetch<import('@/lib/types').RecursosResumo>('/recursos/resumo')
}

export type InterporEmbargosPayload = {
  sentencaId: string
  processoId: string
  origem: 'NOS' | 'REU' | 'AMBOS'
  dataInterposicao: string
  prazoJulgamento?: string
  observacoes?: string
}

export async function interporEmbargosDeclaracao(
  payload: InterporEmbargosPayload,
): Promise<unknown> {
  return apiFetch('/embargos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function registrarResultadoEmbargos(
  embargosId: string,
  payload: {
    resultado: 'ACOLHIDOS' | 'PARCIALMENTE_ACOLHIDOS' | 'REJEITADOS'
    dataJulgamento: string
    observacoes?: string
  },
): Promise<unknown> {
  return apiFetch(`/embargos/${embargosId}/resultado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function getAddonsStatus(): Promise<{
  addons: import('@/lib/types').EscritorioAddonsConfig
  labels: Record<string, string>
}> {
  return apiFetch('/addons/status')
}

export async function classificarDecisaoInterlocutoria(payload: {
  processoId: string
  tipo: import('@/lib/types').TipoInterlocutoria
  conteudo?: string
  prazoCumprimento?: string
  observacoes?: string
  comunicacaoId?: string
}): Promise<unknown> {
  return apiFetch('/decisoes-interlocutorias/classificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// ─── PRO Fase 3 — Workflows raros ─────────────────────────────────────────────

export async function getTutelas(processoId: string): Promise<
  import('@/lib/types').TutelaAntecipada[]
> {
  return apiFetch(`/processos/${processoId}/tutelas`)
}

export async function criarTutela(
  processoId: string,
  payload: {
    tipo: 'TUTELA_ANTECIPADA' | 'TUTELA_CAUTELAR' | 'LIMINAR'
    pedidoEm: string
    descricao?: string
    prazoCumprimento?: string
  },
): Promise<import('@/lib/types').TutelaAntecipada> {
  return apiFetch(`/processos/${processoId}/tutelas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function atualizarTutela(
  tutelaId: string,
  payload: Partial<{
    resultado: string
    dataResultado: string
    cumprida: boolean
    cumpridaEm: string
    observacoes: string
    prazoCumprimento: string
  }>,
): Promise<import('@/lib/types').TutelaAntecipada> {
  return apiFetch(`/tutelas/${tutelaId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function getSucessores(
  processoId: string,
): Promise<import('@/lib/types').ProcessoSucessor[]> {
  return apiFetch(`/processos/${processoId}/sucessores`)
}

export async function registrarAutorFalecido(
  processoId: string,
  payload: {
    dataObito: string
    sucessores: Array<{ nome: string; cpf?: string; parentesco?: string }>
    observacoes?: string
  },
): Promise<import('@/lib/types').Processo> {
  return apiFetch(`/processos/${processoId}/autor-falecido`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function habilitarSucessor(
  sucessorId: string,
  payload?: { habilitadoEm?: string },
): Promise<import('@/lib/types').ProcessoSucessor> {
  return apiFetch(`/sucessores/${sucessorId}/habilitar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  })
}

export async function criarSucessor(
  processoId: string,
  payload: { nome: string; cpf?: string; parentesco?: string; observacoes?: string },
): Promise<import('@/lib/types').ProcessoSucessor> {
  return apiFetch(`/processos/${processoId}/sucessores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// ─── PRO Fase 3 — Captação (parceiros) ───────────────────────────────────────

export async function getParceiros(): Promise<import('@/lib/types').Parceiro[]> {
  return apiFetch('/parceiros')
}

export async function criarParceiro(payload: {
  nome: string
  tipo: 'PF' | 'ESCRITORIO'
  cpfCnpj?: string
  comissaoPercentual?: string
  corHex?: string
}): Promise<import('@/lib/types').Parceiro> {
  return apiFetch('/parceiros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function atualizarParceiro(
  id: string,
  payload: Partial<{
    nome: string
    tipo: 'PF' | 'ESCRITORIO'
    cpfCnpj: string | null
    comissaoPercentual: string | null
    corHex: string | null
    ativo: boolean
  }>,
): Promise<import('@/lib/types').Parceiro> {
  return apiFetch(`/parceiros/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deletarParceiro(id: string): Promise<void> {
  await apiFetch<void>(`/parceiros/${id}`, { method: 'DELETE' })
}

export async function getParceiroMaterias(): Promise<
  import('@/lib/types').ParceiroMateria[]
> {
  return apiFetch('/parceiros/materias')
}

export async function criarParceiroMateria(payload: {
  parceiroId: string
  materia: string
}): Promise<import('@/lib/types').ParceiroMateria> {
  return apiFetch('/parceiros/materias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deletarParceiroMateria(id: string): Promise<void> {
  await apiFetch<void>(`/parceiros/materias/${id}`, { method: 'DELETE' })
}

// ─── PRO Fase 3 — Produção probatória (PJE) ──────────────────────────────────

export async function getProducaoProbatoria(
  processoId: string,
): Promise<import('@/lib/types').ProducaoProbatoria[]> {
  return apiFetch(`/processos/${processoId}/producao-probatoria`)
}

export async function criarProducaoProbatoria(
  processoId: string,
  payload: {
    tipo: string
    status?: string
    dataDesignacao?: string
    peritoNome?: string
    observacoes?: string
  },
): Promise<import('@/lib/types').ProducaoProbatoria> {
  return apiFetch(`/processos/${processoId}/producao-probatoria`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function atualizarProducaoProbatoria(
  id: string,
  payload: Partial<{
    status: string
    dataDesignacao: string
    dataConclusao: string
    peritoNome: string
    observacoes: string
  }>,
): Promise<import('@/lib/types').ProducaoProbatoria> {
  return apiFetch(`/producao-probatoria/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// ─── PRO Fase 3 — Execução avançada ──────────────────────────────────────────

export async function atualizarAstreintes(
  processoId: string,
  payload: Partial<{
    astreintesAtiva: boolean
    astreintesValorDiario: string | null
    astreintesDataInicio: string | null
    astreintesTeto: string | null
    astreintesSuspensaEm: string | null
    astreintesPagaEm: string | null
  }>,
): Promise<import('@/lib/types').Procedente> {
  return apiFetch(`/procedentes/${processoId}/astreintes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function atualizarPenhoraExecucao(
  processoId: string,
  payload: Partial<{
    penhoraSistema: string | null
    sisbajudNumeroOrdem: string | null
    sisbajudDataBloqueio: string | null
    sisbajudValorBloqueado: string | null
    bacenjudDataOficio: string | null
    bacenjudBancoAlvo: string | null
  }>,
): Promise<import('@/lib/types').Procedente> {
  return apiFetch(`/procedentes/${processoId}/penhora`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function getImprocedentes(): Promise<
  import('@/lib/types').ImprocedenteRow[]
> {
  return apiFetch<import('@/lib/types').ImprocedenteRow[]>('/improcedentes')
}

export async function getImprocedentesResumo(): Promise<
  import('@/lib/types').ImprocedentesResumo
> {
  return apiFetch<import('@/lib/types').ImprocedentesResumo>(
    '/improcedentes/resumo',
  )
}

export async function patchImprocedente(
  id: string,
  payload: Partial<{
    valorSucumbencia: string | null
    destinatarioSucumbencia: string | null
    statusPagamento: string
    dataPrazoPagamento: string | null
    dataPagamento: string | null
    justicaGratuita: boolean
  }>,
): Promise<import('@/lib/types').ImprocedenteRow> {
  return apiFetch<import('@/lib/types').ImprocedenteRow>(`/improcedentes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function previewPdfBatch(files: File[]): Promise<PdfPreviewItem[]> {
  const form = new FormData()
  for (const f of files) {
    form.append('files', f)
  }
  const res = await fetch(apiUrl('/processos/preview-pdf-batch'), {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    throw new Error(parseApiErrorMessage(body))
  }
  return res.json() as Promise<PdfPreviewItem[]>
}

export async function confirmarBatchPdf(
  items: ConfirmarBatchItem[],
): Promise<ConfirmarBatchResult> {
  return apiFetch<ConfirmarBatchResult>('/processos/confirmar-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
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

export async function getOpcoesPautista(): Promise<import('@/lib/types').OpcaoPautista[]> {
  return apiFetch('/usuarios/opcoes-pautista')
}

export async function criarUsuario(payload: {
  nome?: string
  email: string
  perfil: string
  senha: string
  loginAliases?: string[]
  ehPautista?: boolean
}): Promise<Usuario> {
  return apiFetch<Usuario>('/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function editarUsuario(
  id: string,
  payload: Partial<{
    nome: string
    email: string
    perfil: string
    senha: string
    loginAliases: string[]
    ehPautista: boolean
    ativo: boolean
  }>,
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
  perfilDiligencia?: 'DILIGENTE' | 'MENOS_DILIGENTE'
  exigeDocFrequente?: boolean
}): Promise<Comarca> {
  return apiFetch<Comarca>('/comarcas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function editarComarca(
  id: string,
  payload: Partial<{
    codigo: string
    nome: string
    abreviado: string
    perfilDiligencia: 'DILIGENTE' | 'MENOS_DILIGENTE' | null
    exigeDocFrequente: boolean
  }>,
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
  cnpj?: string | null
}): Promise<Reu> {
  return apiFetch<Reu>('/reus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function editarReu(
  id: string,
  payload: Partial<{ nomeCanonico: string; aliases: string[]; cnpj: string | null }>,
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

export async function getProcessosResumo(): Promise<
  import('@/lib/types').ProcessosResumo
> {
  return apiFetch<import('@/lib/types').ProcessosResumo>('/processos/resumo')
}

export async function getProcedentesResumo(): Promise<
  import('@/lib/types').ProcedentesResumo
> {
  return apiFetch<import('@/lib/types').ProcedentesResumo>('/procedentes/resumo')
}

export async function getPendencias(
  query?: Record<string, string | undefined>,
): Promise<Pendencia[]> {
  const qs = query
    ? `?${new URLSearchParams(
        Object.entries(query).filter(([, v]) => v != null && v !== '') as [
          string,
          string,
        ][],
      ).toString()}`
    : ''
  return apiFetch<Pendencia[]>(`/pendencias${qs}`)
}

export async function getPendenciasResumo(): Promise<
  import('@/lib/types').PendenciasResumo
> {
  return apiFetch<import('@/lib/types').PendenciasResumo>('/pendencias/resumo')
}

export async function criarPendencia(payload: {
  processoId: string
  tipo: string
  dataLimite?: string | null
  responsavel?: string | null
  observacao?: string | null
  origem?: string
  fila?: string | null
}): Promise<Pendencia> {
  return apiFetch<Pendencia>('/pendencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function cumprirPendencia(
  id: string,
  payload: { status?: string; motivoCumprimento: string },
): Promise<void> {
  await apiFetch<void>(`/pendencias/${id}/cumprir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(payload.status ? { status: payload.status } : {}),
      motivoCumprimento: payload.motivoCumprimento,
    }),
  })
}

export async function cumprirPendenciasLote(
  ids: string[],
  motivoCumprimento = 'Cumprimento em lote',
): Promise<{ processadas: number; ignoradas: number }> {
  return apiFetch<{ processadas: number; ignoradas: number }>('/pendencias/lote/cumprir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, motivoCumprimento }),
  })
}

export async function getEscritoriosAdversarios(): Promise<
  import('@/lib/types').EscritorioAdversario[]
> {
  return apiFetch<import('@/lib/types').EscritorioAdversario[]>(
    '/escritorios-adversarios',
  )
}

export async function criarEscritorioAdversario(payload: {
  nomeCanonico: string
  cnpj?: string | null
  aliases?: string[]
}): Promise<import('@/lib/types').EscritorioAdversario> {
  return apiFetch('/escritorios-adversarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function editarEscritorioAdversario(
  id: string,
  payload: Partial<{
    nomeCanonico: string
    cnpj: string | null
    aliases: string[]
  }>,
): Promise<import('@/lib/types').EscritorioAdversario> {
  return apiFetch(`/escritorios-adversarios/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deletarEscritorioAdversario(id: string): Promise<void> {
  await apiFetch<void>(`/escritorios-adversarios/${id}`, { method: 'DELETE' })
}

export async function seedComarcasPadraoBa(): Promise<{
  inseridas: number
  totalPadrao: number
}> {
  return apiFetch('/comarcas/seed-padrao-ba', { method: 'POST' })
}

// ─── Audiências ───────────────────────────────────────────────────────────────

export async function getAudiencias(): Promise<Audiencia[]> {
  return apiFetch<Audiencia[]>('/audiencias')
}

export async function getRelatorioAusentes6m(): Promise<
  import('@/lib/types').AudienciaAusente[]
> {
  return apiFetch('/audiencias/relatorio-ausentes-6m')
}

export async function getResumoAusentes6m(): Promise<
  import('@/lib/types').Ausentes6mResumo
> {
  return apiFetch('/audiencias/relatorio-ausentes-6m/resumo')
}

export async function atualizarAusente(
  id: string,
  payload: Partial<{
    reaproveitavel: boolean
    reaproveitadoEm: string | null
    observacoesRevisao: string | null
  }>,
): Promise<import('@/lib/types').AudienciaAusente> {
  return apiFetch(`/audiencias/ausentes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
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

export async function atualizarAudiencia(
  id: string,
  payload: Partial<{
    pautista: string | null
    link: string | null
    obsPre: string | null
    tipo: string | null
    data: string
    hora: string | null
  }>,
): Promise<Audiencia> {
  return apiFetch<Audiencia>(`/audiencias/${id}`, {
    method: 'PATCH',
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
    reuPresenca?: string
    motivoAusencia?: string
    motivoCancelamento?: string
    novaData?: string
    novaHora?: string | null
    houvePendencia?: boolean
    pendencias?: Array<{
      tipo: string
      dataLimite?: string | null
      responsavel?: string | null
      observacao?: string | null
    }>
    escritorioAdversarioId?: string | null
    cenario?: string
    cenarioObservacao?: string | null
    docPendenteTipo?: string
  },
): Promise<void> {
  await apiFetch<void>(`/audiencias/${id}/finalizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export type AudienciaHistoricoItem = {
  id: string
  audienciaIdOrigem: string | null
  escritorioId: string
  processoId: string
  escritorioAdversarioId: string | null
  tipo: string | null
  data: string
  hora: string | null
  pautista: string | null
  status: string
  autorPresenca: string | null
  reuPresenca: string | null
  motivoAusencia: string | null
  cenario: string | null
  cenarioObservacao: string | null
  obsPre: string | null
  obsPos: string | null
  link: string | null
  createdAtOrigem: string | null
  archivedAt: string
}

export async function getHistoricoAudienciasProcesso(
  processoId: string,
): Promise<AudienciaHistoricoItem[]> {
  return apiFetch<AudienciaHistoricoItem[]>(
    `/audiencias/historico/processo/${processoId}`,
  )
}

export async function desfazerFinalizacaoAudiencia(
  historicoId: string,
): Promise<{ restauradaId: string; processoId: string; avisos: string[] }> {
  return apiFetch(`/audiencias/historico/${historicoId}/desfazer`, {
    method: 'POST',
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

export type CenarioSegundoGrau = 'A' | 'B' | 'C' | 'D' | 'E'

export type SubResultadoSegundoGrau = 'E1' | 'E2' | 'E3' | 'E4'

export type RegistrarSegundoGrauPayload = {
  processoId: string
  cenario: CenarioSegundoGrau
  /** Obrigatório quando cenario = E (parcial, ambas recorreram). */
  subResultado?: SubResultadoSegundoGrau
  data: string
  valor?: string | null
  observacoes?: string | null
  turma?: string | null
}

/** Decisão de 2º grau — cenários A–D e E (parcial, sub E1–E4). */
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

// ─── DAJE ─────────────────────────────────────────────────────────────────────

export async function dajeEmitir(
  processoId: string,
  body: { valor: string; dataEmissao?: string },
): Promise<import('@/lib/types').Processo> {
  return apiFetch(`/processos/${processoId}/daje/emitir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function dajePedirIsencao(
  processoId: string,
): Promise<import('@/lib/types').Processo> {
  return apiFetch(`/processos/${processoId}/daje/pedir-isencao`, { method: 'POST' })
}

export async function dajeResultadoIsencao(
  processoId: string,
  body: { resultado: 'DEFERIDA' | 'INDEFERIDA' },
): Promise<import('@/lib/types').Processo> {
  return apiFetch(`/processos/${processoId}/daje/resultado-isencao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function dajeRegistrarPagamento(
  processoId: string,
): Promise<import('@/lib/types').Processo> {
  return apiFetch(`/processos/${processoId}/daje/registrar-pagamento`, {
    method: 'POST',
  })
}

export async function dajeInadimplencia(
  processoId: string,
): Promise<{ processo: import('@/lib/types').Processo; perfilDiligencia: string }> {
  return apiFetch(`/processos/${processoId}/daje/inadimplencia`, { method: 'POST' })
}

export async function desistirProcesso(
  processoId: string,
  body: { motivo: string; data: string },
): Promise<import('@/lib/types').Processo> {
  return apiFetch(`/processos/${processoId}/desistir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function atualizarObrigacaoFazer(
  processoId: string,
  body: {
    descricao: string
    cumprida?: boolean
    cumpridaEm?: string
    serasajudAcionado?: boolean
    temObrigacaoFazer?: boolean
  },
): Promise<import('@/lib/types').Procedente> {
  return apiFetch(`/procedentes/${processoId}/obrigacao-fazer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function getClientesProcessos(cpf: string) {
  return apiFetch<
    {
      processoId: string
      numero: string
      clienteNome: string | null
      reuTexto: string | null
      vara: string | null
      faseAtual: string | null
      statusProcesso: string
      materia: string | null
    }[]
  >(`/clientes/${encodeURIComponent(cpf)}/processos`)
}

export async function solicitarCertidaoCredito(improcedenteId: string) {
  return apiFetch(`/improcedentes/${improcedenteId}/certidao-credito`, {
    method: 'POST',
  })
}

export async function getDashLitiganciaMaFe(): Promise<{
  total: number
  processos: {
    processoId: string
    numero: string
    clienteNome: string | null
    reuTexto: string | null
    vara: string | null
    faseAtual: string | null
  }[]
  porReu: { reu: string; total: number }[]
  porVara: { vara: string; total: number }[]
}> {
  return apiFetch('/dashboards/litigancia-ma-fe')
}

// ─── Dashboards ───────────────────────────────────────────────────────────────

export async function getDashVaras(): Promise<DashVara[]> {
  return apiFetch<DashVara[]>('/dashboards/varas')
}

export async function getDashGeral(): Promise<import('@/lib/types').DashGeral> {
  return apiFetch('/dashboards/geral')
}

export async function getDashPendencias(): Promise<import('@/lib/types').DashPendencias> {
  return apiFetch('/dashboards/pendencias')
}

export async function getDashAudiencias(): Promise<import('@/lib/types').DashAudiencias> {
  return apiFetch('/dashboards/audiencias')
}

export async function getDashRecursos(): Promise<import('@/lib/types').DashRecursos> {
  return apiFetch('/dashboards/recursos')
}

export async function getDashImprocedentes(): Promise<
  import('@/lib/types').DashImprocedentes
> {
  return apiFetch('/dashboards/improcedentes')
}

export async function getDashFinanceiro(): Promise<
  import('@/lib/types').DashFinanceiro
> {
  return apiFetch('/dashboards/financeiro')
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

export async function getDashQualidadeProcedencia(): Promise<
  import('@/lib/types').DashQualidadeProcedencia[]
> {
  return apiFetch('/dashboards/qualidade-procedencia')
}

export async function getDashTopBancas(): Promise<
  import('@/lib/types').DashTopBancas
> {
  return apiFetch('/dashboards/top-bancas-adversarias')
}

export async function getDashCruzamento5d(): Promise<
  import('@/lib/types').DashCruzamento5d[]
> {
  return apiFetch('/dashboards/cruzamento-5d')
}

export async function getDashPassivoSucumbencia(): Promise<
  import('@/lib/types').DashPassivoSucumbencia
> {
  return apiFetch('/dashboards/passivo-sucumbencia')
}

export async function getDashPendenciasOrigem(): Promise<
  import('@/lib/types').DashPendenciasOrigem
> {
  return apiFetch('/dashboards/pendencias-origem')
}

export async function getAuditLog(params?: {
  page?: number
  limit?: number
  entidade?: string
  usuarioId?: string
  desde?: string
  ate?: string
}): Promise<import('@/lib/types').AuditLogList> {
  const q = new URLSearchParams()
  if (params?.page) q.set('page', String(params.page))
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.entidade) q.set('entidade', params.entidade)
  if (params?.usuarioId) q.set('usuarioId', params.usuarioId)
  if (params?.desde) q.set('desde', params.desde)
  if (params?.ate) q.set('ate', params.ate)
  const qs = q.toString()
  return apiFetch(`/audit-log${qs ? `?${qs}` : ''}`)
}

export async function previewMigracaoComplemento(linhas: string[]): Promise<{
  total: number
  autoMapeaveis: number
  pctAuto: number
  candidatos: Array<{
    entrada: string
    confianca: number
    recursoTipo?: string
    recursoOrigem?: string
    recursoResultado?: string
    docPendente?: string[]
    sentencaResultado?: string
  }>
}> {
  return apiFetch('/migracao-procedentes/preview-complemento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ linhas }),
  })
}

// ─── Comunicações ─────────────────────────────────────────────────────────────

export async function getComunicacoes(): Promise<Comunicacao[]> {
  return apiFetch<Comunicacao[]>('/comunicacoes')
}

export async function getComunicacoesProcesso(processoId: string): Promise<Comunicacao[]> {
  return apiFetch<Comunicacao[]>(`/comunicacoes/processo/${processoId}`)
}

export async function getComunicacoesOrfas(page = 1, pageSize = 20): Promise<PaginatedComunicacoes> {
  return apiFetch<PaginatedComunicacoes>(`/comunicacoes/orfas?page=${page}&pageSize=${pageSize}`)
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

export type OnboardingStatus = {
  status: 'IDLE' | 'RUNNING' | 'DONE' | 'ERROR'
  progresso: { processado: number; total: number }
  relatorio: {
    processosNovos: number
    comunicacoesNovas: number
    jaExistiam: number
    erros: number
  } | null
  erroMsg?: string | null
}

export async function iniciarOnboardingDjen(payload: {
  oab: string
  ufOab: string
  diasJanela?: number
}): Promise<{ jobId: string; status: OnboardingStatus }> {
  return apiFetch('/onboarding/djen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>('/onboarding/status')
}

export async function resolverComunicacao(
  id: string,
  payload: import('@/lib/types').ResolverComunicacaoPayload,
): Promise<Comunicacao> {
  return apiFetch<Comunicacao>(`/comunicacoes/${id}/resolver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// ─── Captura DJEN ─────────────────────────────────────────────────────────────

export async function getCapturaSaude(): Promise<import('@/lib/types').FonteSaude[]> {
  return apiFetch('/captura/saude')
}

export async function getCapturaLogs(limit = 10): Promise<import('@/lib/types').CapturaLog[]> {
  return apiFetch(`/captura/logs?limit=${limit}`)
}

export async function getCapturaAlerta(): Promise<import('@/lib/types').CapturaAlerta | null> {
  return apiFetch('/captura/alerta')
}

export async function executarCapturaManual(): Promise<{
  total: number
  resultados: Array<{ oab: string; status: string; novosItems: number; totalItems: number }>
}> {
  return apiFetch('/captura/executar', { method: 'POST' })
}

// ─── AI Gateway ───────────────────────────────────────────────────────────────

export async function getAiQuota(): Promise<import('@/lib/types').AiQuota> {
  return apiFetch('/ai-gateway/quota')
}

export async function getAiHealth(): Promise<import('@/lib/types').AiHealth> {
  return apiFetch('/ai-gateway/health')
}

export async function getAiUsage(limit = 50): Promise<import('@/lib/types').AiUsageRow[]> {
  return apiFetch(`/ai-gateway/usage?limit=${limit}`)
}

// ─── Painel (Fase 3) ──────────────────────────────────────────────────────────

export async function getPainel(
  periodo: 'mes' | 'acervo' = 'acervo',
): Promise<import('@/lib/types').PainelData> {
  return apiFetch(`/dashboards/painel?periodo=${periodo}`)
}

// ─── Notificações ─────────────────────────────────────────────────────────────

type NotificacaoRow = {
  id: string
  tipoGatilho?: string | null
  prioridade?: string | null
  conteudo?: { titulo?: string; mensagem?: string } | null
  lidaEm?: string | Date | null
  createdAt: string | Date
  entidade?: string | null
  entidadeId?: string | null
}

function mapNotificacao(row: NotificacaoRow): import('@/lib/types').Notificacao {
  const c = row.conteudo ?? {}
  return {
    id: row.id,
    tipoGatilho: row.tipoGatilho ?? null,
    prioridade: row.prioridade ?? null,
    titulo: c.titulo?.trim() || 'Notificação',
    mensagem: c.mensagem?.trim() || '',
    lidaEm: row.lidaEm ? String(row.lidaEm) : null,
    createdAt: String(row.createdAt),
    entidade: row.entidade ?? null,
    entidadeId: row.entidadeId ?? null,
  }
}

export async function getNotificacoesResumo(): Promise<
  import('@/lib/types').NotificacoesResumo
> {
  return apiFetch('/notificacoes/resumo')
}

export async function getNotificacoes(
  apenasNaoLidas?: boolean,
): Promise<import('@/lib/types').Notificacao[]> {
  const q = apenasNaoLidas ? '?apenasNaoLidas=1' : ''
  const rows = await apiFetch<NotificacaoRow[]>(`/notificacoes${q}`)
  return rows.map(mapNotificacao)
}

export async function marcarNotificacaoLida(
  id: string,
): Promise<import('@/lib/types').Notificacao> {
  const row = await apiFetch<NotificacaoRow>(`/notificacoes/${id}/lida`, {
    method: 'PATCH',
  })
  return mapNotificacao(row)
}

export async function marcarTodasNotificacoesLidas(): Promise<void> {
  await apiFetch('/notificacoes/marcar-todas-lidas', { method: 'POST' })
}

// ─── Atendimento ──────────────────────────────────────────────────────────────

export async function getAtendimentoResumo(): Promise<
  import('@/lib/types').AtendimentoResumo
> {
  return apiFetch<import('@/lib/types').AtendimentoResumo>('/atendimento/resumo')
}

export async function getAtendimentoLista(
  minhas?: boolean,
): Promise<import('@/lib/types').AtendimentoLinha[]> {
  const qs = minhas ? '?minhas=1' : ''
  return apiFetch<import('@/lib/types').AtendimentoLinha[]>(`/atendimento${qs}`)
}

export async function puxarAtendimentoFila(): Promise<Pendencia> {
  return apiFetch<Pendencia>('/atendimento/puxar', { method: 'POST' })
}

export async function cumprirAtendimentoPendencia(
  id: string,
  payload: { motivoCumprimento: string; status?: string },
): Promise<Pendencia> {
  return apiFetch<Pendencia>(`/atendimento/pendencias/${id}/cumprir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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
