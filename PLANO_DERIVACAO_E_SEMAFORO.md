# CONECTAR — Plano de execução
## Opção A (Derivação automática) + Fluxo semafórico de PDFs

> Gerado em 2026-05-13.
> Dois temas independentes, mas executados em sequência recomendada:
> primeiro a derivação (menor risco), depois o semáforo (maior impacto).

---

## PARTE 1 — Opção A: Derivação automática do config da skill

### Contexto

`getSkillConfigJson()` em `escritorio.service.ts` hoje lê `mapa_comarcas` e `login_map`
do JSONB `escritorio.config`. Esses dados já existem em tabelas próprias:

| Campo do config | Tabela fonte | Colunas |
|---|---|---|
| `mapa_comarcas` | `comarca` | `codigo → abreviado` |
| `login_map` | `usuario` | `loginAliases[] → nome` |

Objetivo: `getSkillConfigJson()` passa a derivar esses dois campos das tabelas,
com cache Redis idêntico ao atual. Configurações deixa de ter essas seções.

---

### 1.1 — Backend: adicionar `loginAliases` em `usuario`

**Problema:** a tabela `usuario` tem `nome` e `oabs[]` mas não tem campo de aliases
de login (os apelidos usados no nome do arquivo PDF). Hoje esse mapeamento vive em
`escritorio.config.login_map`.

**Ação:** adicionar coluna `login_aliases text[]` em `usuario`.

```typescript
// apps/api/src/db/schema/usuario.ts  — adicionar campo:
loginAliases: text('login_aliases').array().default([]),
```

**Migration Drizzle:**
```bash
npm run db:generate -w api   # gera migration
npm run db:migrate -w api    # aplica
```

**Seed:** popular `login_aliases` para cada usuário existente a partir dos valores
atualmente em `escritorio.config.login_map` (script one-shot de migração de dados —
ver §1.6).

---

### 1.2 — Backend: atualizar `getSkillConfigJson()`

**Arquivo:** `apps/api/src/escritorio/escritorio.service.ts`

**Hoje:**
```typescript
async getSkillConfigJson(escritorioId: string) {
  const [row] = await db.select({ config: escritorio.config })...
  return {
    mapa_comarcas: c.mapa_comarcas ?? {},
    login_map:     c.login_map ?? {},
    ...
  }
}
```

**Novo (derivado das tabelas):**
```typescript
async getSkillConfigJson(escritorioId: string) {
  // Executa as duas queries em paralelo
  const [comarcaRows, usuarioRows] = await Promise.all([
    db.select({ codigo: comarca.codigo, abreviado: comarca.abreviado })
      .from(comarca)
      .where(eq(comarca.escritorioId, escritorioId)),

    db.select({ nome: usuario.nome, aliases: usuario.loginAliases })
      .from(usuario)
      .where(and(
        eq(usuario.escritorioId, escritorioId),
        eq(usuario.ativo, true),
      )),
  ]);

  // Monta mapa_comarcas: { "0001": "SSA", "0039": "F. DE SANTANA" }
  const mapa_comarcas = Object.fromEntries(
    comarcaRows.map((c) => [c.codigo, c.abreviado])
  );

  // Monta login_map: { "TAINARA": "TAINARA", "ANDRE": "ANDRÉ PITA" }
  const login_map: Record<string, string> = {};
  for (const u of usuarioRows) {
    for (const alias of (u.aliases ?? [])) {
      if (alias.trim()) login_map[alias.trim().toUpperCase()] = u.nome ?? alias;
    }
    // O próprio nome canônico também é um alias válido
    if (u.nome?.trim()) login_map[u.nome.trim().toUpperCase()] = u.nome.trim();
  }

  const c = (await this.obterPerfilTenant(escritorioId)).config as EscritorioConfig;
  return {
    mapa_comarcas,
    login_map,
    materias_validas:       c.materias_validas ?? [],
    fase_inicial:           c.fase_inicial ?? 'AUDIÊNCIA AGENDADA',
    situacao_inicial:       c.situacao_inicial ?? 'ATIVO',
    status_processo_inicial: c.status_processo_inicial ?? 'ATIVO',
  };
}
```

**Nota sobre cache:** o Redis continua em cima desse resultado (TTL 5min). Nada muda
na camada de cache — só o que é consultado no cache miss.

---

### 1.3 — Backend: invalidar cache nos pontos certos

Adicionar chamada a `invalidarCacheSkill(escritorioId)` (já existe) nos services:

**`comarcas.service.ts`** — nos métodos `criar`, `atualizar`, `deletar`:
```typescript
await this.escritorioService.invalidarCacheSkill(escritorioId);
```

**`usuarios.service.ts`** — nos métodos `criar`, `atualizar`, `deletar`:
```typescript
await this.escritorioService.invalidarCacheSkill(escritorioId);
```

---

### 1.4 — Backend: remover `mapa_comarcas` e `login_map` do DTO e do service

**`update-escritorio-config.dto.ts`:** remover os campos `mapa_comarcas` e `login_map`.

**`escritorio.service.ts` → `atualizarConfig()`:** remover os blocos de merge de
`mapa_comarcas` e `login_map`.

**`db/schema/escritorio.ts` → `EscritorioConfig`:** remover os campos do tipo.
(Os dados existentes no JSONB são inofensivos — são ignorados, não precisam ser
apagados da coluna.)

---

### 1.5 — Frontend: limpar página de Configurações

**Arquivo:** `apps/web/app/(app)/configuracoes/page.tsx`

Remover as três seções:
- `PairTable` de Comarcas (mapa código→abreviado)
- `PairTable` de Logins (mapa alias→canônico)
- Seção de Réus canônicos (já tem página `/reus`)

O que fica em Configurações:
- Matérias válidas
- Dropdowns — Intimações (situação, status, sentença, fases)
- Fase inicial / status inicial
- Comunica (webhook token + regras)

---

### 1.6 — Script de migração de dados (one-shot)

Antes de remover as seções, rodar script que copia os valores existentes de
`escritorio.config.login_map` para `usuario.login_aliases`:

```typescript
// apps/api/src/db/seeds/migrar_login_aliases.ts
// Para cada escritório:
//   Para cada [alias, nomeCanônico] em config.login_map:
//     Encontra usuário cujo nome === nomeCanônico
//     Adiciona alias ao array loginAliases (se ainda não estiver)
```

Rodar uma vez antes do deploy: `npm run ts-node migrar_login_aliases.ts -w api`

---

### 1.7 — Nav: mover Réus para Cadastros

**Arquivo:** `apps/web/app/(app)/layout.tsx`

```typescript
// Grupo Cadastros — adicionar Réus:
{
  label: 'Cadastros',
  items: [
    { href: '/usuarios', label: 'Usuários' },
    { href: '/comarcas', label: 'Comarcas' },
    { href: '/reus',     label: 'Réus' },      // ← adicionar
  ],
},
```

---

### Checklist Parte 1

- [ ] 1.1 — Adicionar `loginAliases text[]` em schema `usuario` + migration
- [ ] 1.2 — Reescrever `getSkillConfigJson()` para derivar das tabelas
- [ ] 1.3 — Invalidação de cache em `comarcas.service` e `usuarios.service`
- [ ] 1.4 — Remover `mapa_comarcas` e `login_map` do DTO e do `atualizarConfig()`
- [ ] 1.5 — Limpar página de Configurações (remover 3 seções)
- [ ] 1.6 — Rodar script de migração de dados (login_aliases)
- [ ] 1.7 — Mover Réus para grupo Cadastros na nav

---
---

## PARTE 2 — Fluxo semafórico completo para N PDFs

### Contexto

**Hoje:** upload de 1 PDF por vez direto da aba Intimações. Resultado:
- confiança ≥ 0.8 → insere direto
- confiança 0.6–0.79 → insere com flag `requer_conferencia`
- confiança < 0.6 → vai para fila de Revisões

**Briefing §3.1–3.2:** a página de Importação deve aceitar N PDFs, processar todos,
exibir uma tabela de pré-visualização com semáforo antes de qualquer insert, e
permitir edição inline das linhas amarelas/vermelhas antes de confirmar.

---

### Fluxo completo (novo)

```
1. Adm sobe N PDFs na página /importacao (drag-and-drop ou file picker)
        ↓
2. Frontend envia todos para POST /processos/preview-pdf-batch
        ↓
3. Backend processa cada PDF via skill (em paralelo, max 5 concurrent)
   Retorna array de PreviewItem — sem inserir nada no banco ainda
        ↓
4. Frontend exibe tabela semafórica:
   VERDE  → confiança ≥ 0.8, sem duplicata, sem inconsistência
   AMARELO → confiança 0.6–0.79 OU campo crítico vazio/ambíguo
   VERMELHO → confiança < 0.6 OU duplicata OU PDF scaneado OU data inválida
        ↓
5. Adm pode editar inline qualquer campo de linhas AMARELAS/VERMELHAS
        ↓
6. Botão "Inserir todos os verdes" (1 clique) — insere só os VERDE
   Botão "Inserir selecionados" — insere os que o adm marcou
        ↓
7. POST /processos/confirmar-batch — insere no banco com anti-dup
        ↓
8. Validação: N PDFs subidos = N itens na tabela (alerta se divergir)
   Resultado: X inseridos, Y já existiam, Z com erro
```

---

### 2.1 — Backend: novo endpoint `POST /processos/preview-pdf-batch`

**Entrada:** `multipart/form-data` com campo `files` (array de PDFs)

**Processamento:**
```typescript
// processos.controller.ts
@Post('preview-pdf-batch')
@UseInterceptors(FilesInterceptor('files', 30, { /* filtro PDF */ }))
async previewPdfBatch(
  @CurrentUser() user: AuthUser,
  @UploadedFiles() files: Express.Multer.File[],
) {
  return this.processos.previewPdfBatch(user.escritorioId, files);
}
```

**Service `previewPdfBatch()`:**
```typescript
// Processa todos em paralelo (limite de concurrency = 5)
// Para cada arquivo:
//   1. Chama skill (mesmo fluxo do upload simples)
//   2. Classifica resultado (VERDE / AMARELO / VERMELHO)
//   3. Verifica duplicata no banco (sem inserir)
// Retorna array de PreviewItem
```

**Tipo `PreviewItem`:**
```typescript
interface PreviewItem {
  // Identificação
  arquivo:          string            // nome do arquivo original
  itemId:           string            // UUID gerado no backend para rastrear edições

  // Dados extraídos (todos editáveis)
  numero:           string | null
  clienteNome:      string | null
  clienteCpf:       string | null
  reuTexto:         string | null
  vara:             string | null
  materia:          string | null
  sistema:          string | null
  login:            string | null
  dataDistribuicao: string | null
  dataAudiencia:    string | null
  horaAudiencia:    string | null

  // Classificação semafórica
  cor:      'VERDE' | 'AMARELO' | 'VERMELHO'
  alertas:  string[]   // lista de motivos (ex: ["vara não encontrada no mapa", "CPF mascarado"])
  confidence: number

  // Flag de duplicata
  duplicata: boolean
  processoExistenteId?: string
}
```

---

### 2.2 — Regras de classificação (backend)

```typescript
function classificar(resultado: SkillResult, duplicata: boolean): {
  cor: 'VERDE' | 'AMARELO' | 'VERMELHO'
  alertas: string[]
} {
  const alertas: string[] = []

  // VERMELHO — não inserir sem intervenção
  if (resultado.confidence === 0)
    return { cor: 'VERMELHO', alertas: [resultado.alerta ?? 'PDF ilegível'] }
  if (duplicata)
    alertas.push('Número já existe em Intimações')
  if (resultado.alerta === 'pdf_possivelmente_escaneado')
    alertas.push('PDF possivelmente escaneado — baixe o PDF nativo do tribunal')
  if (datasInconsistentes(resultado.processo))
    alertas.push('Data de audiência anterior à distribuição')

  if (alertas.length > 0 && (duplicata || resultado.alerta === 'pdf_possivelmente_escaneado'))
    return { cor: 'VERMELHO', alertas }

  // AMARELO — inserível após revisão
  if (resultado.confidence < 0.8) alertas.push(`Confiança baixa (${Math.round(resultado.confidence * 100)}%)`)
  if (!resultado.processo.vara?.trim()) alertas.push('Vara não identificada')
  if (!resultado.processo.materia?.trim()) alertas.push('Matéria não identificada')
  if (!resultado.processo.clienteCpf?.trim()) alertas.push('CPF não disponível')

  if (alertas.length > 0)
    return { cor: 'AMARELO', alertas }

  return { cor: 'VERDE', alertas: [] }
}
```

---

### 2.3 — Backend: novo endpoint `POST /processos/confirmar-batch`

**Entrada:** array de `ConfirmarItem` (dados editados pelo adm + itemId + cor original)

```typescript
interface ConfirmarItem {
  itemId: string
  // Todos os campos do processo (editados ou não)
  numero: string
  clienteNome: string | null
  clienteCpf:  string | null
  reuTexto:    string | null
  vara:        string | null
  materia:     string | null
  sistema:     string
  login:       string | null
  dataDistribuicao: string | null
  dataAudiencia:    string | null
  horaAudiencia:    string | null
}
```

**Processamento:**
- Para cada item: `upsertFromSkill()` com anti-dup (`numero + escritorio_id`)
- Retorna: `{ inseridos, jaExistiam, erros: [{itemId, mensagem}] }`
- Duplicatas confirmadas explicitamente pelo adm são ignoradas (não atualizam)

---

### 2.4 — Frontend: nova página `/importacao`

A página atual (CSV textarea) passa a ser substituída pelo fluxo semafórico.
O CSV pode ser mantido como uma seção colapsável secundária ("Importação via CSV (legado)").

**Estrutura da nova página:**

```
┌─────────────────────────────────────────────────────┐
│  Importação de PDFs                                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  Arraste os PDFs aqui ou clique para selecionar│  │
│  │  (máx. 30 arquivos por vez)                   │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  [Processar X PDFs]   ← botão aparece após selecionar│
│                                                      │
├─────────────────────────────────────────────────────┤
│  RESULTADO DA EXTRAÇÃO    3 verde · 1 amarelo · 1 vermelho│
│                                                      │
│  [Inserir todos os verdes (3)]  [Inserir selecionados]│
│                                                      │
│  ┌──┬──────────────────────┬────────┬──────┬───────┐│
│  │  │ Arquivo              │ Número │ Réu  │ Vara  ││
│  ├──┼──────────────────────┼────────┼──────┼───────┤│
│  │🟢│ joao-negativacao.pdf │ 0001…  │ Brad │ 1ªSSA ││
│  │🟢│ maria-conta.pdf      │ 0002…  │ Nubank│ 2ªSSA ││
│  │🟡│ carlos-credito.pdf   │ 0003…  │ —    │ —     ││  ← editável
│  │🔴│ duplicata.pdf        │ 0001…  │ Brad │ 1ªSSA ││  ← duplicata
│  │🔴│ scaneado.pdf         │ —      │ —    │ —     ││  ← PDF scaneado
│  └──┴──────────────────────┴────────┴──────┴───────┘│
│                                                      │
│  ⚠ 5 PDFs processados · 5 itens na tabela ✓         │
└─────────────────────────────────────────────────────┘
```

---

### 2.5 — Frontend: componente `SemaforoImportacao` (reescrever o stub)

**Estados da página:**

```typescript
type Estado =
  | 'idle'          // tela inicial com dropzone
  | 'selecionado'   // arquivos selecionados, aguardando processar
  | 'processando'   // chamando preview-pdf-batch (com spinner por arquivo)
  | 'revisao'       // tabela semafórica visível, aguardando ação do adm
  | 'inserindo'     // chamando confirmar-batch
  | 'concluido'     // resultado final exibido
```

**Funcionalidades da tabela de revisão:**

1. **Badge semafórico** por linha: `🟢 Verde` / `🟡 Amarelo` / `🔴 Vermelho`
2. **Tooltip/expandir** com lista de alertas ao passar o mouse na badge
3. **Edição inline** de campos nas linhas AMARELO: clicar no campo → input editável
4. **Checkbox** por linha para seleção manual
5. **Botão "Inserir todos os verdes"** — seleciona e confirma só os VERDE
6. **Botão "Inserir selecionados"** — confirma o que estiver marcado (incluindo AMARELOS revisados)
7. **Contador de validação:** "N PDFs processados · M itens na tabela" — destaque em vermelho se N ≠ M
8. **Linhas VERMELHO** não têm checkbox — não podem ser inseridas sem edição que mude a cor

**Campos editáveis nas linhas AMARELO/VERMELHO (se não for duplicata/scaneado):**
- `numero`, `clienteNome`, `reuTexto`, `vara`, `materia`, `login`, `dataDistribuicao`
- Ao editar um campo, o sistema re-classifica a linha localmente (pode promover de AMARELO para VERDE)

---

### 2.6 — Frontend: estados de loading por arquivo

Durante o processamento, mostrar progresso por arquivo:

```
Processando 5 PDFs…
  ✓ joao-negativacao.pdf
  ✓ maria-conta.pdf
  ⟳ carlos-credito.pdf   ← em processamento
  ○ duplicata.pdf
  ○ scaneado.pdf
```

Usando `Promise.allSettled` com concurrency controlada no frontend (ou stream de eventos
do backend — implementar como polling simples na primeira versão).

---

### 2.7 — API: novo endpoint no frontend (`lib/api.ts`)

```typescript
// Envia N PDFs, recebe array de PreviewItem (sem inserir)
export async function previewPdfBatch(files: File[]): Promise<PreviewItem[]>

// Confirma inserção dos itens aprovados
export async function confirmarBatch(
  items: ConfirmarItem[]
): Promise<BatchResult>

// Tipos
interface BatchResult {
  inseridos: number
  jaExistiam: number
  erros: { itemId: string; mensagem: string }[]
}
```

---

### 2.8 — O que fazer com a aba Revisões?

Com o semáforo, o fluxo de `extracao_pendente` (Revisões) passa a ser o fallback para
PDFs com problema grave que não podem nem ser exibidos na tabela (ex: arquivo corrompido,
timeout da skill). O fluxo normal nunca mais usa Revisões — tudo passa pela tabela
semafórica antes.

**Decisão:** manter `/revisoes` para esses casos extremos, mas remover o link proeminente
da aba Intimações (o banner "Revisão necessária → Revisar agora").

---

### Checklist Parte 2

**Backend:**
- [ ] 2.1 — Criar endpoint `POST /processos/preview-pdf-batch` (multipart, até 30 PDFs)
- [ ] 2.2 — Implementar função `classificar()` com regras verde/amarelo/vermelho
- [ ] 2.3 — Criar endpoint `POST /processos/confirmar-batch`
- [ ] 2.4 — Criar tipo `PreviewItem` e `ConfirmarItem` em DTOs compartilhados
- [ ] 2.8 — Remover banner de revisão da aba Intimações (manter página /revisoes)

**Frontend:**
- [ ] 2.5 — Reescrever `SemaforoImportacao` com dropzone + tabela semafórica
- [ ] 2.6 — Implementar estados de loading por arquivo
- [ ] 2.7 — Adicionar `previewPdfBatch()` e `confirmarBatch()` em `lib/api.ts`
- [ ] Reescrever `/importacao/page.tsx` usando o novo componente
- [ ] Manter CSV como seção colapsável ("Importação via CSV (legado)")

---

## Ordem de execução recomendada

```
Parte 1 (risco baixo, sem nova UI)
  1.1 → 1.2 → 1.3 → 1.4 → 1.6 (migration) → 1.5 → 1.7

Parte 2 (mais impacto, testar bem)
  2.1 → 2.2 → 2.3 → 2.7 (api.ts) → 2.5 → 2.6 → rewrite importacao/page
```

A Parte 1 pode ir ao ar independentemente da Parte 2.
A Parte 2 requer que a Parte 1 já esteja concluída (skill usa o novo `getSkillConfigJson`).

---

*Referências: BRIEFING_DEV_REUNIAO_04-05_V2.md §3.1-3.2 · BRIEFING_DEV_M0.md §3.4 · PROJETO_CONECTAR.md §9*
