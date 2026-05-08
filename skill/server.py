#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CONECTAR — Microserviço de extração de PDFs (FastAPI).

Roda como serviço persistente ao lado do NestJS.
pdfplumber fica carregado em memória — sem cold start de subprocess por PDF.

Uso:
    uvicorn server:app --host 0.0.0.0 --port 5001 --workers 1

Variáveis de ambiente:
    SKILL_API_KEY   Chave que o NestJS envia no header X-Skill-Key (obrigatório)
    LOG_LEVEL       debug | info | warning (default: info)
"""

import logging
import os
from typing import Any

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from extract_core import Config, extrair_pdf_bytes

# ---------------------------------------------------------------------------
# Config do servidor
# ---------------------------------------------------------------------------
logging.basicConfig(level=os.getenv("LOG_LEVEL", "info").upper())
logger = logging.getLogger("skill.server")

SKILL_API_KEY = os.getenv("SKILL_API_KEY", "")

app = FastAPI(
    title="CONECTAR Skill — Extração de PDF",
    version="10.0.0",
    docs_url=None,   # sem Swagger em produção
    redoc_url=None,
)


# ---------------------------------------------------------------------------
# Autenticação simples — chave compartilhada com o NestJS
# ---------------------------------------------------------------------------
def _verificar_chave(x_skill_key: str = Header(default="")) -> None:
    if SKILL_API_KEY and x_skill_key != SKILL_API_KEY:
        raise HTTPException(status_code=401, detail="Chave inválida")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "conectar-skill"}


@app.post("/extract")
async def extract(
    file: UploadFile = File(...),
    config_json: str = Form(default="{}"),
    x_skill_key: str = Header(default=""),
) -> JSONResponse:
    """
    Extrai dados de um PDF de comprovante de cadastro/protocolo.

    Form fields:
        file        — PDF em multipart
        config_json — JSON com {mapa_comarcas, login_map, materias_validas,
                                fase_inicial, situacao_inicial}
                      Todos opcionais — usa defaults do Config se ausentes.

    Resposta:
        {
          "processo":         { ... },  // null se falhou
          "confidence":       0.95,
          "campos_extraidos": [...],
          "campos_vazios":    [...],
          "alerta":           null | "string",
          "arquivo":          "nome.pdf",
          "sistema_detectado": "PROJUDI" | "PJE" | "PJE FED" | "DESCONHECIDO"
        }

    HTTP status:
        200 — extraído (mesmo confidence baixo — o NestJS decide o que fazer)
        400 — não é PDF ou arquivo vazio
        401 — chave inválida
        422 — config_json inválido
    """
    _verificar_chave(x_skill_key)

    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Envie um arquivo PDF")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Arquivo vazio")

    config = _parse_config(config_json)
    resultado = extrair_pdf_bytes(pdf_bytes, file.filename or "documento.pdf", config)

    return JSONResponse(content=resultado)


@app.post("/extract/batch")
async def extract_batch(
    files: list[UploadFile] = File(...),
    config_json: str = Form(default="{}"),
    x_skill_key: str = Header(default=""),
) -> JSONResponse:
    """
    Extrai múltiplos PDFs em uma chamada.
    Retorna lista na mesma ordem dos arquivos recebidos.
    Limite recomendado: 20 PDFs por chamada.
    """
    _verificar_chave(x_skill_key)

    if len(files) > 50:
        raise HTTPException(status_code=400, detail="Máximo 50 PDFs por chamada")

    config = _parse_config(config_json)
    resultados: list[Any] = []

    for f in files:
        pdf_bytes = await f.read()
        if not pdf_bytes:
            resultados.append({"erro": "arquivo vazio", "arquivo": f.filename})
            continue
        resultado = extrair_pdf_bytes(pdf_bytes, f.filename or "documento.pdf", config)
        resultados.append(resultado)

    resumo = {
        "total":         len(resultados),
        "extraidos":     sum(1 for r in resultados if r.get("confidence", 0) > 0),
        "confidence_baixa": sum(1 for r in resultados if 0 < r.get("confidence", 0) < 0.6),
        "falhas":        sum(1 for r in resultados if r.get("confidence", 0) == 0),
    }

    return JSONResponse(content={"resultados": resultados, "resumo": resumo})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _parse_config(config_json: str) -> Config:
    import json
    try:
        raw: dict = json.loads(config_json) if config_json.strip() else {}
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"config_json inválido: {exc}") from exc

    return Config(
        mapa_comarcas=raw.get("mapa_comarcas", None) or Config.__dataclass_fields__["mapa_comarcas"].default_factory(),
        login_map=raw.get("login_map", {}),
        materias_validas=set(raw.get("materias_validas", [])),
        fase_inicial=raw.get("fase_inicial", "AUDIÊNCIA AGENDADA"),
        situacao_inicial=raw.get("situacao_inicial", "ATIVO"),
    )
