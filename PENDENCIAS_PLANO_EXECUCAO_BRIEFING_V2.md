# Pendências — PLANO_EXECUCAO_BRIEFING_V2

> Gerado a partir de `PLANO_EXECUCAO_BRIEFING_V2.md` e `BRIEFING_DEV_REUNIAO_04-05_V2.md`.  
> Última revisão: maio/2026 (após Sprint 6).

Legenda: **Feito** · **Parcial** · **Aberto**

---

## 1. Sprints — itens ainda abertos dentro de entregas marcadas ✅

| ID | Sprint | Status | Descrição |
|----|--------|--------|-----------|
| F1.1.4 | 1 | Aberto | Validar em homologação `recalcularProcedenteAposSentenca` / sync procedente após sentença 1º grau |
| F1.3.5 | 3 | Parcial | Alertas D-2 e escalada admin se AVALIAR expirar — badge/filtro existem; falta cron/e-mail |
| F1.4.3 | 2 | Parcial | Triggers automáticos de fase documentados — conferir cobertura completa na API |

---

## 2. F0 — Fundação UX

| ID | Status | Descrição |
|----|--------|-----------|
| F0.1.1–F0.1.4 | Feito | Drawer, timeline, observações |
| F0.2.1 | Feito | Menu recolhido por padrão |
| F0.2.2–F0.2.3 | Feito | Cards e filtros Intimações |

---

## 3. F1 — Travas e pop-ups

| ID | Status | Descrição |
|----|--------|-----------|
| F1.1.1–F1.1.3 | Feito | Sentença com travas API + UI |
| F1.1.4 | Aberto | Homologação sync procedente |
| F1.2.1–F1.2.5 | Feito | Pós-audiência |
| F1.3.1–F1.3.4 | Feito | Pós-improcedência / AVALIAR |
| F1.3.5 | Parcial | Notificações automáticas AVALIAR (D-2, escalada) |
| F1.4.1–F1.4.2, F1.4.4 | Feito | Transições de fase + motivo ao cumprir |
| F1.4.3 | Parcial | Triggers automáticos de fase |
| F1.5.1–F1.5.2 | Feito | 2º grau na aba Recursos |

---

## 4. F2 — Abas operacionais

| ID | Status | Descrição |
|----|--------|-----------|
| F2.1.1–F2.1.3 | Feito | Intimações |
| F2.2.1 | Feito | Cards Procedentes |
| F2.2.2 | Parcial | Filtros completos Procedentes (família ok; sub-estado, doc pendente, responsável, tempo na situação) |
| F2.2.3 | Aberto | Réu recorre → processo também em Recursos (regra §4.1.4) |
| F2.3.1–F2.3.3 | Feito | Recursos |
| F2.4.1–F2.4.3 | Feito | Improcedentes |
| F2.4.4 | Feito | Passivo agregado (dashboard F4.4) |
| F2.5.1–F2.5.2 | Feito | Pendências |
| F2.6.1 | Parcial | Filtros Agenda (pautista, período, modalidade, status) |
| F2.6.2 | Aberto | Toggle cartão ↔ lista compacta + `localStorage` |
| F2.6.3 | Feito | Escritório adversário no finalizar |
| F2.6.4 | Aberto | Botões WhatsApp / Ligar |
| F2.7.1 | Parcial | Grid Audiências com todas colunas do briefing |
| F2.7.2 | Feito | PosAudienciaDialog no fechamento |

---

## 5. F3 — Importação e cadastros

| ID | Status | Descrição |
|----|--------|-----------|
| F3.1.1–F3.1.5 | Feito | Semáforo + importação lote |
| F3.2.1 | Parcial | Parser COMPLEMENTO + `POST /migracao-procedentes/preview-complemento` |
| F3.2.2 | Aberto | UI aprovação candidatos + gravação em massa na base |
| F3.3.1–F3.3.4 | Feito | Adversários, comarcas seed, ausentes 6m |
| F3.4.1–F3.4.4 | Feito | Config escritório |

---

## 6. F4 — Indicadores (Sprint 6)

| ID | Status | Descrição |
|----|--------|-----------|
| F4.1 | Feito | Procedência × `qualidade_caso` |
| F4.2 | Feito | Top bancas + tempo médio até sentença |
| F4.3 | Feito | Cruzamento 5D (API + tabela dashboards) |
| F4.4 | Feito | Passivo sucumbência |
| F4.5 | Feito | % pendências por origem + alerta MANUAL > 70% |
| F4.6 | Feito | Comunica digest em Configurações (Sprint 5) |
| F4.7 | Feito | Audit log UI + filtros entidade/usuário/data |

---

## 7. F5 — Banco de Teses (M7) — fora do escopo atual

| ID | Status |
|----|--------|
| F5.1–F5.4 | Aberto (backlog explícito no plano) |

---

## 8. Definition of Done (§12) — checklist briefing

| Critério | Status |
|----------|--------|
| Drawer/modal + timeline + observações | Feito |
| Sentença com travas | Feito |
| Pop-up pós-audiência | Feito |
| Pop-up pós-improcedência | Feito |
| Abas com cards §5 | Parcial (várias abas ok; Procedentes/Agenda/Audiências com lacunas F2) |
| Semáforo §3.2 + inserir verdes | Feito |
| Relatório ausentes 6 meses | Feito |
| Config fases, qualidade, pendências, AVALIAR | Feito |
| Indicadores mínimos (qualidade, sucumbência, % origem) | Feito |
| Audit log consultável (admin) | Feito |

---

## 9. Auditoria Sprint 4 (lacunas conhecidas)

Itens levantados na auditoria pós-Sprint 4 que permanecem relevantes:

| Item | Prioridade | Notas |
|------|------------|-------|
| Card Intimações `semVisto30d` sempre 0 | Média | Query/resumo não calcula “sem visto 30d” |
| Cards Pendências não filtram ao clicar | Média | Cards exibem totais; clique não aplica filtro na lista |
| Filtros Procedentes incompletos (F2.2.2) | Média | Ver §4 |
| Spike ProJudi login/advogado (F3.1.5) | Baixa | Nota em `/importacao`; campo manual |

---

## 10. Infra / qualidade

| Item | Status |
|------|--------|
| Testes e2e fluxos críticos | Aberto |
| E-mail real para digest Comunica e alertas AVALIAR | Aberto (depende SMTP) |
| Sentry / observabilidade | Aberto (comentado em `app.module`) |
| Push commits Sprint 4–6 se ainda local | Operacional |

---

## 11. Ordem sugerida para próximos passos

1. **F1.3.5** + **F1.1.4** — homologação e alertas AVALIAR  
2. **F2.2.2**, **F2.6.1–F2.6.4**, **F2.7.1** — polish operacional das abas  
3. **F3.2.2** — concluir migração planilha se ainda houver carga histórica  
4. **F5** — só após estabilizar F2  
5. Corrigir lacunas da auditoria Sprint 4 (cards clicáveis, `semVisto30d`)

---

*Manter este arquivo alinhado ao `PLANO_EXECUCAO_BRIEFING_V2.md` a cada entrega.*
