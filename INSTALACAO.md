# Manual de Instalação — LexBoard · Radar de Distribuições

Guia passo a passo para colocar o Radar no ar. **Você não precisa programar nem
criar nenhum arquivo** — está tudo pronto na pasta `lexboard-radar`. São só 2
coisas: mandar a pasta pro GitHub e ligar 2 serviços no Easypanel.

Tempo estimado: ~20 minutos.

---

## Visão geral (o caminho todo)

```
   [pasta lexboard-radar]  ──►  [GitHub]  ──►  [Easypanel]  ──►  no ar 🎉
       (já pronta)            Passo 1        Passos 2 a 5
```

1. **Passo 1** — Enviar a pasta pro GitHub (repositório `lexboard-radar`).
2. **Passo 2** — Criar o banco de dados (Postgres) no Easypanel.
3. **Passo 3** — Configurar o aplicativo (origem GitHub + variáveis + domínio).
4. **Passo 4** — Deploy e conferir os logs.
5. **Passo 5** — Primeiro acesso e puxar os dados de 2026.

---

## Os arquivos (já estão prontos — nada a criar)

Tudo isto já existe dentro da pasta `lexboard-radar`. Só para você reconhecer:

| Arquivo / pasta | Para que serve |
|---|---|
| `Dockerfile` | Receita que o Easypanel usa para montar tudo |
| `package.json`, `tsconfig.json` | Configuração do servidor (API) |
| `prisma/schema.prisma` | Estrutura do banco de dados |
| `src/` | A API + o motor que busca DataJud/DJEN |
| `web/` | A página (tela de login + painel) |
| `.env.example` | Modelo das variáveis (referência) |
| `README.md` | Documentação técnica |

Você **não abre nem edita** esses arquivos. Só vai mandá-los pro GitHub.

---

## Passo 1 — Enviar a pasta pro GitHub

### 1a) Criar o repositório vazio

1. Acesse https://github.com/new
2. **Owner:** `avsnadvia` · **Repository name:** `lexboard-radar`
3. Deixe **Private** (recomendado).
4. **NÃO** marque "Add a README", ".gitignore" nem "license" (deixe tudo desmarcado).
5. Clique **Create repository**.

### 1b) Mandar a pasta para esse repositório

**Opção fácil — GitHub Desktop (recomendado se você não usa terminal):**

1. Abra o **GitHub Desktop** → menu **File → Add Local Repository**.
2. Selecione a pasta `lexboard-radar`
   (em `Documentos/Claude/Projects/Advocore - Sistemas Jurídicos/lexboard-radar`).
3. Ele vai dizer que não é um repositório git → clique **create a repository** →
   **Create Repository**.
4. Clique **Publish repository** (em cima, à direita) → escolha a conta
   `avsnadvia`, nome `lexboard-radar`, mantenha **Keep this code private** →
   **Publish Repository**.

Pronto: o código está no GitHub.

**Opção terminal (alternativa):** abra o Terminal e cole:

```bash
cd ~/Documents/Claude/Projects/"Advocore - Sistemas Jurídicos"/lexboard-radar
git init
git add .
git commit -m "LexBoard Radar — versão inicial"
git branch -M main
git remote add origin https://github.com/avsnadvia/lexboard-radar.git
git push -u origin main
```

> Se pedir senha no `push`, use um **Personal Access Token** do GitHub (não a senha
> normal). Por isso o GitHub Desktop costuma ser mais simples.

---

## Passo 2 — Criar o banco (Postgres) no Easypanel

No Easypanel, dentro do projeto **`lexboard-radar`**:

1. Clique em **+ Serviço** (ou no `+` ao lado de SERVIÇOS).
2. Escolha o bloco **Postgres**.
3. **Nome do serviço:** `db`
4. Defina uma **senha** (anote — você vai usar no Passo 3). Pode deixar usuário e
   database como `postgres`.
5. Clique **Criar**.
6. Abra o serviço `db` → procure a **connection string / URL interna**. Vai ter
   este formato (copie a sua):

```
postgres://postgres:SUA_SENHA@lexboard-radar_db:5432/postgres
```

Guarde essa URL — é o `DATABASE_URL` do próximo passo.

---

## Passo 3 — Configurar o aplicativo (`radar`)

Você já tem o serviço **`radar`** (o Aplicativo). Abra ele e preencha 4 abas:

### Aba Origem (Source)
- **GitHub** → repositório `avsnadvia/lexboard-radar` → branch **`main`**.

### Aba Build
- Tipo: **Dockerfile**
- Caminho do arquivo: `./Dockerfile`

### Aba Environment (variáveis)
Cole exatamente isto, trocando os valores entre `< >` e a senha do banco:

```
DATABASE_URL=postgres://postgres:SUA_SENHA@lexboard-radar_db:5432/postgres
JWT_SECRET=<invente-uma-chave-aleatoria-bem-longa>
DATAJUD_APIKEY=APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw
DATAJUD_START=20260101000000
ADMIN_EMAIL=rodrigo@avsn.com.br
ADMIN_PASSWORD=<senha-que-voce-vai-usar-para-entrar>
INGEST_HOUR=8
PORT=8080
```

### Aba Domains (domínio)
- Adicione um domínio (ex.: `radar.lexboard.com.br`) apontando para a **porta 8080**.
- (No seu provedor de DNS, aponte esse subdomínio para o IP `187.127.29.122`.)

---

## Passo 4 — Deploy e conferência

1. No serviço `radar`, clique **Deploy** (ou **Implantar**).
2. Abra a aba **Logs / Implantações** e acompanhe. A primeira vez demora alguns
   minutos (ele monta o front + a API).
3. Deu certo quando aparecer, no fim do log, algo como:

```
Seed OK — fonte "Trabalhista — Ribeirão Preto" criada e admin rodrigo@avsn.com.br.
LexBoard Radar ouvindo em :8080
```

---

## Passo 5 — Primeiro acesso e puxar 2026

1. Abra o domínio que você configurou (ex.: `https://radar.lexboard.com.br`).
2. Entre com **ADMIN_EMAIL** e **ADMIN_PASSWORD** (os que você pôs no Passo 3).
3. Clique em **Fontes** (canto superior direito).
4. Na fonte "Trabalhista — Ribeirão Preto", clique **Rodar agora**.
   - Ele vai puxar os distribuídos de 2026 e buscar as partes (roda em segundo
     plano; pode levar um tempo). Atualize a página depois de alguns minutos.
5. Daí pra frente o sistema **se atualiza sozinho todo dia** (madrugada).

---

## Variáveis de ambiente (referência)

| Variável | O que é | Exemplo |
|---|---|---|
| `DATABASE_URL` | Endereço do banco (Passo 2) | `postgres://postgres:senha@lexboard-radar_db:5432/postgres` |
| `JWT_SECRET` | Segredo do login | uma frase longa aleatória |
| `DATAJUD_APIKEY` | Chave pública do CNJ | `APIKey cDZHYzlZ...` (já preenchida) |
| `DATAJUD_START` | Data inicial da captura | `20260101000000` (2026) |
| `ADMIN_EMAIL` | Seu login | `rodrigo@avsn.com.br` |
| `ADMIN_PASSWORD` | Sua senha | escolha uma |
| `INGEST_HOUR` | Hora da atualização diária (UTC) | `8` (≈5h de Brasília) |
| `PORT` | Porta do app | `8080` |

---

## Problemas comuns

- **"repository not found" na aba Origem:** o código não foi pro GitHub (refaça o
  Passo 1) ou o Easypanel não tem acesso ao `avsnadvia` (conecte a conta GitHub
  nas configurações do Easypanel).
- **Log com erro de banco / "can't reach database":** confira o `DATABASE_URL` —
  o host tem que ser o nome do serviço Postgres (`lexboard-radar_db`) e a senha
  tem que bater com a do Passo 2.
- **Abriu mas não loga:** confirme `ADMIN_EMAIL`/`ADMIN_PASSWORD` e veja no log se
  apareceu "Seed OK". Se mudou a senha depois, ela só é criada no primeiro boot;
  para trocar, me chame que ajusto.
- **Tabela vazia / ranking vazio:** você ainda não rodou a ingestão — faça o
  Passo 5 (Fontes → Rodar agora) e aguarde.

---

## Checklist final

- [ ] Repositório `avsnadvia/lexboard-radar` criado e com o código (Passo 1)
- [ ] Serviço **Postgres** `db` criado, senha anotada (Passo 2)
- [ ] App `radar`: Origem GitHub + Build Dockerfile + Variáveis + Domínio (Passo 3)
- [ ] Deploy concluído, log mostrando "Seed OK" e "ouvindo em :8080" (Passo 4)
- [ ] Login funcionando + "Rodar agora" na fonte de RP (Passo 5)
```
