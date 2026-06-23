import dotenv from "dotenv";

dotenv.config();

function read(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return v;
}

export const env = {
  databaseUrl: read("DATABASE_URL"),
  jwtSecret: read("JWT_SECRET", "dev-secret-troque-em-producao"),
  // Header Authorization completo do DataJud (chave pública publicada pelo CNJ).
  datajudApiKey: read(
    "DATAJUD_APIKEY",
    "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw"
  ),
  datajudBase: process.env.DATAJUD_BASE ?? "https://api-publica.datajud.cnj.jus.br",
  djenBase: process.env.DJEN_BASE ?? "https://comunicaapi.pje.jus.br/api/v1/comunicacao",
  // Data inicial padrão da captura quando a fonte ainda não tem cursor (AAAAMMDDHHMMSS).
  datajudStart: process.env.DATAJUD_START ?? "20260101000000",
  port: Number(process.env.PORT ?? "8080"),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
};
