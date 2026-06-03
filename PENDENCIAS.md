# Pendências — pós Fase 3 PRO

> Consolidado após o commit `bbaf378` (Fase 3 PRO completa).  
> Plano de referência: [`PLANO_PROXIMOS_PASSOS.md`](PLANO_PROXIMOS_PASSOS.md) · Fases 1–2 já entregues em `c017dce`.  
> Pendências de sprints anteriores: [`PENDENCIAS_PLANO_EXECUCAO_BRIEFING_V2.md`](PENDENCIAS_PLANO_EXECUCAO_BRIEFING_V2.md).

Legenda: **Aberto** · **Parcial** (backend ou componente pronto; falta integração/UI) · **Operacional** (deploy/banco, não código)

---

## 1. Operacional — banco e ativação

| Prioridade | Status | Descrição |
|------------|--------|-----------|
| Alta | Operacional | Aplicar [`apps/api/sql/plano_fase3_pro.sql`](apps/api/sql/plano_fase3_pro.sql) no Supabase (tabelas PRO + colunas em `processo` / `processo_procedente`). Preferir SQL aditivo; evitar `db:push` destrutivo sem revisar diff. |
| Alta | Operacional | Ativar add-ons por escritório em **Configurações → PRO** (`escritorio.config.addons.*`). Sem flag ativa, rotas retornam 403 e seções da UI ficam ocultas. |
| Média | Operacional | Definir `salario_minimo_atual` no config do escritório (add-on PJE) para classificação RPV vs Precatório. |

---

## 2. Fase 3 — critérios ainda abertos no plano

| Item | Status | Descrição |
|------|--------|-----------|
| **[12] Indicadores Juizado vs PJE** | Aberto | Critério do plano: indicadores separados por sistema judicial (tempo médio, taxa de procedência, volume RPV/Precatório). Backend PJE parcial; **falta dashboard** em `/dashboards` ou painel geral. |

---

## 3. Integrações UI / Comunica (Fase 3)

| Item | Status | O que falta |
|------|--------|-------------|
| **Pop-up decisão interlocutória** | Parcial | Componente [`PopUpDecisaoInterlocutoria`](apps/web/components/popups/decisao-interlocutoria.tsx) e API `POST /decisoes-interlocutorias/classificar` prontos. **Não está ligado** ao fluxo de Intimações/Comunica: falta abrir o pop-up quando o tipo da publicação for `DECISAO_INTERLOCUTORIA` (ou regra equivalente no mapa Comunica). |
| **`EMBARGOS_JULGADOS` no Comunica** | Aberto | Plano [8.1]: tipo de publicação que classifica resultado dos embargos e reinicia prazo do recurso. API de resultado existe (`PATCH /embargos/:id/resultado`); **falta handler** em `comunicacoes.service` + regra no mapa Comunica. |
| **Resultado dos embargos na UI Recursos** | Parcial | Interposição (pop-up + badge **ED**) implementada. **Falta tela/ação** para registrar julgamento (ACOLHIDOS / PARCIAL / REJEITADOS) — função `registrarResultadoEmbargos` já existe em [`apps/web/lib/api.ts`](apps/web/lib/api.ts). |

---

## 4. Dashboards e KPIs (derivados da Fase 3)

| Item | Status | O que falta |
|------|--------|-------------|
| **Sobrestados a revisar** | Parcial | API `GET /processos/resumo` passa a incluir `sobrestadosRevisar` (processos sobrestados há 6+ meses). Job mensal `jobRevisarSobrestados` ativo. **Falta card** na aba Intimações ou dashboard geral. |
| **Dashboard de comissões** | Parcial | API `GET /procedentes/comissoes/resumo` (totais a pagar/pago por parceiro). CRUD e cor por parceiro na grid ok. **Falta página ou seção** dedicada (plano [10]). |
| **Badge ASTREINTES em Procedentes** | Parcial | Formulário astreintes no drawer de Procedentes (add-on `execucao_avancada`). Confirmar badge **ASTREINTES** visível na **grid** da aba (critério [11]). |

---

## 5. PJE — fluxos aprofundados (Fase 3)

| Item | Status | Descrição |
|------|--------|-----------|
| **Apelação 15 dias úteis** | Aberto | Fases/labels PJE existem (`AGUARDANDO_PRAZO_APELACAO`, etc.). Plano [12.3]: prazo de apelação **15d úteis** (não 10d do Juizado), pop-up pós-sentença PJE e opção remessa necessária — **lógica de prazo e pop-up não implementados**. |
| **Pop-up pós-réplica (provas)** | Aberto | Plano [12.1]: após réplica, decidir SIM/NÃO produção probatória e tipos de prova. Tabela `processo_producao_probatoria` + CRUD básico ok; **falta pop-up e transições**. |
| **Execução órgão público** | Parcial | `PjeService.classificarExecucaoOrgaoPublico` (RPV/Precatório por valor × 60 SM). **Falta disparo automático** ao entrar em execução (hook em procedentes/sentença) e campos de UI (`numero_rpv`, `numero_precatorio`, etc.). |

---

## 6. Workflows raros — refinamentos

| Item | Status | Descrição |
|------|--------|-----------|
| **Sobrestamento PRO vs LEAN** | Parcial | Pop-up com 6 motivos quando add-on `workflows_raros` ativo. Campos PRO gravados se enviados; **modo LEAN** (texto livre) ainda funciona sem add-on. |
| **Status visual tutela** | Parcial | Seção tutela no drawer ok. Plano [9.1]: cores deferida/indeferida/pendente/revogada — **revisar** se todos os estados estão estilizados. |
| **Filtro por parceiro** | Aberto | Plano [10]: filtro "Por parceiro" em Intimações e dashboards — coluna/cor ok; **filtro na lista** pendente. |

---

## 7. Ordem sugerida de ataque

1. SQL no Supabase + ativar add-ons no escritório de teste.  
2. Ligar `PopUpDecisaoInterlocutoria` ao Comunica (desbloqueia [8.2] de ponta a ponta).  
3. UI de resultado de embargos em Recursos + tipo `EMBARGOS_JULGADOS`.  
4. KPI `sobrestadosRevisar` + dashboard comissões.  
5. Indicadores Juizado vs PJE e fluxos PJE (apelação 15d, pós-réplica).

---

## 8. Referência rápida — arquivos-chave

| Área | Arquivos |
|------|----------|
| SQL Fase 3 | `apps/api/sql/plano_fase3_pro.sql` |
| Add-ons | `apps/api/src/addons/`, aba PRO em `apps/web/app/(app)/configuracoes/` |
| Embargos | `apps/api/src/embargos/`, `apps/web/components/recursos/popup-embargos-declaracao.tsx` |
| Interlocutória | `apps/api/src/decisoes-interlocutorias/`, `apps/web/components/popups/decisao-interlocutoria.tsx` |
| Workflows raros | `apps/api/src/workflows-raros/`, `apps/web/app/(app)/intimacoes/_components/pro-workflows-section.tsx` |
| Captação | `apps/api/src/parceiros/`, `apps/web/.../parceiros-section.tsx` |
| Jobs PRO | `apps/api/src/jobs/pro-jobs.service.ts` |
| PJE | `apps/api/src/pje/` |

---

*Atualizar este arquivo ao fechar cada pendência (data + commit opcional na descrição).*
