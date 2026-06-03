# PLANO DE EXECUÇÃO — ROADMAP COMPLETO DO PRODUTO

> Gerado em: 2026-06-02  
> Baseado em: análise dos fluxogramas do escritório (Fluxos 1–4 + complementares), briefing V3 LEAN, Anexo Técnico, e estado atual do código.

---

## ESTRUTURA GERAL

```
FASE 1 — Core operacional imediato             (semanas 1–2)
  ├── [1] Auto-criar processo de comunicação órfã
  ├── [2] Alerta de CR na linha do processo
  └── [3] Módulo de onboarding via DJEN

FASE 2 — Fechar gaps dos fluxos LEAN           (semanas 3–5)
  ├── [4] Encadeamento vara_exigente_documento
  ├── [5] Litigância de má-fé — alerta e encadeamento
  ├── [6] UI obrigação de fazer / SerasaJud
  └── [7] Acordo extrajudicial — flag procuração

FASE 3 — Add-ons PRO                           (sob demanda, prontos p/ vender)
  ├── [8]  PRO Recursos avançados
  │         ├── Embargos de declaração
  │         └── Decisão interlocutória (7 tipos)
  ├── [9]  PRO Workflows raros
  │         ├── Tutela antecipada / liminar
  │         ├── Autor falecido
  │         ├── Sobrestamento detalhado
  │         └── Desistência em 3 modalidades formais
  ├── [10] PRO Captação (parcerias com comissão)
  ├── [11] PRO Execução avançada (astreintes + SISBAJUD/BACENJUD)
  └── [12] PRO Justiça Comum PJE (Fluxos 1–3 PJE completos)
```

---

## FASE 1 — Core operacional imediato

---

### [1] Auto-criar processo ao receber comunicação órfã

**Prioridade:** Crítica — maior ROI imediato  
**Fluxos cobertos:** Fluxo 1 (entrada automática do processo via DJEN)  
**Estado atual:** `ingestFromCaptura` em `comunicacoes.service.ts` define `status = 'ORFA'` quando não encontra o processo no banco. O escritório precisa criar manualmente.

#### Backend — `comunicacoes.service.ts`

Modificar o método `ingestFromCaptura`. Quando `processoId === null` e o número de processo for válido (passar pela `normNumero`):

1. Extrair dados da publicação:
   - `numero` → de `item.numeroProcesso` / `numeroProcessoBruto`
   - `vara` → campo estruturado da API Comunica quando disponível
   - `clienteNome` → nome da parte autora (campo `nomeParteAutora` da API)
   - `sistema` → inferir por tribunal (`PROJUDI` para TJBA Projudi, `PJE_TJBA` para PJE TJBA)
2. Criar registro em `processo` com:
   - `faseAtual = 'AGUARDANDO_DISTRIBUICAO'`
   - `statusProcesso = 'ATIVO'`
   - `requerConferencia = true` (sinaliza criação automática)
   - `origemCriacao = 'DJEN_AUTO'` (novo campo)
3. Vincular a comunicação ao processo recém-criado (`status = 'LIDA'`)
4. Se `varasConfig` do escritório tiver `comprovantes_aceitos` para a vara → setar `alertaCrVara = true` (ver Item 2)
5. Registrar no audit log com `acao = 'AUTO_CRIADO_DJEN'`

**Regra:** só criar se `normNumero(numeroProcessoBruto)` retornar valor não nulo. Caso contrário, manter `ORFA`.

#### Backend — schema

Adicionar em `processo.ts`:
```typescript
origemCriacao: varchar('origem_criacao', { length: 20 })
  // valores: 'MANUAL' | 'PDF' | 'DJEN_AUTO' | 'ONBOARDING'
```

Migração:
```sql
ALTER TABLE processo ADD COLUMN IF NOT EXISTS origem_criacao varchar(20) DEFAULT 'MANUAL';
```

#### Frontend — grid de intimações

- Linha com `requerConferencia = true` + `origemCriacao = 'DJEN_AUTO'` → badge azul "Auto" ao lado do número do processo
- Ao abrir o modal e confirmar/editar qualquer campo → PATCH `{ requerConferencia: false }` para limpar o badge
- Tooltip: "Processo criado automaticamente pelo DJEN. Verifique e complete os dados."

#### Critério de aceite
- [x] Captura DJEN com processo inexistente → processo criado automaticamente
- [x] Badge "Auto" aparece na grid até confirmação manual
- [x] Comunicação vinculada ao processo (não fica ÓRFÃ)
- [x] Dados extraídos corretamente (número, vara, cliente quando disponível)
- [x] Processo sem número válido → continua ÓRFÃ (não cria processo vazio)

---

### [2] Alerta de CR na linha do processo em intimações

**Prioridade:** Alta — fecha o ciclo do `comprovante_residencia_tipo` já implementado  
**Fluxos cobertos:** Fluxo 1 (verificação vara × documento exigido)  
**Estado atual:** `comprovanteResidenciaTipo` existe no banco e no modal. `comprovantes_aceitos` existe por vara na `varasConfig`. Nenhum alerta visual na grid.

#### Backend — schema

Adicionar em `processo.ts`:
```typescript
alertaCrVara: boolean('alerta_cr_vara').notNull().default(false),
```

Migração:
```sql
ALTER TABLE processo ADD COLUMN IF NOT EXISTS alerta_cr_vara boolean NOT NULL DEFAULT false;
```

#### Backend — lógica de set/clear

**Set** (`comunicacoes.service.ts`): ao criar ou vincular processo (Item 1 ou comunicação normal), verificar:
```typescript
const varaConfig = escritorioConfig.varas_config?.[processo.vara ?? ''];
if (varaConfig?.comprovantes_aceitos?.length && !processo.comprovanteResidenciaTipo) {
  // Verifica se é a primeira comunicação do processo
  const totalComms = await countComunicacoesByProcesso(processoId);
  if (totalComms <= 1) {
    await db.update(processo).set({ alertaCrVara: true }).where(eq(processo.id, processoId));
  }
}
```

**Clear** (`processos.service.ts`): no método PATCH, quando `alertaCrVara: false` é enviado, limpar.  
Frontend deve enviar `PATCH { alertaCrVara: false }` ao abrir o modal.

#### Frontend — grid de intimações

- Linha com `alertaCrVara = true`: borda laranja à esquerda `border-l-4 border-orange-400`
- Ícone laranja `⚠` na coluna de vara ou status
- Tooltip: `"Esta vara exige tipo específico de comprovante de residência. Verifique no modal."`
- Ao montar o `ProcessoDetailPanel` com `alertaCrVara = true`: disparar PATCH para limpar (optimistic update)

#### Critério de aceite
- [x] Vara sem `comprovantes_aceitos` → nunca gera alerta
- [x] `comprovanteResidenciaTipo` já preenchido → não gera alerta
- [x] Borda laranja aparece na grid
- [x] Abre modal → alerta some imediatamente (optimistic) e persiste no banco

---

### [3] Módulo de onboarding via DJEN (bulk import)

**Prioridade:** Alta — bloqueador de venda do SaaS para novos escritórios  
**Estado atual:** Não existe. Novo escritório precisa cadastrar processos manualmente.

#### Backend — novo módulo `onboarding`

Arquivos a criar:
- `apps/api/src/onboarding/onboarding.module.ts`
- `apps/api/src/onboarding/onboarding.controller.ts`
- `apps/api/src/onboarding/onboarding.service.ts`
- `apps/api/src/onboarding/onboarding.processor.ts`

**Rota:** `POST /escritorios/:id/onboarding/djen`

```typescript
// Payload
{
  oab: string;        // ex: "66364"
  ufOab: string;      // ex: "BA"
  diasJanela: number; // 90 | 180 | 365 (default 365)
}
```

**Lógica do job (BullMQ — fila `onboarding`):**
1. Validar que não há job ativo para o escritório (máximo 1 simultâneo)
2. Buscar todas as publicações do período usando `ComunicaApiClient.consultarPorOabTodasPaginas`
   - Período: `hoje - diasJanela` até `hoje`
3. Para cada publicação, chamar `comunicacoes.service.ingestFromCaptura`
   - Com Item 1 implementado, isso já cria o processo automaticamente se não existir
   - A idempotência é garantida por `hashExterno` (já implementado)
4. Processos criados via onboarding recebem `origemCriacao = 'ONBOARDING'`
5. Ao final, salvar log no `captura_log` com `tipo = 'ONBOARDING'`
6. Retornar relatório: `{ processosNovos, comunicacoesNovas, jaExistiam, erros }`

**Rota de status:** `GET /escritorios/:id/onboarding/status`  
Retorna: `{ status: 'IDLE' | 'RUNNING' | 'DONE', progresso: { processado, total }, relatorio }`

#### Frontend — tela de Configurações

Adicionar seção "Importação inicial via DJEN" abaixo de VarasSection:

- Campo OAB (pré-preenchido com OAB do escritório se configurada)
- Campo UF (padrão "BA")
- Select janela: 90 dias / 180 dias / 365 dias (recomendado)
- Botão "Iniciar importação"
- Barra de progresso via polling do endpoint de status (a cada 3s enquanto `RUNNING`)
- Relatório final ao completar:
  ```
  ✅ Importação concluída
  • 312 processos criados
  • 847 comunicações vinculadas
  • 23 já existiam (ignorados)
  • 2 erros (ver log)
  ```

**Restrição:** desabilitar botão se já há job rodando.  
**Aviso:** exibir antes de iniciar — "Esta operação pode levar vários minutos. O sistema continuará funcionando normalmente."

#### Critério de aceite
- [x] Admin consegue acionar onboarding pela tela de configurações
- [x] Job roda assincronamente, exibe progresso
- [x] Processos criados aparecem em INTIMAÇÕES com badge "Auto"
- [x] Rodar novamente não duplica processos nem comunicações
- [x] Relatório final exibe totais corretos

---

## FASE 2 — Fechar gaps dos fluxos LEAN

---

### [4] Encadeamento `vara_exigente_documento`

**Prioridade:** Média-alta  
**Fluxos cobertos:** Fluxo 1 PROJUDI — quando vara tem exigência frequente de documentação, telemarketing é acionado preventivamente antes da audiência  
**Estado atual:** Campo `varaExigeDocFrequente` existe na tabela `processo`. O briefing V3 §12.4 descreve a cascata `vara_exigente_documento` mas não está no registry de encadeamentos.

#### Backend — `encadeamentos.types.ts`

Adicionar ao array `ENCADEAMENTO_EVENTOS`:
```typescript
'vara_exigente_documento'
```

#### Backend — `encadeamentos.registry.ts`

```typescript
vara_exigente_documento: [
  {
    tipo: 'SOLICITAR_DOC_CONFORME_VARA',
    dias: 5,
    responsavel: null,
    fila: 'ATENDIMENTO',
  },
],
```

A observação da pendência deve conter a vara e o tipo de documento exigido — injetar no momento da criação da pendência via `observacao` contextual.

#### Backend — `comunicacoes.service.ts`

Após criar ou vincular processo (primeira comunicação):
```typescript
if (processo.varaExigeDocFrequente) {
  const jaTemPendencia = await checkPendenciaAberta(processoId, 'SOLICITAR_DOC_CONFORME_VARA');
  if (!jaTemPendencia) {
    await this.encadeamentos.dispatch(escritorioId, 'vara_exigente_documento', { processoId });
  }
}
```

**Regra:** disparar APENAS se não houver já uma pendência desse tipo aberta para o processo (evitar duplicação em múltiplas publicações).

#### Critério de aceite
- [x] Processo com `varaExigeDocFrequente = true` → pendência "SOLICITAR_DOC_CONFORME_VARA" criada automaticamente para fila ATENDIMENTO
- [x] Segunda comunicação do mesmo processo → sem duplicação
- [x] Vara sem exigência → nenhuma pendência gerada

---

### [5] Litigância de má-fé — alerta visual e encadeamento

**Prioridade:** Média  
**Fluxos cobertos:** Fluxo 4 — sentença com litigância de má-fé exige monitoramento prioritário, risco de penhora/bloqueio de conta do cliente  
**Estado atual:** Campo `litiganciaMaFe` existe no banco. Badge aparece em IMPROCEDENTES. Sem alerta em INTIMAÇÕES e sem encadeamento.

#### Backend — `encadeamentos.types.ts`

Adicionar:
```typescript
'litigancia_ma_fe_detectada'
```

#### Backend — `encadeamentos.registry.ts`

```typescript
litigancia_ma_fe_detectada: [
  {
    tipo: 'MONITORAR_PROCESSO_MA_FE',
    dias: 15,
    responsavel: null,
    fila: 'ADV',
  },
  {
    tipo: 'CONTATO_URGENTE_CLIENTE_MA_FE',
    dias: 3,
    responsavel: null,
    fila: 'ATENDIMENTO',
  },
],
```

#### Backend — `processos.service.ts`

No método PATCH, quando `litiganciaMaFe` muda de `false` para `true`:
```typescript
if (dto.litiganciaMaFe === true && !processo.litiganciaMaFe) {
  await this.encadeamentos.dispatch(escritorioId, 'litigancia_ma_fe_detectada', { processoId });
}
```

#### Frontend — grid de intimações

- Linha com `litiganciaMaFe = true`: borda vermelha `border-l-4 border-red-500`
- Badge "MÁ-FÉ" vermelho compacto na linha
- Tooltip: "Processo com litigância de má-fé — monitoramento prioritário. Risco de penhora/bloqueio de conta do cliente."

#### Critério de aceite
- [x] Marcar `litiganciaMaFe = true` → 2 pendências criadas automaticamente (ADV + ATENDIMENTO)
- [x] Grid de INTIMAÇÕES destaca a linha com borda vermelha
- [x] Badge "MÁ-FÉ" visível

---

### [6] Confirmar e completar UI — Obrigação de fazer / SerasaJud

**Prioridade:** Média  
**Fluxos cobertos:** Fluxo 3 PROCEDENTE — obrigação de pagar (indenização) coexiste com obrigação de fazer (retirar negativação), conforme OBSERVAÇÃO PROCEDÊNCIA DA AÇÃO  
**Estado atual:** Backend **completamente implementado** — `temObrigacaoFazer`, `obrigacaoFazerDescricao`, `obrigacaoFazerCumprida`, `serasajudAcionado` existem em `processo_procedente`. Endpoint `POST /procedentes/:id/obrigacao-fazer` existe.

#### Verificação

Conferir se a aba PROCEDENTES (frontend) expõe os campos:

1. **Bloco "Obrigação de pagar"** (já deve existir — valor + status pagamento)
2. **Bloco "Obrigação de fazer"** (verificar se está visível):
   - Toggle `temObrigacaoFazer`
   - `obrigacaoFazerDescricao` (textarea, ex: "retirar negativação contrato XXX do Serasa")
   - Checkbox `obrigacaoFazerCumprida` + data de cumprimento
   - Checkbox `serasajudAcionado` (juiz determinou exclusão via SerasaJud)
   - Badge "Aguardando SerasaJud" quando `serasajudAcionado = true` e `obrigacaoFazerCumprida = false`

#### Gancho de captação (briefing V3 §11.3)

Ao marcar `obrigacaoFazerCumprida = true` (negativação retirada), verificar se existem outras negativações no histórico do cliente:
- Se `comprovanteResidenciaTipo` ou histórico de comunicações sugere outras negativações → criar pendência `VERIFICAR_NOVAS_NEGATIVACOES` (5d, fila ADV)
- Essa pendência leva ao fluxo de nova ação contra outra empresa (captação orgânica)

**Arquivo:** `apps/web/app/(app)/procedentes/` — verificar e complementar componentes existentes

#### Critério de aceite
- [x] UI de PROCEDENTES exibe bloco de obrigação de fazer
- [x] Toggle ativa/desativa os campos
- [x] Checkbox cumprida + data visíveis
- [x] Badge "Aguardando SerasaJud" aparece e some ao marcar cumprida
- [x] Pendência de verificação de novas negativações criada ao marcar cumprida

---

### [7] Acordo extrajudicial — flag de procuração solicitada

**Prioridade:** Média-baixa  
**Fluxos cobertos:** Fluxograma Alternativo — Acordo Extrajudicial e Expedição de Alvará  
**Estado atual:** Encadeamento `acordo_homologado` existe (cria pendência "VERIFICAR CUMPRIMENTO ACORDO"). Sentença tipo `ACORDO` dispara `dispatch('acordo_homologado')`. Gap: quando juiz solicita nova procuração ao homologar, não há fluxo automático para telemarketing.

#### Backend — `encadeamentos.types.ts`

Adicionar:
```typescript
'acordo_procuracao_solicitada'
```

#### Backend — `encadeamentos.registry.ts`

```typescript
acordo_procuracao_solicitada: [
  {
    tipo: 'SOLICITAR_NOVA_PROCURACAO',
    dias: 5,
    responsavel: null,
    fila: 'ATENDIMENTO',
  },
],
```

#### Frontend — pop-up de acordo / sentença

No pop-up pós-sentença quando `resultado = 'ACORDO'`, adicionar checkbox:
```
[ ] Juiz solicitou nova procuração para homologação
```

Se marcado → no submit, além de criar sentença, chamar endpoint para disparar encadeamento `acordo_procuracao_solicitada`.

**Arquivo:** `apps/web/components/popups/` — popup de sentença/acordo

#### Critério de aceite
- [x] Checkbox aparece apenas quando resultado = ACORDO
- [x] Se marcado → pendência "SOLICITAR_NOVA_PROCURACAO" criada para ATENDIMENTO
- [x] Se não marcado → comportamento atual mantido (só pendência de verificação de cumprimento)

---

## FASE 3 — Add-ons PRO

> Implementados e prontos para ativar por escritório via `escritorio.config.addons`. Cada add-on tem feature flag no backend que desabilita rotas e UI quando não contratado.

---

### [8] PRO Recursos avançados

**Para quem:** escritórios com volume alto de 2º grau e embargos.  
**Ativa:** `escritorio.config.addons.recursos_avancados = true`

---

#### [8.1] Embargos de declaração

**Contexto:** Lei 9.099/95 art. 48. Prazo 5 dias úteis. Interrompe (não suspende) o prazo do recurso nominado. Cabíveis tanto de decisão monocrática quanto colegiada.  
**Estado atual no LEAN:** quando adm registra embargos manualmente, vira observação em `processo.observacao_geral`. Sem workflow.

##### Backend — schema

Adicionar em `sentenca` (ou tabela separada `embargos_declaracao`):
```sql
-- Opção recomendada: nova tabela
CREATE TABLE embargos_declaracao (
  id UUID PRIMARY KEY,
  sentenca_id UUID NOT NULL REFERENCES sentenca(id),
  processo_id UUID NOT NULL REFERENCES processo(id),
  escritorio_id UUID NOT NULL REFERENCES escritorio(id),
  origem VARCHAR(10) NOT NULL CHECK (origem IN ('NOS', 'REU', 'AMBOS')),
  data_interposicao DATE NOT NULL,
  prazo_julgamento DATE,
  resultado VARCHAR(30) CHECK (resultado IN ('ACOLHIDOS', 'PARCIALMENTE_ACOLHIDOS', 'REJEITADOS', 'A_JULGAR')),
  data_julgamento DATE,
  observacoes TEXT,
  interrompe_prazo_recurso BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

##### Backend — encadeamentos

Adicionar evento `embargos_interpostos_por_nos`:
```typescript
embargos_interpostos_por_nos: [
  {
    tipo: 'ELABORAR_EMBARGOS_DECLARACAO',
    dias: 5,
    responsavel: null,
    fila: 'ADV',
  },
],
```

##### Frontend — pop-up de embargos (novo componente `PopUpEmbargosDeclaracao`)

Campos:
1. **Origem:** NÓS / RÉU / AMBOS
2. **Data de interposição** (obrigatório)
3. **Resultado** (preenchido depois): ACOLHIDOS / PARCIALMENTE ACOLHIDOS / REJEITADOS
4. **Observações**

**Efeitos ao confirmar:**
- `embargos_interpostos_por_nos` → cria pendência `ELABORAR_EMBARGOS_DECLARACAO` (5d, ADV)
- Processo ganha flag visual "ED" na grid de RECURSOS
- Fase → `AGUARDANDO_DECISAO_EMBARGOS_DEC`
- Prazo do recurso nominado é **interrompido** (não conta dias enquanto ED pendente); reinicia integralmente após julgamento

**Resultado dos embargos:**
- `ACOLHIDOS` → sentença é modificada; fase volta para revisão do resultado
- `PARCIALMENTE_ACOLHIDOS` → sentença parcialmente alterada; adv decide se prossegue com recurso
- `REJEITADOS` → prazo do recurso reinicia integralmente a partir do julgamento

##### Mapa Comunica — novos tipos (add-on PRO)

| Tipo | Ação |
|---|---|
| `EMBARGOS_JULGADOS` | Classifica resultado; reinicia prazo do recurso nominado |

#### Critério de aceite [8.1]
- [x] Pop-up de embargos funciona para interposição por nós e pelo réu
- [x] Flag "ED" aparece na grid de RECURSOS
- [x] Prazo do recurso nominado é pausado e reiniciado corretamente
- [x] Resultado do julgamento atualiza a sentença base

---

#### [8.2] Decisão interlocutória (7 tipos + cascatas)

**Contexto:** No LEAN, decisão interlocutória cai em `OUTRO` no Comunica e vai para fila de classificação manual. O PRO tem pop-up dedicado com 7 tipos e cascatas automáticas por tipo.

##### Frontend — pop-up `PopUpDecisaoInterlocutoria`

7 tipos de decisão interlocutória (dropdown rígido):

| Tipo | Significado | Ação automática |
|---|---|---|
| `TUTELA_DEFERIDA` | Tutela antecipada ou cautelar deferida | Cria pendência `MONITORAR_TUTELA` (30d, ADV) + notificação alta prioridade |
| `TUTELA_INDEFERIDA` | Tutela negada | Cria pendência `AVALIAR_AGRAVO_INSTRUMENTO` (5d, ADV) |
| `EMENDA_INICIAL` | Juiz pediu complementação da petição | Cria pendência `EMENDAR_INICIAL` (10d, ADV) |
| `JUNTADA_DOCUMENTOS` | Juiz exigiu documentação adicional | Cria pendência `JUNTAR_DOCUMENTOS` (5d, ADV) + pendência solicitação ao cliente (3d, ATENDIMENTO) |
| `CITACAO_REALIZADA` | Réu citado — prazo de contestação em curso | Fase → `AGUARDANDO_CONTESTACAO`; pendência `ACOMPANHAR_CONTESTACAO` (15d, ADV) |
| `SANEAMENTO` | Despacho de saneamento — fase probatória | Fase → `EM_SANEAMENTO`; pendência `RESPONDER_SANEAMENTO` (15d, ADV) |
| `OUTRO_INTERLOCUTORIO` | Decisão interlocutória genérica | Pendência `ANALISAR_DECISAO_INTERLOCUTORIA` (5d, ADV) |

**Disparado quando:** Comunica classifica comunicação como `DECISAO_INTERLOCUTORIA` (novo tipo no mapa do PRO).

**Campos do pop-up:**
1. Tipo de decisão (dropdown 7 tipos)
2. Conteúdo resumido da decisão (textarea)
3. Prazo de cumprimento (se aplicável)
4. Observações

#### Critério de aceite [8.2]
- [x] Tipo `DECISAO_INTERLOCUTORIA` no Comunica → pop-up aparece
- [x] Cada tipo gera a cascata correta
- [x] Tipo `TUTELA_DEFERIDA` → notificação alta prioridade + pendência de monitoramento
- [x] Tipo `CITACAO_REALIZADA` → fase muda para `AGUARDANDO_CONTESTACAO`

---

### [9] PRO Workflows raros

**Para quem:** escritórios com casos sofisticados (autor falecido, tutela antecipada, sobrestamentos formais).  
**Ativa:** `escritorio.config.addons.workflows_raros = true`

---

#### [9.1] Tutela antecipada / liminar

**Contexto:** Pedido de tutela antecipada ou liminar no início do processo. Relevante para PJE (mas também ocorre no Juizado em casos específicos). Requer monitoramento periódico do cumprimento.

##### Backend — schema

```sql
CREATE TABLE tutela_antecipada (
  id UUID PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES processo(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL REFERENCES escritorio(id),
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('TUTELA_ANTECIPADA', 'TUTELA_CAUTELAR', 'LIMINAR')),
  pedido_em DATE NOT NULL,
  resultado VARCHAR(20) CHECK (resultado IN ('DEFERIDA', 'INDEFERIDA', 'PARCIALMENTE_DEFERIDA', 'REVOGADA', 'PENDENTE')),
  data_resultado DATE,
  prazo_cumprimento DATE,
  cumprida BOOLEAN DEFAULT false,
  cumprida_em DATE,
  descricao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

##### Backend — encadeamentos

```typescript
tutela_deferida: [
  { tipo: 'MONITORAR_CUMPRIMENTO_TUTELA', dias: 10, fila: 'ADV' },
  { tipo: 'VERIFICAR_CUMPRIMENTO_TUTELA', dias: 30, fila: 'ADV' },
],
tutela_indeferida: [
  { tipo: 'AVALIAR_AGRAVO_INSTRUMENTO', dias: 5, fila: 'ADV' },
],
```

##### Frontend

- Seção "Tutela/Liminar" no drawer do processo (visível só com add-on ativo)
- Status visual: deferida (verde) / indeferida (vermelho) / pendente (amarelo) / revogada (cinza)
- Job `job_revisar_tutelas`: semanal — lista tutelas com `cumprida = false` e `prazo_cumprimento < hoje + 7d` → alerta ADV

#### Critério de aceite [9.1]
- [x] Seção de tutela aparece no drawer quando add-on ativo
- [x] Tutela deferida → pendências de monitoramento criadas
- [x] Tutela indeferida → pendência de avaliar agravo
- [x] Job semanal alerta tutelas vencendo

---

#### [9.2] Autor falecido

**Contexto:** Cliente falece durante o processo. Processo fica sobrestado até herdeiros se habilitarem. Requer tabela própria para sucessores e workflow de habilitação.

##### Backend — schema

```sql
CREATE TABLE processo_sucessor (
  id UUID PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES processo(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL,
  nome VARCHAR(300) NOT NULL,
  cpf VARCHAR(14),
  parentesco VARCHAR(50),          -- filho, cônjuge, genitor, etc.
  habilitado BOOLEAN DEFAULT false,
  habilitado_em DATE,
  documentos_recebidos JSONB DEFAULT '[]',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

##### Backend — fluxo

1. Adv registra "autor falecido" via modal no drawer:
   - Data do óbito
   - Cadastra sucessores (N herdeiros)
   - `processo.statusProcesso = 'SOBRESTADO'`
   - `processo.sobrestamentoMotivo = 'AUTOR_FALECIDO em <data>'`
2. Cria pendências por herdeiro:
   - `SOLICITAR_DOCUMENTOS_SUCESSOR` (30d, ATENDIMENTO) para cada herdeiro não habilitado
3. Quando todos os herdeiros forem habilitados:
   - `processo.statusProcesso = 'ATIVO'`
   - `processo.clienteNome` atualizado para o sucessor principal
   - Fase recalculada via `estado_natural()`

##### Frontend

- Seção "Sucessores" no drawer (visível só com add-on ativo)
- Lista de herdeiros com status de habilitação
- Botão "+ Adicionar herdeiro"
- Badge "FALECIDO" na grid de INTIMAÇÕES quando `processo.sobrestamentoMotivo` contém `AUTOR_FALECIDO`

#### Critério de aceite [9.2]
- [x] Modal de registro de óbito funciona
- [x] Múltiplos herdeiros podem ser cadastrados
- [x] Pendências criadas por herdeiro para ATENDIMENTO
- [x] Todos habilitados → processo volta para ATIVO automaticamente
- [x] Badge "FALECIDO" visível na grid

---

#### [9.3] Sobrestamento detalhado (6 motivos + revisão semestral)

**Contexto:** No LEAN, sobrestamento é texto livre. O PRO tem dropdown rígido de 6 motivos, pop-up dedicado e job de revisão semestral automática.

##### Backend — novos campos em `processo`

```sql
ALTER TABLE processo
  ADD COLUMN sobrestamento_motivo_codigo varchar(40)
    CHECK (sobrestamento_motivo_codigo IS NULL OR sobrestamento_motivo_codigo IN (
      'IRDR_IAC_STJ',
      'IRDR_IAC_TJBA',
      'ACORDO_EXTRAJUDICIAL_NEGOCIACAO',
      'PREJUDICIAL_EXTERNA',
      'INDEFERIMENTO_INICIAL_RECURSO',
      'OUTRO'
    )),
  ADD COLUMN sobrestamento_tema_afetado varchar(100),  -- número do tema/incidente
  ADD COLUMN sobrestamento_previsao_retorno date,
  ADD COLUMN sobrestamento_revisado_em date;
```

##### Frontend — pop-up `PopUpSobrestamento`

```
┌─ Sobrestar processo ─────────────────────────┐
│  Motivo:      [ dropdown 6 opções ]           │
│  Tema/Nº:     [ texto ] (se IRDR/IAC)         │
│  Previsão:    [ data ] (opcional)             │
│  Observações: [ texto livre ]                 │
│  [ Cancelar ]   [ Confirmar ]                 │
└──────────────────────────────────────────────┘
```

Ao confirmar sobrestamento:
1. `statusProcesso = 'SOBRESTADO'`
2. Pendências abertas movidas para `pendencia_problema` com `resultado = 'SUSPENSA_SOBRESTAMENTO'`
3. Cria pendência `REVISAR_SOBRESTAMENTO` (180d, ADV)

##### Backend — job `job_revisar_sobrestados`

- Roda dia 1 de cada mês, 09:00
- Lista processos `status_processo = 'SOBRESTADO'` há mais de 6 meses sem `sobrestamento_revisado_em`
- Cria notificação para ADV: "Processo sobrestado há X meses — revisar situação"
- Card "Sobrestados a revisar" no DASH_GERAL

#### Critério de aceite [9.3]
- [x] Pop-up com 6 motivos substituindo o modal simples atual
- [x] Pendências suspensas ao sobrestar
- [x] Job mensal de revisão semestral dispara alertas
- [x] Card no dashboard conta sobrestados vencidos

---

#### [9.4] Desistência em 3 modalidades formais

**Contexto:** No LEAN, desistência é uma das `extincao_modalidade` no pop-up de extinção. O PRO tem 3 modalidades formais com regras distintas e confirmação extra.

As 3 modalidades (já parcialmente na tabela `sentenca.extincao_modalidade`):

| Modalidade | Regime jurídico | Reversibilidade | Ação no sistema |
|---|---|---|---|
| `DESISTENCIA_SEM_ONUS` | CPC art. 485 VIII | Pode reajuizar | Extinção sem custas; análise de reprotocolo |
| `DESISTENCIA_COM_ONUS` | CPC art. 90 caput | Pode reajuizar; mas paga custas | Extinção com custas; fluxo DAJE |
| `RENUNCIA_DIREITO` | CPC art. 487 III-c | **IRREVERSÍVEL** — coisa julgada material | Extinção com mérito; sem recurso; sem reprotocolo |

##### Frontend — melhoria no pop-up de extinção

Para `DESISTENCIA_SEM_ONUS` e `DESISTENCIA_COM_ONUS`:
- Modal padrão de extinção

Para `RENUNCIA_DIREITO`:
- Adicionar confirmação extra em 2 etapas:
  1. Checkbox: `[ ] Confirmo que o cliente foi orientado sobre a IRREVERSIBILIDADE desta renúncia`
  2. Botão: "Confirmar renúncia irreversível" em vermelho

**Badge na grid:** processo com `extincao_modalidade = 'RENUNCIA_DIREITO'` exibe badge vermelho "RENÚNCIA" na coluna de status.

#### Critério de aceite [9.4]
- [x] 3 modalidades claramente distintas no pop-up
- [x] Confirmação dupla para renúncia de direito
- [x] Badge vermelho "RENÚNCIA" na grid
- [x] Renúncia não abre análise de reprotocolo (fluxo diferente das demais extinções)

---

### [10] PRO Captação

**Para quem:** escritórios com captadores externos (parceiros) recebendo comissão.  
**Ativa:** `escritorio.config.addons.captacao = true`

**Estado atual no LEAN:** campo texto livre `processo.parceiro_escritorio` (sem comissão, sem cor, sem regra automática).

#### Backend — nova tabela `parceiro`

```sql
CREATE TABLE parceiro (
  id UUID PRIMARY KEY,
  escritorio_id UUID NOT NULL REFERENCES escritorio(id),
  nome VARCHAR(200) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('PF', 'ESCRITORIO')),
  cpf_cnpj VARCHAR(18),
  comissao_percentual NUMERIC(5,2),   -- ex: 30.00 para 30%
  cor_hex VARCHAR(7),                  -- ex: '#3B82F6' para azul
  ativo BOOLEAN DEFAULT true,
  UNIQUE (escritorio_id, nome)
);

-- Mapeamento automático: matéria → parceiro padrão
CREATE TABLE parceiro_materia (
  id UUID PRIMARY KEY,
  escritorio_id UUID NOT NULL REFERENCES escritorio(id),
  parceiro_id UUID NOT NULL REFERENCES parceiro(id),
  materia VARCHAR(100) NOT NULL,
  UNIQUE (escritorio_id, materia)
);
```

Alterar `processo` para usar FK:
```sql
ALTER TABLE processo
  ADD COLUMN parceiro_id UUID REFERENCES parceiro(id),
  ADD COLUMN comissao_calculada NUMERIC(12,2),
  ADD COLUMN comissao_paga BOOLEAN DEFAULT false,
  ADD COLUMN comissao_paga_em DATE;
```

#### Backend — lógica automática

Na importação de PDF e no `ingestFromCaptura`:
1. Se `processo.materia` tem mapeamento em `parceiro_materia` → auto-preencher `parceiro_id`
2. Se `processo.observacao_geral` contém padrão "Parceria <nome>" → fuzzy match com `parceiro.nome` e auto-preencher

Na aba PROCEDENTES, ao marcar `data_recebimento`:
- Calcular `comissao_calculada = sentenca.valor * parceiro.comissao_percentual / 100`
- Criar pendência `PAGAR_COMISSAO_PARCEIRO` (30d, fila FINANCEIRO)

#### Frontend

- Cor de fundo da linha em INTIMAÇÕES baseada em `parceiro.cor_hex` (tons suaves)
- Coluna "Parceiro" na grid com nome e cor
- Seção "Parceiros" nas Configurações — CRUD completo + mapeamento matéria→parceiro
- Filtro "Por parceiro" em INTIMAÇÕES e DASHBOARDS
- Dashboard de comissões: total pago, a pagar, por parceiro

#### Indicadores habilitados (M2 financeiro)

- Top parceiros por volume
- Taxa de procedência por parceiro
- Comissão total por parceiro (mensal/anual)
- Forecast de comissões baseado em procedentes em andamento

#### Critério de aceite [10]
- [x] CRUD de parceiros nas configurações
- [x] Mapeamento matéria→parceiro automático na importação
- [x] Cor da linha em INTIMAÇÕES por parceiro
- [x] Comissão calculada ao registrar recebimento
- [x] Pendência de pagamento de comissão criada automaticamente
- [x] Dashboard de comissões

---

### [11] PRO Execução avançada

**Para quem:** escritórios com volume alto de execução (SISBAJUD, penhoras, astreintes).  
**Ativa:** `escritorio.config.addons.execucao_avancada = true`

---

#### [11.1] Astreintes detalhada (multa cominatória diária)

**Contexto:** No LEAN, astreintes é anotada em `processo_procedente.observacoes_execucao` (texto livre). O PRO tem campos próprios e job de atualização diária.

##### Backend — novos campos em `processo_procedente`

```sql
ALTER TABLE processo_procedente
  ADD COLUMN astreintes_ativa BOOLEAN DEFAULT false,
  ADD COLUMN astreintes_valor_diario NUMERIC(12,2),
  ADD COLUMN astreintes_data_inicio DATE,
  ADD COLUMN astreintes_total_acumulado NUMERIC(14,2),
  ADD COLUMN astreintes_ultima_atualizacao DATE,
  ADD COLUMN astreintes_teto NUMERIC(14,2),        -- valor máximo se fixado pelo juiz
  ADD COLUMN astreintes_suspensa_em DATE,
  ADD COLUMN astreintes_paga_em DATE;
```

##### Backend — job `job_atualizar_astreintes`

- Roda diariamente às 06:00
- Para cada `processo_procedente` com `astreintes_ativa = true`:
  ```
  dias = hoje - astreintes_data_inicio
  total = dias * astreintes_valor_diario
  se teto definido: total = min(total, astreintes_teto)
  UPDATE astreintes_total_acumulado = total, astreintes_ultima_atualizacao = hoje
  ```
- Cria alerta quando `total > teto * 0.8` (aviso de teto próximo)

##### Frontend

- Seção "Astreintes" no drawer de PROCEDENTES (visível só com add-on ativo)
- Campo valor diário + data início + teto (opcional)
- Contador em tempo real: "R$ X.XXX,XX acumulado (N dias)"
- Badge vermelho "ASTREINTES" na grid quando `astreintes_ativa = true`

#### [11.2] SISBAJUD vs BACENJUD distintos

**Contexto:** No LEAN, penhora é texto livre em `penhora_origem`. O PRO distingue os dois sistemas com campos e fluxos separados.

##### Backend — novos campos em `processo_procedente`

```sql
ALTER TABLE processo_procedente
  ADD COLUMN penhora_sistema VARCHAR(20) CHECK (penhora_sistema IN ('SISBAJUD', 'BACENJUD', 'CARTA', 'OUTRO')),
  ADD COLUMN sisbajud_numero_ordem VARCHAR(50),     -- número do pedido no SISBAJUD
  ADD COLUMN sisbajud_data_bloqueio DATE,
  ADD COLUMN sisbajud_valor_bloqueado NUMERIC(12,2),
  ADD COLUMN bacenjud_data_oficio DATE,
  ADD COLUMN bacenjud_banco_alvo VARCHAR(100);
```

##### Frontend

- Dropdown "Sistema de penhora" na seção de execução: SISBAJUD / BACENJUD / Carta / Outro
- Campos específicos por sistema aparecem condicionalmente
- SISBAJUD: número da ordem + data bloqueio + valor bloqueado
- BACENJUD: data do ofício + banco alvo

#### Critério de aceite [11]
- [x] Campos de astreintes separados do texto livre
- [x] Job diário atualiza o total acumulado
- [x] Badge "ASTREINTES" na grid
- [x] Dropdown de sistema de penhora com campos condicionais
- [x] Número da ordem SISBAJUD registrável

---

### [12] PRO Justiça Comum PJE — Fluxos 1–3 PJE completos

**Para quem:** escritórios que atuam também na Justiça Comum (não só Juizado Especial).  
**Ativa:** `escritorio.config.addons.justica_comum_pje = true`

Este é o add-on de maior escopo. Substitui o fluxo Juizado por PJE para processos marcados com `sistema IN ('PJE_TJBA', 'PJE_FED')`.

---

#### [12.1] Fluxo 1 PJE — Protocolo até citação/contestação

**Novas fases** adicionadas ao `mapa_tipo_para_fase` e à matriz de transições:

```
AGUARDANDO_CITACAO_REU
AGUARDANDO_CONTESTACAO
AGUARDANDO_REPLICA
AGUARDANDO_SANEAMENTO
EM_PRODUCAO_PROBATORIA
AGUARDANDO_ENCERRAMENTO_INSTRUCAO
```

**Novos tipos de comunicação Comunica** (mapeados no add-on):

| Tipo | Ação |
|---|---|
| `CITACAO_REALIZADA` | Fase → `AGUARDANDO_CONTESTACAO`; pendência `ACOMPANHAR_CONTESTACAO` (15d, ADV) |
| `CONTESTACAO_JUNTADA` | Fase → `AGUARDANDO_REPLICA`; pendência `ELABORAR_REPLICA` (15d, ADV) |
| `SANEAMENTO_PUBLICADO` | Fase → `AGUARDANDO_SANEAMENTO`; pendência `RESPONDER_SANEAMENTO` (15d, ADV) |
| `AUDIENCIA_INSTRUCAO_DESIGNADA` | Fase → `AGUARDANDO_AUDIENCIA_INSTRUCAO`; cria linha em `audiencia` tipo `INSTRUCAO` |

**Pop-up pós-réplica:**
- Decisão: há provas a produzir? SIM / NÃO
- SIM → fase → `EM_PRODUCAO_PROBATORIA`; selecionar tipos: perícia / quesitos / assistente técnico / contadoria judicial / prova documental / audiência de instrução
- NÃO → fase → `AGUARDANDO_SENTENCA`

---

#### [12.2] Produção probatória — sub-estados

Nova tabela `processo_producao_probatoria`:
```sql
CREATE TABLE processo_producao_probatoria (
  id UUID PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES processo(id),
  escritorio_id UUID NOT NULL,
  tipo VARCHAR(40) NOT NULL CHECK (tipo IN (
    'PERICIA', 'QUESITOS', 'ASSISTENTE_TECNICO',
    'CONTADORIA_JUDICIAL', 'PROVA_DOCUMENTAL', 'AUDIENCIA_INSTRUCAO'
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'AGUARDANDO',
  data_designacao DATE,
  data_conclusao DATE,
  perito_nome VARCHAR(200),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

#### [12.3] Fluxo 2 PJE — Sentença → Apelação

**Novas fases:**
```
AGUARDANDO_PRAZO_APELACAO        -- 15 dias úteis
EM_ELABORACAO_APELACAO
AGUARDANDO_CONTRARRAZOES_APELACAO
AGUARDANDO_JULGAMENTO_TRIBUNAL
AGUARDANDO_REMESSA_NECESSARIA    -- quando obrigatória contra órgão público
```

**Pop-up pós-sentença PJE:**
- Idêntico ao pop-up do Juizado, mas prazo de recurso = **15 dias úteis** (não 10)
- Adicionar opção "Remessa necessária" quando `processo.reuOrgaoPublico = true`

**Apelação vs recurso nominado:**
- Juizado: recurso nominado, 10d, turma recursal
- PJE: apelação, 15d, tribunal (TRT/TJBA/TRF)

---

#### [12.4] Fluxo 3 PJE — Execução contra órgão público (RPV e Precatório)

**Contexto:** Quando réu é órgão público (`processo.reuOrgaoPublico = true`), pagamento segue regime especial: RPV (até 60 salários mínimos) ou Precatório (acima).

**Novas fases:**
```
AGUARDANDO_EXPEDICAO_RPV
AGUARDANDO_EXPEDICAO_PRECATORIO
AGUARDANDO_PAGAMENTO_RPV
AGUARDANDO_PAGAMENTO_PRECATORIO
```

**Campos em `processo_procedente`:**
```sql
ALTER TABLE processo_procedente
  ADD COLUMN execucao_contra_orgao_publico BOOLEAN DEFAULT false,
  ADD COLUMN modalidade_execucao_pub VARCHAR(20) CHECK (modalidade_execucao_pub IN ('RPV', 'PRECATORIO')),
  ADD COLUMN numero_rpv VARCHAR(50),
  ADD COLUMN numero_precatorio VARCHAR(50),
  ADD COLUMN previsao_pagamento_pub DATE;
```

**Lógica de classificação automática:**
- `sentenca.valor <= 60 * salario_minimo` → `modalidade_execucao_pub = 'RPV'`
- Acima → `modalidade_execucao_pub = 'PRECATORIO'`
- Salário mínimo configurável em `escritorio.config.salario_minimo_atual`

#### Indicadores habilitados pelo add-on PJE

- Tempo médio distribuição → sentença por sistema (Juizado vs PJE)
- Taxa de procedência PJE vs Juizado por matéria
- Volume de RPV vs Precatório em aberto
- Forecast de recebimento por modalidade de execução pública

#### Critério de aceite [12]
- [x] Processos PJE têm fases distintas dos processos do Juizado
- [x] Fluxo citação → contestação → réplica → saneamento navegável
- [x] Sub-estados de produção probatória registráveis
- [x] Apelação com prazo 15d (não 10d)
- [x] Execução contra órgão público → RPV vs Precatório
- [ ] Indicadores separados por sistema judicial

---

## RESUMO: cobertura dos fluxos após implementação completa

| Fluxo | Fase 1+2 | Fase 3 (PRO) |
|---|---|---|
| **Fluxo 1 — Protocolo → Audiência (Juizado)** | ✅ Completo | — |
| **Fluxo 1 — PJE / Justiça Comum** | ⚠️ Básico (importação) | ✅ PRO [12] |
| **Fluxo 2 — Concluso → Sentença → Recurso (Juizado)** | ✅ Completo | ✅ Embargos PRO [8.1] |
| **Fluxo 2 — Apelação PJE** | ⚠️ Básico | ✅ PRO [12.3] |
| **Fluxo 3 — Procedente → Cumprimento** | ✅ Completo após [6] | ✅ Astreintes PRO [11.1] |
| **Fluxo 3 — Execução órgão público (RPV/Precatório)** | ⚠️ Básico | ✅ PRO [12.4] |
| **Fluxo 4 — Improcedente** | ✅ Completo após [5] | — |
| **Fluxo Complementar — Acordo extrajudicial** | ✅ Completo após [7] | — |
| **Fluxo Complementar — Reprotocolo** | ✅ Já implementado | — |
| **Fluxo Complementar — Custas/DAJE** | ✅ Já implementado | — |
| **Fluxo Complementar — Múltiplas demandas CPF** | ✅ Indicadores | — |
| **Fluxo Complementar — Tutela antecipada** | ⚠️ Texto livre | ✅ PRO [9.1] |
| **Fluxo Complementar — Autor falecido** | ⚠️ Texto livre | ✅ PRO [9.2] |

---

## CAMPOS NOVOS NO BANCO (consolidado)

| Campo | Tabela | Tipo | Item |
|---|---|---|---|
| `alerta_cr_vara` | `processo` | `boolean default false` | [2] |
| `origem_criacao` | `processo` | `varchar(20)` | [1] + [3] |
| `embargos_declaracao` | nova tabela | — | [8.1] |
| `tutela_antecipada` | nova tabela | — | [9.1] |
| `processo_sucessor` | nova tabela | — | [9.2] |
| `sobrestamento_motivo_codigo` + extras | `processo` | `varchar(40)` | [9.3] |
| `parceiro` + `parceiro_materia` | novas tabelas | — | [10] |
| `parceiro_id`, `comissao_calculada`, `comissao_paga` | `processo` | FK + numeric + bool | [10] |
| `astreintes_*` (6 campos) | `processo_procedente` | numeric + date + bool | [11.1] |
| `penhora_sistema` + SISBAJUD/BACENJUD | `processo_procedente` | varchar + extras | [11.2] |
| `execucao_contra_orgao_publico` + RPV/Precatório | `processo_procedente` | bool + varchar | [12.4] |
| `processo_producao_probatoria` | nova tabela | — | [12.2] |

---

## ORDEM DE EXECUÇÃO SUGERIDA

```
Semana 1:
  [1] Auto-criar processo de comunicação órfã
  [2] Alerta de CR na linha do processo

Semana 2:
  [3] Onboarding via DJEN (backend + UI básica)

Semana 3:
  [4] Encadeamento vara_exigente_documento
  [5] Litigância de má-fé — alerta e encadeamento

Semana 4:
  [6] Verificar e completar UI obrigação de fazer / SerasaJud
  [7] Acordo extrajudicial — checkbox procuração

A partir da Semana 5 (sob demanda por escritório-cliente):
  [8]  PRO Recursos avançados   → ativar quando escritório pede
  [9]  PRO Workflows raros      → ativar quando escritório tem casos complexos
  [10] PRO Captação             → ativar quando escritório tem parceiros com comissão
  [11] PRO Execução avançada    → ativar quando escritório tem volume alto de execução
  [12] PRO Justiça Comum PJE    → ativar quando escritório atende PJE
```
