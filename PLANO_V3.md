# PLANO V3 — CONECTAR M0 LEAN

Stack inalterada: NestJS 11 + Drizzle ORM · Next.js 14 App Router · Postgres 15 · Redis/BullMQ · FastAPI (skill PDF).  
Banco praticamente vazio — sem preocupação com migração de dados.  
Lógica de negócio: NestJS service layer (sem triggers SQL).  
Grid: abordagem atual mantida.

---

## FASE 0 — Design System

> Fundação visual. Deve ser feita antes de qualquer outra fase pois todas as telas dependem.

### 0.1 — Substituir variáveis CSS (`globals.css`)

Trocar o brand **teal** (`#0d9488`) pelo **navy + laranja** do protótipo:

| Variável atual | Novo valor |
|---|---|
| `--color-brand` | `#0a1929` |
| `--color-brand-hover` | `#1e3a5f` |
| `--color-brand-subtle` | `rgba(10,25,41,0.06)` |
| `--color-brand-text` | `#0a1929` |
| `--color-bg-app` | `#f5f7fa` |
| `--color-text-primary` | `#1a202c` |
| `--color-text-secondary` | `#4a5568` |
| `--color-text-tertiary` | `#718096` |
| `--header-height` | `60px` (de 52px) |

Adicionar novos tokens:

```css
--color-accent: #f5a623;
--color-accent-dark: #d69220;
--color-accent-subtle: #fffbeb;
```

Remover tokens shadcn (`--primary`, `--secondary`, `--ring`, etc.) — sistema não usa Shadcn.

### 0.2 — Componentes base (`apps/web/components/ui/`)

Criar/reescrever:

| Arquivo | O que faz |
|---|---|
| `kpi-card.tsx` | Card com label, value, foot; variantes: default/danger/warning/success/accent; hover translateY(-2px) |
| `pill.tsx` | Badge pill com variantes: success/warning/danger/info/neutral |
| `btn.tsx` | Botão com variantes: default/primary(laranja)/danger; estados: loading/disabled |
| `filter-bar.tsx` | Container de filtros com label+select/input, layout flex wrap |
| `familia-tabs.tsx` | Tabs horizontais para famílias de PROCEDENTES |
| `import-zone.tsx` | Drop zone com borda dashed, hover laranja |
| `toast.tsx` | Toast slide-in com variantes e auto-dismiss 4.5s (revisar o existente) |

### 0.3 — Layout principal (`apps/web/app/(app)/layout.tsx`)

Reescrever completamente seguindo o protótipo:

**Estrutura grid:**
```css
display: grid;
grid-template-columns: 240px 1fr;
grid-template-rows: 60px 1fr;
height: 100vh;
overflow: hidden;
```

**Sidebar (navy):**
- Background `#0a1929`, texto branco
- Logo: quadrado 28×28 laranja com "C" em navy, nome "CONECTAR" branco, subtítulo "LEAN · M0" em laranja
- 4 seções: **Operacional** / **Gestão** / **Inteligência** / **Admin**
- Item ativo: background `--color-accent` (#f5a623), cor `--color-brand`, font-weight 600
- Badge de contagem por item (número de itens pendentes/ativos)

**Navegação (nova estrutura):**

| Seção | Item | Rota |
|---|---|---|
| Operacional | INTIMAÇÕES | `/intimacoes` |
| Operacional | PROCEDENTES | `/procedentes` |
| Operacional | RECURSOS | `/recursos` |
| Operacional | IMPROCEDENTES | `/improcedentes` |
| Operacional | REPROTOCOLO | `/reprotocolo` |
| Operacional | AGENDA | `/agenda` |
| Operacional | PENDÊNCIAS | `/pendencias` |
| Gestão | Importação PDF | `/importacao` |
| Gestão | Telemarketing | `/telemarketing` |
| Gestão | Comunicações Órfãs | `/comunicacoes` |
| Inteligência | Dashboards | `/dashboards` |
| Admin | Réus canônicos | `/reus` |
| Admin | Bancas adversárias | `/bancas` |
| Admin | Configurações | `/configuracoes` |

> Remover: grupos antigos (Captação, Acompanhamento, Execução, Análise, Cadastros, Sistema). Remover: `/revisoes`, `/audiencias` (AUDIÊNCIAS é sub-view de INTIMAÇÕES no V3), `/usuarios` move para `/configuracoes`. Comarcas e Usuários ficam em Configurações.

**Header:**
- Breadcrumb: `<escritório> / <aba atual>`
- Botão secundário: "+ Habilitação adversária"
- Botão primário (laranja): "+ Importar PDF" → navega para `/importacao`
- Sino com ponto vermelho de notificação
- Avatar com iniciais do usuário

---

## FASE 1 — Schema (backend)

### 1.1 — Campos faltando em `processo`

Adicionar via migration Drizzle:

```typescript
tipoCr: varchar('tipo_cr', { length: 50 })
dataTransito: date('data_transito')
sucumbenciaDevida: boolean('sucumbencia_devida').default(false)
honorarioSucumbencialValor: varchar('honorario_sucumbencial_valor', { length: 30 })
honorarioSucumbencialStatus: varchar('honorario_sucumbencial_status', { length: 20 }) // PAGO | A_PAGAR | SUSPENSO_JG
honorarioSucumbencialPagoEm: date('honorario_sucumbencial_pago_em')
justicaGratuitaConcedidaEm: date('justica_gratuita_concedida_em')
justicaGratuitaExpiravEm: date('justica_gratuita_expira_em')
justicaGratuitaRevisadaEm: date('justica_gratuita_revisada_em')
sobrestamentoMotivo: text('sobrestamento_motivo')
sobrestadoDesde: date('sobrestado_desde')
recursoAdversario: boolean('recurso_adversario').default(false)
parceiroEscritorio: varchar('parceiro_escritorio', { length: 200 })
// renomear observacoes → observacao_geral (ou adicionar alias)
```

Atualizar `UpdateProcessoDto`, `CreateProcessoDto`, tipo `Processo` em `lib/types.ts`.

### 1.2 — Tabelas novas

**`advogado_adversario`** (e `advogado_adversario_alias`):
```sql
id UUID PK
escritorio_id UUID FK escritorio
escritorio_adversario_id UUID FK escritorio_adversario
nome_canonico VARCHAR(300) NOT NULL
oab VARCHAR(20)
created_at TIMESTAMPTZ
UNIQUE (escritorio_id, nome_canonico)
```

**`vara_documento_regra`**:
```sql
id UUID PK
escritorio_id UUID FK
vara VARCHAR(50) NOT NULL
tipo_documento VARCHAR(50)  -- COMP_RESIDENCIA, PROCURACAO, RG_CPF, etc.
formato_documento VARCHAR(50)
aceita BOOLEAN NOT NULL
observacao TEXT
```

**`processo_reprotocolo`** (1:1 com processo):
```sql
processo_id UUID PK FK processo
escritorio_id UUID FK
sub_estado VARCHAR(50)  -- AGUARDANDO_ISENCAO_CUSTAS | AGUARDANDO_ANALISE | AGUARDANDO_DOC_CLIENTE | EM_REPROTOCOLO | REPROTOCOLADO | DESCARTADO
motivo_extincao VARCHAR(100)
modalidade_extincao VARCHAR(20)  -- SEM_CUSTAS | COM_CUSTAS | COM_MA_FE
data_extincao DATE
data_isencao_pedida DATE
data_isencao_resultado VARCHAR(20)  -- DEFERIDA | INDEFERIDA
data_reprotocolo DATE
processo_novo_id UUID FK processo (nullable)
observacoes TEXT
created_at TIMESTAMPTZ
```

**`notificacao`**:
```sql
id UUID PK
escritorio_id UUID FK
usuario_id UUID FK (nullable)
fila VARCHAR(30)  -- TELEMARKETING | ADV | ADM | FINANCEIRO
tipo_gatilho VARCHAR(50)
entidade VARCHAR(50)
entidade_id UUID
canal VARCHAR(20)  -- IN_APP | EMAIL
prioridade VARCHAR(10)  -- BAIXA | MEDIA | ALTA | CRITICA
conteudo JSONB
lida_em TIMESTAMPTZ
agendada_para TIMESTAMPTZ
enviada_em TIMESTAMPTZ
created_at TIMESTAMPTZ
```

**`feriado`**:
```sql
id UUID PK
escritorio_id UUID FK
data DATE NOT NULL
descricao VARCHAR(100)
tipo VARCHAR(20)  -- NACIONAL | ESTADUAL | MUNICIPAL | FORENSE
```

### 1.3 — Ajustes em tabelas existentes

**`audiencia`**: verificar se tem `autor_presenca`, `motivo_ausencia`, `escritorio_adversario_id`, `advogado_adversario_id`. Adicionar se faltar.

**`processo_procedente`**: verificar campos de execução (`data_protocolo_alvara`, `data_alvara_expedido`, `data_peticao_cumprimento`, `data_penhora_realizada`, `valor_penhorado`, `penhora_origem`, `observacoes_execucao`). Adicionar se faltar.

**`sentenca`**: verificar `extincao_modalidade` e `motivo_extincao`. Adicionar se faltar. Adicionar CHECK: `resultado <> 'EXTINTO_SEM_MERITO' OR extincao_modalidade IS NOT NULL`.

**`pendencia`**: verificar `fila` (TELEMARKETING/ADV/ADM/FINANCEIRO) e `resultado` (5 valores). Adicionar se faltar.

### 1.4 — Novos módulos NestJS

Criar módulo e controller para:
- `advogado-adversario` (CRUD básico)
- `vara-documento-regra` (CRUD básico)
- `reprotocolo` (workflow completo)
- `notificacoes` (listagem + marcar lida)
- `telemarketing` (fila + puxar + cumprir)

### 1.5 — Endpoints críticos de workflow (ProcessosService)

| Endpoint | Lógica |
|---|---|
| `POST /processos/:id/sobrestar` | `status_processo = SOBRESTADO`, salva motivo e data |
| `POST /processos/:id/dessobrestar` | `status_processo = ATIVO`, limpa campos de sobrestamento |
| `POST /processos/:id/justica-gratuita` | `operacao: CONCEDER\|RENOVAR\|REVOGAR`, calcula expira_em |
| `GET /processos/:id/observacoes` | UNION ALL de 6 fontes ordenado por data DESC |
| `PATCH /processos/:id/avaliacao-recurso` | Abre/fecha avaliação com prazo |

---

## FASE 2 — Pop-ups reutilizáveis (7 componentes críticos)

> Cada pop-up é um portão de negócio. Cancelar reverte o estado.

### 2.1 — `PopUpPosAudiencia` (`components/popups/pos-audiencia.tsx`)

**Campos (4 blocos obrigatórios):**
1. **Autor presente?** PRESENTE / AUSENTE. Se AUSENTE → motivo obrigatório (dropdown): `AUTOR_FALTOU | REPRESENTANTE_FALTOU | ENDERECO_INVALIDO | OUTRO` + campo livre
2. **Audiência:** REALIZADA / REDESIGNADA. Se REDESIGNADA → nova data + hora
3. **Houve pendência?** SIM/NÃO. Se SIM → adicionar N pendências: tipo (dropdown por escritório), prazo em dias úteis, responsável (default ADV), observação
4. **Observações** (obrigatório, mínimo 10 chars, validação inline)

**Ao confirmar:**
- Status audiência → REALIZADA ou REDESIGNADA
- Se REDESIGNADA: cria nova `audiencia` com nova data; fase → AGUARDANDO AUDIÊNCIA
- Se REALIZADA + pendências: cria pendências em `pendencia`; fase → AGUARDANDO [tipo mais urgente]
- Se REALIZADA + sem pendência: fase → AGUARDANDO SENTENÇA
- Se AUSENTE: cria registro em `audiencia_ausente`
- Se obs_pos contém AUSENTE: prefixa `[AUSENTE: MOTIVO] <obs>`
- Cancelar: `audiencia.status` reverte para AGENDADA

**Endpoint:** `POST /audiencias/:id/finalizar`

---

### 2.2 — `PopUpPosImprocedencia` (`components/popups/pos-improcedencia.tsx`)

**Campos:**
1. Data da sentença (obrigatório)
2. Valor (R$ 0,00 ou sucumbência)
3. Decisão: RECORRER / NÃO RECORRER / AVALIAR
4. Observações

**Ao confirmar:**
- Cria `sentenca` (PRIMEIRO_GRAU, resultado=IMPROCEDENTE, favoravel_para=REU)
- RECORRER → processo entra em RECURSOS; fase = EM RECURSO; cascata `improcedente_recorrer`
- NÃO RECORRER → processo entra em IMPROCEDENTES; gestão de sucumbência 15d
- AVALIAR → `avaliacao_recurso = { ativa: true, prazo: hoje+7d, ... }`; bandeira amarela em INTIMAÇÕES

**Endpoint:** `POST /sentencas/pos-improcedencia`

---

### 2.3 — `PopUpPosProcedenteParcial` (`components/popups/pos-procedente-parcial.tsx`)

**Campos:**
1. Data da sentença
2. Valor concedido (base para provisão)
3. Valor pedido na inicial (calcula gap)
4. Decisão: RECORRER_PARA_MAJORAR / NÃO_RECORRER / AVALIAR
5. Observações

---

### 2.4 — `PopUpPosExtincao` (`components/popups/pos-extincao.tsx`)

**Campos:**
1. Data da sentença
2. Modalidade: SEM_CUSTAS / COM_CUSTAS / COM_MA_FE
3. Motivo: AUTOR_FALTOU / INDEFERIMENTO_INICIAL / AUS_PRESSUPOSTOS / OUTRO
4. Observações

**Cascatas por modalidade:**
- SEM_CUSTAS → `ANALISE_REPROTOCOLO` (7d, adv); `processo_reprotocolo` sub_estado=AGUARDANDO_ANALISE
- COM_CUSTAS → `PETICIONAR_ISENCAO_CUSTAS` (15d, adv); sub_estado=AGUARDANDO_ISENCAO_CUSTAS
- COM_MA_FE → `ELABORAR_RECURSO` (10d, adv); entra em RECURSOS

---

### 2.5 — `PopUpPosPendencia` (`components/popups/pos-pendencia.tsx`)

**Campos:**
1. Resultado: CUMPRIDA / NAO_CUMPRIDA / SEM_EXITO / AUTOR_FALECIDO / DEIXOU_DE_RESPONDER
2. Motivo (obrigatório se não CUMPRIDA/AUTOR_FALECIDO)
3. Observações
4. Próxima ação (dropdown derivado do tipo de pendência)

**Roteamento:**
- CUMPRIDA/AUTOR_FALECIDO → move para `pendencia_historico`
- NAO_CUMPRIDA/SEM_EXITO/DEIXOU → move para `pendencia_problema`
  - Abre modal extra: Reabrir com novo prazo / Encerrar processo / Escalar para adv

---

### 2.6 — `PopUpHabilitacaoAdversaria` (`components/popups/habilitacao-adversaria.tsx`)

**Campos:** Nome da banca + Advogado + OAB + Data + Origem (COMUNICA/MANUAL/DRAWER)

Cria ou vincula `escritorio_adversario` + `advogado_adversario`. Vincula à audiência atual se aberto por drawer.

---

### 2.7 — `PopUpSobrestamento` (`components/popups/sobrestamento.tsx`)

**Campos:** Motivo (texto livre) + Data início.

Ao confirmar: `status_processo = SOBRESTADO`, pendências abertas viram problemas.  
Dessobrestar: `status_processo = ATIVO` (não reabre pendências).

---

## FASE 3 — Aba INTIMAÇÕES (revamp)

### 3.1 — KPI cards no topo
```
[ TOTAL ATIVOS ] [ AÇÃO IMEDIATA ] [ EM AVALIAÇÃO ] [ ARQUIVADOS 30d ]
```

### 3.2 — Barra de filtros
Campos: Resultado (bom/ruim/sem sentença), Status, Fase, Qualidade, Login, Matéria, Vara, Réu, Período.  
Botões: "Filtrar" (aplica) + "Importar PDF" (atalho para importação).

### 3.3 — Grid de processos
Colunas padrão (ajustar labels para nomes canônicos definidos no PLANO_REVISAO_PDF_E_NOMES.md):

| Coluna | Campo | Editável inline |
|---|---|---|
| Nº PROCESSO | `numero` | Não (abre drawer) |
| LOGIN | `login` | Sim |
| CLIENTE | `clienteNome` | Não |
| RÉU | `reuTexto` | Não |
| MATÉRIA | `materia` | Sim (dropdown) |
| SISTEMA | `sistema` | Não |
| VARA | `vara` | Sim |
| FASE | `faseAtual` | Sim (dropdown por escritório) |
| TIPO CR | `tipoCr` | Sim (dropdown) |
| QUALIDADE | `qualidadeCaso` | Sim (dropdown) |
| ÚLT. MOVIMENTAÇÃO | `ultimaMovimentacaoDt` | Não |

### 3.4 — Drawer lateral (`components/drawers/processo-drawer.tsx`)

**Seções:**
1. **Identificação:** nº, sistema, vara, login, CPF, data distribuição
2. **Audiência:** data, hora, tipo, status, link, pautista
3. **Sentença(s):** timeline com todas as sentenças (1:N)
4. **Réu + Escritório adversário:** banca + advogado + botão "Registrar habilitação"
5. **Controle:** status, fase, qualidade, justiça gratuita, TIPO_CR
6. **Centro de Observações** (botão expansível): UNION ALL de 6 fontes (GERAL, PRÉ-AUDIÊNCIA, PÓS-AUDIÊNCIA, PENDÊNCIA, SENTENÇA, PROCEDENTE) — GET /processos/:id/observacoes
7. **Timeline do processo:** Distribuição → 1ª sentença → recurso → 2ª sentença → trânsito → execução → recebido
8. **Ações:** [Sobrestar] [Registrar Sentença] [Pendência manual] [Habilitação adversária]
9. Campo `observacao_geral` editável inline no topo

---

## FASE 4 — Aba PROCEDENTES (revamp)

### 4.1 — Familia tabs
```
[ TODAS ] [ AGUARDAR TRÂNSITO ] [ PEND. INTERNA ] [ EXEC. ATIVA ] [ AGUARDAR PAGTO ] [ ENCERRADO ]
```

### 4.2 — KPI cards
```
[ TOTAL ATIVOS ] [ AÇÃO IMEDIATA ] [ AGUARDANDO ] [ ENCERRADO 30d ] [ SEM VISTO >30d ] [ ALVARÁ >60d SEM PAGTO ]
```

### 4.3 — Grid por família
Colunas variam por família. Campos de execução: data_protocolo_alvara, data_alvara_expedido, valor_recebido, etc.

### 4.4 — Ações por linha
- Botão "Avançar fase" → modal de transição
- Botão "Registrar valor recebido"
- Link para processo original

---

## FASE 5 — Aba RECURSOS (revamp)

### 5.1 — KPI cards
```
[ TOTAL EM RECURSO ] [ MANIFESTAÇÃO VENCE 7d ] [ ACÓRDÃO AGUARDANDO ] [ COM DECISÃO ]
```

### 5.2 — Grid
Colunas: Nº processo, Instância, Tipo recurso, Data recurso, Turma, Prazo manifestação, Status.

### 5.3 — Pop-up registrar acórdão 2º grau
4 cenários (A/B/C/D) mapeados em `POST /sentencas/registrar-acordao`:
- A: Nós recorremos + Provimento → vai para PROCEDENTES
- B: Nós recorremos + Negado → permanece IMPROCEDENTES
- C: Réu recorreu + Mantida → permanece PROCEDENTES (provisão sobe 85%)
- D: Réu recorreu + Reformada → vai para IMPROCEDENTES

---

## FASE 6 — Aba IMPROCEDENTES (revamp)

### 6.1 — KPI cards
```
[ TOTAL IMPROC. ] [ EM AVALIAÇÃO RECURSO ] [ SUCUMBÊNCIA A PAGAR ] [ VENCE 15d ]
```

### 6.2 — Grid
Colunas: Nº processo, Data sentença, Valor sucumbência, Status sucumbência, Prazo pagamento, Justiça gratuita, AVALIAR prazo.

### 6.3 — Bandeira AVALIAR
Processos com `avaliacao_recurso.ativa = true` exibem badge amarelo na linha com o prazo restante. Clique abre PopUpPosImprocedencia para decidir.

---

## FASE 7 — Aba REPROTOCOLO (nova)

### 7.1 — KPI cards
```
[ TOTAL ] [ AGUARDANDO ISENÇÃO ] [ AGUARDANDO ANÁLISE ] [ EM REPROTOCOLO ] [ A REVISITAR ESTA SEMANA ]
```

### 7.2 — Grid
Colunas: Nº processo, Cliente, Réu, Modalidade extinção, Sub-estado, Data extinção, Isenção resultado, Data reprotocolo, Processo novo.

### 7.3 — Fluxo de sub-estados
Botões na linha conforme sub-estado:
- `AGUARDANDO_ISENCAO_CUSTAS` → [Registrar decisão isenção]
- `AGUARDANDO_ANALISE` → [Aprovar reprotocolo] / [Descartar]
- `AGUARDANDO_DOC_CLIENTE` → [Doc recebido]
- `EM_REPROTOCOLO` → [Reprotocolado] (vincula `processo_novo_id`)

### 7.4 — Revisita semanal
Toda segunda-feira: processos em sub-estado `AGUARDANDO_*` há >7d aparecem destacados. KPI "A revisitar esta semana" conta esses.

---

## FASE 8 — Aba PENDÊNCIAS (revamp)

### 8.1 — KPI cards
```
[ TOTAL ] [ VENCIDOS ] [ URGENTE ≤3d ] [ ATENÇÃO 4-7d ] [ NORMAL >7d ] [ SEM PRAZO ] [ CUMPRIDOS 30d ]
```

### 8.2 — Grid
Colunas: Nº processo, Tipo, Origem, Prazo, Dias restantes (badge urgência), Responsável/Fila, Status.  
Filtro: Vencidos / Urgente / Todos / Por responsável / Por fila.

### 8.3 — Ação "Cumprir pendência"
Abre `PopUpPosPendencia`. Campos já definidos na Fase 2.

### 8.4 — Criação manual de pendência
Botão "Nova pendência" → modal com: processo (busca), tipo, prazo, responsável/fila, observação.

---

## FASE 9 — Aba AGENDA (ajuste)

Já foi revampada mas precisa de:
- Aplicar novo design system (cores, cards, botões)
- "Marcar como REALIZADA" abre `PopUpPosAudiencia` (Fase 2)
- Campo telefone com ícone WhatsApp (link `wa.me`)
- Exibir banca adversária se preenchida

---

## FASE 10 — Seção GESTÃO

### 10.1 — Importação PDF (`/importacao`)
Reescrever `SemaforoImportacao` conforme PLANO_REVISAO_PDF_E_NOMES.md.  
**Fluxo:** drop zone → preview-pdf-batch → tabela semafórica → confirmar selecionados → confirmar-batch.  
Linha VERDE: auto-selecionada. Linha AMARELO: selecionável com aviso. Linha VERMELHO: desabilitada.

### 10.2 — Telemarketing (`/telemarketing`) — nova página
- Cards: abertas / vencendo / na fila / cumpridas 30d
- Lista de pendências com prazo destacado (style `.tlm-item`)
- Botão "Puxar da fila" atribui pendência ao usuário logado
- Perfil TELEMARKETING: só vê essa tela + suas pendências em PENDÊNCIAS

### 10.3 — Comunicações Órfãs (`/comunicacoes`)
- Renomear rota e título para "Comunicações Órfãs"
- Remover comunicações que já têm processo vinculado da view principal
- Seção "Sem processo vinculado": botões Vincular / Não é nosso / Erro
- `POST /comunicacoes/:id/resolver` com decisão + dados_novo_processo (se aplicável)
- Seção "Todas as comunicações" como tab secundário

---

## FASE 11 — Seção ADMIN

### 11.1 — Bancas adversárias (`/bancas`) — nova página
CRUD de `escritorio_adversario` + aliases + advogados vinculados.  
Colunas: Nome canônico, CNPJ, Aliases, Advogados (count), Processos vinculados.

### 11.2 — Réus canônicos (`/reus`)
Já implementado. Ajustar design system (FASE 0).

### 11.3 — Configurações (`/configuracoes`)
Reorganizar em abas:

| Aba | Conteúdo |
|---|---|
| Geral | Nome do escritório, config de prazo (DIAS_UTEIS/CORRIDOS) |
| Usuários | CRUD de usuários (mover de `/usuarios`) |
| Comarcas | CRUD (mover de `/comarcas`) |
| Matérias | Lista de matérias válidas (dropdown INTIMAÇÕES) |
| Dropdowns | Fases, qualidades, tipos de CR, tipos de pendência |
| Feriados | CRUD de feriados por tipo |
| Encadeamentos | Ativar/desativar as 10 cascatas automáticas |
| Vara × Doc | Tabela `vara_documento_regra` |

---

## FASE 12 — Encadeamentos automáticos (BullMQ)

Implementar as 10 cascatas em `apps/api/src/encadeamentos/`:

| Evento | Pendências criadas |
|---|---|
| `improcedente_recorrer` | ELABORAR_RECURSO (10d, adv) + SOLICITAR_DOC_GRATUIDADE (5d, TELEMARKETING) |
| `procedente_reu_recorre` | ELABORAR_CONTRARRAZOES (10d, adv) |
| `extinto_sem_merito_com_custas` | PETICIONAR_ISENCAO_CUSTAS (15d, adv) |
| `extinto_sem_merito_sem_custas` | ANALISE_REPROTOCOLO (7d, adv) |
| `extinto_sem_merito_ma_fe` | ELABORAR_RECURSO (10d, adv) |
| `transito_em_julgado` | PETICIONAR_DADOS_ALVARA (5d, adv) |
| `alvara_expedido` | VERIFICAR_PAGAMENTO (30d, adv) |
| `acordo_homologado` | VERIFICAR_CUMPRIMENTO_ACORDO (60d, adv) |
| `pagamento_voluntario_expirado` | PETICIONAR_CUMPRIMENTO_SENTENCA (5d, adv) |
| `procedente_parcial_recorrer` | ELABORAR_RECURSO (10d, adv) + SOLICITAR_DOC_GRATUIDADE (5d, TELEMARKETING) |

**Implementação:** cada evento dispara um BullMQ job `cascata:{evento}` que cria as pendências. Configurações de ativação em `escritorio.config.encadeamentos` (JSONB).

**Função `calcularPrazoProcessual(dias, tipo, escritorioId)`:** consulta `feriado` por escritório, pula fins de semana se `DIAS_UTEIS`.

---

## FASE 13 — Jobs de manutenção (BullMQ scheduled)

Implementar jobs críticos primeiro:

| Job | Frequência | Prioridade |
|---|---|---|
| `job_alertas_pendencias` | A cada 1h (07-19h) | CRÍTICO |
| `job_alertas_avaliar` | A cada 1h (07-19h) | CRÍTICO |
| `job_alertas_recurso_10d` | A cada 1h | CRÍTICO |
| `job_alertas_sucumbencia` | Diário 08:00 | CRÍTICO |
| `job_revisita_reprotocolo` | Segunda 06:00 | Importante |
| `job_descarta_orfas` | Diário 03:30 | Normal |
| `job_limpeza_historico` | Diário 03:00 | Normal |

Cada job cria notificações em `notificacao` (canal IN_APP) + dispara email (canal EMAIL).

---

## FASE 14 — Dashboards (7)

| Dashboard | Rota sugerida | Dados principais |
|---|---|---|
| GERAL | `/dashboards` (default) | Funil carteira + comunicações órfãs + processos s/ movimento |
| VARAS & TESES | `/dashboards/varas` | Heatmap Tese×Réu×Vara, taxa procedência, top 5 varas |
| AUDIÊNCIAS | `/dashboards/audiencias` | Próximos 7d + heatmap pautista×dia + OBS PRÉ pendentes |
| PENDÊNCIAS | `/dashboards/pendencias` | Por responsável, por tipo, SLA |
| RECURSOS | `/dashboards/recursos` | Taxa provimento, tempo acórdão, por turma |
| IMPROCEDENTES | `/dashboards/improcedentes` | Sucumbência, AVALIAR com prazo, por status |
| FINANCEIRO | `/dashboards/financeiro` | Provisão escalonada, forecast trimestral (M2 — depois) |

---

## Checklist de execução (ordem recomendada)

### Sprint 1 — Fundação visual
- [x] 0.1 Substituir variáveis CSS (globals.css)
- [x] 0.2 Criar componentes base (kpi-card, pill, btn, filter-bar, familia-tabs, import-zone)
- [x] 0.3 Reescrever layout.tsx (nova sidebar + header)
- [x] Remover rotas obsoletas (revisoes, audiencias stand-alone, usuarios) — redirects para intimacoes/agenda/configuracoes; `/bancas` substitui escritorios-adversarios na nav

### Sprint 2 — Schema backend
- [x] 1.1 Migration: novos campos em `processo` — patch `006_plano_v3_sprint2.sql` + schema Drizzle
- [x] 1.2 Migration: novas tabelas (advogado_adversario, vara_documento_regra, processo_reprotocolo, notificacao, feriado)
- [x] 1.3 Ajustar tabelas existentes (audiencia, processo_procedente, sentenca, pendencia)
- [x] 1.4 Criar módulos NestJS (advogado-adversario, vara-documento-regra, reprotocolo, notificacoes, telemarketing)
- [x] 1.5 Novos endpoints de workflow — `ProcessosWorkflowService` + rotas sobrestar/dessobrestar/justica-gratuita/observacoes/avaliacao-recurso

### Sprint 3 — Pop-ups
- [x] 2.1 PopUpPosAudiencia — `components/popups/pos-audiencia.tsx` + `POST /audiencias/:id/finalizar`
- [x] 2.2 PopUpPosImprocedencia — `components/popups/pos-improcedencia.tsx` + endpoint existente
- [x] 2.3 PopUpPosProcedenteParcial — `components/popups/pos-procedente-parcial.tsx` + `POST /processos/:id/pos-procedente-parcial`
- [x] 2.4 PopUpPosExtincao — `components/popups/pos-extincao.tsx` + `POST /processos/:id/pos-extincao`
- [x] 2.5 PopUpPosPendencia — `components/popups/pos-pendencia.tsx` + `POST /pendencias/:id/encerrar`
- [x] 2.6 PopUpHabilitacaoAdversaria — header layout + CRUD advogado/banca
- [x] 2.7 PopUpSobrestamento — `components/popups/sobrestamento.tsx` + workflow sobrestar (integrar no drawer quando necessário)

### Sprint 4 — Telas operacionais
- [x] 3.x INTIMAÇÕES: KPI cards + barra filtros + grid (labels canônicos) + drawer com Centro de Obs
- [x] 4.x PROCEDENTES: familia tabs + KPI cards + grid por família
- [x] 5.x RECURSOS: KPI cards + grid + registrar acórdão
- [x] 6.x IMPROCEDENTES: KPI cards + grid + bandeira AVALIAR
- [x] 7.x REPROTOCOLO: página nova completa

### Sprint 5 — Pendências + Agenda
- [x] 8.x PENDÊNCIAS: KPI cards + grid + PopUpPosPendencia integrado
- [x] 9.x AGENDA: aplicar design system + integrar PopUpPosAudiencia + WhatsApp link

### Sprint 6 — Gestão + Admin
- [x] 10.1 Importação PDF (semaforo completo)
- [x] 10.2 Telemarketing (nova página)
- [x] 10.3 Comunicações Órfãs (revamp)
- [x] 11.1 Bancas adversárias (nova página)
- [x] 11.3 Configurações (reorganizar em abas)

### Sprint 7 — Automação
- [x] 12.x Encadeamentos automáticos (BullMQ)
- [x] 13.x Jobs de alertas

### Sprint 8 — Dashboards
- [x] 14.x 7 dashboards

---

*Plano criado em 2026-05-18. Stack: NestJS 11 · Drizzle ORM · Next.js 14 · Postgres 15 · Redis · BullMQ · FastAPI.*
