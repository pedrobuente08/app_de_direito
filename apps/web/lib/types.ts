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
  /** Resultado da sentença mais recente (1º/2º grau, etc.), só na listagem. */
  ultimaSentencaResultado?: string | null
  /** Qualidade do processo (BOA, RUIM, MEEIRA…); exibida como “Situação” na grid. */
  qualidadeCaso?: string | null
  faseAtual?: string | null
  avaliacaoRecurso?: Record<string, unknown> | null
  justicaGratuita?: boolean
  situacaoFinal?: string | null
  telefone?: string | null
  statusAudiencia?: string | null
  ultimaMovimentacaoDt?: string | null
  ultimaMovimentacaoTipo?: string | null
  tipoCr?: string | null
  observacoes?: string | null
  observacaoGeral?: string | null
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
  observacoes: string | null
  observacaoGeral: string | null
  tipoCr: string | null
}>

export type Sentenca = {
  id: string
  processoId: string
  escritorioId: string
  grau: string
  data: string
  valor: string | null
  resultado: string
  favoravelPara: string
  turma?: string | null
  assessorJulgador?: string | null
  turnoJulgamento?: string | null
  observacoes?: string | null
  createdAt?: string | null
}

export type CreateSentencaPayload = {
  processoId: string
  grau: string
  data: string
  valor?: string | null
  resultado: string
  favoravelPara: string
  turma?: string | null
  observacoes?: string | null
}

export type ProcessoTimelineEvento = {
  id: string
  tipo: 'distribuicao' | 'audiencia' | 'sentenca' | 'fase'
  data: string
  titulo: string
  subtitulo: string | null
}

export type ProcessoTimelineResponse = {
  processoId: string
  eventos: ProcessoTimelineEvento[]
}

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
  cnpj?: string | null
  createdAt: string
}

/** Opções de dropdown na grid Intimações (Configurações → salvar). */
export type DropdownsProcessoConfig = {
  /** Valores de `qualidade_caso` (coluna Situação na grade). */
  situacao?: string[]
  /** ATIVO | SOBRESTADO | ARQUIVADO — campo Status do processo no modal. */
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
  transicoes_fase?: Record<string, string[]>
  /** Default 7 — estado AVALIAR após improcedente. */
  prazo_avaliacao_recurso_dias?: number
  /** Default 10 — pendência ao RECORRER. */
  prazo_elaborar_recurso_dias?: number
  tipos_pendencia?: string[]
  fatores_provisao_pct?: number[]
  comunica_digest?: { enabled?: boolean; emails?: string[]; dias?: number }
}

export type ImprocedenteRow = {
  id: string
  processoId: string
  valorSucumbencia?: string | null
  destinatarioSucumbencia?: string | null
  statusPagamento: string
  dataPrazoPagamento?: string | null
  dataPagamento?: string | null
  decisaoRecurso?: string | null
  numero?: string
  clienteNome?: string | null
  materia?: string | null
  vara?: string | null
  justicaGratuita?: boolean | null
  avaliacaoRecurso?: Record<string, unknown> | null
  faseAtual?: string | null
}

export type ImprocedentesResumo = {
  total: number
  emAvaliacao: number
  sucumbenciaAPagar: number
  venceEm15: number
  passivoTotal: string
}

export type RecursoListaItem = {
  processoId: string
  numero: string
  clienteNome?: string | null
  materia?: string | null
  vara?: string | null
  faseAtual?: string | null
  origemRecurso?: 'NOSSO' | 'REU' | null
  tipoRecurso?: string | null
  prazoManifestacao?: string | null
  pendenciaRecurso?: string | null
}

export type RecursosResumo = {
  totalEmRecurso: number
  manifestacao7d: number
  aguardandoAcordao: number
  comDecisao: number
}

export type ProcessosResumo = {
  totalAtivos: number
  acaoImediata: number
  emAvaliacao: number
  arquivados30d: number
}

export type ProcedentesResumo = {
  totalAtivos: number
  acaoImediata: number
  aguardando: number
  encerrado30d: number
  semVisto30d: number
  alvara60d: number
}

export type ObservacaoItem = {
  fonte: string
  texto: string | null
  dataRef: string | null
}

export type ReprotocoloResumo = {
  total: number
  porSubEstado: Record<string, number>
  aRevisitarSemana: number
}

export type ReprotocoloLinha = {
  reprotocolo: {
    processoId: string
    subEstado: string | null
    motivoExtincao: string | null
    modalidadeExtincao: string | null
    dataExtincao: string | null
    dataIsencaoResultado: string | null
    dataReprotocolo: string | null
    processoNovoId: string | null
    observacoes: string | null
  }
  processo: {
    id: string
    numero: string
    clienteNome: string | null
    reuTexto: string | null
    faseAtual: string | null
  }
}

export type PendenciasResumo = {
  total: number
  vencidos: number
  urgente: number
  atencao: number
  normal: number
  semPrazo: number
  cumpridos30d: number
}

export type PosImprocedenciaPayload = {
  sentencaId: string
  decisao: 'RECORRER' | 'NAO_RECORRER' | 'AVALIAR'
  valorSucumbencia?: string | null
  observacao?: string | null
  responsavel?: string | null
  prazoDias?: number
}

export type PosExtincaoPayload = {
  sentencaId: string
  modalidade: 'SEM_CUSTAS' | 'COM_CUSTAS' | 'COM_MA_FE'
  motivo: string
  observacao?: string | null
}

export type PosProcedenteParcialPayload = {
  sentencaId: string
  decisao: 'RECORRER_PARA_MAJORAR' | 'NAO_RECORRER' | 'AVALIAR'
  valorConcedido?: string | null
  valorPedido?: string | null
  observacao?: string | null
  responsavel?: string | null
  prazoDias?: number
}

export type EncerrarPendenciaPayload = {
  resultado:
    | 'CUMPRIDA'
    | 'NAO_CUMPRIDA'
    | 'SEM_EXITO'
    | 'AUTOR_FALECIDO'
    | 'DEIXOU_DE_RESPONDER'
  motivo?: string | null
  observacao?: string | null
  proximaAcao?: string | null
}

export type SobrestarProcessoPayload = {
  motivo: string
  sobrestadoDesde: string
}

export type EscritorioAdversario = {
  id: string
  escritorioId: string
  nomeCanonico: string
  cnpj?: string | null
  createdAt?: string
  aliases?: string[]
}

export type AudienciaAusente = {
  id: string
  escritorioId: string
  processoId: string
  numeroProcesso: string
  clienteNome?: string | null
  materia?: string | null
  vara?: string | null
  dataAudiencia: string
  motivoAusencia: string
  reaproveitavel?: boolean | null
  reaproveitadoEm?: string | null
  observacoesRevisao?: string | null
  createdAt?: string | null
}

export type Ausentes6mResumo = {
  total: number
  reaproveitaveis: number
  reaproveitados: number
  pctReaproveitados: number
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
  sugestaoMergeReu?: { id: string; nomeCanonico: string; score: number }
  sugestaoMergeAdversario?: { id: string; nomeCanonico: string; score: number }
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
  totalSolicitados: number
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
  fila?: string | null
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
  escritorioAdversarioId?: string | null
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

export type DashVara = { vara: string | null; total: number }
export type DashPendenciaStatus = { status: string; total: number }

export type DashGeral = {
  totalProcessos: number
  comunicacoesOrfas: number
  processosSemMovimento30d: number
  funilPorFase: { fase: string; total: number }[]
  funilPorQualidade: { qualidade: string; total: number }[]
}

export type DashAudiencias = {
  audienciasFuturas: number
  audienciasCadastradas: number
  obsPrePendentes: number
  proximos7d: {
    id: string
    data: string
    hora: string | null
    tipo: string | null
    pautista: string | null
    status: string
    processoNumero: string
    clienteNome: string | null
  }[]
  heatmapPautista: { pautista: string; data: string; total: number }[]
}

export type DashPendencias = {
  porStatus: DashPendenciaStatus[]
  porResponsavel: { responsavel: string; total: number }[]
  porTipo: { tipo: string; total: number }[]
  sla: {
    abertas: number
    vencidas: number
    comPrazo: number
    semPrazo: number
    pctVencidas: number
  }
}

export type DashRecursos = {
  totalAcordaos: number
  taxaProvimentoPct: number
  tempoMedioDiasAcordao: number
  porTurma: { turma: string; total: number }[]
  recentes: {
    data: string
    resultado: string
    favoravelPara: string
    turma: string | null
  }[]
}

export type DashImprocedentes = {
  passivo: DashPassivoSucumbencia
  porStatusPagamento: { status: string; total: number; valor: string }[]
  avaliar: {
    ativos: number
    vencidos: number
    lista: {
      processoId: string
      numero: string
      prazo: string | null
      vencido: boolean
    }[]
  }
}

export type DashFinanceiro = {
  fase: string
  mensagem: string
  fatoresProvisaoPct: number[]
  recebimentos: { linhasComValor: number; valorTotalRecebido: string }
  provisaoEscalonada: { fatorPct: number; valorEstimado: string | null }[]
  carteiraAguardandoRecebimento: string
}
export type DashTeseReuVara = {
  materia: string
  vara: string
  reuTexto: string
  total: number
  procedentes: number
}

export type DashQualidadeProcedencia = {
  qualidadeCaso: string
  total: number
  procedentes: number
  taxaProcedenciaPct: number
}

export type DashTopBancas = {
  bancas: {
    bancaId: string
    banca: string
    audiencias: number
    acordos: number
    taxaAcordoPct: number
  }[]
  tempoMedioDiasAteSentenca: number
}

export type DashCruzamento5d = {
  banca: string
  reuTexto: string | null
  materia: string | null
  vara: string | null
  resultado: string
  total: number
}

export type DashPassivoSucumbencia = {
  linhasAPagar: number
  valorTotalAPagar: string
}

export type DashPendenciasOrigem = {
  totalAbertas: number
  pctManual: number
  alertaManualAlto: boolean
  porOrigem: { origem: string; total: number; pct: number }[]
}

export type AuditLogRow = {
  id: string
  escritorioId: string | null
  usuarioId: string | null
  entidade: string
  entidadeId: string
  acao: string
  diff: Record<string, unknown> | null
  ip: string | null
  createdAt: string
}

export type AuditLogList = {
  data: AuditLogRow[]
  meta: { page: number; limit: number; total: number; totalPages: number }
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

export type ResolverComunicacaoPayload = {
  decisao: 'VINCULAR' | 'NAO_E_NOSSO' | 'ERRO'
  processoId?: string
  dadosNovoProcesso?: {
    numero: string
    sistema: string
    clienteNome?: string | null
    clienteCpf?: string | null
    reuTexto?: string | null
    vara?: string | null
    materia?: string | null
  }
}

export type TelemarketingResumo = {
  abertas: number
  vencendo: number
  naFila: number
  cumpridas30d: number
}

export type TelemarketingLinha = {
  pendencia: Pendencia
  processo: {
    id: string
    numero: string
    clienteNome: string | null
    telefone: string | null
  }
}

export type OabEscuta = {
  id: string
  oab: string
  createdAt: string
}

export type Notificacao = {
  id: string
  tipoGatilho: string | null
  prioridade: string | null
  titulo: string
  mensagem: string
  lidaEm: string | null
  createdAt: string
  entidade: string | null
  entidadeId: string | null
}

export type NotificacoesResumo = {
  naoLidas: number
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
