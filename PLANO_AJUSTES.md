# CONECTAR — Plano de Ajustes ao PROJETO_CONECTAR.md

> Gerado em 2026-05-12.
> Consolida as diferenças entre o BRIEFING_DEV_REUNIAO_04-05_V2 (decisões da reunião)
> e o PROJETO_CONECTAR.md (documento técnico atual).
> Cada item deve ser incorporado ao PROJETO_CONECTAR.md antes ou durante o desenvolvimento.

---

## Prioridade A — Resolver antes de qualquer linha de código

São quebras estruturais de schema. Migrar depois é custoso.

---

### A1 — Tabela `sentenca` separada (1:N com processo)

**Problema:** PROJETO_CONECTAR.md mantém `sentenca`, `data_sentenca`, `valor_sentenca`, `acordao`, `turma` como colunas diretas em `processo`. O BRIEFIN §4.3 decide que sentença vira tabela própria, pois um processo pode ter 1º grau + 2º grau + embargos como registros distintos.

**Ação:** Remover os campos abaixo de `processo` e criar a tabela `sentenca`:

Campos a remover de `processo`:
- `data_sentenca DATE`
- `sentenca VARCHAR(30)`
- `valor_sentenca NUMERIC(12,2)`
- `recurso VARCHAR(50)`
- `turma VARCHAR(50)`
- `acordao VARCHAR(30)`

Tabela a criar (já definida no BRIEFIN §4.3):

```sql
CREATE TABLE sentenca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processo(id),
  escritorio_id UUID NOT NULL,
  grau VARCHAR(20) NOT NULL,          -- PRIMEIRO_GRAU | SEGUNDO_GRAU | EMBARGOS
  data DATE NOT NULL,
  valor NUMERIC(12,2),
  resultado VARCHAR(40) NOT NULL,
  favoravel_para VARCHAR(10) NOT NULL, -- AUTOR | REU
  turma VARCHAR(50),
  assessor_julgador VARCHAR(100),
  turno_julgamento VARCHAR(20),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sentenca_processo ON sentenca(processo_id);
CREATE INDEX idx_sentenca_escritorio ON sentenca(escritorio_id, data DESC);
```

**Impacto no código:** Consulta da sentença mais recente substitui o campo direto. Trava de validação (DATA + VALOR + RESULTADO + FAVORAVEL_PARA) passa a valer no insert da tabela `sentenca`.

**Atualizar em:** schema Drizzle (`sentenca.ts`), `ProcessosService`, `DashboardsService` (queries de taxa de procedência), trava de validação no `SentencasController`.

---

### A2 — Família `EM_RECURSO` removida de `processo_procedente`

**Problema:** PROJETO_CONECTAR.md lista 6 famílias em `processo_procedente` incluindo `EM_RECURSO`. O BRIEFIN §4.1.5 é explícito: **família `EM_RECURSO` é removida — 5 famílias finais.** Processo procedente com réu recorrendo aparece em PROCEDENTES + RECURSOS simultaneamente, mas não via família separada.

**Ação:** Remover `EM_RECURSO` do enum de `familia_situacao`. As 5 famílias finais são:

| Família | Significado |
|---|---|
| `AGUARDAR_TRANSITO` | Sem mais recurso, aguardando formalidade |
| `PEND_INTERNA` | Bloqueio interno do escritório |
| `EXEC_ATIVA` | Peticionar / agir no processo |
| `AGUARDAR_PAGTO` | Aguardando dinheiro entrar |
| `ENCERRADO` | Saída do funil |

**Impacto no código:** Cards do topo de PROCEDENTES, indicadores agregados, seed de sub-estados.

---

### A3 — STATUS × FASE × PENDÊNCIA — separação clara em `processo`

**Problema:** PROJETO_CONECTAR.md tem `situacao` e `fase_atual` no processo sem separação clara de semântica. O BRIEFIN §4.1 redefine:

- `status_processo`: 3 valores fixos (ATIVO / SOBRESTADO / ARQUIVADO) — marco amplo, raro
- `fase_atual`: estado operacional granular, atualiza a cada movimentação, parametrizável por escritório
- Pendência: tarefa interna — **não alimenta STATUS, alimenta FASE**

**Ação:** Renomear/reestruturar no schema:

```sql
-- Em processo, renomear situacao → status_processo e restringir valores
ALTER TABLE processo
  ADD COLUMN status_processo VARCHAR(20) NOT NULL DEFAULT 'ATIVO';
  -- Valores: ATIVO | SOBRESTADO | ARQUIVADO
  -- Remover 'situacao' ou mantê-lo como alias até migração completa

-- fase_atual permanece, mas seu preenchimento passa a ser obrigatório
-- e controlado pela máquina de estados
```

**Atualizar em:** schema, filtros das grids, cards do topo de INTIMAÇÕES, dropdowns de configuração.

---

## Prioridade B — Incorporar antes do desenvolvimento das abas novas

---

### B1 — Tabela `audiencia_ausente`

**Decisão (BRIEFIN §2.3):** Subsistema completo — não só uma flag. Quando audiência é marcada REALIZADA + autor AUSENTE, cria snapshot do processo no momento da ausência.

```sql
CREATE TABLE audiencia_ausente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL,
  audiencia_id UUID REFERENCES audiencia(id),
  processo_id UUID NOT NULL REFERENCES processo(id),
  -- Snapshot do processo no momento da ausência
  numero_processo VARCHAR(30) NOT NULL,
  cliente_nome VARCHAR(300),
  reu_id UUID,
  materia VARCHAR(100),
  vara VARCHAR(50),
  qualidade_caso VARCHAR(60),
  -- Operacional
  data_audiencia DATE NOT NULL,
  motivo_ausencia TEXT NOT NULL,
  reaproveitavel BOOLEAN,
  reaproveitado_em DATE,
  observacoes_revisao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Adicionar em:** schema Drizzle (`audiencia_ausente.ts`), `AudienciasService` (trigger ao fechar com AUSENTE), relatório semestral.

**Indicador habilitado:** % de ausentes reaproveitados (lead recuperado).

---

### B2 — Tabela `fase_historico`

**Decisão (BRIEFIN §4.1):** Toda mudança de fase gera registro para auditoria e cálculo de tempo médio por fase.

```sql
CREATE TABLE fase_historico (
  id BIGSERIAL PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES processo(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL,
  fase_anterior VARCHAR(50),
  fase_nova VARCHAR(50) NOT NULL,
  origem VARCHAR(20) NOT NULL,  -- MANUAL | AUTO | PENDENCIA | COMUNICA
  usuario_id UUID REFERENCES usuario(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fase_historico_processo ON fase_historico(processo_id);
```

**Adicionar em:** schema Drizzle, `ProcessosService` (registrar em toda mudança de `fase_atual`), query de tempo médio por fase nos dashboards.

---

### B3 — Tabelas `escritorio_adversario` + `escritorio_adversario_alias`

**Decisão (BRIEFIN §4.2.1):** "Escritório" no produto = banca de advocacia que defende o réu. Normalização canônica igual à de réu.

```sql
CREATE TABLE escritorio_adversario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorio(id),
  nome_canonico VARCHAR(300) NOT NULL,
  cnpj VARCHAR(18),
  UNIQUE (escritorio_id, nome_canonico)
);

CREATE TABLE escritorio_adversario_alias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_adversario_id UUID NOT NULL REFERENCES escritorio_adversario(id) ON DELETE CASCADE,
  alias VARCHAR(300) NOT NULL
);
```

**Adicionar em:** schema Drizzle, módulo `escritorios-adversarios/` no backend, tela de gestão (similar à de réus), coluna `escritorio_adversario_id` em `audiencia`.

**Indicadores habilitados:** top bancas por frequência, taxa de acordo por banca, cruzamento 5D.

---

### B4 — Tabela `improcedente` (gestão de sucumbência)

**Decisão (BRIEFIN §4.1.7):** Improcedente não é lixeira — gerencia honorários sucumbenciais devidos.

```sql
CREATE TABLE improcedente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processo(id),
  escritorio_id UUID NOT NULL,
  -- Sucumbência
  valor_sucumbencia NUMERIC(12,2),
  destinatario_sucumbencia VARCHAR(300),  -- advogado adversário / banca
  status_pagamento VARCHAR(30) NOT NULL DEFAULT 'A_PAGAR',
  -- A_PAGAR | PAGO | SUSPENSO_JG (justiça gratuita)
  data_prazo_pagamento DATE,    -- 15 dias pós-trânsito
  data_pagamento DATE,
  -- Recurso
  decisao_recurso VARCHAR(20),  -- RECORRER | NAO_RECORRER | AVALIAR | AGUARDANDO
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Adicionar em:** schema Drizzle, módulo `improcedentes/`, trigger ao marcar sentença IMPROCEDENTE, alerta de prazo de pagamento (15d pós-trânsito), indicador de passivo no dashboard financeiro.

---

## Prioridade C — Campos a adicionar em tabelas existentes

---

### C1 — Campos faltando em `processo`

```sql
ALTER TABLE processo
  ADD COLUMN qualidade_caso VARCHAR(60),
  -- Dropdown parametrizável: BOA — SEM NADA | RUIM — CONTRATO ASSINADO |
  -- MEEIRA | MEEIRA — RG + SELFIE | RUIM
  ADD COLUMN avaliacao_recurso JSONB,
  -- Estrutura: { "ativa": bool, "criado_em": date, "prazo": date,
  --              "responsavel": string, "observacao": string }
  ADD COLUMN justica_gratuita BOOLEAN DEFAULT false;
  -- Se TRUE, sucumbência suspensa por 5 anos (CPC art. 98 §3º)
```

**Atualizar em:** schema Drizzle, `ProcessosService`, grid de INTIMAÇÕES (coluna QUALIDADE DO CASO), alertas automáticos do estado AVALIAR.

---

### C2 — Campos faltando em `audiencia`

```sql
ALTER TABLE audiencia
  ADD COLUMN escritorio_adversario_id UUID REFERENCES escritorio_adversario(id),
  ADD COLUMN autor_presenca VARCHAR(10),    -- PRESENTE | AUSENTE
  ADD COLUMN motivo_ausencia TEXT;          -- obrigatório se autor_presenca = AUSENTE
```

**Atualizar em:** schema Drizzle, `AudienciasService` (trava: autor_presenca obrigatório ao marcar REALIZADA), aba AUDIÊNCIAS (colunas), aba AGENDA (cartões).

---

### C3 — Campo `origem` em `pendencia` — valores corretos

**Problema:** PROJETO_CONECTAR.md define `origem VARCHAR(20) DEFAULT 'MANUAL'` com valores `MANUAL | COMUNICA | IMPORT`. O BRIEFIN §4.1.2 define três portas distintas:

| Valor correto | Quando |
|---|---|
| `POS_AUDIENCIA` | Juiz pede pendência durante audiência (pop-up pós-audiência) |
| `MANUAL_INTIMACOES` | Adm clica "+ Pendência" na linha do processo |
| `COMUNICA` | Publicação eletrônica do CNJ |

**Ação:** Atualizar enum de `origem` em `pendencia`. O valor `IMPORT` pode ser mantido para migração, mas não é uma porta operacional.

**Indicador habilitado:** % de pendências por origem — se `MANUAL_INTIMACOES > 70%`, Comunica está perdendo movimentações.

---

## Prioridade D — Frontend: páginas e componentes novos

---

### D1 — Três novas páginas no frontend

Adicionar à estrutura de `apps/web/app/(app)/`:

```
├── recursos/
│   └── page.tsx        # Aba dedicada — AG Grid com workflow de 2º grau
├── improcedentes/
│   └── page.tsx        # Aba dedicada — sucumbência + estado AVALIAR
└── agenda/
    └── page.tsx        # Layout de cartões (toggle pra lista compacta)
```

**Observação:** `/audiencias/page.tsx` permanece como grid operacional. `/agenda/page.tsx` é a vista do pautista em cartões.

---

### D2 — Componentes novos

| Componente | Localização | Descrição |
|---|---|---|
| `<PostAudienciaPopup />` | `components/popups/` | Obrigatório ao marcar audiência REALIZADA. Coleta: autor_presenca, decisão audiência, pendências, obs. |
| `<PostImprocedenciaPopup />` | `components/popups/` | Obrigatório ao marcar IMPROCEDENTE. Coleta: data, valor, RECORRER/NÃO RECORRER/AVALIAR, obs. |
| `<ProcessoDrawer />` | `components/drawers/` | Drawer lateral ao clicar na linha. Exibe timeline em graus + campo de observações editável. |
| `<SemaforoImportacao />` | `components/importacao/` | Tabela de pré-visualização com badge verde/amarelo/vermelho por linha de PDF. |
| `<AgendaCard />` | `components/agenda/` | Card de audiência para a aba AGENDA (layout de pautista). |
| `<TimelineProcesso />` | `components/drawers/` | Timeline visual dentro do drawer: distribuição → audiência → 1º grau → 2º grau → trânsito → alvará → recebido. |

---

### D3 — Sidebar: adicionar novas abas

```typescript
// Itens a adicionar no componente Sidebar
{ href: '/recursos',      label: 'Recursos',      icon: Scale }
{ href: '/improcedentes', label: 'Improcedentes',  icon: XCircle }
{ href: '/agenda',        label: 'Agenda',         icon: CalendarDays }
```

---

## Prioridade E — Lógica de negócio a implementar

---

### E1 — Pop-up pós-audiência (componente reutilizável)

Quando `audiencia.status` muda para REALIZADA, pop-up obrigatório com 4 campos:
1. **Autor:** PRESENTE / AUSENTE → se AUSENTE, motivo obrigatório
2. **Audiência:** REALIZADA / REDESIGNADA → se REDESIGNADA, nova data
3. **Houve pendência?** SIM / NÃO → se SIM, permite N pendências (tipo, prazo, responsável, obs)
4. **Observações:** texto livre, obrigatório

Tabela de resultados por combinação (ver BRIEFIN §4.1.1).

---

### E2 — Pop-up pós-improcedência (componente reutilizável)

Quando sentença IMPROCEDENTE é registrada, pop-up obrigatório:
1. **Data da sentença:** obrigatório
2. **Valor:** R$ 0,00 ou sucumbência já fixada
3. **Decisão:** RECORRER / NÃO RECORRER / AVALIAR
4. **Observações:** texto livre

Resultados:
- **RECORRER** → processo entra em RECURSOS; fase → EM RECURSO; pendência "elaborar recurso" (prazo 10d)
- **NÃO RECORRER** → processo vai pra IMPROCEDENTES; inicia gestão de sucumbência (15d pós-trânsito)
- **AVALIAR** → bandeira amarela em INTIMAÇÕES; `avaliacao_recurso` JSONB preenchido; notificação em D-2

---

### E3 — Máquina de estados de FASE (derivação automática)

Regras de trigger automático (BRIEFIN §4.1 e §4.1.3):

| Evento | Fase resultante |
|---|---|
| Pendência aberta tipo PROCURAÇÃO | AGUARDANDO PROCURAÇÃO |
| Recurso aberto | EM RECURSO |
| Audiência marcada | AGUARDANDO AUDIÊNCIA |
| Audiência realizada | AGUARDANDO SENTENÇA |
| Sentença + procedente | AGUARDANDO TRÂNSITO |
| Trânsito + Comunica | AGUARDANDO ALVARÁ |

Regra de derivação por pendências múltiplas:
1. Pendência com **data limite mais próxima** dita a fase
2. Pendência fecha → fase muda pra próxima aberta
3. Todas fechadas → fase volta ao estado natural

Edição manual de fase bloqueada se houver pendência aberta ou transição inválida.

---

### E4 — Quatro cenários de retorno do 2º grau

Implementar ação automática para cada combinação (BRIEFIN §4.1.5):

| Cenário | Origem 1º grau | Decisão 2º grau | Destino | Ação |
|---|---|---|---|---|
| A | IMPROCEDENTE (nós recorremos) | Provimento | RECURSOS → PROCEDENTES | Cria `sentenca` SEGUNDO_GRAU; cria `processo_procedente` (AGUARDAR_TRANSITO) |
| B | IMPROCEDENTE (nós recorremos) | Negado | RECURSOS → IMPROCEDENTES | Cria `sentenca` SEGUNDO_GRAU; inicia sucumbência |
| C | PROCEDENTE (réu recorreu) | Mantida | RECURSOS → permanece em PROCEDENTES | Cria `sentenca` SEGUNDO_GRAU; `status_provisao` avança |
| D | PROCEDENTE (réu recorreu) | Reformada | Sai de PROCEDENTES + RECURSOS → IMPROCEDENTES | Cria `sentenca` SEGUNDO_GRAU; `processo_procedente` inativo; inicia sucumbência |

---

### E5 — Importação semafórica (página `/importacao`)

Substituir o upload simples pelo fluxo com pré-visualização (BRIEFIN §3.1):

```
Upload N PDFs → Processamento → Tabela semafórica → Inserção seletiva
```

Regras de classificação (BRIEFIN §3.2):

| Condição | Cor |
|---|---|
| Dados completos, sem conflito | VERDE |
| Vara não casa com mapa de comarcas | AMARELO |
| Matéria não inferida do arquivo | AMARELO |
| CPF mascarado ou vazio | AMARELO |
| Réu com match >85% em canônico | AMARELO (sugere merge) |
| Número já existe em INTIMAÇÕES | VERMELHO (duplicata) |
| PDF scaneado | VERMELHO (rejeita) |
| Datas inconsistentes | VERMELHO |

Botão "Inserir todos os verdes" + edit inline nas linhas amarelas/vermelhas antes de inserir.
Validação de contagem: N protocolos = N PDFs (alerta se divergir).

---

### E6 — Estado AVALIAR — alertas automáticos

Quando `avaliacao_recurso.ativa = true`:
- Bandeira amarela em INTIMAÇÕES durante o prazo
- D-2: notifica advogado responsável (in-app em M0, email/WhatsApp em M3)
- Prazo expirado sem decisão: alerta vermelho + escalada pro admin
- Decisão tomada: `avaliacao_recurso.ativa = false`, segue fluxo normal

---

### E7 — Relatório periódico de ausentes (6 meses)

Query para o relatório (BRIEFIN §2.3):
- Lista `audiencia_ausente` dos últimos 6 meses
- Indicador "causa boa": matéria com alta procedência + réu com alta revelia
- Admin marca `reaproveitavel = true` nos candidatos
- Reprotocolado → marca `reaproveitado_em`

Indicador: % de ausentes reaproveitados.

---

### E8 — Filtro "resultado bom × ruim × sem sentença" em INTIMAÇÕES

Vista dinâmica (BRIEFIN §4.3.1), não aba física:
- "Resultado bom" → última sentença `favoravel_para = AUTOR`
- "Resultado ruim" → última sentença `favoravel_para = REU`
- "Sem sentença" → processo sem nenhum registro em `sentenca`

Implementar como filtro no topo da grid de INTIMAÇÕES (3 botões toggle).

---

## Checklist de execução

### Schema / backend
- [ ] A1 — Criar tabela `sentenca`, remover campos de `processo`
- [ ] A2 — Remover `EM_RECURSO` do enum de `familia_situacao`
- [ ] A3 — Separar `status_processo` (3 valores) de `fase_atual` (parametrizável)
- [ ] B1 — Criar tabela `audiencia_ausente`
- [ ] B2 — Criar tabela `fase_historico`
- [ ] B3 — Criar tabelas `escritorio_adversario` + alias
- [ ] B4 — Criar tabela `improcedente`
- [ ] C1 — Adicionar `qualidade_caso`, `avaliacao_recurso`, `justica_gratuita` em `processo`
- [ ] C2 — Adicionar `escritorio_adversario_id`, `autor_presenca`, `motivo_ausencia` em `audiencia`
- [ ] C3 — Corrigir valores de `pendencia.origem`
- [ ] E3 — Implementar máquina de estados de FASE com triggers
- [ ] E4 — Implementar 4 cenários de retorno do 2º grau
- [ ] E6 — Implementar alertas do estado AVALIAR
- [ ] E7 — Implementar relatório de ausentes

### Frontend
- [ ] D1 — Criar páginas `/recursos`, `/improcedentes`, `/agenda`
- [ ] D2 — Criar componentes: `PostAudienciaPopup`, `PostImprocedenciaPopup`, `ProcessoDrawer`, `SemaforoImportacao`, `AgendaCard`, `TimelineProcesso`
- [ ] D3 — Atualizar Sidebar com novos itens
- [ ] E1 — Integrar `PostAudienciaPopup` ao fluxo de fechar audiência
- [ ] E2 — Integrar `PostImprocedenciaPopup` ao fluxo de registrar sentença
- [ ] E5 — Substituir upload simples por fluxo semafórico em `/importacao`
- [ ] E8 — Adicionar filtro bom/ruim/sem sentença no topo de INTIMAÇÕES

### Atualizar PROJETO_CONECTAR.md
- [ ] Incorporar schema novo (§8) com as tabelas adicionadas
- [ ] Atualizar estrutura de repositório (§3) com novas páginas e componentes
- [ ] Atualizar endpoints REST (§5) com rotas de `sentenca`, `improcedentes`, `recursos`, `agenda`, `escritorios-adversarios`
- [ ] Atualizar regras de negócio críticas (§7) com as novas travas
- [ ] Atualizar critério de aceite (§9) com as novas funcionalidades

---

*Referências: BRIEFING_DEV_REUNIAO_04-05_V2.md · BRIEFING_DEV_M0.md · PROJETO_CONECTAR.md*
