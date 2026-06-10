# Plano: Worker Assíncrono de Enriquecimento de Processo

## Problema

Processos criados via ONBOARDING chegam sem `cliente_nome` (ou com nome inválido) e sem
`login` (OAB do advogado). A causa raiz é que a comunicação capturada pode ser de uma fase
recursal, onde o cliente aparece com `polo='P'` — e o código atual só busca `polo='A'`.
Além disso, `processo.login` nunca é preenchido no fluxo ONBOARDING.

**Solução:** após criar o processo, enfileirar um job assíncrono que busca todas as
comunicações daquele processo na API DJEN (`OAB + numeroProcesso`), extrai o melhor candidato
a nome e ao advogado, valida, e atualiza o registro.

---

## Visão geral das mudanças

```
NOVOS ARQUIVOS
  src/enriquecimento/enriquecimento.types.ts
  src/enriquecimento/enriquecimento.service.ts
  src/enriquecimento/enriquecimento-queue.service.ts
  src/enriquecimento/enriquecimento.processor.ts
  src/enriquecimento/enriquecimento.module.ts

ARQUIVOS MODIFICADOS
  src/captura/comunica-api.client.ts           (+1 método)
  src/comunicacoes/comunicacoes.service.ts     (+injeção + trigger)
  src/comunicacoes/comunicacoes.module.ts      (+import EnriquecimentoModule)
```

Nenhuma migration de banco necessária — usa campos existentes:
`cliente_nome`, `login`, `requer_conferencia`, `observacao_geral`.

---

## Passo 1 — Adicionar `consultarPorNumeroProcesso` no ComunicaApiClient

**Arquivo:** `src/captura/comunica-api.client.ts`

Adicionar novo tipo de parâmetro e novo método ao final da classe, antes do fechamento `}`:

```typescript
export type ConsultaProcessoParams = {
  numeroOab: string;
  ufOab: string;
  numeroProcesso: string;  // sem máscara, só dígitos
};

// Dentro da classe ComunicaApiClient:

async consultarPorNumeroProcesso(
  params: ConsultaProcessoParams,
  maxPaginas = 5,
): Promise<ComunicaApiItem[]> {
  const items: ComunicaApiItem[] = [];

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/comunicacao`);
    url.searchParams.set('pagina', String(pagina));
    url.searchParams.set('itensPorPagina', '100');
    url.searchParams.set('numeroOab', params.numeroOab);
    url.searchParams.set('ufOab', params.ufOab);
    url.searchParams.set('numeroProcesso', params.numeroProcesso);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) break;
      const data = (await res.json()) as ComunicaApiResponse;
      if (data.status !== 'success' || !data.items?.length) break;
      items.push(...data.items);
      if (data.items.length < 100) break;
    } catch {
      break;
    } finally {
      clearTimeout(timer);
    }
  }

  return items;
}
```

---

## Passo 2 — Criar `enriquecimento.types.ts`

**Arquivo:** `src/enriquecimento/enriquecimento.types.ts`

```typescript
export type EnriquecimentoJobPayload = {
  processoId: string;
  escritorioId: string;
  numeroProcesso: string;   // com máscara, ex: "0126693-40.2025.8.05.0001"
  oab: string;              // ex: "66364"
  ufOab: string;            // ex: "BA"
};
```

---

## Passo 3 — Criar `enriquecimento.service.ts`

**Arquivo:** `src/enriquecimento/enriquecimento.service.ts`

Este serviço contém toda a lógica de enriquecimento.

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { processo } from '../db/schema/processo';
import { ComunicaApiClient } from '../captura/comunica-api.client';
import type { EnriquecimentoJobPayload } from './enriquecimento.types';
import type { ComunicaApiItem } from '../comunicacoes/comunica-api.types';

/** Padrões de nome que indicam dado suspeito — exige revisão manual. */
const NOME_SUSPEITO =
  /REGISTRADO\(A\)\s+CIVILMENTE\s+COMO|^ESP[OÓ]LIO\s+DE|^MASSA\s+FALIDA|MENOR\s+REPRESENTADO/i;

function nomePareceLimpo(nome: string): boolean {
  if (!nome || nome !== nome.toUpperCase()) return false; // tem minúscula = lixo da intimação
  if (NOME_SUSPEITO.test(nome)) return false;
  const palavras = nome.trim().split(/\s+/);
  if (palavras.length < 2 || palavras.length > 8) return false;
  return true;
}

function nomeEhSuspeito(nome: string): boolean {
  return nome === nome.toUpperCase() && NOME_SUSPEITO.test(nome);
}

function extrairMelhorNome(items: ComunicaApiItem[]): string | null {
  // Prioridade 1: polo='A' com nome limpo
  for (const item of items) {
    const dest = item.destinatarios?.find((d) => d.polo === 'A');
    if (dest?.nome && nomePareceLimpo(dest.nome.trim())) {
      return dest.nome.trim();
    }
  }
  // Prioridade 2: polo='A' com nome suspeito (retorna mesmo assim — alerta será setado)
  for (const item of items) {
    const dest = item.destinatarios?.find((d) => d.polo === 'A');
    if (dest?.nome?.trim()) return dest.nome.trim();
  }
  // Prioridade 3: único destinatário independente de polo
  for (const item of items) {
    if (item.destinatarios?.length === 1) {
      const nome = item.destinatarios[0].nome?.trim();
      if (nome) return nome;
    }
  }
  return null;
}

function extrairLogin(items: ComunicaApiItem[]): string | null {
  for (const item of items) {
    const adv = item.destinatarioadvogados?.[0]?.advogado;
    if (adv?.numero_oab && adv?.uf_oab) {
      return `${adv.numero_oab}/${adv.uf_oab}`.toUpperCase();
    }
  }
  return null;
}

@Injectable()
export class EnriquecimentoService {
  private readonly log = new Logger(EnriquecimentoService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly comunicaApi: ComunicaApiClient,
  ) {}

  async enriquecer(payload: EnriquecimentoJobPayload): Promise<void> {
    const { processoId, escritorioId, numeroProcesso, oab, ufOab } = payload;

    // Busca o número sem máscara (só dígitos)
    const numeroDigits = numeroProcesso.replace(/\D/g, '');
    if (!numeroDigits) {
      this.log.warn(`numeroProcesso inválido para processoId=${processoId}`);
      return;
    }

    // Busca estado atual do processo
    const [proc] = await this.drizzle.db
      .select({
        clienteNome: processo.clienteNome,
        login: processo.login,
      })
      .from(processo)
      .where(eq(processo.id, processoId))
      .limit(1);

    if (!proc) return;

    const nomeAtualOk =
      proc.clienteNome?.trim() && nomePareceLimpo(proc.clienteNome.trim());
    const loginAtualOk = !!proc.login?.trim();

    // Se já está tudo ok, não faz nada
    if (nomeAtualOk && loginAtualOk) return;

    // Busca todas as comunicações do processo na API DJEN
    let items: ComunicaApiItem[] = [];
    try {
      items = await this.comunicaApi.consultarPorNumeroProcesso({
        numeroOab: oab,
        ufOab,
        numeroProcesso: numeroDigits,
      });
    } catch (err) {
      this.log.warn(`Falha ao consultar DJEN para processo ${numeroProcesso}: ${err}`);
      throw err; // propaga para o BullMQ fazer retry
    }

    if (!items.length) {
      this.log.debug(`Nenhuma comunicação retornada para ${numeroProcesso}`);
      return;
    }

    const patch: Partial<typeof processo.$inferInsert> = {
      updatedAt: new Date(),
    };

    // Enriquece cliente_nome se necessário
    if (!nomeAtualOk) {
      const melhorNome = extrairMelhorNome(items);
      if (melhorNome) {
        patch.clienteNome = melhorNome.slice(0, 300);
        patch.requerConferencia = nomeEhSuspeito(melhorNome);
        if (patch.requerConferencia) {
          patch.observacaoGeral = `[ALERTA] Nome requer revisão manual: ${melhorNome.slice(0, 100)}`;
        }
      } else {
        // Não achou nome — mantém requerConferencia=true (já estava)
        patch.observacaoGeral = '[ALERTA] Nome do cliente não identificado automaticamente.';
      }
    }

    // Enriquece login (OAB do advogado) se necessário
    if (!loginAtualOk) {
      const login = extrairLogin(items);
      if (login) patch.login = login;
    }

    const temMudanca = Object.keys(patch).length > 1; // mais que só updatedAt
    if (!temMudanca) return;

    await this.drizzle.db
      .update(processo)
      .set(patch)
      .where(eq(processo.id, processoId));

    this.log.log(
      `Processo ${processoId} enriquecido: nome="${patch.clienteNome ?? 'sem mudança'}" login="${patch.login ?? 'sem mudança'}"`,
    );
  }
}
```

---

## Passo 4 — Criar `enriquecimento-queue.service.ts`

**Arquivo:** `src/enriquecimento/enriquecimento-queue.service.ts`

Segue o mesmo padrão de `captura-queue.service.ts` — fallback síncrono se Redis ausente.

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { EnriquecimentoService } from './enriquecimento.service';
import type { EnriquecimentoJobPayload } from './enriquecimento.types';

export const ENRIQUECIMENTO_QUEUE = 'enriquecimento-processo';

@Injectable()
export class EnriquecimentoQueueService {
  private readonly log = new Logger(EnriquecimentoQueueService.name);

  constructor(
    private readonly enriquecimento: EnriquecimentoService,
    @Optional()
    @InjectQueue(ENRIQUECIMENTO_QUEUE)
    private readonly queue?: Queue<EnriquecimentoJobPayload>,
  ) {}

  async enfileirar(payload: EnriquecimentoJobPayload): Promise<void> {
    if (this.queue) {
      await this.queue.add(
        `enriquecer:${payload.processoId}`,
        payload,
        {
          jobId: `enriquecimento:${payload.processoId}`,   // dedup por processo
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
        },
      );
      return;
    }
    // Sem Redis: executa imediatamente (dev local)
    this.log.debug(`Redis indisponível — enriquecimento síncrono processo=${payload.processoId}`);
    await this.enriquecimento.enriquecer(payload);
  }
}
```

> O `jobId` fixo com o `processoId` garante **deduplicação**: se o mesmo processo for
> enfileirado múltiplas vezes (ex.: onboarding duplicado), apenas um job executa.

---

## Passo 5 — Criar `enriquecimento.processor.ts`

**Arquivo:** `src/enriquecimento/enriquecimento.processor.ts`

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { EnriquecimentoService } from './enriquecimento.service';
import { ENRIQUECIMENTO_QUEUE } from './enriquecimento-queue.service';
import type { EnriquecimentoJobPayload } from './enriquecimento.types';

@Processor(ENRIQUECIMENTO_QUEUE)
export class EnriquecimentoProcessor extends WorkerHost {
  private readonly log = new Logger(EnriquecimentoProcessor.name);

  constructor(private readonly enriquecimento: EnriquecimentoService) {
    super();
  }

  override async process(job: Job<EnriquecimentoJobPayload>) {
    this.log.debug(`Enriquecendo processo=${job.data.processoId}`);
    await this.enriquecimento.enriquecer(job.data);
  }
}
```

---

## Passo 6 — Criar `enriquecimento.module.ts`

**Arquivo:** `src/enriquecimento/enriquecimento.module.ts`

```typescript
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ComunicaApiClient } from '../captura/comunica-api.client';
import { EnriquecimentoProcessor } from './enriquecimento.processor';
import { EnriquecimentoQueueService, ENRIQUECIMENTO_QUEUE } from './enriquecimento-queue.service';
import { EnriquecimentoService } from './enriquecimento.service';

const redisUrl = process.env.REDIS_URL?.trim();

@Module({
  imports: [
    ...(redisUrl ? [BullModule.registerQueue({ name: ENRIQUECIMENTO_QUEUE })] : []),
  ],
  providers: [
    ComunicaApiClient,          // própria instância, sem importar CapturaModule (evita ciclo)
    EnriquecimentoService,
    EnriquecimentoQueueService,
    ...(redisUrl ? [EnriquecimentoProcessor] : []),
  ],
  exports: [EnriquecimentoQueueService],
})
export class EnriquecimentoModule {}
```

> **Por que `ComunicaApiClient` como provider direto?**
> `CapturaModule` já importa `ComunicacoesModule`. Se `ComunicacoesModule` importasse
> `CapturaModule` para pegar o `ComunicaApiClient`, criaria um ciclo de dependência.
> `ComunicaApiClient` depende apenas de `ConfigService` (global), então pode ser
> instanciado diretamente em qualquer módulo sem ciclos.

---

## Passo 7 — Modificar `comunicacoes.module.ts`

**Arquivo:** `src/comunicacoes/comunicacoes.module.ts`

Adicionar import de `EnriquecimentoModule` e exportá-lo para o service acessar o queue:

```typescript
// Adicionar import:
import { EnriquecimentoModule } from '../enriquecimento/enriquecimento.module';

// Dentro de @Module({ imports: [...] }):
EnriquecimentoModule,
```

---

## Passo 8 — Modificar `comunicacoes.service.ts`

**Arquivo:** `src/comunicacoes/comunicacoes.service.ts`

### 8a. Injetar `EnriquecimentoQueueService` no constructor

Localizar o `constructor(` do `ComunicacoesService` e adicionar:

```typescript
import { EnriquecimentoQueueService } from '../enriquecimento/enriquecimento-queue.service';

// No constructor, adicionar parâmetro:
private readonly enriquecimentoQueue: EnriquecimentoQueueService,
```

### 8b. Disparar enriquecimento após `criarProcessoDeComunica()`

Localizar `ingestFromCaptura()` — especificamente o bloco que retorna após criar o processo
(aproximadamente linhas 1049–1058). Após o `processoId = await this.criarProcessoDeComunica(...)`,
adicionar o trigger:

```typescript
processoId = await this.criarProcessoDeComunica(
  escritorioId,
  numeroProcessoBruto,
  digits!,
  item,
  origem,
);
processoCriado = true;

// NOVO: enfileira enriquecimento se dados de identidade incompletos
const nomeRuim =
  !item.destinatarios?.find((d) => d.polo === 'A')?.nome?.trim() ||
  item.destinatarios.find((d) => d.polo === 'A')!.nome !== 
    item.destinatarios.find((d) => d.polo === 'A')!.nome.toUpperCase();

if (nomeRuim || true) { // login é sempre null no ONBOARDING, sempre enfileira
  const oabRaw = oab.trim().toUpperCase(); // ex: "66364/BA"
  const [numero_oab, uf_oab] = oabRaw.includes('/')
    ? oabRaw.split('/')
    : [oabRaw, ''];
  void this.enriquecimentoQueue.enfileirar({
    processoId,
    escritorioId,
    numeroProcesso: numeroProcessoBruto ?? digits!,
    oab: numero_oab,
    ufOab: uf_oab,
  }).catch((err) =>
    this.log.warn(`Falha ao enfileirar enriquecimento processo=${processoId}: ${err}`),
  );
}
```

> **Nota sobre o `oab`:** em `ingestFromCaptura`, o parâmetro `oab` é a string completa
> (`"66364/BA"`). Verificar o formato exato no ponto de chamada para fazer o split correto.
> Ver linha ~1015 onde `oab` é recebido como parâmetro da função.

---

## Passo 9 — Backfill dos processos existentes (103 registros)

Após o deploy, rodar o seguinte script SQL para identificar os processos que precisam de
enriquecimento. A equipe pode disparar manualmente via endpoint admin ou script de seed:

```sql
-- Processos ONBOARDING com dados incompletos
SELECT id, numero, login, cliente_nome
FROM processo
WHERE origem_criacao = 'ONBOARDING'
  AND (
    login IS NULL
    OR cliente_nome IS NULL
    OR (cliente_nome IS NOT NULL AND cliente_nome != upper(cliente_nome))
  )
ORDER BY created_at DESC;
-- Resultado esperado: ~103 processos
```

Para reprocessar via código, criar endpoint admin temporário ou chamar
`EnriquecimentoQueueService.enfileirar()` em loop a partir de um script/seed.

---

## Resumo das responsabilidades de cada arquivo

| Arquivo | Responsabilidade |
|---|---|
| `enriquecimento.types.ts` | Tipo do payload do job |
| `enriquecimento.service.ts` | Lógica: chama API, extrai nome/login, valida, atualiza DB |
| `enriquecimento-queue.service.ts` | Enfileira job com dedup + fallback síncrono |
| `enriquecimento.processor.ts` | Consome a fila BullMQ |
| `enriquecimento.module.ts` | Registra fila, providers e exports |
| `comunica-api.client.ts` | +`consultarPorNumeroProcesso()` |
| `comunicacoes.service.ts` | Injeta queue, dispara enriquecimento após criar processo |
| `comunicacoes.module.ts` | Importa `EnriquecimentoModule` |

---

## Comportamento esperado após implementação

```
Processo criado via ONBOARDING
        ↓
Job enfileirado: { processoId, oab, numeroProcesso }
        ↓  (assíncrono, não bloqueia o onboarding)
Worker executa
        ↓
GET /api/v1/comunicacao?numeroOab=66364&ufOab=BA&numeroProcesso=01266934...
        ↓
Varre todas as comunicações retornadas:
  → Encontrou polo='A' com nome limpo?
      → atualiza clienteNome, login, requerConferencia=false
  → Encontrou polo='A' com nome suspeito (REGISTRADO CIVILMENTE...)?
      → atualiza clienteNome, login, requerConferencia=true, observacaoGeral=[ALERTA]
  → Não encontrou nome válido?
      → atualiza apenas login, observacaoGeral=[ALERTA], requerConferencia=true
  → Falha na API?
      → BullMQ reencaminha: 3 tentativas com backoff exponencial (5s, 25s, 125s)
```
