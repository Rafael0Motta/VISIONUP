# Disparo Certo

Plataforma web multi-tenant de governança de campanhas de WhatsApp. O app cuida de organizações, aprovação de campanhas, templates e relatórios — o disparo em si (Infobip) e as automações de equipe (ClickUp) vivem no n8n, fora deste projeto. O app só troca dados com o n8n via webhooks (saída) e uma API autenticada por token de serviço (entrada).

Stack: Next.js 16 (App Router) + Supabase (Postgres/Auth/Storage/RLS) + Tailwind v4 + shadcn/ui.

## Desenvolvimento local

Requer Node 22+ (ver `.nvmrc`).

```bash
npm install
cp .env.example .env.local   # preencha com as credenciais do seu projeto Supabase
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

Ver `.env.example` para a lista completa e onde pegar cada valor. Resumo:

| Variável | Onde é usada | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | precisa também ser **build arg** do Docker (ver abaixo) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | nunca expor ao client; ignora RLS |
| `N8N_SERVICE_TOKEN` | server-only | autentica os callbacks do n8n (`Authorization: Bearer`) |
| `INTERNAL_API_TOKEN` | server-only | protege o gatilho manual de sweep de webhooks |

## Migrations (Supabase)

O schema/RLS vive em `supabase/migrations/`. Pra aplicar num projeto Supabase:

```bash
npx supabase login
npx supabase link --project-ref <seu-project-ref>
npx supabase db push --linked -p <senha-do-banco>
```

Depois de qualquer migration, regenere os tipos:

```bash
npx supabase gen types typescript --project-id <seu-project-ref> > src/types/supabase.ts
```

## Deploy (Docker + EasyPanel)

O projeto já vem com `Dockerfile` (multi-stage, Next.js em modo `standalone`) pronto pra build direto do GitHub.

### 1. Suba o código pro GitHub
Este repositório já está preparado — é só conectar o EasyPanel a ele.

### 2. Crie o serviço no EasyPanel
- Tipo: **App** a partir de repositório Git (GitHub).
- Build: **Dockerfile** (raiz do projeto).
- Porta interna do container: **3000**.

### 3. Configure os *build args* (importante!)
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são inlinados no bundle do navegador **durante o build**, não em runtime. No EasyPanel isso fica na aba de build do serviço (Build Args), não junto das env vars normais:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Se só configurar como env var de runtime, o app builda mas o client do navegador fica sem conseguir falar com o Supabase.

### 4. Configure as env vars de runtime
Todas as 5 variáveis de `.env.example` (as duas `NEXT_PUBLIC_*` também aqui, além das 3 server-only). O container lê `PORT`/`HOSTNAME` automaticamente (já vem `PORT=3000`, `HOSTNAME=0.0.0.0` no Dockerfile).

### 5. Aplique as migrations no Supabase
O container **não** roda migrations sozinho — isso é feito uma vez, manualmente (ou via CI), com o comando da seção acima, apontando pra o mesmo projeto Supabase que as env vars de produção referenciam.

### 6. Health check
O container expõe `GET /api/health` (retorna `{"ok":true}`) e já tem um `HEALTHCHECK` no Dockerfile. Se o EasyPanel pedir um path de health check, use `/api/health`.

### O que roda dentro do container
Um único processo Node (`server.js`, gerado pelo build standalone do Next.js) atende as rotas HTTP **e** o job de retry de webhooks (agendado via `node-cron` em `src/instrumentation.ts`, a cada 2 minutos) — não precisa de um serviço/worker separado.

### Build local (opcional, pra testar antes de configurar o EasyPanel)

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -t disparo-certo .

docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e N8N_SERVICE_TOKEN=... \
  -e INTERNAL_API_TOKEN=... \
  disparo-certo
```
