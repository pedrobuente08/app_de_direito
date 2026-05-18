# PLANO — Revisão PDF e Consistência de Nomes

**Objetivo:** (1) corrigir inconsistência de nomes entre grid, modal e UI de revisão; (2) alterar o fluxo de upload de PDF para que TODOS os arquivos passem pela tela de revisão semafórica antes de serem inseridos — inclusive PDFs VERDE de alta confiança.

---

## Parte 1 — Consistência de Nomes (Grid × Modal × Revisão)

### 1.1 — Problema identificado

| Contexto | Label visível | Campo no banco |
|---|---|---|
| `processos-grid.tsx` coluna | **"Situação"** | `faseAtual` |
| `processo-modal.tsx` seção Controle | **"Fase"** | `faseAtual` |
| `processo-modal.tsx` seção Controle | **"Situação final"** | `situacaoFinal` |

O campo `faseAtual` aparece como "Situação" na grid e como "Fase" no modal. Isso confunde o usuário — o mesmo campo tem dois nomes distintos na mesma tela.

### 1.2 — Decisão de nomenclatura

Adotar **"Fase"** como label canônico para `faseAtual` em toda a aplicação.  
Manter **"Situação final"** como label de `situacaoFinal` (campo diferente — sem conflito).

### 1.3 — Mapa completo de labels (referência definitiva)

| Campo (`Processo`) | Label canônico na UI |
|---|---|
| `numero` | Nº Processo |
| `clienteNome` | Cliente |
| `clienteCpf` | CPF |
| `reuTexto` | Réu |
| `vara` | Vara |
| `materia` | Matéria |
| `sistema` | Sistema |
| `login` | Login |
| `dataDistribuicao` | Data de distribuição |
| `dataAudiencia` | Data da audiência |
| `horaAudiencia` | Hora da audiência |
| `tipoAudiencia` | Tipo de audiência |
| `faseAtual` | **Fase** |
| `statusProcesso` | Status do processo |
| `qualidadeCaso` | Qualidade do caso |
| `situacaoFinal` | Situação final |
| `justicaGratuita` | Justiça gratuita |
| `telefone` | Telefone |
| `statusAudiencia` | Status da audiência |
| `requerConferencia` | Requer conferência |
| `ultimaMovimentacaoDt` | Últ. movimentação |
| `ultimaMovimentacaoTipo` | Tipo da movimentação |

### 1.4 — Arquivos a alterar

**`apps/web/app/(app)/intimacoes/_components/processos-grid.tsx`**
- Coluna `faseAtual`: trocar header de `"Situação"` → `"Fase"`
- Verificar se há outras colunas com label divergente do mapa acima

**`apps/web/app/(app)/intimacoes/_components/processo-modal.tsx`**
- Já usa "Fase" para `faseAtual` — nenhuma alteração necessária
- Confirmar que "Situação final" aponta para `situacaoFinal` (correto)

**`apps/web/components/importacao/semaforo-importacao.tsx`** (componente a construir — Parte 2)
- Usar o mapa canônico acima nas colunas e no modal de edição inline

---

## Parte 2 — Novo Fluxo de PDF: Sempre via Revisão

### 2.1 — Decisão

**Antes:** confiança ≥ 0.6 → inserção automática; confiança < 0.6 → vai para revisões (`extracoes_pendentes`).  
**Depois:** **100% dos PDFs** (qualquer confiança, qualquer cor semafórica) → tela de revisão → usuário confirma → inserção.  
Nenhum processo é inserido sem clique explícito de confirmação.

### 2.2 — Arquitetura do novo fluxo

```
                   ┌─────────────────────────────────────────┐
                   │            UPLOAD DE PDF(s)             │
                   └────────────────┬────────────────────────┘
                                    │
              ┌─────────────────────┴────────────────────────┐
              │  1 arquivo                             N arquivos
              │  (Intimações)                          (Importação)
              ▼                                              ▼
  POST /processos/preview-pdf-batch          POST /processos/preview-pdf-batch
     (array de 1 elemento)                     (array de N elementos, max 30)
              │                                              │
              ▼                                              ▼
   Modal de Revisão (1 item)               Tabela Semafórica (N itens)
   - campos editáveis                      - linha por PDF, cor semafórica
   - cor semafórica                        - edição inline por linha
   - botão Confirmar / Descartar           - seleção múltipla
              │                            - botão Confirmar selecionados
              ▼                                              │
   POST /processos/confirmar-batch ◄───────────────────────┘
              │
              ▼
         Processo(s) inserido(s)
```

### 2.3 — O que JÁ está implementado (não alterar)

| Camada | O que existe | Arquivo |
|---|---|---|
| API | `POST /processos/preview-pdf-batch` (chunks de 5 arquivos) | `processos.controller.ts:126` |
| API | `POST /processos/confirmar-batch` (anti-dup, inserção) | `processos.controller.ts:148` |
| Frontend util | `previewPdfBatch(files: File[]): Promise<PdfPreviewItem[]>` | `lib/api.ts:202` |
| Frontend util | `confirmarBatchPdf(items): Promise<ConfirmarBatchResult>` | `lib/api.ts:219` |
| Tipos | `PdfPreviewItem`, `PdfSemaforoCor`, `ConfirmarBatchItem`, `ConfirmarBatchResult` | `lib/types.ts` |

> **Nota:** O backend `tratarResultadoSkill()` ainda insere automaticamente PDFs com confiança ≥ 0.6 quando chamado via rota antiga `/upload-pdf`. Essa rota deve ser **removida do frontend** — o frontend deve usar APENAS `preview-pdf-batch` + `confirmar-batch`. A rota no backend pode permanecer por compatibilidade, mas o frontend nunca a chama.

### 2.4 — O que precisa ser construído

#### Passo 1 — Corrigir nomenclatura (Parte 1.4 acima)

#### Passo 2 — Modal de revisão para 1 PDF (Intimações)

**Arquivo:** `apps/web/app/(app)/intimacoes/_components/pdf-revisao-modal.tsx` (novo)

Comportamento:
1. Usuário clica em "Enviar PDF" → seleciona arquivo → frontend chama `previewPdfBatch([file])`
2. Enquanto aguarda: spinner no botão
3. Retorno: array com 1 `PdfPreviewItem`
4. Modal abre com os campos preenchidos (editáveis) e badge de cor semafórica (VERDE/AMARELO/VERMELHO)
5. Alertas do item (`alertas[]`) exibidos abaixo dos campos se houver
6. Botão **"Confirmar inserção"**: chama `confirmarBatchPdf([itemEditado])` → fecha modal → toast sucesso → refresh da lista
7. Botão **"Descartar"**: fecha modal, nada é inserido
8. Se `duplicata === true`: badge "Duplicata" em vermelho + aviso no topo do modal + campo `processoExistenteId` com link para o processo existente

Campos editáveis no modal (usar mapa canônico de 1.3):
- Nº Processo (`numero`) — obrigatório
- Cliente (`clienteNome`)
- CPF (`clienteCpf`)
- Réu (`reuTexto`)
- Vara (`vara`)
- Matéria (`materia`)
- Sistema (`sistema`) — obrigatório
- Login (`login`)
- Data de distribuição (`dataDistribuicao`)
- Data da audiência (`dataAudiencia`)
- Hora da audiência (`horaAudiencia`)

**Integração em `intimacoes/page.tsx` ou no componente de upload existente:**
- Substituir a chamada a `uploadPdf()` / `/upload-pdf` pelo fluxo preview → modal
- Estado: `previewItem: PdfPreviewItem | null` + `isReviewing: boolean`

#### Passo 3 — Reescrever `SemaforoImportacao` (Importação — N PDFs)

**Arquivo:** `apps/web/components/importacao/semaforo-importacao.tsx` (reescrever o stub)

**Estado do componente:**
```typescript
type EstadoImportacao = 'idle' | 'uploading' | 'revisao' | 'confirmando' | 'resultado'

interface ItemEditavel extends PdfPreviewItem {
  selecionado: boolean
  camposEditados: Partial<ConfirmarBatchItem>
}
```

**Fase `idle`:**
- Drop zone + botão "Selecionar PDFs" (multiple)
- Aceita até 30 arquivos `.pdf`
- Exibe lista dos arquivos selecionados com opção de remover individualmente
- Botão "Processar PDFs" → inicia fase `uploading`

**Fase `uploading`:**
- Barra de progresso (indeterminate)
- Texto "Analisando X arquivo(s)..."
- Chama `previewPdfBatch(files)`

**Fase `revisao`:**
- Tabela com uma linha por arquivo, colunas:
  - Checkbox (seleção)
  - Arquivo (nome)
  - Cor semafórica (badge VERDE/AMARELO/VERMELHO)
  - Nº Processo
  - Cliente
  - Réu
  - Vara
  - Confiança (%)
  - Alertas (ícone ⚠ com tooltip se houver)
  - Ação: botão "Editar" abre drawer/modal lateral com todos os campos editáveis
- Legenda semafórica no topo:
  - 🟢 VERDE: todos os campos críticos extraídos com alta confiança
  - 🟡 AMARELO: campos com confiança baixa ou campos faltando
  - 🔴 VERMELHO: duplicata detectada, PDF ilegível ou erro fatal
- Checkbox "Selecionar todos" no header
- Items VERMELHO por duplicata: desabilitados por padrão, com aviso
- Botão **"Confirmar selecionados (X)"**: só itens `selecionado === true`
- Botão "Cancelar tudo": volta para `idle`

**Fase `confirmando`:**
- Spinner + "Inserindo processos..."
- Chama `confirmarBatchPdf(itensSelecionados.map(toConfirmarBatchItem))`

**Fase `resultado`:**
- Resumo: "X inseridos, Y já existiam, Z erros"
- Lista de erros se houver
- Botão "Nova importação" → volta para `idle`

#### Passo 4 — Remover uso de `/upload-pdf` (rota antiga) do frontend

Buscar em todo `apps/web/` qualquer chamada que use a rota antiga e substituir pelo fluxo preview+confirmar.  
A rota no backend pode ser mantida ou removida posteriormente — apenas o frontend não deve usá-la.

---

## Parte 3 — Checklist de Execução

### Naming (Parte 1)
- [ ] 1.1 `processos-grid.tsx`: alterar header da coluna `faseAtual` de "Situação" → "Fase"
- [ ] 1.2 Auditar demais colunas da grid contra o mapa canônico (Parte 1.3)
- [ ] 1.3 `processo-modal.tsx`: confirmar que "Fase" está correto (sem alteração esperada)
- [ ] 1.4 Auditar `semaforo-importacao.tsx` novo contra o mapa ao construir

### Modal de revisão PDF único (Parte 2, Passo 2)
- [ ] 2.1 Criar `pdf-revisao-modal.tsx` com campos editáveis + badge semafórico
- [ ] 2.2 Integrar no fluxo de upload da página Intimações
- [ ] 2.3 Remover chamada a `uploadPdf` / `/upload-pdf` do componente de upload
- [ ] 2.4 Testar fluxo: upload → modal abre → editar campo → confirmar → processo na lista
- [ ] 2.5 Testar duplicata: PDF duplicado → badge vermelho + aviso + botão desabilitado por padrão

### Tabela semafórica N PDFs (Parte 2, Passo 3)
- [ ] 3.1 Reescrever `semaforo-importacao.tsx` (idle → uploading → revisao → confirmando → resultado)
- [ ] 3.2 Drawer/modal de edição inline por item
- [ ] 3.3 Checkbox de seleção múltipla + "Confirmar selecionados"
- [ ] 3.4 Legenda semafórica visível
- [ ] 3.5 Itens VERMELHO (duplicata) desabilitados por padrão com aviso claro
- [ ] 3.6 Testar com 1 arquivo, 5 arquivos, 30 arquivos
- [ ] 3.7 Testar mix de VERDE + AMARELO + VERMELHO no mesmo batch

### Limpeza (Parte 2, Passo 4)
- [ ] 4.1 Grep em `apps/web/` por `/upload-pdf` e substituir pelo novo fluxo
- [ ] 4.2 Remover função `uploadPdf` de `lib/api.ts` se não tiver outros usos

---

## Parte 4 — Ordem de Execução Recomendada

1. **Naming** (Parte 1) — rápido, baixo risco, melhoria imediata visível
2. **Modal de revisão PDF único** (Passo 2) — desbloqueia Intimações com novo fluxo
3. **Tabela semafórica** (Passo 3) — Importação completa
4. **Limpeza da rota antiga** (Passo 4) — finalização

---

*Arquivo criado em 2026-05-12.*
