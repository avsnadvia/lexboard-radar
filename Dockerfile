# LexBoard — Radar de Distribuições (API + front num único serviço)
FROM node:20-slim

# Prisma precisa de openssl
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependências da API
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Dependências do front
COPY web/package*.json ./web/
RUN cd web && npm install --no-audit --no-fund

# Código-fonte
COPY . .

# Build: front (web/dist) + client Prisma + API (dist/)
RUN cd web && npm run build
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080

# No start: aplica o schema, garante o seed (idempotente) e sobe o servidor.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/prisma/seed.js && node dist/src/index.js"]
