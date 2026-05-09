# CONECTAR — Skill de extração de PDF

Microserviço **FastAPI** que a API Nest chama em `POST /extract` com o PDF multipart. Sem este processo rodando, o upload de PDF na aplicação retorna erro do tipo *não foi possível contatar o serviço de extração*.

## Subir localmente

Na raiz do monorepo (`app_de_direito/`):

```bash
python3 -m venv skill/.venv
source skill/.venv/bin/activate   # Windows: skill\.venv\Scripts\activate
pip install -r skill/requirements.txt
```

Depois, em um terminal dedicado:

```bash
npm run dev:skill
```

Ou direto:

```bash
cd skill && python3 -m uvicorn server:app --host 127.0.0.1 --port 5001 --reload
```

## Variáveis

| Variável | Descrição |
|----------|-----------|
| `SKILL_API_KEY` | Opcional. Se definida, a API Nest deve usar o **mesmo** valor em `SKILL_API_KEY` (header `X-Skill-Key`). |

## Testar

```bash
curl -s http://127.0.0.1:5001/health
```

Deve responder `{"status":"ok",...}`.

Com a API Nest no ar, também dá para testar **do ponto de vista do Node**:

```bash
curl -s http://127.0.0.1:3001/api/health/skill
```

Se `ok: false`, a API não está alcançando a skill (URL, skill parada ou rede).

No `.env` da API (`apps/api/.env`): `SKILL_URL=http://127.0.0.1:5001` (sem barra no final). **Não use `localhost`** se a skill subiu só em `127.0.0.1` (em alguns sistemas `localhost` vira IPv6 e a conexão falha).

## Escopo da extração (comprovante de protocolo / cadastro)

O fluxo atual trata **PDFs de comprovante** (Projudi ou PJe: protocolo, cadastro, primeira petição com dados do processo). O resultado alimenta a tabela `processos` na API.

### O que a skill costuma preencher

- Identificação do processo, sistema (Projudi / PJe), comarca/vara quando aparecem no texto.
- Partes: nome do cliente (autor), texto do réu.
- **CPF do cliente**: bloco tabular Projudi (`Nome` / `Identidade` / `CPF/CNPJ`) ou, no PJe, linha **`Partes: NOME (999.999.999-99)`** (primeiro CPF; ignora CNPJ do réu).
- **Audiência** (quando consta no PDF): data, hora e tipo (ex. conciliação → UNA no PJe).

Quando a API grava o processo após o upload e a extração traz **data de audiência**, o backend Nest **cria ou atualiza** a linha correspondente na tabela **`audiencia`** (status `AGENDADA`, chave única por escritório + processo + data), para a aba **Audiências** do webapp acompanhar o PDF.

### O que não vem desse tipo de documento (fica vazio / `NULL` no banco)

Comprovantes **não** trazem andamento avançado. Os campos abaixo **não são extraídos** hoje e permanecem `NULL` até preenchimento manual, outra fonte ou evolução do pipeline para **outros** PDFs (ex. sentença, acórdão):

- `turma`
- `data_sentenca`
- `sentenca`
- `valor_sentenca`
- `recurso`

Isso é esperado: não é falha da extração do comprovante, é **fora do escopo** do documento.

## Docker

Existe `skill/Dockerfile` para subir o mesmo serviço em container, mapeando a porta 5001.
