# PLANO FINAL — Incrementos CONECTAR_M0_LEAN_FINAL

Incremento sobre o V3 já implementado. Banco praticamente vazio — sem preocupação com migração de dados.  
Stack inalterada. Prioridade: BREAKING primeiro, depois aditivos independentes.

---

## SPRINT A — BREAKING: `fase_atual` → UPPER_SNAKE_CASE

> Esta é a única mudança que quebra o que está funcionando. Deve ser feita antes de qualquer outra coisa.

### A.1 — Função `fase_label()` no front-end (`apps/web/lib/fase-label.ts`)

Criar mapa de chave canônica → label português para exibição na UI:

```typescript
export function faseLabel(chave: string | null | undefined): string {
  if (!chave) return '—'
  return FASE_LABELS[chave] ?? chave.replace(/_/g, ' ')
}

const FASE_LABELS: Record<string, string> = {
  AGUARDANDO_AUDIENCIA:          'Aguardando audiência',
  AGUARDANDO_SENTENCA:           'Aguardando sentença',
  AGUARDANDO_TRANSITO:           'Aguardando trânsito',
  AGUARDANDO_ALVARA:             'Aguardando alvará',
  AGUARDANDO_EXPEDICAO_ALVARA:   'Aguardando expedição do alvará',
  AGUARDANDO_PAGTO:              'Aguardando pagamento',
  AGUARDANDO_PROCURACAO:         'Aguardando procuração',
  AGUARDANDO_HIPOSSUFICIENCIA:   'Aguardando hipossuficiência',
  AGUARDANDO_DOC_GRATUIDADE:     'Aguardando doc. gratuidade',
  AGUARDANDO_DECISAO_GRATUIDADE: 'Aguardando decisão gratuidade',
  AGUARDANDO_ISENCAO_CUSTAS:     'Aguardando isenção de custas',
  EM_RECURSO:                    'Em recurso',
  EM_REPROTOCOLO:                'Em reprotocolo',
  EM_AVALIACAO_RECURSO:          'Em avaliação de recurso',
  IMPROCEDENTE_SUCUMBENCIA:      'Improcedente — sucumbência',
  ENCERRADO:                     'Encerrado',
  SOBRESTADO:                    'Sobrestado',
}
```

### A.2 — Substituir exibição em toda a UI

Arquivos que exibem `processo.faseAtual` diretamente e precisam usar `faseLabel()`:

| Arquivo | Onde trocar |
|---|---|
| `intimacoes/_components/processos-grid.tsx` | Coluna "Fase atual" |
| `procedentes/page.tsx` | Grid / cards de família |
| `recursos/page.tsx` | Grid |
| `improcedentes/page.tsx` | Grid |
| `reprotocolo/page.tsx` | Grid |
| `pendencias/page.tsx` | Coluna fase (se exibida) |
| Drawer do processo (se existir) | Seção "Controle" |
| Filtros que filtram por fase | Trocar values pelos códigos canônicos |

### A.3 — Atualizar dropdowns de fase

Em `dropdown-opcoes.ts` e em qualquer `<select>` de fase: os `value` devem ser as chaves canônicas (`AGUARDANDO_AUDIENCIA`) e o `label` deve vir de `faseLabel()`.

### A.4 — Migration SQL

```sql
-- 007_fase_atual_upper_snake.sql
-- Como o banco está vazio, basta garantir que o CHECK (se existir) aceite o novo formato.
-- Verificar se há CHECK CONSTRAINT em processo.fase_atual e atualizar para aceitar UPPER_SNAKE_CASE.
ALTER TABLE processo DROP CONSTRAINT IF EXISTS processo_fase_atual_check;
-- Não adicionar novo CHECK por enquanto — fase é derivada por trigger/service, flexível.
```

> Se o banco tiver dados reais no momento de rodar esta migration, adicionar um `UPDATE processo SET fase_atual = <mapeamento>` antes do ALTER.

---

## SPRINT B — Schema: campos novos no banco

> Todos aditivos — não quebram nada existente. Podem ser executados como uma única migration.

### B.1 — Tabela `processo`: campos novos

```sql
-- 008_plano_final_campos.sql

ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  fase_updated_at TIMESTAMPTZ;                          -- anti-race: marca quando fase_atual foi escrito nesta transação

ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  revelia_decretada BOOLEAN NOT NULL DEFAULT false;     -- substitui fase_atual = 'REVELIA DECRETADA'

ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  litigancia_ma_fe BOOLEAN NOT NULL DEFAULT false;      -- flag para dashboard e filtro

-- DAJE (custas processuais Bahia — R$ 1k–2k aprox)
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  daje_emitido BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  daje_valor NUMERIC(12,2);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  daje_data_emissao DATE;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  daje_status VARCHAR(30)
    CHECK (daje_status IS NULL OR daje_status IN (
      'EMITIDO',
      'ISENCAO_PEDIDA',
      'ISENCAO_DEFERIDA',
      'ISENCAO_INDEFERIDA',
      'PAGO',
      'DIVIDA_ATIVA',
      'ARQUIVADO_SEM_PAGAMENTO'
    ));
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  daje_data_pedido_isencao DATE;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  daje_data_pagamento DATE;
```

### B.2 — Tabela `comarca`: campo `perfil_diligencia`

```sql
ALTER TABLE comarca ADD COLUMN IF NOT EXISTS
  perfil_diligencia VARCHAR(20)
    CHECK (perfil_diligencia IS NULL OR
           perfil_diligencia IN ('DILIGENTE', 'MENOS_DILIGENTE'));
```

**Comportamento no DAJE:**
- `DILIGENTE`: se DAJE não pago → intima autor + advogado + inscreve em dívida ativa
- `MENOS_DILIGENTE`: se DAJE não pago → apenas arquiva, sem cobrança efetiva

### B.3 — Tabela `audiencia`: campos de cenário

```sql
ALTER TABLE audiencia ADD COLUMN IF NOT EXISTS
  cenario VARCHAR(30)
    CHECK (cenario IS NULL OR cenario IN (
      'REVELIA',               -- réu não compareceu → marca processo.revelia_decretada = true
      'TODOS_COMPARECERAM',    -- trâmite normal
      'SO_ADVOGADO',           -- cria pendência JUSTIFICAR_AUSENCIA_CLIENTE (5d, fila ATENDIMENTO)
      'UNA',                   -- audiência una (conciliação + instrução em sessão única)
      'FRACIONADA',            -- audiência fracionada
      'DOCUMENTACAO_PENDENTE'  -- cria pendência automática baseada em cenario_observacao
    ));

ALTER TABLE audiencia ADD COLUMN IF NOT EXISTS
  cenario_observacao TEXT;    -- justificativa (SO_ADVOGADO) ou tipo de doc (DOCUMENTACAO_PENDENTE)
```

### B.4 — Tabela `processo_procedente`: obrigação de fazer + SerasaJud

```sql
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  tem_obrigacao_fazer BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  obrigacao_fazer_descricao TEXT;          -- ex: "retirar negativação contrato XXX"

ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  obrigacao_fazer_cumprida BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  obrigacao_fazer_cumprida_em DATE;

ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  serasajud_acionado BOOLEAN NOT NULL DEFAULT false;   -- juiz determinou exclusão direta via SerasaJud
```

### B.5 — Atualizar schema Drizzle

Refletir todos os campos acima nos arquivos:
- `apps/api/src/db/schema/processo.ts`
- `apps/api/src/db/schema/comarca.ts`
- `apps/api/src/db/schema/audiencia.ts`
- `apps/api/src/db/schema/processo-procedente.ts`

### B.6 — Atualizar tipos TypeScript (`apps/web/lib/types.ts`)

Adicionar os campos novos ao tipo `Processo`, `Comarca`, `Audiencia` e `ProcessoProcedente`.

---

## SPRINT C — Pop-up pós-audiência: campo cenário

> Adicionar 1 bloco ao pop-up existente (`components/popups/pos-audiencia.tsx`).

### C.1 — Novo bloco: "Cenário da audiência"

Campo obrigatório no pop-up, logo após "Audiência: REALIZADA/REDESIGNADA":

```
Cenário da audiência *
○ TODOS COMPARECERAM     ○ REVELIA (réu não compareceu)
○ SÓ O ADVOGADO          ○ UNA
○ FRACIONADA             ○ DOCUMENTAÇÃO PENDENTE
```

Se `SÓ O ADVOGADO` → exibe campo texto obrigatório "Justificativa".  
Se `DOCUMENTAÇÃO PENDENTE` → exibe campo texto obrigatório "Documento necessário".  
Se `REVELIA` → nenhum campo extra (só salva a flag).

### C.2 — Lógica pós-cenário no serviço (`audiencias.service.ts`)

| Cenário | Ação automática |
|---|---|
| `REVELIA` | `UPDATE processo SET revelia_decretada = true` |
| `SO_ADVOGADO` | Cria pendência `JUSTIFICAR_AUSENCIA_CLIENTE` (5d, fila ATENDIMENTO) |
| `DOCUMENTACAO_PENDENTE` | Cria pendência `SOLICITAR_DOC_CONFORME_VARA` (5d, fila ATENDIMENTO) com observação = `cenario_observacao` |

### C.3 — Endpoint `POST /audiencias/:id/finalizar`

Incluir `cenario` e `cenario_observacao` no DTO e na lógica de processamento.

---

## SPRINT D — 5º cenário de 2º grau

> Adicionar o cenário E ao pop-up de acórdão existente (`PopUpPosAcordao` ou equivalente em recursos).

### D.1 — Cenário E: PROCEDENTE_PARCIAL — AMBAS AS PARTES RECORRERAM

4 sub-resultados:

| Sub | Descrição | Destino |
|---|---|---|
| E1 | Ambos providos parcialmente | Ajusta valor em PROCEDENTES |
| E2 | Só o nosso provido (majoração) | Permanece em PROCEDENTES com valor maior |
| E3 | Só do réu provido (reforma) | Vai para IMPROCEDENTES |
| E4 | Ambos negados | Mantém valor original em PROCEDENTES |

### D.2 — Atualizar `sentencas.service.ts`

Adicionar rota/case `PROCEDENTE_PARCIAL_AMBAS` com os 4 sub-cenários. Criar `sentenca` do tipo `SEGUNDO_GRAU` com o sub-resultado gravado em `observacao` ou em campo novo `sub_resultado VARCHAR(30)`.

---

## SPRINT E — Workflow DAJE

> Novo subsistema de custas processuais (Bahia). Aditivo — não afeta fluxos existentes.

### E.1 — NestJS: módulo `daje` (`apps/api/src/daje/`)

Endpoints:
```
POST   /processos/:id/daje/emitir              → daje_emitido=true, daje_status=EMITIDO, valor, data
POST   /processos/:id/daje/pedir-isencao       → daje_status=ISENCAO_PEDIDA, data_pedido
POST   /processos/:id/daje/resultado-isencao   → body: { resultado: 'DEFERIDA' | 'INDEFERIDA' }
POST   /processos/:id/daje/registrar-pagamento → daje_status=PAGO, data_pagamento
POST   /processos/:id/daje/inadimplencia       → lógica depende de comarca.perfil_diligencia
```

### E.2 — Front-end: seção DAJE no drawer do processo

Exibir bloco DAJE apenas quando `processo.daje_emitido = true` ou `processo.faseAtual` relacionada a custas. Botões conforme `daje_status` atual.

### E.3 — Configuração `comarca.perfil_diligencia`

Adicionar campo no CRUD de comarcas (`/configuracoes` aba Comarcas): dropdown `DILIGENTE / MENOS_DILIGENTE`.

---

## SPRINT F — Obrigação de fazer + SerasaJud

> Aditivo em PROCEDENTES. Aparece apenas quando `tem_obrigacao_fazer = true`.

### F.1 — UI: seção no drawer/página de PROCEDENTES

Quando `processo_procedente.tem_obrigacao_fazer = true`:
- Exibir badge "Obrigação de fazer" na linha do grid
- No drawer/detalhe: campo de descrição + checkbox "Réu cumpriu" + data cumprimento + botão "Acionar SerasaJud" (se descumprimento persiste)

### F.2 — Endpoint `POST /procedentes/:id/obrigacao-fazer`

```typescript
body: {
  descricao: string
  cumprida?: boolean
  cumpridaEm?: string     // date ISO
  serasajudAcionado?: boolean
}
```

### F.3 — Endpoint `GET /clientes/:cpf/processos`

Cross-sell: busca todos os processos de um CPF (qualquer escritório vinculado ao mesmo `escritorioId`). Retorna lista resumida para avaliação de oportunidade de novos casos.

---

## SPRINT G — Centro de Observações: 7ª fonte

> Adicionar `LITIGANCIA` como 7ª fonte na query de observações do processo.

### G.1 — Atualizar `GET /processos/:id/observacoes`

Adicionar ao UNION ALL:
```sql
SELECT 'LITIGANCIA' as fonte,
       'Processo marcado com litigância de má-fé' as conteudo,
       updated_at as data
FROM processo
WHERE id = :processoId AND litigancia_ma_fe = true
```

### G.2 — Dashboard `litigancia-ma-fe`

Novo endpoint `GET /api/dashboards/litigancia-ma-fe`: lista processos com `litigancia_ma_fe = true` por escritório, agrupado por réu e vara.

---

## Checklist de execução

### Sprint A — BREAKING fase_atual
- [x] A.1 Criar `fase-label.ts` com mapa completo
- [x] A.2 Substituir `faseAtual` por `faseLabel(faseAtual)` em todas as telas
- [x] A.3 Atualizar dropdowns de fase (value = chave canônica)
- [x] A.4 Migration SQL (remover CHECK antigo se existir)

### Sprint B — Schema aditivo
- [ ] B.1 Migration: campos DAJE + revelia_decretada + litigancia_ma_fe + fase_updated_at em `processo`
- [ ] B.2 Migration: `perfil_diligencia` em `comarca`
- [ ] B.3 Migration: `cenario` + `cenario_observacao` em `audiencia`
- [ ] B.4 Migration: obrigação de fazer + SerasaJud em `processo_procedente`
- [ ] B.5 Atualizar schemas Drizzle
- [ ] B.6 Atualizar tipos TypeScript

### Sprint C — Pop-up audiência
- [ ] C.1 Adicionar bloco cenário no `pos-audiencia.tsx`
- [ ] C.2 Lógica de cenário no `audiencias.service.ts`
- [ ] C.3 Atualizar DTO e endpoint `/audiencias/:id/finalizar`

### Sprint D — 5º cenário 2º grau
- [ ] D.1 Adicionar cenário E ao pop-up de acórdão
- [ ] D.2 Lógica dos 4 sub-resultados em `sentencas.service.ts`

### Sprint E — DAJE
- [ ] E.1 Módulo NestJS `daje` com 5 endpoints
- [ ] E.2 Seção DAJE no drawer do processo
- [ ] E.3 Campo `perfil_diligencia` no CRUD de comarcas

### Sprint F — Obrigação de fazer + SerasaJud
- [ ] F.1 UI na página de PROCEDENTES
- [ ] F.2 Endpoint `POST /procedentes/:id/obrigacao-fazer`
- [ ] F.3 Endpoint `GET /clientes/:cpf/processos`

### Sprint G — Observações + Dashboard
- [ ] G.1 Atualizar query de observações (7ª fonte: LITIGANCIA)
- [ ] G.2 Endpoint e página de dashboard litigância de má-fé

### Sprint H — Aba ATENDIMENTO ✅ CONCLUÍDO

**Renomeação (TELEMARKETING → ATENDIMENTO):**
- [x] H.1 `encadeamentos.registry.ts`: `fila: 'TELEMARKETING'` → `fila: 'ATENDIMENTO'`
- [x] H.2 `telemarketing.service.ts`: `FILA = 'TELEMARKETING'` → `FILA = 'ATENDIMENTO'`
- [x] H.3 `telemarketing.controller.ts`: `@Controller('telemarketing')` → `@Controller('atendimento')`; roles `'telemarketing'` → `'atendimento'`
- [x] H.4 `_config/nav.ts`: perfil `'telemarketing'` → `'atendimento'`; renomear constante e função
- [x] H.5 `layout.tsx`: guard de perfil `'telemarketing'` → `'atendimento'`
- [x] H.6 `middleware.ts`: rota `/telemarketing` → `/atendimento`
- [x] H.7 `lib/api.ts`: funções e paths `/telemarketing` → `/atendimento`; `getTelemarketingResumo` → `getAtendimentoResumo` etc.
- [x] H.8 `lib/types.ts`: `TelemarketingResumo` → `AtendimentoResumo`; `TelemarketingLinha` → `AtendimentoLinha`
- [x] H.9 Pasta `app/(app)/telemarketing/` → `app/(app)/atendimento/`
- [x] H.10 Placeholders nos campos de "Fila": `"Ex.: TELEMARKETING"` → `"Ex.: ATENDIMENTO"`

**Aba implementada:**
- [x] H.11 Página `atendimento/page.tsx` — KPI cards (abertas / vencendo / na fila / cumpridas 30d), lista com urgência, link WhatsApp, toggle Toda a fila / Minhas pendências
- [x] H.12 Botão "Puxar da fila" → `POST /atendimento/puxar`
- [x] H.13 Botão "Cumprir" → abre `PopUpPosPendencia` → `POST /pendencias/:id/encerrar`
- [x] H.14 `_config/nav.ts`: entrada "Atendimento" adicionada na seção Gestão
- [x] H.15 Guard de perfil `atendimento` só acessa `/atendimento` e `/pendencias`

**Backend (já existia, mantido):**
- `apps/api/src/telemarketing/` — módulo NestJS com service/controller/module (nomes internos de classe não alterados)

---

## SPRINT I — Fluxogramas do Escritório (M0)

> Itens identificados nos 14 arquivos de `FLUXOGRAMA ESCRITÓRIO/` que não estavam cobertos pelo briefing anterior.

### I.1 — Novos campos: `processo` e `processo_procedente`

Migration SQL (`009_fluxogramas_escritorio.sql`):

```sql
-- processo
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  hipossuficiencia_comprovada BOOLEAN NOT NULL DEFAULT false;
  -- gate em 3 pontos: gratuidade indeferida, recurso do cliente, sentença improcedente

ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  vara_exige_doc_frequente BOOLEAN NOT NULL DEFAULT false;
  -- dispara contato proativo de Atendimento antes da audiência

-- sentenca
ALTER TABLE sentenca ADD COLUMN IF NOT EXISTS
  turma_recursal SMALLINT;
  -- Juizado: número da turma sorteada (1–5) após remessa

ALTER TABLE sentenca ADD COLUMN IF NOT EXISTS
  tipo_decisao VARCHAR(20)
    CHECK (tipo_decisao IS NULL OR tipo_decisao IN ('MONOCRATICA', 'COLEGIADA'));
  -- Monocrática: cabem embargos + agravo interno
  -- Colegiada: cabem apenas embargos de declaração

-- processo_procedente
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  tipo_execucao VARCHAR(20)
    CHECK (tipo_execucao IS NULL OR tipo_execucao IN ('COMUM', 'RPV', 'PRECATORIO'));
  -- RPV e Precatório: execução contra órgão público

ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  penhora_status VARCHAR(30)
    CHECK (penhora_status IS NULL OR penhora_status IN (
      'NAO_EXECUTADA',
      'SOLICITADA',
      'BLOQUEADA',
      'IMPUGNADA',
      'LIBERADA'
    ));
```

Atualizar schemas Drizzle e tipos TypeScript correspondentes.

### I.2 — Lógica de hipossuficiência como gate

Em 3 pontos do sistema, quando `hipossuficiencia_comprovada = false`, criar pendência automática `SOLICITAR_DOC_HIPOSSUFICIENCIA` (fila ATENDIMENTO, 5d):

| Ponto de disparo | Onde implementar |
|---|---|
| Gratuidade indeferida na Justiça Comum | `processos.service.ts` ao registrar decisão de gratuidade |
| Recurso do cliente no Juizado | `encadeamentos.registry.ts` — novo evento `juizado_cliente_recorre` |
| Sentença improcedente no Juizado | `encadeamentos.registry.ts` — evento `improcedente_recorrer` (já existente, adicionar verificação) |

### I.3 — Lógica de decisão monocrática vs. colegiada

Em `sentencas.service.ts` (ou `recursos` service): ao registrar sentença/acórdão com `tipo_decisao`:
- `MONOCRATICA` → cascata pode criar pendências para embargos de declaração (5d, ADV) e agravo interno (10d, ADV)
- `COLEGIADA` → cascata cria apenas pendência para embargos de declaração (5d, ADV)

### I.4 — Prazo em dobro para órgão público

Campo `reu_orgao_publico BOOLEAN DEFAULT false` já deve existir ou ser adicionado em `processo`.

Quando `reu_orgao_publico = true` na Justiça Comum:
- Prazo recursal: 30 dias úteis (em vez de 15)
- Execução: `tipo_execucao` deve ser `RPV` ou `PRECATORIO` em `processo_procedente`
- Exibe badge "Órgão Público" no grid de INTIMAÇÕES e RECURSOS

Verificar se campo existe; adicionar se faltar:
```sql
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  reu_orgao_publico BOOLEAN NOT NULL DEFAULT false;
```

### I.5 — Verificação pós-SerasaJud: novas negativações

Após `serasajud_acionado = true` + confirmação de exclusão (`obrigacao_fazer_cumprida = true`), endpoint que verifica automaticamente outras restrições ativas:

```
GET /clientes/:cpf/restricoes-ativas
```

Retorna lista de restrições (CPF consultado via serviço externo ou campo manual). Se houver novas restrições, cria pendência `VERIFICAR_NOVA_NEGATIVACAO` (fila ADV, 7d) com observação contendo o relatório.

### I.6 — Status de certidão de crédito

Adicionar status `CERTIDAO_CREDITO` ao conjunto de estados finais de processo improcedente. Quando processo improcedente com `litigancia_ma_fe = true` não tem mais medida viável:

```sql
-- Em improcedente ou em processo diretamente:
ALTER TABLE improcedente ADD COLUMN IF NOT EXISTS
  certidao_credito_solicitada BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE improcedente ADD COLUMN IF NOT EXISTS
  certidao_credito_data DATE;
```

Botão "Solicitar certidão de crédito" na aba IMPROCEDENTES (visível apenas quando `litigancia_ma_fe = true` e processo sem recurso ativo).

### I.7 — Desistência como encerramento rápido

Novo tipo de encerramento disponível no drawer/pop-up do processo em qualquer fase:

**Endpoint:** `POST /processos/:id/desistir`
```typescript
body: { motivo: string; data: string }
```

Move processo para `pendencia_historico` com status `DESISTENCIA`. Não passa por pop-ups de sentença — é encerramento direto.

Adicionar botão "Registrar desistência" no drawer do processo (discreto, em seção "Ações avançadas").

### I.8 — Vara com exigência frequente de documentação

Adicionar campo `exige_doc_frequente BOOLEAN DEFAULT false` no CRUD de comarcas/varas (`/configuracoes` aba Comarcas).

Comportamento: quando processo é distribuído em vara com `exige_doc_frequente = true`, criar automaticamente pendência `SOLICITAR_PROCURACAO_ATUALIZADA` (fila ATENDIMENTO, 5d) **antes mesmo da audiência** — contato proativo com cliente.

Implementar no `processos.service.ts` ao receber novo processo (importação PDF ou criação manual).

### I.9 — Turma recursal no grid de RECURSOS

Adicionar coluna "Turma" no grid da aba RECURSOS, preenchida via `sentenca.turma_recursal`. Campo editável inline (input numérico 1–5 para Juizado; texto livre para Justiça Comum).

---

## PENDÊNCIAS FUTURAS — M1

### M1.1 — Gestão completa de prazos processuais (Prazos com DJEN/10G)

> Complexidade alta — postergado para M1.

Funcionalidade: registro da data de publicação no DJEN (Diário da Justiça Eletrônico) / 10G como marco zero para contagem de prazos processuais.

**Regras identificadas nos fluxogramas:**
- Embargos de Declaração (Juizado): 5 dias úteis a partir do DJEN
- Recurso Nominado (Juizado): 10 dias úteis a partir do DJEN — **interrompido** quando embargos são protocolados; reinicia integralmente após julgamento dos embargos
- Contrarrazões: 10 dias úteis a partir da intimação
- Prazo em dobro para órgão público (Justiça Comum): 30 dias úteis

**O que envolve implementar:**
- Tabela `prazo_processual` (processo_id, tipo, data_inicio_djen, dias, tipo_contagem UTEIS|CORRIDOS, data_limite_calculada, status)
- Integração com tabela `feriado` para cálculo de dias úteis
- Lógica de suspensão/reinício de prazo por evento (embargos)
- Widget de prazo no drawer do processo
- Alertas automáticos quando prazo vence em ≤3d (job existente)

---

*Plano criado em 2026-05-22. Incremento sobre PLANO_V3.md (já executado).*
