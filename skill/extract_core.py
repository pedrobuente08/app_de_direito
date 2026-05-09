#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CONECTAR — Core de extração de PDFs de comprovantes de cadastro/protocolo.

Suporta:
  - Projudi TJBA (Comprovante de Cadastro)
  - PJe TJBA    (Comprovante de Protocolo)
  - PJe Federal (Comprovante de Protocolo)

Toda configuração que antes era hardcoded (MAPA_COMARCAS, LOGIN_MAP,
MATERIAS_VALIDAS) é injetada via Config — permitindo que cada escritório-
tenant tenha seus próprios mapeamentos sem alterar código.

Uso como módulo:
    from extract_core import extrair_pdf, Config

    config = Config(
        mapa_comarcas={"0001": "SSA", "0039": "F. DE SANTANA"},
        login_map={"TAINARA": "TAINARA", "ANDRE": "ANDRÉ PITA"},
        materias_validas={"NEGATIVAÇÃO", "CONTA CANCELADA"},
    )
    resultado = extrair_pdf(Path("processo.pdf"), config)
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logging.getLogger("pdfminer").setLevel(logging.ERROR)
logging.getLogger("pdfplumber").setLevel(logging.ERROR)

try:
    import pdfplumber
except ImportError as exc:
    raise ImportError("pdfplumber não instalado. Rode: pip install pdfplumber") from exc


# ---------------------------------------------------------------------------
# Meses em PT — usado pelos parsers de data (fixo, não é config de negócio)
# ---------------------------------------------------------------------------
_MESES: dict[str, int] = {
    "janeiro": 1, "fevereiro": 2, "marco": 3, "março": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8, "setembro": 9,
    "outubro": 10, "novembro": 11, "dezembro": 12,
}


# ---------------------------------------------------------------------------
# Config — injetada por chamada, nunca global
# ---------------------------------------------------------------------------
@dataclass
class Config:
    """
    Configuração por escritório.

    Todos os campos têm defaults razoáveis para não quebrar em testes unitários,
    mas em produção o NestJS sempre envia a config do escritório vinda do banco.

    Campos:
        mapa_comarcas:
            Código CNJ (últimos 4 dígitos do número do processo) → sigla curta.
            Exemplo: {"0001": "SSA", "0039": "F. DE SANTANA"}
            Cresce conforme o produto expande para novas comarcas/estados.

        login_map:
            Variantes de nome do advogado/captador → nome canônico.
            Exemplo: {"ANDRE": "ANDRÉ PITA", "ANDRE GABRIEL": "ANDRÉ PITA"}
            Cada escritório tem sua própria equipe.

        materias_validas:
            Conjunto de teses aceitas pelo escritório.
            Usado para flag de aviso quando matéria extraída do nome do arquivo
            não está na lista (não bloqueia — só informa).
            Exemplo: {"NEGATIVAÇÃO", "CONTA CANCELADA", "EMBASA"}

        fase_inicial:
            Valor padrão de FASE ATUAL no insert. Cada escritório pode ter
            nomenclatura própria.

        situacao_inicial:
            Valor padrão de SITUAÇÃO FINAL no insert.
    """

    mapa_comarcas: dict[str, str] = field(default_factory=lambda: {
        "0001": "SSA",
        "0004": "ALAGOINHAS",
        "0039": "F. DE SANTANA",
        "0044": "CAMACARI",
        "0075": "ENCRUZILHADA",
        "0080": "ITABUNA",
        "0103": "TEIXEIRA DE FREITAS",
        "0113": "VIT. DA CONQUISTA",
        "0146": "PORTO SEGURO",
        "0150": "ILHEUS",
        "0208": "REMANSO",
        "0238": "LAURO",
        "0250": "SIMOES FILHO",
        "0274": "EUNAPOLIS",
    })

    login_map: dict[str, str] = field(default_factory=dict)

    materias_validas: set[str] = field(default_factory=set)

    fase_inicial: str = "AUDIÊNCIA AGENDADA"
    situacao_inicial: str = "ATIVO"


# ---------------------------------------------------------------------------
# Campos críticos e pesos do confidence score
# ---------------------------------------------------------------------------
_CAMPOS_CRITICOS = ["numero", "cliente_nome", "reu_texto", "vara", "data_distribuicao"]
_PESOS: dict[str, float] = {
    "cliente_nome":    0.25,
    "reu_texto":       0.25,
    "vara":            0.20,
    "data_distribuicao": 0.15,
    "sistema_known":   0.15,  # sistema != DESCONHECIDO
}


# ---------------------------------------------------------------------------
# Extração de texto
# ---------------------------------------------------------------------------
def _extrair_texto(pdf_path: Path) -> str:
    with pdfplumber.open(pdf_path) as pdf:
        partes = [p.extract_text() or "" for p in pdf.pages]
    return "\n".join(partes)


def _extrair_texto_bytes(pdf_bytes: bytes) -> str:
    import io
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        partes = [p.extract_text() or "" for p in pdf.pages]
    return "\n".join(partes)


# ---------------------------------------------------------------------------
# Detecção de sistema
# ---------------------------------------------------------------------------
def _detectar_sistema(texto: str) -> str:
    if re.search(r"N[uú]mero\s+do\s+processo:", texto):
        if re.search(r"Justi[çc]a\s+Federal|TRF\s*1", texto, re.IGNORECASE):
            return "PJE FED"
        return "PJE"
    if re.search(r"Justi[çc]a\s+Federal", texto, re.IGNORECASE):
        return "PJE FED"
    return "PROJUDI"


# ---------------------------------------------------------------------------
# Parsers compartilhados
# ---------------------------------------------------------------------------
def _extrair_no_processo(texto: str) -> str:
    m = re.search(r"Processo\s+n[º°]\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})", texto)
    if m:
        return m.group(1)
    m = re.search(r"N[úu]mero\s+do\s+processo:?\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})", texto)
    if m:
        return m.group(1)
    return ""


def _extrair_codigo_comarca(no_proc: str) -> str:
    m = re.search(r"\.(\d{4})$", no_proc)
    return m.group(1) if m else ""


def _extrair_cpf_cliente(texto: str) -> str:
    """Extrai CPF do promovente quando disponível no PDF (Projudi ou PJe)."""
    blocos = re.findall(
        r"Nome\s+Identidade\s+CPF/CNPJ\s*\n"
        r"[A-ZÀ-Úa-zà-ú0-9\s\.\-\'/&]+?\s+(\d{3}\.\d{3}\.\d{3}-\d{2})",
        texto,
    )
    if blocos:
        return blocos[0].strip()

    # PJe TJBA / Federal: «Partes: NOME DO AUTOR (999.999.999-99)» (primeiro CPF, não CNPJ)
    m = re.search(
        r"Partes:\s*.+?\((\d{3}\.\d{3}\.\d{3}-\d{2})\)",
        texto,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        return m.group(1).strip()

    return ""


# ---------------------------------------------------------------------------
# Parsers Projudi TJBA
# ---------------------------------------------------------------------------
def _projudi_extrair_partes(texto: str) -> tuple[str, str]:
    blocos = re.findall(
        r"Nome\s+Identidade\s+CPF/CNPJ\s*\n"
        r"([A-ZÀ-Úa-zà-ú0-9\s\.\-\'/&]+?)\s+(\d{2,3}\.\d{3}\.\d{3}[\-/]?[0-9]*)",
        texto,
    )
    cliente = blocos[0][0].strip() if len(blocos) >= 1 else ""
    reu = blocos[1][0].strip() if len(blocos) >= 2 else ""
    return cliente, reu


def _projudi_extrair_juizo(texto: str) -> str:
    m = re.search(r"\n([^J][^\n]+?)\s*\nJu[ií]zo\s+Valor\s+da\s+Causa", texto)
    if m and m.group(1).strip():
        return m.group(1).strip()
    m = re.search(
        r"(?:^|\n)([A-Z0-9ªº][A-Z0-9ªº\s\\.\(\)/\-\'ÁÉÍÓÚÂÊÔÃÕÇªº]*?)\s+Ju[ií]zo\s+Valor\s+da\s+Causa",
        texto,
    )
    if m:
        return m.group(1).strip()
    m = re.search(
        r"\n([A-Z0-9ªº\s\\.\(\)/\-\'ÁÉÍÓÚÂÊÔÃÕÇªº]+?)\s*\nJu[ií]zo\b",
        texto,
    )
    if m:
        return m.group(1).strip()
    m = re.search(r"Ju[ií]zo\s+([^\n]+?)\s+Juiz\s+Respons[aá]vel", texto)
    if m:
        bruto = m.group(1).strip()
        if "Valor" not in bruto:
            return bruto
    return ""


def _projudi_montar_vara(no_proc: str, juizo: str, mapa_comarcas: dict[str, str]) -> str:
    if not juizo:
        return ""
    juizo_norm = juizo.upper()
    if any(x in juizo_norm for x in ("VALOR", "CAUSA", "R$", "JUIZ RESPONS", "CONTATO")):
        return ""
    m_num = re.match(r"(\d+)ª?", juizo or "")
    numero = f"{m_num.group(1)}ª" if m_num else ""
    cod = _extrair_codigo_comarca(no_proc)
    sigla = mapa_comarcas.get(cod, "")
    if numero and sigla:
        return f"{numero} {sigla}"
    if not numero and sigla:
        return sigla
    return ""


def _projudi_extrair_data_distribuicao(texto: str) -> str:
    bloco = re.search(r"Tipo de A[çc][aã]o.*?Contato do Ju[ií]zo", texto, re.DOTALL)
    trecho = bloco.group(0) if bloco else texto
    plano = re.sub(r"\s+", " ", trecho)
    m = re.search(
        r"(\d{1,2})\s+de\s+(\w+)\s+de\s+(?:Situa[çc][aã]o\s+Data de Distribui[çc][aã]o\s+)?(\d{4})",
        plano,
        re.IGNORECASE,
    )
    if not m:
        return ""
    dia = int(m.group(1))
    mes = _MESES.get(m.group(2).lower(), 0)
    ano = int(m.group(3))
    return f"{dia:02d}/{mes:02d}/{ano}" if mes else ""


def _projudi_extrair_audiencia(texto: str) -> tuple[str, str]:
    plano = re.sub(r"\s+", " ", texto)
    m = re.search(
        r"Foi\s+designada\s+Audi[eê]ncia.*?para\s+o\s+dia\s+"
        r"(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})\s+(?:às|as)\s+(\d{1,2}):(\d{2})",
        plano,
        re.IGNORECASE,
    )
    if not m:
        return "", ""
    dia = int(m.group(1))
    mes = _MESES.get(m.group(2).lower(), 0)
    ano = int(m.group(3))
    hora, minuto = int(m.group(4)), int(m.group(5))
    if not mes:
        return "", ""
    return f"{dia:02d}/{mes:02d}/{ano}", f"{hora:02d}:{minuto:02d}"


def _projudi_extrair_tipo_audiencia(texto: str) -> str:
    # Projudi: "Audiência de Conciliação"; PJe: "Audiência (Conciliação) designada..."
    if re.search(
        r"Audi[eê]ncia\s*(?:de\s+)?\(?\s*Concilia[çc][aã]o\s*\)?",
        texto,
        re.IGNORECASE,
    ):
        return "UNA"
    return "AIJ"


# ---------------------------------------------------------------------------
# Parsers PJe (TJBA + Federal)
# ---------------------------------------------------------------------------
def _pje_extrair_no_processo(texto: str) -> str:
    m = re.search(r"N[uú]mero\s+do\s+processo:\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})", texto)
    return m.group(1) if m else ""


def _pje_extrair_partes(texto: str) -> tuple[str, str]:
    cliente, reu = "", ""
    bloco = re.search(
        r"Partes:\s*(.+?)(?:\n[A-Z][a-z]+:\s|\nDocumentos\s|\nAudi[eê]ncia\s|\nÓrgão\s|$)",
        texto,
        re.DOTALL,
    )
    if bloco:
        linhas = [l.strip() for l in bloco.group(1).split("\n") if l.strip()]
        validas = [l for l in linhas if re.search(r"\([\d./\-]+\)", l)] or linhas
        if validas:
            cliente = re.sub(r"\s*\([\d./\-]+\)\s*$", "", validas[0]).strip()
        if len(validas) >= 2:
            reu = re.sub(r"\s*\([\d./\-]+\)\s*$", "", validas[1]).strip()
        if cliente and reu:
            return cliente, reu

    mA = re.search(r"\n\s*AUTOR\s*\n\s*([A-ZÀ-Ü][A-ZÀ-Üa-zà-ü\s\.\-\']+?)(?:\s*\([\d./\-]+\))?\s*\n", texto)
    mR = re.search(r"\n\s*RE[UÚ]\s*\n\s*([A-ZÀ-Ü][A-ZÀ-Üa-zà-ü\s\.\-\'\&\/0-9]+?)(?:\s*\([\d./\-]+\))?\s*\n", texto)
    if mA and not cliente:
        cliente = mA.group(1).strip()
    if mR and not reu:
        reu = mR.group(1).strip()
    return cliente, reu


def _pje_extrair_audiencia(texto: str) -> tuple[str, str]:
    """
    PJe TJBA / Federal — comprovante costuma trazer, por exemplo:
    «Audiência (Conciliação) designada para o dia 08/06/2026 08:00»
    (data e hora separadas por espaço, sem «às»).
    """
    plano = re.sub(r"\s+", " ", texto)

    m = re.search(
        r"designad[ao]\s+para\s+o\s+dia\s+"
        r"(\d{2})/(\d{2})/(\d{4})\s+(?:(?:às|as)\s+)?(\d{1,2}):(\d{2})\b",
        plano,
        re.IGNORECASE,
    )
    if m:
        return (
            f"{m.group(1)}/{m.group(2)}/{m.group(3)}",
            f"{int(m.group(4)):02d}:{m.group(5)}",
        )

    m2 = re.search(
        r"designad[ao]\s+para\s+o\s+dia\s+(\d{2})/(\d{2})/(\d{4})\b",
        plano,
        re.IGNORECASE,
    )
    if m2:
        return f"{m2.group(1)}/{m2.group(2)}/{m2.group(3)}", ""

    m3 = re.search(
        r"Audi[eê]ncia[^\d]{0,120}?(\d{2})/(\d{2})/(\d{4})\s+(?:às|as)\s*(\d{1,2}):(\d{2})\b",
        plano,
        re.IGNORECASE,
    )
    if m3:
        return (
            f"{m3.group(1)}/{m3.group(2)}/{m3.group(3)}",
            f"{int(m3.group(4)):02d}:{m3.group(5)}",
        )

    return "", ""


def _pje_extrair_vara(texto: str, no_proc: str, mapa_comarcas: dict[str, str]) -> str:
    m = re.search(r"[OÓ]rg[aã]o\s+julgador:\s*(.+?)(?:\n|$)", texto)
    if not m:
        return ""
    texto_vara = m.group(1).strip()
    num_match = re.match(r"(\d+)\s*ª?", texto_vara)
    numero = f"{num_match.group(1)}ª" if num_match else ""

    if re.search(r"SJBA|Bahia|Vara\s+Federal|Federal\b", texto_vara, re.IGNORECASE):
        if re.search(r"SJSE|Sergipe", texto_vara, re.IGNORECASE):
            return f"{numero} SE" if numero else "SE"
        return f"{numero} SSA" if numero else "SSA"

    cod = no_proc[-4:] if len(no_proc) >= 4 else ""
    sigla = mapa_comarcas.get(cod, "")
    if numero and sigla:
        return f"{numero} {sigla}"
    if not numero and sigla:
        return sigla
    return ""


def _pje_extrair_data_distribuicao(texto: str) -> str:
    m = re.search(r"Distribu[ií]do\s+em:\s*(\d{2})/(\d{2})/(\d{4})", texto)
    if not m:
        return ""
    return f"{m.group(1)}/{m.group(2)}/{m.group(3)}"


# ---------------------------------------------------------------------------
# Nome do arquivo → matéria + login
# ---------------------------------------------------------------------------
def _parse_nome_arquivo(pdf_path: Path, login_map: dict[str, str]) -> tuple[str, str]:
    """
    Padrão: nome_cliente - MATERIA - LOGIN.pdf
    Separadores aceitos: hífen ou underscore, com ou sem espaços.
    Retorna ("", "") se o nome não tiver pelo menos 3 partes.
    """
    stem = pdf_path.stem
    partes = re.split(r"\s*[-_]\s*", stem)
    partes = [p.strip() for p in partes if p.strip()]
    if len(partes) < 3:
        return "", ""

    login_raw = " ".join(partes[-1].upper().split())
    if len(partes) == 3:
        materia_raw = partes[1].upper()
    else:
        materia_raw = "-".join(partes[1:-1]).upper()

    login = login_map.get(login_raw, "")
    return materia_raw, login


# ---------------------------------------------------------------------------
# Confidence score
# ---------------------------------------------------------------------------
def calcular_confidence(processo: dict) -> float:
    """
    Retorna score de 0.0 a 1.0.
    Se o número do processo não foi extraído → 0.0 imediatamente (dado inútil).
    """
    if not processo.get("numero"):
        return 0.0
    score = 0.0
    if processo.get("cliente_nome"):
        score += _PESOS["cliente_nome"]
    if processo.get("reu_texto"):
        score += _PESOS["reu_texto"]
    if processo.get("vara"):
        score += _PESOS["vara"]
    if processo.get("data_distribuicao"):
        score += _PESOS["data_distribuicao"]
    if processo.get("sistema") not in ("DESCONHECIDO", "", None):
        score += _PESOS["sistema_known"]
    return round(score, 2)


def _campos_extraidos(processo: dict) -> list[str]:
    return [c for c in _CAMPOS_CRITICOS if processo.get(c)]


def _campos_vazios(processo: dict) -> list[str]:
    return [c for c in _CAMPOS_CRITICOS if not processo.get(c)]


def _detectar_alerta(texto: str, processo: dict, materia: str, config: Config) -> Optional[str]:
    if not processo.get("numero"):
        return "numero_nao_encontrado"
    if len(texto.strip()) < 50:
        return "pdf_possivelmente_escaneado"
    if processo.get("sistema") == "DESCONHECIDO":
        return "formato_nao_reconhecido"
    if materia and config.materias_validas and materia not in config.materias_validas:
        return "materia_fora_da_lista"
    return None


# ---------------------------------------------------------------------------
# Processamento principal
# ---------------------------------------------------------------------------
def _processar_texto(texto: str, pdf_path: Path, config: Config) -> dict:
    sistema = _detectar_sistema(texto)

    if sistema in ("PJE FED", "PJE"):
        numero = _pje_extrair_no_processo(texto)
        cliente, reu = _pje_extrair_partes(texto)
        vara = _pje_extrair_vara(texto, numero, config.mapa_comarcas)
        data_dist = _pje_extrair_data_distribuicao(texto)
        data_aud, hora_aud = _pje_extrair_audiencia(texto)
        tipo_aud = _projudi_extrair_tipo_audiencia(texto) if data_aud else ""
    else:
        numero = _extrair_no_processo(texto)
        cliente, reu = _projudi_extrair_partes(texto)
        juizo = _projudi_extrair_juizo(texto)
        vara = _projudi_montar_vara(numero, juizo, config.mapa_comarcas)
        data_dist = _projudi_extrair_data_distribuicao(texto)
        data_aud, hora_aud = _projudi_extrair_audiencia(texto)
        tipo_aud = _projudi_extrair_tipo_audiencia(texto) if data_aud else ""

    cpf_cliente = _extrair_cpf_cliente(texto)
    materia, login = _parse_nome_arquivo(pdf_path, config.login_map)

    processo = {
        "numero":           numero,
        "cliente_nome":     cliente,
        "cliente_cpf":      cpf_cliente,
        "reu_texto":        reu,
        "vara":             vara,
        "sistema":          sistema,
        "data_distribuicao": data_dist,
        "data_audiencia":   data_aud,
        "hora_audiencia":   hora_aud,
        "tipo_audiencia":   tipo_aud,
        "materia":          materia,
        "login":            login,
        # Defaults para o insert (parametrizáveis por escritório)
        "fase_inicial":     config.fase_inicial,
        "situacao_inicial": config.situacao_inicial,
    }

    confidence = calcular_confidence(processo)
    alerta = _detectar_alerta(texto, processo, materia, config)

    return {
        "processo":          processo,
        "confidence":        confidence,
        "campos_extraidos":  _campos_extraidos(processo),
        "campos_vazios":     _campos_vazios(processo),
        "alerta":            alerta,
        "arquivo":           pdf_path.name,
        "sistema_detectado": sistema,
    }


def extrair_pdf(pdf_path: Path, config: Config) -> dict:
    """
    Extrai um PDF a partir de um Path.
    Retorna dict com processo + meta (confidence, alertas, campos).
    """
    try:
        texto = _extrair_texto(pdf_path)
    except Exception as exc:
        return _resultado_erro(pdf_path.name, f"Falha ao abrir PDF: {exc}")

    if len(texto.strip()) < 50:
        return _resultado_erro(
            pdf_path.name,
            "PDF parece ser scan/imagem — baixe o PDF nativo do tribunal",
        )

    return _processar_texto(texto, pdf_path, config)


def extrair_pdf_bytes(pdf_bytes: bytes, filename: str, config: Config) -> dict:
    """
    Extrai um PDF a partir de bytes (para o FastAPI — recebe multipart).
    """
    pdf_path_fake = Path(filename)
    try:
        texto = _extrair_texto_bytes(pdf_bytes)
    except Exception as exc:
        return _resultado_erro(filename, f"Falha ao abrir PDF: {exc}")

    if len(texto.strip()) < 50:
        return _resultado_erro(
            filename,
            "PDF parece ser scan/imagem — baixe o PDF nativo do tribunal",
        )

    return _processar_texto(texto, pdf_path_fake, config)


def _resultado_erro(arquivo: str, mensagem: str) -> dict:
    return {
        "processo":          None,
        "confidence":        0.0,
        "campos_extraidos":  [],
        "campos_vazios":     _CAMPOS_CRITICOS,
        "alerta":            "erro_leitura",
        "erro":              mensagem,
        "arquivo":           arquivo,
        "sistema_detectado": "DESCONHECIDO",
    }
