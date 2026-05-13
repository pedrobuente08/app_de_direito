/** Linha de processo (INTIMAÇÕES) — alinhado ao JSON da API (camelCase). */
export type Processo = {
  id: string
  numero: string
  escritorioId?: string
  clienteNome?: string | null
  clienteCpf?: string | null
  reuId?: string | null
  reuTexto?: string | null
  vara?: string | null
  materia?: string | null
  sistema?: string | null
  login?: string | null
  dataDistribuicao?: string | null
  dataAudiencia?: string | null
  horaAudiencia?: string | null
  tipoAudiencia?: string | null
  /** ATIVO | SOBRESTADO | ARQUIVADO */
  statusProcesso?: string
  faseAtual?: string | null
  qualidadeCaso?: string | null
  avaliacaoRecurso?: Record<string, unknown> | null
  justicaGratuita?: boolean
  situacaoFinal?: string | null
  telefone?: string | null
  statusAudiencia?: string | null
  ultimaMovimentacaoDt?: string | null
  ultimaMovimentacaoTipo?: string | null
  requerConferencia: boolean
  createdAt: string
  updatedAt?: string
}

/** Corpo de PATCH /processos/:id (campos opcionais). */
export type PatchProcessoPayload = Partial<{
  login: string | null
  clienteNome: string | null
  clienteCpf: string | null
  reuId: string | null
  reuTexto: string | null
  materia: string | null
  sistema: string | null
  vara: string | null
  dataDistribuicao: string | null
  dataAudiencia: string | null
  horaAudiencia: string | null
  tipoAudiencia: string | null
  statusProcesso: string
  faseAtual: string | null
  qualidadeCaso: string | null
  avaliacaoRecurso: Record<string, unknown> | null
  justicaGratuita: boolean
  situacaoFinal: string | null
  telefone: string | null
  statusAudiencia: string | null
  ultimaMovimentacaoDt: string | null
  ultimaMovimentacaoTipo: string | null
  requerConferencia: boolean
}>

export type ProcessoCampos = {
  numero: string
  cliente_nome: string
  cliente_cpf: string
  reu_texto: string
  vara: string
  sistema: string
  data_distribuicao: string
  data_audiencia: string
  hora_audiencia: string
  tipo_audiencia: string
  materia: string
  login: string
  fase_inicial: string
  situacao_inicial: string
}

export type SkillResultado = {
  processo?: Partial<ProcessoCampos>
  campos_extraidos?: string[]
  campos_vazios?: string[]
  alerta?: string | null
  confidence?: number
  sistema_detectado?: string
}

export type ExtracaoPendente = {
  id: string
  arquivoNome: string
  confidence: number
  alerta: string | null
  revisaoStatus: 'PENDENTE' | 'EM_REVISAO' | 'APROVADO' | 'REJEITADO'
  resultadoSkill: SkillResultado
  createdAt: string
}

export type ExtracaoPendenteDetalhe = ExtracaoPendente & {
  textoExtraido: string
  sugestaoIa?: Partial<ProcessoCampos> | null
}

export type Usuario = {
  id: string
  nome: string | null
  email: string
  perfil: 'admin' | 'adm' | 'advogado' | 'leitura'
  ativo: boolean
  createdAt: string
  loginAliases: string[]
}

export type Comarca = {
  id: string
  codigo: string
  nome: string
  abreviado: string
}

export type Reu = {
  id: string
  nomeCanonico: string
  aliases: string[]
  createdAt: string
}

/** Opções de dropdown na grid Intimações (Configurações → salvar). */
export type DropdownsProcessoConfig = {
  situacao?: string[]
  status_processo?: string[]
  sentenca?: string[]
  fase_atual?: string[]
}

export type EscritorioConfig = {
  materias_validas?: string[]
  fase_inicial?: string
  situacao_inicial?: string
  status_processo_inicial?: string
  dropdowns_processo?: DropdownsProcessoConfig
}

export type PdfSemaforoCor = 'VERDE' | 'AMARELO' | 'VERMELHO'

export type PdfPreviewItem = {
  arquivo: string
  itemId: string
  numero: string | null
  clienteNome: string | null
  clienteCpf: string | null
  reuTexto: string | null
  vara: string | null
  materia: string | null
  sistema: string | null
  login: string | null
  dataDistribuicao: string | null
  dataAudiencia: string | null
  horaAudiencia: string | null
  cor: PdfSemaforoCor
  alertas: string[]
  confidence: number
  duplicata: boolean
  processoExistenteId?: string
}

export type ConfirmarBatchItem = {
  itemId: string
  numero: string
  clienteNome?: string | null
  clienteCpf?: string | null
  reuTexto?: string | null
  vara?: string | null
  materia?: string | null
  sistema: string
  login?: string | null
  dataDistribuicao?: string | null
  dataAudiencia?: string | null
  horaAudiencia?: string | null
}

export type ConfirmarBatchResult = {
  inseridos: number
  jaExistiam: number
  erros: { itemId: string; mensagem: string }[]
}

export type AuthMe = {
  userId: string
  escritorioId: string
  perfil: string
  email: string
}

export type ProcessosListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ProcessosListResponse = {
  data: Processo[]
  meta: ProcessosListMeta
}

export type UploadPdfResult =
  | { ok: true; processo: Processo }
  | { ok: false; extracaoPendenteId: string; motivo: string }
  | { assincrono: true; jobId: string }

export type Pendencia = {
  id: string
  processoId: string
  tipo: string
  dataAbertura: string
  dataLimite?: string | null
  status: string
  solicitante?: string | null
  responsavel?: string | null
  observacao?: string | null
  origem: string
  createdAt: string
  processo?: { numero: string; clienteNome: string }
}

export type Audiencia = {
  id: string
  processoId: string
  tipo?: string | null
  data: string
  hora?: string | null
  pautista?: string | null
  status: string
  obsPre?: string | null
  obsPos?: string | null
  link?: string | null
  createdAt: string
  processo?: {
    numero: string
    clienteNome: string | null
    telefone?: string | null
    reuTexto?: string | null
    materia?: string | null
    vara?: string | null
    tipoAudiencia?: string | null
    qualidadeCaso?: string | null
    login?: string | null
  }
  /** Nome canónico do escritório adversário (tabela `escritorio_adversario`). */
  escritorioAdversarioNome?: string | null
}

export type Procedente = {
  id: string
  processoId: string
  familiaSituacao?: string | null
  situacao?: string | null
  recursoTipo?: string | null
  recursoOrigem?: string | null
  recursoResultado?: string | null
  docPendente?: string[]
  responsavel?: string | null
  obsCurta?: string | null
  dataEstimadaRecebimento?: string | null
  valorRecebido?: string | null
  dataRecebimento?: string | null
  createdAt: string
  processo?: { numero: string; clienteNome: string; reuTexto: string; sentenca?: string | null }
}

export type DashVara = { vara: string; total: number }
export type DashPendenciaStatus = { status: string; total: number }
export type DashAudiencias = { futuras: number; total: number }
export type DashTeseReuVara = {
  materia: string
  vara: string
  reuTexto: string
  total: number
  procedentes: number
}

export type Comunicacao = {
  id: string
  processoId?: string | null
  oab: string
  numeroProcessoBruto?: string | null
  tipo?: string | null
  resumo?: string | null
  conteudoCompleto?: string | null
  dataDisponibilizacao?: string | null
  pendenciaGeradaId?: string | null
  status: string
  createdAt: string
}

export type OabEscuta = {
  id: string
  oab: string
  createdAt: string
}

export type ImportResult = {
  importados: number
  totalLinhas: number
  erros: { linha: number; mensagem: string }[]
}

export type SugestaoReu = {
  reuTexto: string
  quantidadeProcessos: number
  candidato: {
    id: string
    nomeCanonico: string
    score: number
  } | null
}
