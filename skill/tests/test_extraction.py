"""
Testes da skill de extração.

Estrutura esperada:
    skill/tests/
    ├── pdfs/
    │   ├── projudi_tjba_01.pdf     # Comprovante de Cadastro Projudi
    │   ├── pje_tjba_01.pdf         # Comprovante de Protocolo PJe TJBA
    │   └── pje_federal_01.pdf      # Comprovante de Protocolo PJe Federal
    └── test_extraction.py

Os PDFs devem ser reais mas com CPFs/telefones substituídos (anonimização).
Se as pastas de PDFs não existirem, os testes de integração são pulados
automaticamente (útil para CI sem fixtures).

Rodar:
    cd skill && pytest tests/ -v
"""

import json
from pathlib import Path

import pytest

from extract_core import Config, calcular_confidence, extrair_pdf

# ---------------------------------------------------------------------------
# Config de teste — mesma estrutura que o NestJS vai enviar em produção
# ---------------------------------------------------------------------------
CONFIG_TESTE = Config(
    mapa_comarcas={
        "0001": "SSA",
        "0004": "ALAGOINHAS",
        "0039": "F. DE SANTANA",
        "0044": "CAMACARI",
    },
    login_map={
        "TAINARA": "TAINARA",
        "ANDRE":   "ANDRÉ PITA",
        "ANDRE GABRIEL": "ANDRÉ PITA",
    },
    materias_validas={"NEGATIVAÇÃO", "CONTA CANCELADA", "EMBASA"},
)

PDFS_DIR = Path(__file__).parent / "pdfs"


def _pdf(nome: str) -> Path:
    return PDFS_DIR / nome


def _skip_se_sem_pdf(nome: str):
    return pytest.mark.skipif(
        not _pdf(nome).exists(),
        reason=f"PDF de fixture ausente: tests/pdfs/{nome}",
    )


# ---------------------------------------------------------------------------
# Testes unitários — não precisam de PDFs reais
# ---------------------------------------------------------------------------
class TestConfidenceScore:
    def test_numero_ausente_retorna_zero(self):
        assert calcular_confidence({"numero": ""}) == 0.0

    def test_numero_vazio_retorna_zero(self):
        assert calcular_confidence({}) == 0.0

    def test_todos_campos_criticos_retorna_um(self):
        processo = {
            "numero":            "0001234-12.2024.8.05.0001",
            "cliente_nome":      "FULANO DE TAL",
            "reu_texto":         "BANCO BRADESCO S.A.",
            "vara":              "1ª SSA",
            "data_distribuicao": "15/03/2024",
            "sistema":           "PROJUDI",
        }
        assert calcular_confidence(processo) == 1.0

    def test_sem_vara_reduz_score(self):
        processo = {
            "numero":            "0001234-12.2024.8.05.0001",
            "cliente_nome":      "FULANO DE TAL",
            "reu_texto":         "BANCO BRADESCO S.A.",
            "vara":              "",
            "data_distribuicao": "15/03/2024",
            "sistema":           "PROJUDI",
        }
        score = calcular_confidence(processo)
        assert score == 0.80

    def test_sistema_desconhecido_reduz_score(self):
        processo = {
            "numero":            "0001234-12.2024.8.05.0001",
            "cliente_nome":      "FULANO",
            "reu_texto":         "REU",
            "vara":              "1ª SSA",
            "data_distribuicao": "15/03/2024",
            "sistema":           "DESCONHECIDO",
        }
        score = calcular_confidence(processo)
        assert score == 0.85


class TestParseNomeArquivo:
    """Testa a extração de matéria e login do nome do arquivo."""

    def _run(self, nome_arquivo: str) -> tuple[str, str]:
        from extract_core import _parse_nome_arquivo
        return _parse_nome_arquivo(Path(nome_arquivo), CONFIG_TESTE.login_map)

    def test_formato_padrao_com_traco(self):
        materia, login = self._run("FULANO DE TAL - NEGATIVAÇÃO - TAINARA.pdf")
        assert materia == "NEGATIVAÇÃO"
        assert login == "TAINARA"

    def test_formato_com_underscore(self):
        materia, login = self._run("FULANO_CONTA CANCELADA_ANDRE.pdf")
        assert materia == "CONTA CANCELADA"
        assert login == "ANDRÉ PITA"

    def test_materia_com_traco_interno(self):
        materia, login = self._run("FULANO - CREFISA-BOLSA F. - TAINARA.pdf")
        assert "CREFISA" in materia
        assert login == "TAINARA"

    def test_nome_sem_3_partes_retorna_vazio(self):
        materia, login = self._run("FULANO - TAINARA.pdf")
        assert materia == ""
        assert login == ""

    def test_login_desconhecido_retorna_vazio(self):
        materia, login = self._run("FULANO - NEGATIVAÇÃO - XXXX.pdf")
        assert login == ""

    def test_variante_login_com_acento(self):
        materia, login = self._run("FULANO - NEGATIVAÇÃO - ANDRE GABRIEL.pdf")
        assert login == "ANDRÉ PITA"


class TestPjeAudienciaTexto:
    """Layout real PJe TJBA: data DD/MM/YYYY e hora HH:MM no mesmo bloco, sem «às»."""

    def test_designada_para_o_dia_com_hora_espaco(self):
        from extract_core import _pje_extrair_audiencia, _projudi_extrair_tipo_audiencia

        trecho = (
            "Audiência\nAudiência (Conciliação) designada para o dia 08/06/2026 08:00\n"
            "Endereço: RUA X"
        )
        d, h = _pje_extrair_audiencia(trecho)
        assert d == "08/06/2026"
        assert h == "08:00"
        assert _projudi_extrair_tipo_audiencia(trecho) == "UNA"

    def test_designada_so_data(self):
        from extract_core import _pje_extrair_audiencia

        trecho = "designada para o dia 15/03/2025\nDistribuído"
        d, h = _pje_extrair_audiencia(trecho)
        assert d == "15/03/2025"
        assert h == ""


class TestPjeCpfCliente:
    """PJe: CPF do autor na linha «Partes: NOME (999.999.999-99)»."""

    def test_partes_linha_com_cpf(self):
        from extract_core import _extrair_cpf_cliente

        trecho = (
            "Partes: JOSENIAS FERREIRA CORREIA (998.287.745-34)\n"
            "BANCO C6 CONSIGNADO S.A. (61.348.538/0001-86)\n"
        )
        assert _extrair_cpf_cliente(trecho) == "998.287.745-34"


# ---------------------------------------------------------------------------
# Testes de integração — precisam dos PDFs em tests/pdfs/
# ---------------------------------------------------------------------------
@_skip_se_sem_pdf("projudi_tjba_01.pdf")
class TestProjudiTJBA:
    def test_extrai_numero_processo(self):
        r = extrair_pdf(_pdf("projudi_tjba_01.pdf"), CONFIG_TESTE)
        assert r["processo"]["numero"] != ""
        assert re.match(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}", r["processo"]["numero"])

    def test_sistema_detectado_correto(self):
        r = extrair_pdf(_pdf("projudi_tjba_01.pdf"), CONFIG_TESTE)
        assert r["sistema_detectado"] == "PROJUDI"

    def test_confidence_alta(self):
        r = extrair_pdf(_pdf("projudi_tjba_01.pdf"), CONFIG_TESTE)
        assert r["confidence"] >= 0.8

    def test_cliente_e_reu_presentes(self):
        r = extrair_pdf(_pdf("projudi_tjba_01.pdf"), CONFIG_TESTE)
        assert r["processo"]["cliente_nome"] != ""
        assert r["processo"]["reu_texto"] != ""

    def test_nao_regride_com_config_diferente(self):
        config_alt = Config(mapa_comarcas={"9999": "OUTRA"})
        r = extrair_pdf(_pdf("projudi_tjba_01.pdf"), config_alt)
        assert r["processo"]["numero"] != ""


@_skip_se_sem_pdf("pje_tjba_01.pdf")
class TestPjeTJBA:
    def test_sistema_detectado_correto(self):
        r = extrair_pdf(_pdf("pje_tjba_01.pdf"), CONFIG_TESTE)
        assert r["sistema_detectado"] == "PJE"

    def test_extrai_numero_processo(self):
        r = extrair_pdf(_pdf("pje_tjba_01.pdf"), CONFIG_TESTE)
        assert r["processo"]["numero"] != ""

    def test_confidence_alta(self):
        r = extrair_pdf(_pdf("pje_tjba_01.pdf"), CONFIG_TESTE)
        assert r["confidence"] >= 0.8


@_skip_se_sem_pdf("pje_federal_01.pdf")
class TestPjeFederal:
    def test_sistema_detectado_correto(self):
        r = extrair_pdf(_pdf("pje_federal_01.pdf"), CONFIG_TESTE)
        assert r["sistema_detectado"] == "PJE FED"

    def test_vara_formato_sem_prefixo_fed(self):
        r = extrair_pdf(_pdf("pje_federal_01.pdf"), CONFIG_TESTE)
        vara = r["processo"]["vara"]
        assert "FED" not in vara, f"Vara federal não deve ter prefixo FED-: {vara}"
        assert vara != ""

    def test_confidence_alta(self):
        r = extrair_pdf(_pdf("pje_federal_01.pdf"), CONFIG_TESTE)
        assert r["confidence"] >= 0.8


# ---------------------------------------------------------------------------
# Testes de robustez
# ---------------------------------------------------------------------------
class TestRobustez:
    def test_pdf_inexistente_retorna_erro(self):
        r = extrair_pdf(Path("nao_existe.pdf"), Config())
        assert r["confidence"] == 0.0
        assert r["alerta"] == "erro_leitura"
        assert r["processo"] is None

    def test_resultado_sempre_tem_campos_obrigatorios(self, tmp_path):
        pdf_fake = tmp_path / "vazio.pdf"
        pdf_fake.write_bytes(b"%PDF-1.4")
        r = extrair_pdf(pdf_fake, Config())
        assert "confidence" in r
        assert "campos_extraidos" in r
        assert "campos_vazios" in r
        assert "alerta" in r
        assert "sistema_detectado" in r


# ---------------------------------------------------------------------------
# Import necessário para o teste de regex no TestProjudiTJBA
# ---------------------------------------------------------------------------
import re  # noqa: E402
