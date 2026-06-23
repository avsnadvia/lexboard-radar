# LexBoard — Radar de Distribuições

Produto **independente** (banco, login e domínio próprios) que capta processos
**distribuídos** no DataJud e enriquece com as **partes** (reclamante/reclamado)
do DJEN, mantendo um banco **sempre atualizado** e **extensível** por "fontes"
(tribunal + comarca + área).

Primeira fonte: **Trabalhista — Ribeirão Preto (TRT-15)**, a partir de **2026**.

## Status — pronto para deploy

- **Fase 1 — Motor:** modelo de dados (Prisma), clientes DataJud/DJEN, ingestão incremental, seed, CLI.
- **Fase 2 — API + login:** Express + JWT (poucos usuários), processos/ranking/stats/fontes/export.
- **Fase 3 — Página:** SPA React/Vite/Tailwind (visual LexBoard) — login, filtros, tabela, ranking, export.
- **Fase 4 — Automático + deploy:** scheduler diário de ingestão + Dockerfile (um único serviço).

Tudo com typecheck/build limpos.

## Arquitetura

```
src/                API Express + serviço de ingestão + scheduler
  services/         datajud.ts · djen.ts · ingest.ts
  routes/           auth · processos · fontes
prisma/schema.prisma  Fonte, Processo, Parte (polo A/P), User
web/                front SPA (React + Vite + Tailwind) — servido pela própria API
Dockerfile          build do front + API num único contêiner
```

O Express serve a API (`/api`, `/auth`) **e** o front (build estático) na mesma
origem → **um único serviço** no Easypanel, sem CORS.

## Deploy no Easypanel (serviço separado, banco próprio)

1. **Postgres:** crie um serviço Postgres novo (banco próprio, separado do avsn.cloud).
2. **App:** novo serviço a partir deste repositório, build pelo **Dockerfile**. Porta **8080**.
3. **Domínio:** aponte um subdomínio LexBoard (ex.: `radar.lexboard.com.br`).
4. **Variáveis de ambiente** do serviço App:

| Variável | Exemplo / valor |
|---|---|
| `DATABASE_URL` | string do Postgres do passo 1 |
| `JWT_SECRET` | chave aleatória longa |
| `DATAJUD_APIKEY` | `APIKey cDZHYzlZ...` (chave pública do CNJ) |
| `DATAJUD_START` | `20260101000000` |
| `ADMIN_EMAIL` | `rodrigo@avsn.com.br` |
| `ADMIN_PASSWORD` | senha do 1º acesso |
| `INGEST_HOUR` | `8` (≈05:00 BRT; hora UTC do container) |

No start o contêiner aplica o schema (`prisma db push`), roda o **seed**
(idempotente — cria a fonte RP/trabalhista e o admin) e sobe o servidor.

## Primeiro acesso e backfill de 2026

1. Acesse o subdomínio e entre com `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. Abra **Fontes** (canto superior) → na fonte "Trabalhista — Ribeirão Preto"
   clique **Rodar agora** para captar 2026 e buscar as partes (roda em segundo plano).
   - Alternativa por console do serviço: `npm run ingest:prod`
   - Pode rodar mais de uma vez: a captação é incremental e o enriquecimento retoma.
3. Depois disso, o **scheduler** mantém o banco atualizado todo dia (item 2).

## Uso local (dev)

Postgres local (ex.: `docker run --name radar-db -e POSTGRES_PASSWORD=radar -e POSTGRES_USER=radar -e POSTGRES_DB=lexboard_radar -p 5432:5432 -d postgres:16`), depois:

```bash
# API
cp .env.example .env        # ajuste DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
npm install
npx prisma generate && npx prisma db push
npm run seed
npm run dev                 # API em :8080
# Front (outro terminal)
cd web && npm install && npm run dev   # front em :5173 (proxy p/ :8080)
```

## Extensão — outras comarcas/justiças (item 3)

Em **Fontes → Adicionar fonte**: informe o `datajudAlias` do tribunal
(ex.: `api_publica_tjsp` para o TJSP), o `Órgão contém` (ex.: "Ribeirão Preto")
e a área. O motor passa a captar essa fonte automaticamente. Sem mexer em código.

## Conformidade

DataJud não traz nomes de partes (Resolução CNJ 331/2020); as partes vêm do DJEN
(publicações oficiais). Uso voltado a **pesquisa/inteligência** — atenção à LGPD
(finalidade, não captação) e aos termos de uso de DataJud/DJEN.
