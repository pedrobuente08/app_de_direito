import type { SkillExtractResult } from '../skill/skill.service';
import { emptyToNull, parseBrDate } from './skill-processo.mapper';

export type PdfSemaforoCor = 'VERDE' | 'AMARELO' | 'VERMELHO';

export type ClassificacaoSemaforo = {
  cor: PdfSemaforoCor;
  alertas: string[];
};

export type SugestaoMergePreview = {
  id: string;
  nomeCanonico: string;
  score: number;
};

export type PdfPreviewItem = {
  arquivo: string;
  itemId: string;
  numero: string | null;
  clienteNome: string | null;
  clienteCpf: string | null;
  reuTexto: string | null;
  vara: string | null;
  materia: string | null;
  sistema: string | null;
  login: string | null;
  dataDistribuicao: string | null;
  dataAudiencia: string | null;
  horaAudiencia: string | null;
  cor: PdfSemaforoCor;
  alertas: string[];
  confidence: number;
  duplicata: boolean;
  processoExistenteId?: string;
  sugestaoMergeReu?: SugestaoMergePreview;
  sugestaoMergeAdversario?: SugestaoMergePreview;
};

function datasInconsistentes(
  proc: Record<string, unknown> | null | undefined,
): boolean {
  if (!proc) {
    return false;
  }
  const d1 = parseBrDate(proc.data_distribuicao);
  const d2 = parseBrDate(proc.data_audiencia);
  if (!d1 || !d2) {
    return false;
  }
  return d2 < d1;
}

function cpfMascarado(cpf: unknown): boolean {
  const s = emptyToNull(cpf);
  if (!s) {
    return false;
  }
  if (s.includes('*')) {
    return true;
  }
  return /XXX/i.test(s);
}

/**
 * Regras do PLANO_DERIVACAO_E_SEMAFORO §2.2 (pré-visualização sem insert).
 */
export function classificarResultadoSkill(
  resultado: SkillExtractResult,
  duplicata: boolean,
): ClassificacaoSemaforo {
  if (Number(resultado.confidence) === 0) {
    return {
      cor: 'VERMELHO',
      alertas: [
        resultado.alerta ? String(resultado.alerta) : 'PDF ilegível',
      ],
    };
  }

  const proc = resultado.processo;
  const alertas: string[] = [];

  if (duplicata) {
    alertas.push('Número já existe em Intimações');
  }

  if (resultado.alerta === 'pdf_possivelmente_escaneado') {
    alertas.push(
      'PDF possivelmente escaneado — baixe o PDF nativo do tribunal',
    );
  }

  if (datasInconsistentes(proc ?? undefined)) {
    alertas.push('Data de audiência anterior à distribuição');
  }

  if (
    alertas.length > 0 &&
    (duplicata || resultado.alerta === 'pdf_possivelmente_escaneado')
  ) {
    return { cor: 'VERMELHO', alertas };
  }

  const conf = Number(resultado.confidence) || 0;
  if (conf < 0.8) {
    alertas.push(`Confiança baixa (${Math.round(conf * 100)}%)`);
  }
  if (!emptyToNull(proc?.vara)) {
    alertas.push('Vara não identificada');
  }
  if (!emptyToNull(proc?.materia)) {
    alertas.push('Matéria não identificada');
  }
  if (!emptyToNull(proc?.cliente_cpf)) {
    alertas.push('CPF não disponível');
  }
  if (cpfMascarado(proc?.cliente_cpf)) {
    alertas.push('CPF mascarado ou incompleto');
  }

  if (alertas.length > 0) {
    return { cor: 'AMARELO', alertas };
  }

  return { cor: 'VERDE', alertas: [] };
}
