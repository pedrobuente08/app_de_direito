# CONECTAR — Visão Geral do Software

> Documento executivo. Pra entender o produto em 5 minutos.
> Detalhe técnico está em `BRIEFING_DEV_M0.md`.

---

## O que é

CONECTAR é um software de gestão de captação massiva pra escritórios de advocacia, especializado em alto volume e teses repetidas (perfil consumerista contra bancos, financeiras, telefonia, cadastros de inadimplentes).

Não é um ERP jurídico genérico. Não compete com Astrea ou ADVBOX em "fazer um pouco de tudo". Compete em **fazer extremamente bem o que escritório de captação massiva precisa**: cadastrar centenas de processos por semana via PDF do tribunal, monitorar movimentação por OAB, executar workflow padronizado pós-sentença até receber, e medir o que importa pra essa operação (tese × réu × vara, taxa de procedência, forecast de receita).

## Pra quem

Escritórios de advocacia com perfil de captação massiva:

- Volume alto (centenas a milhares de processos ativos).
- Ticket médio baixo (R$ 2 mil a R$ 20 mil por causa).
- Teses repetidas contra mesmos réus (Bradesco, Caixa, Serasa, Embasa, etc.).
- Estrutura administrativa pequena conduzindo grande volume operacional.

## Decisões fechadas

1. **Multi-tenant desde o dia 1.** Toda tabela tem `escritorio_id`. Isolamento total entre escritórios-clientes.
2. **Webservice próprio**, não SaaS embarcado em Sheets. Banco Postgres, frontend tipo planilha (grid editável inline — não modal por linha).
3. **Vai virar produto vendável.** Mensalidade por usuário, com tier por módulos.
4. **Especialização em captação massiva** como posicionamento. Não tenta abraçar full-service.
5. **LGPD desde o início** — opera dados de terceiros, é regulatório (criptografia at rest/in transit, audit log, data residency BR, contrato de tratamento por escritório).

## Estrutura modular

| Módulo | O que entrega | Quando |
|---|---|---|
| **M0 — Core** | Multi-tenant, auth, upload PDF, INTIMAÇÕES/PENDÊNCIAS/AUDIÊNCIAS/PROCEDENTES, dashboards, integração Comunica | **Primeira entrega** |
| M1 — BI Avançado | Indicadores temporais, comparativos, cohorts | Posterior |
| M2 — Financeiro | Honorários, provisão escalonada, forecast trimestral | Posterior |
| M3 — Alertas | Push, email, WhatsApp configurável | Posterior |
| M4 — Cliente | Cadastro lazy via CPF, ficha completa | Posterior |
| M5 — Integração | DataJud, consulta automática Projudi/PJe | Posterior |
| M6 — Documentos | Banco de petições, mail merge | Posterior |

## O que existe hoje (a planilha que vamos substituir)

Google Sheets + Apps Script + skill Python que extrai dados de PDF de cadastro processual:

- **Skill Python** lê PDFs de comprovante de cadastro (Projudi TJBA, PJe TJBA, PJe Federal), extrai número do processo, autor, réu, vara, matéria, data de audiência. Roda local na máquina da adm via `.bat`.
- **Apps Script** recebe webhook da skill, insere em INTIMAÇÕES, sincroniza com AUDIÊNCIAS, dispara regras (movimentação por status, trava de OBS PÓS, sincronização de fase, etc.).
- **Sheets** funciona como UI + banco. ~800 processos ativos, ~440 audiências em histórico, ~390 agendadas, 251 procedentes em acompanhamento ativo.

Funciona, mas chegou no teto: arquivo `.gs` de 4000+ linhas trunca em edits, multi-user é melhor esforço, escala ruim, integração com fontes externas é manual.

## Fluxo principal (não muda no webservice)

```
ADM joga PDF na pasta PROTOCOLOS
        ↓
Skill Python extrai dados
        ↓
Webservice recebe via API
        ↓
Insere em INTIMAÇÕES (anti-dup por Nº processo)
        ↓
Se há data de audiência: cria registro em AUDIÊNCIAS
        ↓
Se sentenca = PROCEDENTE/PARCIAL/ACORDO: cria registro em PROCEDENTES
        ↓
Comunica entrega publicação por OAB
        ↓
Cruza com INTIMAÇÕES, atualiza ou cria pendência conforme tipo
```

## Abas operacionais (4 principais)

| Aba | Função | Volume típico |
|---|---|---|
| **INTIMAÇÕES** | Fonte da verdade — cadastro de todos os processos | Centenas a milhares |
| **PENDÊNCIAS** | Tarefas internas com prazo (procurações, alvarás, etc.) | Dezenas a centenas |
| **AUDIÊNCIAS** | Audiências agendadas, com workflow de OBS PRÉ/PÓS | Dezenas |
| **PROCEDENTES** | Vista filtrada de INTIMAÇÕES com workflow pós-sentença | Centenas (251 hoje) |

PROCEDENTES é vista filtrada, não duplicação — quando `INTIMAÇÕES.SENTENÇA` muda pra PROCEDENTE/PARCIAL/ACORDO, o registro aparece automaticamente em PROCEDENTES com colunas adicionais (situação, movimentação recursal estruturada, documentação pendente, valor recebido).

## Diferenciais do produto

1. **Extração de PDF nativa** dos sistemas usados pelo público-alvo (Projudi TJBA, PJe TJBA, PJe Federal). Concorrentes genéricos não têm.
2. **Indicador estrela: Tese × Réu × Vara × Resultado.** Heatmap 3D filtrado por réu, responde "para Bradesco em RCC, qual vara dá maior procedência". Decisão estratégica de carteira.
3. **Workflow pós-sentença estruturado em 2 níveis** (família × sub-estado). Vocabulário tirado da operação real do escritório.
4. **Integração Comunica nativa.** Publicações entram automaticamente como pendências, atualizam situação de processos procedentes, eliminam trabalho manual de "checar diário".
5. **Normalização de réu canônico.** "Bradesco S/A" e "Banco Bradesco S.A." viram entidade única — habilita análise por réu que hoje é impossível.
6. **Configuração por escritório.** Sub-estados, regras de pendência, fatores financeiros, mapa de comarcas — cada escritório calibra o próprio sem alterar código.

## Config Comunica (`GET/PATCH /config`)

Rotas na API: **`GET /config`** (lê `escritorio.config` + metadados) e **`PATCH /config`** (merge parcial; **só perfil admin** do tenant).

Campos relevantes em `config` (JSONB):

| Campo | Função |
|-------|--------|
| `comunica_webhook_token` | Segredo enviado no body do `POST /comunicacoes/webhook` (`token`). |
| `comunica_regras` | Objeto cuja **chave** é o `tipo` da publicação em **MAIÚSCULAS** (ex.: `INTIMAÇÃO`), igual ao valor recebido no webhook. |
| `comunica_digest` | Resumo por e-mail: `enabled`, `emails[]`, `dias` (1–30 no cron). Requer **SMTP** configurado na API; cron diário ~7h. |

### Exemplo de `comunica_regras`

```json
{
  "INTIMAÇÃO": {
    "criar_pendencia": true,
    "tipo_pendencia": "MANIFESTAR",
    "prazo_dias": 5
  },
  "AUDIÊNCIA DESIGNADA": {
    "sincronizar_audiencia": true,
    "audiencia_tipo": "UNA",
    "audiencia_hora": "14:30"
  }
}
```

- **`criar_pendencia`** + **`tipo_pendencia`**: cria pendência com `origem: COMUNICA`; `prazo_dias` opcional define `dataLimite`.
- **`sincronizar_audiencia`**: cria registro em audiências (`data` = `dataDisponibilizacao` da comunicação ou data atual; `audiencia_tipo` / `audiencia_hora` opcionais).

### Exemplo de `comunica_digest`

```json
{
  "enabled": true,
  "emails": ["coordenacao@escritorio.com.br"],
  "dias": 1
}
```

**Digest na API (sem e-mail):** `GET /comunicacoes/digest?dias=7` — totais por tipo e status no período.

## Princípios de design (não negociáveis)

1. **Edit inline tipo planilha.** Adm não tolera modal por linha. Grid editável (AG Grid / Handsontable).
2. **Não inflar a rotina.** Campo novo só se gera valor real e tem fluxo de preenchimento natural.
3. **Lazy quando possível.** Cadastro de cliente, valor da causa, honorários — preenchidos quando há retorno real, não no cadastro inicial.
4. **Dado deriva, não duplica.** PROCEDENTES vem de INTIMAÇÕES. AUDIÊNCIAS faz join com INTIMAÇÕES. Nada de copiar nome do cliente em 3 abas.
5. **Vocabulário do usuário.** Não inventar termos — usar os que a adm já fala (PETICIONAR DADOS PARA ALVARÁ, AGUARDAR TRÂNSITO, etc.).

## Stack sugerida (decisão final do dev)

- **Backend:** Node.js / Python (FastAPI) / Go.
- **Banco:** Postgres 15+.
- **Storage:** S3 ou compatível (PDFs originais).
- **Auth:** JWT + refresh.
- **Worker assíncrono:** BullMQ / Celery (extração PDF, retenção, Comunica).
- **Frontend:** React/Vue + grid editável.
- **Hospedagem:** Brasil (LGPD).
- **Observabilidade:** log estruturado + métricas + Sentry.

## Próximos passos

1. Dev valida modelo de dados em `BRIEFING_DEV_M0.md` § 4 e propõe ajustes.
2. Dev valida lista de endpoints em `BRIEFING_DEV_M0.md` § 5.
3. Decide stack final.
4. Inicia M0 com critério de aceite em `BRIEFING_DEV_M0.md` § 9.

## Documentos relacionados

| Arquivo | Conteúdo |
|---|---|
| `BRIEFING_DEV_M0.md` | Briefing técnico detalhado — modelo de dados, endpoints, regras críticas, critério de aceite |
| `ESTADO_ATUAL_07_05_2026.md` | Snapshot da operação atual (Sheets) |
| `FLUXOGRAMA_PRA_DEV.md` | Diagramas mermaid do fluxo atual |
| `CONECTAR_v11_LATEST.gs` | Código do Apps Script (referência das regras de negócio) |
| `skill_projudi/extract_projudi_LATEST.py` | Skill de extração de PDF (v9.1) |
| `CONECTAR_Indicadores_e_Financeiro.pdf` | Resumo de indicadores e estrutura financeira |

---

**Resumindo em uma frase:** CONECTAR é a planilha de gestão da captação massiva, transformada em produto webservice multi-tenant, com integração Comunica e indicadores especializados que ERP genérico não entrega.
