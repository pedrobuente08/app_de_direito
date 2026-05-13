/** Janela padrão: 1 minuto (ms). */
const M1 = 60_000;

/**
 * Limites por rota (IP + rota, conforme @nestjs/throttler).
 * Ajuste em produção conforme carga e monitoramento.
 */
export const ThrottlePresets = {
  /** Brute-force login (15 min). */
  authLogin: { default: { limit: 10, ttl: 900_000 } },

  /** Cadastro público de tenant. */
  authCadastroEscritorio: { default: { limit: 5, ttl: M1 } },

  authRefresh: { default: { limit: 45, ttl: M1 } },

  authLogout: { default: { limit: 60, ttl: M1 } },

  authRecuperarSenha: { default: { limit: 8, ttl: M1 } },

  authRedefinirSenha: { default: { limit: 12, ttl: M1 } },

  escritorioMe: { default: { limit: 120, ttl: M1 } },

  escritorioConfigPatch: { default: { limit: 20, ttl: M1 } },

  processosList: { default: { limit: 120, ttl: M1 } },

  processoGet: { default: { limit: 180, ttl: M1 } },

  processoPatch: { default: { limit: 90, ttl: M1 } },

  /** CPU + I/O na skill. */
  processoUploadPdf: { default: { limit: 12, ttl: M1 } },

  /** CPU + I/O na skill (lote, até 5 paralelos no service). */
  processoPreviewPdfBatch: { default: { limit: 8, ttl: M1 } },

  processoConfirmarBatch: { default: { limit: 15, ttl: M1 } },

  processoPdfJobStatus: { default: { limit: 120, ttl: M1 } },

  processoPostManual: { default: { limit: 40, ttl: M1 } },

  processoDelete: { default: { limit: 20, ttl: M1 } },

  extracaoList: { default: { limit: 90, ttl: M1 } },

  extracaoGet: { default: { limit: 120, ttl: M1 } },

  extracaoAplicar: { default: { limit: 30, ttl: M1 } },

  usuariosList: { default: { limit: 90, ttl: M1 } },

  usuariosPost: { default: { limit: 15, ttl: M1 } },

  usuariosPatch: { default: { limit: 30, ttl: M1 } },

  comarcasList: { default: { limit: 90, ttl: M1 } },

  comarcasWrite: { default: { limit: 25, ttl: M1 } },

  reusList: { default: { limit: 90, ttl: M1 } },

  reusPost: { default: { limit: 35, ttl: M1 } },

  reusPatch: { default: { limit: 35, ttl: M1 } },

  reusDelete: { default: { limit: 20, ttl: M1 } },

  reusMerge: { default: { limit: 15, ttl: M1 } },

  pendenciasList: { default: { limit: 120, ttl: M1 } },

  pendenciasWrite: { default: { limit: 60, ttl: M1 } },

  audienciasList: { default: { limit: 120, ttl: M1 } },

  audienciasWrite: { default: { limit: 60, ttl: M1 } },

  comunicaWebhook: { default: { limit: 120, ttl: M1 } },

  comunicaList: { default: { limit: 90, ttl: M1 } },

  comunicaDigest: { default: { limit: 60, ttl: M1 } },

  comunicaWrite: { default: { limit: 25, ttl: M1 } },

  dashboardRead: { default: { limit: 90, ttl: M1 } },

  importProcessos: { default: { limit: 8, ttl: M1 } },

  importPendencias: { default: { limit: 8, ttl: M1 } },

  importAudiencias: { default: { limit: 8, ttl: M1 } },

  procedentesList: { default: { limit: 90, ttl: M1 } },

  procedentesWrite: { default: { limit: 40, ttl: M1 } },

  configRead: { default: { limit: 120, ttl: M1 } },

  configWrite: { default: { limit: 20, ttl: M1 } },

  auditLogList: { default: { limit: 90, ttl: M1 } },

  adminBootstrap: { default: { limit: 3, ttl: M1 } },

  adminLogin: { default: { limit: 15, ttl: M1 } },

  adminRead: { default: { limit: 120, ttl: M1 } },

  adminWrite: { default: { limit: 40, ttl: M1 } },
} as const;
