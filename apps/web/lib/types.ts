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
  faseUpdatedAt?: string | null
  reveliaDecretada?: boolean
  litiganciaMaFe?: boolean
  dajeEmitido?: boolean
  dajeValor?: string | null
  dajeDataEmissao?: string | null
  dajeStatus?: string | null
  dajeDataPedidoIsencao?: string | null
  dajeDataPagamento?: string | null
  reuOrgaoPublico?: boolean
  hipossuficienciaComprovada?: boolean
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
  perfil: 'admin' | 'adm' | 'advogado' | 'pautista' | 'atendimento' | 'leitura'
  ehPautista?: boolean
  ativo: boolean
  createdAt: string
  loginAliases: string[]
}

export type Comarca = {
  id: string
  codigo: string
  nome: string
  abreviado: string
  perfilDiligencia?: 'DILIGENTE' | 'MENOS_DILIGENTE' | null
  exigeDocFrequente?: boolean
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

export type VaraConfig = {
  tipo: 'una' | 'fracionada'
  muda_sala?: boolean
  una_condicional?: boolean
}

export type ComunicaRegra = {
  criar_pendencia?: boolean
  tipo_pendencia?: string
  prazo_dias?: number
  sincronizar_audiencia?: boolean
  /** Tipo gravado na audiência criada (default: tipo da comunicação). */
  audiencia_tipo?: string
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
  /** Chave = tipo da publicação em MAIÚSCULAS. Data e hora extraídas do texto. */
  comunica_regras?: Record<string, ComunicaRegra>
  comunica_digest?: { enabled?: boolean; emails?: string[]; dias?: number }
  /** Varas que operam em modalidade FRACIONADA. Comparação case-insensitive. */
  varas_fracionadas?: string[]
  /** Varas UNA onde o cliente troca de sala virtual para instrução. */
  varas_muda_sala?: string[]
  /** Varas UNA que se tornam FRACIONADAS quando ambas as partes pedem AIJ. */
  varas_una_condicional?: string[]
  /** Mapa vara → config (tipo, muda_sala, una_condicional). Fonte de verdade. */
  varas_config?: Record<string, VaraConfig>
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
  litiganciaMaFe?: boolean | null
  certidaoCreditoSolicitada?: boolean
  certidaoCreditoData?: string | null
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
  turmaRecursal?: string | number | null
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
  nome?: string | null
  /** true se perfil pautista ou advogado marcado como pautista no cadastro */
  ehPautista?: boolean
}

export type OpcaoPautista = {
  id: string
  nome: string
  email: string
  perfil: string
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
  cenario?: string | null
  cenarioObservacao?: string | null
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
  temObrigacaoFazer?: boolean
  obrigacaoFazerDescricao?: string | null
  obrigacaoFazerCumprida?: boolean
  obrigacaoFazerCumpridaEm?: string | null
  serasajudAcionado?: boolean
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

export type OabEscuta = {
  id: string
  oab: string
  createdAt: string
}

export type FonteSaude = {
  fonte: string
  ultimoOkEm: string | null
  ultimaFalhaEm: string | null
  falhasConsecutivas: number
  saudavel: boolean
}

export type CapturaLog = {
  id: string
  oab: string
  fonte: string
  iniciadoEm: string
  concluidoEm?: string | null
  status: string
  totalItems?: number | null
  novosItems?: number | null
  erroMsg?: string | null
}

export type CapturaAlerta = {
  ativo: boolean
  titulo: string
  mensagem: string
  fonte: string
  falhasConsecutivas: number
  ultimaFalhaEm: string | null
}

export type AiQuota = {
  periodo: string
  periodoLabel?: string
  plano: string
  creditosTotal: number
  creditosUsados: number
  creditosRestantes: number
  percentualUsado: number
  overagePolicy: string
}

export type AiUsageByFeature = {
  feature: string
  totalCreditos: number
  totalChamadas: number
}

export type AiUsageRow = {
  id: string
  feature: string
  model: string
  inputTokens: number
  outputTokens: number
  creditos: number
  custoBrl: string
  cacheHit: boolean
  latencyMs: number | null
  createdAt: string
}

export type AiHealth = {
  quota: AiQuota
  usoPorFeature: AiUsageByFeature[]
  ultimasChamadas: AiUsageRow[]
  redisAtivo: boolean
  anthropicConfigurado: boolean
}

export type PainelKpi = {
  label: string
  value: string
  delta: string
  deltaLabel: string
  icon: 'file' | 'calendar' | 'shield' | 'clock'
  type: 'up' | 'warn' | 'ochre'
}

export type PainelJurimetriaRow = {
  comarca: string
  subtext: string
  seu: number
  media: number
  acima?: boolean
}

export type PainelPrazo = {
  id: string
  dia: number
  mes: string
  tipo: string
  caso: string
  fonte: string
  responsavel: string
  responsavelCor: string
  criticidade: 'crit' | 'soon' | 'ok'
}

export type PainelPrevisao = {
  disponivel: boolean
  caso: string
  numero: string
  tipo: string
  probabilidade: number
  valor: string | null
  duracao: string | null
  vara: string
  tendencia: string | null
  amostra: number
}

export type PainelData = {
  periodo: 'mes' | 'acervo'
  resumoUrgencias: string
  kpis: PainelKpi[]
  jurimetria: {
    rows: PainelJurimetriaRow[]
    insight: string
    insightIa: boolean
  }
  previsao: PainelPrevisao
  prazos: PainelPrazo[]
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

export type AtendimentoResumo = {
  abertas: number
  vencendo: number
  naFila: number
  cumpridas30d: number
}

export type AtendimentoLinha = {
  pendencia: Pendencia
  processo: {
    id: string
    numero: string
    clienteNome: string | null
    telefone: string | null
  }
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
