import { Polo } from "@prisma/client";
import { prisma } from "../db";
import { datajudDistribuidos } from "./datajud";
import { djenPartes } from "./djen";
import { digits, mascaraCnj, normEmpresa, ehEmpresa } from "../lib/cnj";
import { sleep } from "../lib/util";
import { env } from "../config/env";

function agoraAjuizamento(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}235959`;
}

function parseAjuizamento(s?: string): Date {
  const v = String(s ?? "");
  if (v.length >= 8) {
    const dt = new Date(
      Date.UTC(
        Number(v.slice(0, 4)),
        Number(v.slice(4, 6)) - 1,
        Number(v.slice(6, 8)),
        Number(v.slice(8, 10) || "0"),
        Number(v.slice(10, 12) || "0"),
        Number(v.slice(12, 14) || "0")
      )
    );
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  return new Date();
}

export interface IngestResult {
  total: number;
  novos: number;
}

/**
 * Passo 1 — captar do DataJud os distribuídos NOVOS da fonte (incremental).
 * Usa cursorAjuizamento como piso; dedupe por unique(fonteId, numeroDigits).
 */
export async function ingestDistribuidos(
  fonteId: string,
  onPage?: (n: number) => void
): Promise<IngestResult> {
  const fonte = await prisma.fonte.findUniqueOrThrow({ where: { id: fonteId } });
  const gte = fonte.cursorAjuizamento ?? env.datajudStart;
  const lte = agoraAjuizamento();

  const hits = await datajudDistribuidos({
    alias: fonte.datajudAlias,
    orgaoContains: fonte.orgaoContains,
    gte,
    lte,
    onPage,
  });

  let novos = 0;
  let maxCursor = gte;
  for (const h of hits) {
    const dig = digits(h.numeroProcesso);
    if (dig.length !== 20) continue;
    if (h.dataAjuizamento && h.dataAjuizamento > maxCursor) maxCursor = h.dataAjuizamento;
    const assuntos = (h.assuntos ?? [])
      .map((a) => a?.nome)
      .filter((x): x is string => Boolean(x))
      .join("; ");
    try {
      await prisma.processo.create({
        data: {
          fonteId,
          numero: mascaraCnj(h.numeroProcesso),
          numeroDigits: dig,
          tribunal: h.tribunal ?? null,
          orgaoJulgador: h.orgaoJulgador?.nome ?? null,
          classe: h.classe?.nome ?? null,
          assuntos: assuntos || null,
          dataAjuizamento: parseAjuizamento(h.dataAjuizamento),
          grau: h.grau ?? null,
          nivelSigilo: h.nivelSigilo ?? null,
        },
      });
      novos++;
    } catch (e) {
      // P2002 = unique violada (já existe) → ignora (idempotente)
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }

  await prisma.fonte.update({
    where: { id: fonteId },
    data: { cursorAjuizamento: maxCursor, ultimaIngestaoAt: new Date() },
  });

  return { total: hits.length, novos };
}

export interface EnriquecerResult {
  processados: number;
  ok: number;
  erros: number;
}

/**
 * Passo 2 — para processos ainda sem partes, buscar reclamante/reclamado no DJEN.
 * Em erro persistente, NÃO marca como buscado (retoma na próxima rodada).
 */
export async function enriquecerPartes(
  fonteId: string,
  limit = 500
): Promise<EnriquecerResult> {
  const pendentes = await prisma.processo.findMany({
    where: { fonteId, partesBuscadas: false },
    take: limit,
    orderBy: { dataAjuizamento: "desc" },
  });

  let ok = 0;
  let erros = 0;
  for (const p of pendentes) {
    let partes;
    try {
      partes = await djenPartes(p.numeroDigits);
    } catch {
      erros++;
      continue;
    }
    const rows = [
      ...partes.reclamantes.map((nome) => ({ nome, polo: Polo.A })),
      ...partes.reclamados.map((nome) => ({ nome, polo: Polo.P })),
    ];
    await prisma.$transaction([
      prisma.parte.deleteMany({ where: { processoId: p.id } }),
      ...(rows.length
        ? [
            prisma.parte.createMany({
              data: rows.map((r) => ({
                processoId: p.id,
                nome: r.nome,
                nomeNorm: normEmpresa(r.nome),
                polo: r.polo,
                ehEmpresa: ehEmpresa(r.nome),
              })),
            }),
          ]
        : []),
      prisma.processo.update({
        where: { id: p.id },
        data: { partesBuscadas: true, partesBuscadaAt: new Date() },
      }),
    ]);
    ok++;
    await sleep(200);
  }
  return { processados: pendentes.length, ok, erros };
}

/** Roda uma fonte ponta a ponta: captar + enriquecer. */
export async function runFonte(fonteId: string, enriquecerLimit = 1000) {
  const dist = await ingestDistribuidos(fonteId);
  const enr = await enriquecerPartes(fonteId, enriquecerLimit);
  return { dist, enr };
}

/** Roda todas as fontes ativas (usado pelo job automático). */
export async function runFontesAtivas(enriquecerLimit = 1000) {
  const fontes = await prisma.fonte.findMany({ where: { ativo: true } });
  const out: Record<string, { dist: IngestResult; enr: EnriquecerResult }> = {};
  for (const f of fontes) {
    out[f.nome] = await runFonte(f.id, enriquecerLimit);
  }
  return out;
}
