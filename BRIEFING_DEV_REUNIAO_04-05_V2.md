# CONECTAR — Briefing pós-reunião 04/05 — V2

> Versão revisada e ampliada. Tudo que foi decidido na thread está aqui. Pronto pra dev iniciar o desenvolvimento.
>
> Consolida (1) ideias do bloco de notas + (2) decisões formais das reuniões gravadas via Plaud:
> - **PDF 1:** Fluxo de Fase/Status Processual, Audiências (Autor Ausente/Presente), Banco de Teses
> - **PDF 2:** Otimização de Processos e Gestão de Intimações

---

## 0. Posicionamento do produto

Nicho explícito: **"advogados do Juizado do Consumidor com volume de ações"**.

Não é ERP genérico (Astrea / ADVBOX). É ferramenta especializada pra escritórios que:

- Atuam em massa no Juizado Especial Cível do Consumidor.
- Têm centenas a milhares de processos vivos contra mesmos réus (bancos, financeiras, telefonia, cadastros de inadimplentes).
- Têm teses repetidas e fluxo padronizado pós-sentença.

**Dor principal do nicho (gancho de venda):** *perda de prazos intermediários*. É o que Comunica + sistema de pendências + travas de preenchimento resolvem.

---

## 1. Resumo executivo

Demandas se agrupam em:

- **UX da interface** (menu, redução de colunas, drawer de detalhe do processo).
- **Fluxo de importação** com revisão semafórica antes de inserir.
- **Modelagem de dados** (escritório adversário, qualidade do caso, autor presente/ausente, sentença 1:N, redefinição de STATUS × FASE × PENDÊNCIA).
- **Novas abas operacionais:** RECURSOS dedicada, IMPROCEDENTES com sucumbência, AGENDA em cartões.
- **Subsistema "Autor Ausente"** — histórico separado, relatório semestral de reaproveitamento.
- **Banco de Teses** — módulo novo (M7, posterior ao M0).

### Decisão estrutural (precede tudo)

| Conceito | Significado | Atualização | Exemplo |
|---|---|---|---|
| **STATUS** | Marco amplo, raro | Pontual | "audiência realizada", "aguardando sentença" |
| **FASE** | Estado operacional granular — **abriga pendências** | A cada movimentação (obrigatório) | "aguardando audiência", "aguardando procuração", "aguardando trânsito", "aguardando recurso" |
| **PENDÊNCIA** | Tarefa interna específica | Quando criada/encerrada | Procuração, alvará, diligência, hipossuficiência |

**Regra explícita:** *"Pendências NÃO devem mais alimentar STATUS, e sim a FASE do processo."*

---

## 2. Demandas confirmadas

### 2.1 UX da interface

- **Minimizar menu lateral por padrão.**
- **Reduzir colunas na view default de INTIMAÇÕES.**
- **Tirar da view de INTIMAÇÕES** as colunas relacionadas a audiência (data audiência, status audiência).
- **Drawer/modal lateral ao clicar na linha** — exibe detalhe completo: CPF, datas, valor, observações, **timeline do processo** (distribuição → 1ª sentença → recurso → 2ª sentença → trânsito → execução → recebido).
- **Campo de observações editável** dentro do detalhe.

### 2.2 Trava de validação reforçada

- **DATA + VALOR DA SENTENÇA + FAVORÁVEL_PARA** só são exigidos quando a adm muda `sentenca` para PROCEDENTE / PARCIAL / ACORDO. Modal pede preenchimento. Sem isso, mudança é revertida.

### 2.3 AUDIÊNCIAS — subsistema "Autor ausente"

Subsistema completo, não só uma flag:

- Campo binário `autor_presenca` (PRESENTE / AUSENTE) obrigatório quando audiência muda pra REALIZADA.
- Se AUSENTE → motivo obrigatório.
- Audiência pode estar REALIZADA mesmo com autor ausente.

**Histórico de ausentes:**

```sql
CREATE TABLE audiencia_ausente (
  id UUID PRIMARY KEY,
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

**Workflow:**

1. Audiência marcada REALIZADA + AUSENTE → linha em `audiencia_ausente` com snapshot.
2. **Relatório periódico (6 meses)** lista ausentes com indicador "causa boa" (matéria com alta procedência + réu com alta revelia).
3. Adm marca `reaproveitavel = true` nos candidatos a reprotocolar.
4. Reprotocolado → marca `reaproveitado_em` (lead recuperado).

**Indicador:** "% de ausentes reaproveitados" — mede eficácia em recuperar processos perdidos.

### 2.4 Normalização de réu

BRADESCO S.A. / BRADESCO SEGUROS / BANCO BRADESCO → **BRADESCO** (entidade canônica). Fuzzy match na importação inicial + sugestão de merge em novos cadastros.

### 2.5 Dropdown de varas

Expandir mapa de comarcas para cobrir 100% das varas da Bahia + federais.

### 2.6 Aba AUDIÊNCIAS — colunas confirmadas

| Coluna | Origem |
|---|---|
| Nº PROCESSO | herdado de processo |
| LOGIN | herdado de processo (captação) |
| CLIENTE | herdado de processo |
| RÉU | herdado (normalizado) |
| MATÉRIA | herdado de processo |
| VARA / COMARCA | herdado de processo |
| TIPO AUDIÊNCIA | manual (UNA, instrução, conciliação, etc.) |
| DATA AUDIÊNCIA | PDF ou manual |
| HORA | PDF ou manual |
| PAUTISTA | manual (dropdown de usuários) |
| STATUS | manual (AGENDADA, REALIZADA, CANCELADA, ADIADA, REDESIGNADA) |
| OBS PRÉ | manual (briefing pro pautista) |
| OBS PÓS | manual (obrigatório no fechamento) |
| AUTOR PRESENÇA | manual (PRESENTE / AUSENTE, obrigatório no fechamento) |
| MOTIVO AUSÊNCIA | manual (obrigatório se AUSENTE) |
| TELEFONE | herdado de processo |
| LINK | manual (URL da audiência virtual) |
| **ESCRITÓRIO ADVERSÁRIO** | manual (FK pra `escritorio_adversario` canônico) |

---

## 3. Mudanças no fluxo de importação de PDF

### 3.1 Página dedicada à importação

```
1. Adm sobe N PDFs na página de importação
        ↓
2. Sistema processa todos via skill (extract_projudi)
        ↓
3. Renderiza tabela de pré-visualização com classificação automática:
   - VERDE: dados completos, sem conflito  → pronto pra inserir
   - AMARELO: campo crítico vazio ou ambíguo (vara, matéria) → revisão obrigatória
   - VERMELHO: erro de leitura ou duplicata → revisão obrigatória
        ↓
4. Botão "Inserir todos os verdes" (1 clique)
   Linha amarela/vermelha: edit inline antes de inserir
        ↓
5. Insere em INTIMAÇÕES + sincroniza AUDIÊNCIAS
        ↓
6. Validação de contagem: N protocolos = N PDFs (alerta se divergir)
```

### 3.2 Regras de classificação

| Condição | Cor |
|---|---|
| Vara não casa com mapa de comarcas | AMARELO |
| Matéria não foi inferida do nome do arquivo | AMARELO |
| CPF mascarado (PJe Federal) ou vazio | AMARELO |
| Réu coincide >85% com canônico existente | AMARELO (sugere merge) |
| Banca adversária coincide >85% com canônico | AMARELO (sugere merge) |
| Nº processo já existe em INTIMAÇÕES | VERMELHO (duplicata) |
| Skill detectou PDF scaneado | VERMELHO (rejeita) |
| Datas inconsistentes (audiência < distribuição) | VERMELHO |

### 3.3 Importação de PROCEDENTES (migração da planilha atual)

Importar a planilha histórica de procedentes (251 linhas) exige decomposição do campo `COMPLEMENTO` (texto livre) em campos estruturados:

| Coluna atual (planilha) | Campos estruturados resultantes |
|---|---|
| COMPLEMENTO = "ED DO REU NAO ACOLHIDO" | `recurso_tipo=ED`, `recurso_origem=REU`, `recurso_resultado=NAO_ACOLHIDO` |
| COMPLEMENTO = "RI MAJOROU" | `recurso_tipo=RI`, `recurso_origem=NOS`, `recurso_resultado=MAJOROU` |
| COMPLEMENTO = "PROCURAÇÃO P/ ALVARÁ" | `doc_pendente=["procuracao_alvara"]` |
| COMPLEMENTO = "COMPROVANTE DE PAGAMENTO" | `doc_pendente=["comprovante_pagamento"]` |
| COMPLEMENTO = "PROCEDENTE EM PARTE" | herda pra `sentenca.resultado=PROCEDENTE_PARCIAL` (não vai pra processo_procedente) |

Script de migração roda fuzzy match + apresenta candidatos pra adm aprovar manualmente. 80% deve mapear automaticamente.

---

## 4. Decisões da reunião (DEFINIDAS)

### 4.1 STATUS × FASE — máquina de estados explícita

**STATUS** (campo `status_processo`, três valores fixos):
- `ATIVO` — processo em curso, qualquer fase.
- `SOBRESTADO` — processo paralisado pelo juízo.
- `ARQUIVADO` — encerrado.

**FASE** (campo `fase_atual`, parametrizada por escritório):
- Valores típicos: AGUARDANDO AUDIÊNCIA, AGUARDANDO SENTENÇA, AGUARDANDO TRÂNSITO, EM RECURSO, AGUARDANDO PROCURAÇÃO, AGUARDANDO DILIGÊNCIA, AGUARDANDO ALVARÁ, AGUARDANDO PAGAMENTO.
- Atualiza a cada movimentação.
- Atualização automática por trigger:
  - Abre pendência tipo PROCURAÇÃO → fase = "AGUARDANDO PROCURAÇÃO"
  - Abre recurso → fase = "EM RECURSO"
  - Audiência marcada → fase = "AGUARDANDO AUDIÊNCIA"
  - Audiência realizada → fase = "AGUARDANDO SENTENÇA"
  - Sentença + procedente → fase = "AGUARDANDO TRÂNSITO"
  - Trânsito + Comunica → fase = "AGUARDANDO ALVARÁ"

**Dicionário de transições válidas** (cada escritório calibra o próprio em `escritorio.config`):
- Toda mudança de fase precisa ser válida.
- Cada transição gera linha em `fase_historico` (auditoria + cálculo de tempo médio por fase).

### 4.1.1 Pop-up pós-audiência (componente reutilizável)

Quando adm muda audiência pra REALIZADA, pop-up obrigatório:

**Campos:**

1. **Autor:** PRESENTE / AUSENTE. Se AUSENTE → motivo obrigatório.
2. **Audiência:** REALIZADA / REDESIGNADA. Se REDESIGNADA → nova data.
3. **Houve pendência?** SIM / NÃO. Se SIM → permite cadastrar **N pendências** (botão "+ adicionar"), cada uma com tipo, prazo, responsável, observação.
4. **Observações da audiência:** texto livre, obrigatório.

**Ações ao confirmar:**

| Combinação | Resultado |
|---|---|
| Presente + sem pendência + REALIZADA | fase → AGUARDANDO SENTENÇA |
| Presente + com pendência(s) + REALIZADA | cria pendências (origem=POS_AUDIENCIA); fase → AGUARDANDO [tipo mais urgente] |
| Ausente + REALIZADA | cria registro em `audiencia_ausente`; fase = conforme decisão |
| Ausente + REDESIGNADA | cria registro em `audiencia_ausente`; fase → AGUARDANDO AUDIÊNCIA; nova audiência criada |

Observações alimentam o histórico do processo (visível no drawer/quadro de resumo).

### 4.1.2 Três portas de entrada pra pendência

| Porta | Quando | `pendencia.origem` |
|---|---|---|
| Pop-up pós-audiência | Juiz pede pendência durante audiência | `POS_AUDIENCIA` |
| Manual em INTIMAÇÕES | Adm/adv clica "+ Pendência" na linha do processo | `MANUAL_INTIMACOES` |
| Comunica (CNJ) | Publicação eletrônica exige manifestação | `COMUNICA` |

**Indicador:** % de pendências por origem. Se `MANUAL_INTIMACOES` > 70%, integração Comunica está perdendo movimentações.

### 4.1.3 Regra de derivação automática da fase

Processo pode ter múltiplas pendências abertas:

1. Pendência aberta com **data limite mais próxima** dita a fase atual.
2. Pendência fecha → fase muda automaticamente pra próxima aberta.
3. Todas fechadas → fase volta pra estado natural (AGUARDANDO SENTENÇA).

**Edição manual da fase:**
- Permitida apenas pra fases **não derivadas de pendência**.
- Bloqueada se houver pendência aberta.
- Bloqueada pra transições inválidas (não pular AGUARDANDO AUDIÊNCIA → AGUARDANDO TRÂNSITO).

### 4.1.4 Máquina de estados 1º × 2º grau (fluxograma)

```
INTIMAÇÕES (1º grau, fonte da verdade)
│
├── Sentença = PROCEDENTE / PARCIAL / ACORDO
│   └─→ aparece em PROCEDENTES
│       │
│       └── Réu recorre → coluna RECURSO = SIM
│           └─→ aparece TAMBÉM em RECURSOS (permanece em PROCEDENTES)
│               │
│               ├── 2º grau MANTÉM → segue só em PROCEDENTES
│               └── 2º grau REFORMA → sai de PROCEDENTES, vai pra IMPROCEDENTES
│
└── Sentença = IMPROCEDENTE
    │
    └── Pop-up "decisão sobre recurso":
        │
        ├── RECORRER → vai pra RECURSOS
        │   ├── 2º grau provê → vira PROCEDENTE, vai pra PROCEDENTES
        │   └── 2º grau nega → vai pra IMPROCEDENTES
        │
        ├── NÃO RECORRER → vai pra IMPROCEDENTES
        │
        └── AVALIAR (prazo X dias, default 7) → bandeira em INTIMAÇÕES
            └── decisão antes do prazo → RECORRER ou NÃO RECORRER
            └── prazo expirou → alerta vermelho, escalada
```

### 4.1.5 Os 4 cenários de retorno do 2º grau (tabela formal)

Quando recurso fecha no tribunal, cada combinação leva o processo a um destino diferente. Dev precisa implementar regra automática pra cada:

| # | Origem em 1º grau | Decisão de 2º grau | Destino final | Ação automática |
|---|---|---|---|---|
| A | IMPROCEDENTE (nós recorremos) | Provimento (vira procedente) | Sai de RECURSOS → vai pra PROCEDENTES | Cria `sentenca` SEGUNDO_GRAU; cria `processo_procedente` (familia=AGUARDAR_TRANSITO) |
| B | IMPROCEDENTE (nós recorremos) | Negado provimento | Sai de RECURSOS → permanece em IMPROCEDENTES | Cria `sentenca` SEGUNDO_GRAU; inicia contagem de sucumbência |
| C | PROCEDENTE (réu recorreu) | Mantida procedência | Sai de RECURSOS → permanece em PROCEDENTES | Cria `sentenca` SEGUNDO_GRAU; status_provisao avança pra 85% |
| D | PROCEDENTE (réu recorreu) | Reformada (vira improcedente) | Sai de PROCEDENTES + sai de RECURSOS → vai pra IMPROCEDENTES | Cria `sentenca` SEGUNDO_GRAU; `processo_procedente` marcado inativo; inicia contagem de sucumbência |

**Regras consolidadas:**

- Processo procedente com réu recorrendo aparece em PROCEDENTES + RECURSOS simultaneamente.
- Sentença é tabela `sentenca` (1:N): 1º grau e 2º grau viram registros distintos.
- `favoravel_para` (AUTOR / RÉU) resolve ambiguidade de "acolhido".
- Família `EM_RECURSO` **removida** de PROCEDENTES (5 famílias finais).

### 4.1.6 Pop-up pós-improcedência (componente reutilizável)

Quando adm muda `sentenca` pra IMPROCEDENTE, pop-up obrigatório:

**Campos:**

1. **Data da sentença:** obrigatório.
2. **Valor da sentença:** R$ 0,00 ou valor de sucumbência se já fixado.
3. **Decisão sobre recurso:** RECORRER / NÃO RECORRER / AVALIAR.
4. **Observações:** texto livre.

**Ações ao confirmar:**

| Decisão | Resultado |
|---|---|
| **RECORRER** | Processo aparece em RECURSOS imediatamente; fase → EM RECURSO; cria pendência tipo "elaborar recurso" com prazo de 10 dias (juizado especial) |
| **NÃO RECORRER** | Processo vai pra IMPROCEDENTES; inicia gestão de sucumbência (15d pós-trânsito) |
| **AVALIAR** | Bandeira amarela em INTIMAÇÕES; campo `prazo_avaliacao_recurso` recebe data atual + X dias (default 7); cria notificação automática |

**Estado "AVALIAR" — campo dedicado em processo:**

```sql
ALTER TABLE processo ADD COLUMN avaliacao_recurso JSONB;
-- Estrutura: {
--   "ativa": true,
--   "criado_em": "2026-05-11",
--   "prazo": "2026-05-18",
--   "responsavel": "adv@escritorio.com",
--   "observacao": "Verificar jurisprudência STJ antes de decidir"
-- }
```

**Alertas e escalada:**

- Bandeira amarela em INTIMAÇÕES durante o prazo.
- Alerta na semana (D-2): notifica adv responsável.
- Prazo expirou sem decisão: alerta vermelho + escalada pro admin do escritório.
- Decisão tomada antes do prazo (RECORRER ou NÃO RECORRER): `avaliacao_recurso.ativa = false`, segue fluxo normal.

### 4.1.7 Aba IMPROCEDENTES — gestão de sucumbência

Improcedente não é lixeira. Aba IMPROCEDENTES gerencia:

- **Honorários sucumbenciais devidos** (valor + a quem pagar).
- **Status do pagamento:** pago / a pagar / suspenso por justiça gratuita.
- **Prazo de pagamento** (15 dias pós-trânsito; alerta automático).
- **Flag `justica_gratuita`** em processo (se TRUE, sucumbência suspensa por 5 anos — CPC art. 98 §3º).

**Indicador agregado:** "Total de sucumbência a pagar" entra no dashboard financeiro como **passivo a pagar**.

### 4.2 Escritório adversário + Qualidade do caso

#### 4.2.1 Escritório adversário (banca do réu)

"Escritório" no contexto do produto = **banca de advocacia que defende o réu**. Preenchido manualmente pela adm na aba AUDIÊNCIA.

```sql
CREATE TABLE escritorio_adversario (
  id UUID PRIMARY KEY,
  escritorio_id UUID NOT NULL REFERENCES escritorio(id),
  nome_canonico VARCHAR(300) NOT NULL,
  cnpj VARCHAR(18),
  UNIQUE (escritorio_id, nome_canonico)
);

CREATE TABLE escritorio_adversario_alias (
  id UUID PRIMARY KEY,
  escritorio_adversario_id UUID NOT NULL REFERENCES escritorio_adversario(id) ON DELETE CASCADE,
  alias VARCHAR(300) NOT NULL
);

ALTER TABLE audiencia ADD COLUMN escritorio_adversario_id UUID REFERENCES escritorio_adversario(id);
```

**Normalização canônica:** "Pinheiro Neto Advogados" / "Pinheiro Neto" / "PNA" → mesma entidade.

**Indicadores habilitados:**

- Top 10 bancas adversárias por frequência.
- Taxa de acordo por banca (informa OBS PRÉ).
- Tempo médio até sentença por banca.
- Taxa de procedência por banca.
- **Cruzamento 5D:** banca × réu × matéria × vara × resultado.

#### 4.2.2 Qualidade do caso

Campo `qualidade_caso` em `processo`, dropdown parametrizável por escritório.

**Vocabulário inicial do escritório André:**

| Valor | Significado |
|---|---|
| BOA — SEM NADA | Causa boa, sem exigência de prova adicional |
| RUIM — CONTRATO ASSINADO | Causa fraca, réu tem contrato assinado |
| MEEIRA | Causa intermediária (vocabulário interno; não é direito de família) |
| MEEIRA — RG + SELFIE | Intermediária + identificação básica |
| RUIM | Causa fraca, genérico |

**Regras:**

- Preenchido idealmente no cadastro do processo. Editável a qualquer momento.
- Qualquer adv pode editar — registra `audit_log`.
- Audiência herda pra exibir pro pautista; edição em INTIMAÇÕES.

**Indicador-chave:** taxa de procedência por QUALIDADE DO CASO — valida calibragem do julgamento dos advs.

#### 4.2.3 Layout da aba AGENDA — cartões pro pautista

Cards verticais agrupados por dia, escaneáveis:

```
═══════════════════════════════════════════════════════════════════════
  📅 SEGUNDA-FEIRA  ·  05/05/2026  ·  4 audiências
═══════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │  08:20  ·  AGENDADA  ·  VIRTUAL                                 │
  │  ─────────────────────────────────────────────                  │
  │  CLIENTE:  ROSANGELA SANTANA CONCEIÇÃO                          │
  │  TEL:      (71) 9664-5956    [Whatsapp]  [Ligar]                │
  │  ─────────────────────────────────────────────                  │
  │  RÉU:      Mercado Pago Instituição de Pagamento                │
  │  ESCRIT.:  [+ preencher escritório adversário]                  │
  │  MATÉRIA:  Negativação                                          │
  │  VARA:     2ª Lauro    ·    Tipo: UNA                           │
  │  ─────────────────────────────────────────────                  │
  │  📋 QUALIDADE: BOA — SEM NADA                                   │
  │  📝 OBS PRÉ:  Sem defesa ainda                                  │
  │  🔗 LINK:     [Abrir reunião]                                   │
  │  ─────────────────────────────────────────────                  │
  │  Pautista: TAINARA      Login captação: TAINARA                 │
  │                                                                 │
  │             [ Marcar como REALIZADA ]   [ Editar ]              │
  └─────────────────────────────────────────────────────────────────┘
```

**Filtros do topo:**
- Pautista (default: meu nome)
- Período (hoje / semana / próximas 4 semanas / customizado)
- Modalidade (presencial / virtual / ambas)
- Status (AGENDADA / TODAS)

**Modo alternativo:** botão de toggle pra alternar entre **cartão** e **lista compacta** (preferência individual).

### 4.3 Aba RECURSOS — aba dedicada

Aba dedicada, não vista filtrada. Justificativas:

- Nomenclatura dos resultados de recurso é diferente das sentenças de 1º grau.
- Permite registrar nova sentença/acórdão ao mesmo processo (botão dedicado).
- Tem workflow próprio (prazo de manifestação, contrarrazões, embargos).

**Modelagem — sentença vira tabela separada:**

```sql
CREATE TABLE sentenca (
  id UUID PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES processo(id),
  escritorio_id UUID NOT NULL,
  grau VARCHAR(20) NOT NULL,  -- PRIMEIRO_GRAU | SEGUNDO_GRAU | EMBARGOS
  data DATE NOT NULL,
  valor NUMERIC(12,2),
  resultado VARCHAR(40) NOT NULL,
  favoravel_para VARCHAR(10) NOT NULL,  -- AUTOR | REU
  turma VARCHAR(50),
  assessor_julgador VARCHAR(100),
  turno_julgamento VARCHAR(20),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Implicações:**

1. Campo `sentenca` single em `processo` deixa de existir. Consulta a `sentenca` mais recente.
2. Acórdão pode mudar processo de IMPROCEDENTE pra PROCEDENTE automaticamente.
3. Trava: data + valor + resultado + favoravel_para são obrigatórios.

### 4.3.1 Vista "bom × ruim" — filtro dinâmico

Botão de filtro no topo de INTIMAÇÕES com 3 opções:
- "Resultado bom" → última sentença favorável ao AUTOR.
- "Resultado ruim" → última sentença favorável ao RÉU.
- "Sem sentença" → processos pré-julgamento.

Filtro dinâmico, não aba física (processo pode migrar bom↔ruim após recurso).

### 4.4 Timeline em graus (1º e 2º) no drawer do processo

A anotação original "1ª fase / 2ª fase no cadastro do cliente" foi resolvida como **timeline visual** no drawer de detalhe do processo, não como cadastro de cliente novo. Cadastro de cliente fica em M4 (lazy), conforme decidido anteriormente.

**No drawer aparece:**

```
TIMELINE DO PROCESSO
├── 📥 Distribuído em 12/03/2024
├── 🎙️ Audiência realizada em 05/05/2025
├── ⚖️ 1º GRAU
│   ├── Sentença: PROCEDENTE PARCIAL — 18/07/2025
│   ├── Valor: R$ 7.500,00 — Favorável: AUTOR
│   └── Juiz: Dr. Silva (2ª Lauro)
├── ⚖️ 2º GRAU (se houver)
│   ├── Recurso RI do réu protocolado em 02/08/2025
│   ├── Acórdão: NEGADO PROVIMENTO — 15/11/2025
│   └── Turma: 5ª Câmara
├── ⏳ Trânsito em julgado: 22/12/2025
├── 💰 Alvará expedido: 14/01/2026
└── ✅ Recebido: R$ 2.150 — 28/02/2026
```

### 4.5 "MEEIRA" — esclarecido

Não é direito de família. Vocabulário interno pra QUALIDADE DO CASO (§ 4.2.2). Direito de família não entra no escopo.

### 4.6 Aba de diligência

Não criar aba nova. "DILIGENCIAR" é sub-estado em PROCEDENTES (família PEND_INTERNA). Em vez disso: **vista "AÇÃO IMEDIATA"** filtrando PEND_INTERNA + EXEC_ATIVA. Pauta da semana da adm.

### 4.7 Banco de Teses (M7, posterior)

Estrutura inicial:

```
TESE
├── nome (ex: "RCC indevida contra Bradesco")
├── matéria
├── réu canônico (opcional)
├── fundamento jurídico
├── doutrinas citadas
├── jurisprudências favoráveis
├── modelo de petição inicial (.docx)
├── modelo de RI (.docx)
├── modelo de contrarrazões (.docx)
└── histórico de uso:
    ├── processos onde foi aplicada
    ├── taxa de procedência (calculada)
    └── tempo médio até sentença
```

**Indicadores:**
- Teses mais usadas
- Teses com maior taxa de êxito
- Tese × vara (qual vara aceita melhor cada tese)
- Tese × réu (qual réu cai com qual argumento)

---

## 5. Cards e filtros por aba operacional

### 5.1 Aba INTIMAÇÕES (1º grau)

**Cards no topo:**

```
[ TOTAL ATIVOS ]  [ AÇÃO IMEDIATA ]  [ EM AVALIAÇÃO ]  [ ARQUIVADOS 30d ]
                         ↑                  ↑
                   pendência aberta     processo em
                   ou prazo vencendo    AVALIAR recurso
```

**Filtros disponíveis:**
- Resultado: bom / ruim / sem sentença (filtro dinâmico § 4.3.1)
- Status: ATIVO / SOBRESTADO / ARQUIVADO
- Fase: dropdown completo (parametrizável)
- Qualidade do caso: dropdown completo
- LOGIN (captação)
- Matéria, Vara, Réu
- Período (data distribuição / data sentença)

### 5.2 Aba PROCEDENTES (workflow pós-sentença)

**Cards no topo (5 famílias finais):**

```
[ TOTAL ATIVOS ]  [ AÇÃO IMEDIATA ]  [ AGUARDANDO ]  [ ENCERRADO 30d ]
                         ↑                  ↑
                  PEND_INTERNA +      AGUARDAR_TRANSITO
                  EXEC_ATIVA          + AGUARDAR_PAGTO

[ SEM VISTO > 30d ]  [ ALVARÁ > 60d SEM PAGAMENTO ]
```

**Filtros disponíveis:**
- Família (5 valores)
- Sub-estado (parametrizável)
- Documentação pendente (multi-select)
- Responsável
- Tempo na situação atual
- Vara, Réu, Matéria

### 5.3 Aba RECURSOS (2º grau)

**Cards no topo:**

```
[ TOTAL EM RECURSO ]  [ MANIFESTAÇÃO VENCE 7d ]  [ ACÓRDÃO AGUARDANDO ]  [ COM DECISÃO ]
```

**Filtros disponíveis:**
- Origem: nosso recurso (vimos de IMPROCEDENTE) / réu (vimos de PROCEDENTE)
- Tipo: ED / RI / AGRAVO
- Resultado: PENDENTE / ACOLHIDO / NÃO ACOLHIDO / MAJOROU / MAJORAR
- Turma
- Prazo de manifestação

### 5.4 Aba IMPROCEDENTES (sucumbência)

**Cards no topo:**

```
[ TOTAL IMPROC. ]  [ EM AVALIAÇÃO RECURSO ]  [ SUCUMBÊNCIA A PAGAR ]  [ VENCE 15d ]
```

**Filtros disponíveis:**
- Status pagamento: pago / a pagar / suspenso por justiça gratuita
- Em AVALIAR recurso (com prazo)
- Por matéria, vara, banca adversária

### 5.5 Aba AGENDA (vista de audiências)

Já detalhado em § 4.2.3 (cartões + filtros).

### 5.6 Aba PENDÊNCIAS

**Cards no topo (já existentes na planilha atual):**

```
[ TOTAL ]  [ VENCIDOS ]  [ URGENTE ≤3d ]  [ ATENÇÃO 4-7d ]  [ NORMAL >7d ]  [ SEM PRAZO ]  [ CUMPRIDOS 30d ]
```

**Filtros disponíveis (novos):**
- Origem (POS_AUDIENCIA / MANUAL_INTIMACOES / COMUNICA)
- Tipo (parametrizável)
- Responsável
- Período de vencimento

---

## 6. Decisões pendentes

| # | Pergunta | Status |
|---|---|---|
| 1 | "Escritório" é o quê? | ✓ Resolvido — banca adversária |
| 2 | "PENDÊNCIA" como status macro | ✓ Resolvido — STATUS=ATIVO/SOBRESTADO/ARQUIVADO; pendência vira FASE |
| 3 | RECURSOS é vista ou aba? | ✓ Resolvido — aba dedicada |
| 4 | "1ª fase / 2ª fase" é cadastro ou timeline? | ✓ Resolvido — timeline no drawer (§ 4.4) |
| 5 | "MEEIRA" — direito de família? | ✓ Resolvido — NÃO |
| 6 | Diligência: aba ou vista? | ✓ Vista filtrada |
| 7 | Importação: revisão total ou semáforo? | ✓ Semáforo |
| 8 | Extração automática advogado/login (ProJudi) | Pergunta técnica pro dev — não bloqueia |
| 9 | Resultado bom/ruim: abas ou filtro? | ✓ Filtro dinâmico |
| 10 | Link audiência: AUDIÊNCIAS ou AGENDA? | ✓ AGENDA em cartões |
| 11 | Nomenclatura final resultados recursos (Sofia) | Pendência interna — não bloqueia M0 |
| 12 | Papéis Tainá/Sofia/Kevin | Decisão interna |
| 13 | Pop-up pós-audiência + portas pendência + derivação fase | ✓ Resolvido (4.1.1-4.1.3) |
| 14 | Máquina 1º × 2º grau + IMPROCEDENTES sucumbência | ✓ Resolvido (4.1.4-4.1.7) |
| 15 | Escritório adversário + Qualidade caso + AGENDA cartão | ✓ Resolvido (4.2.1-4.2.3) |
| 16 | Pop-up pós-improcedência + estado AVALIAR | ✓ Resolvido (4.1.6) |
| 17 | 4 cenários de retorno do 2º grau | ✓ Resolvido (4.1.5) |
| 18 | Cards e filtros por aba | ✓ Resolvido (§ 5) |

**Status final:** 15 de 18 perguntas resolvidas. As 3 restantes (8, 11, 12) **não bloqueiam o dev** — são decisões internas ou perguntas técnicas em paralelo.

---

## 7. Itens prontos pra ir ao dev

### UX
1. Minimizar menu lateral.
2. Reduzir colunas da view default de INTIMAÇÕES.
3. Drawer/modal lateral de detalhe do processo (quadro de resumo + timeline em graus).
4. Tirar colunas de audiência da view default de INTIMAÇÕES.
5. Filtro "Resultado bom × ruim × sem sentença" no topo de INTIMAÇÕES.
6. Cards e filtros específicos por aba (§ 5).

### Travas de preenchimento
7. SENTENÇA → exige DATA + VALOR + RESULTADO + FAVORÁVEL_PARA.
8. AUDIÊNCIA REALIZADA → exige OBS PÓS + AUTOR_PRESENCA (motivo se ausente) + decisão de pendência.
9. PENDÊNCIA fechada → exige motivo registrado.
10. FASE → atualização obrigatória; máquina de estados; histórico em `fase_historico`.

### Modelagem
11. Tabela `sentenca` separada (1:N com processo).
12. Tabela `audiencia_ausente` (subsistema completo).
13. Tabela `fase_historico` (auditoria + tempo médio).
14. Triggers cruzados de fase (abrir pendência muda fase; abrir recurso muda fase; etc.).
15. Normalização canônica de réu.
16. Tabela `escritorio_adversario` + alias (banca do réu).
17. Campo `qualidade_caso` parametrizável.
18. Tabela `pendencia` com campo `origem` (POS_AUDIENCIA / MANUAL_INTIMACOES / COMUNICA).
19. Tabela `improcedente` ou view derivada com gestão de sucumbência.
20. Campo `avaliacao_recurso` JSONB em `processo` (estado AVALIAR com prazo).
21. Pop-up pós-audiência (componente reutilizável).
22. Pop-up pós-improcedência (componente reutilizável com RECORRER / NÃO RECORRER / AVALIAR).
23. Máquina de estados de transições válidas (parametrizável em `escritorio.config`).
24. Implementação dos 4 cenários de retorno do 2º grau (§ 4.1.5).

### Importação
25. Página dedicada com:
    - Tabela semafórica.
    - Validação de contagem (N protocolos = N PDFs).
    - Decomposição automática de COMPLEMENTO (texto livre → campos estruturados) na migração da planilha histórica.
    - **Investigar extração de nome do advogado + login do conteúdo do PDF (ProJudi).**

### Vistas e abas
26. Aba RECURSOS dedicada.
27. Aba AGENDA em cartões com toggle pra lista compacta.
28. Aba IMPROCEDENTES com gestão de sucumbência.
29. Relatório de Ausentes periódico (6 meses).

### Dropdown / parametrização
30. Expandir mapa de comarcas (100% TJBA + federais BA).
31. Dicionário de fases parametrizável por escritório.
32. Dicionário de resultados de recurso parametrizável (com `favoravel_para`).
33. Dropdown de QUALIDADE DO CASO parametrizável (valores iniciais do André em § 4.2.2).
34. Dropdown de tipos de pendência parametrizável (HIPOSSUFICIÊNCIA, PROCURAÇÃO, PROCURAÇÃO ALVARÁ, CR, CR PROCURAÇÃO, DILIGÊNCIA, etc.).
35. Prazo padrão do estado AVALIAR (parametrizável, default 7 dias).
36. Fatores iniciais de provisão financeira (60% / 85% / 100%) parametrizáveis por escritório.

---

## 8. Próximos passos

1. Responder as 3 perguntas remanescentes da § 6 (8, 11, 12). Não bloqueiam M0.
2. Levar ao dev os 4 documentos da pasta `webservice/`:
   - `VISAO_GERAL_SOFTWARE.md`
   - `BRIEFING_DEV_M0.md`
   - `BRIEFING_DEV_REUNIAO_04-05_V2.md` (este — substitui o anterior)
   - `CONECTAR_Indicadores_e_Financeiro.md` (+ PDF quando regerado)
3. Dev consolida M0 original + ajustes desta versão antes da modelagem.
4. Definir vocabulário inicial de fases parametrizáveis em `escritorio.config`.
5. Calibrar fatores iniciais de provisão (60% / 85% / 100%) com histórico do escritório.

---

**Pronto pra desenvolvimento.** Tudo decidido na thread está aqui — máquina de estados, pop-ups, modelagem de dados, abas, cards, filtros, importação, parametrização. O dev pode começar M0 com este documento + BRIEFING_DEV_M0.md como base técnica.
