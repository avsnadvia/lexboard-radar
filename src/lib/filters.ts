import { Prisma, Area } from "@prisma/client";
import { digits, normEmpresa } from "./cnj";

export interface ProcessoFiltro {
  fonteId?: string;
  area?: string;
  q?: string; // número (CNJ/livre) OU nome de parte
  dataIni?: string; // YYYY-MM-DD
  dataFim?: string; // YYYY-MM-DD
  classe?: string;
  varas?: string[]; // filtra por órgão julgador exato (uma ou mais varas)
  assuntos?: string[]; // filtra por tipo de crime/assunto (um ou mais)
}

const AREAS = new Set<string>(Object.values(Area));

/** Monta o filtro Prisma de Processo a partir dos parâmetros da query. */
export function buildProcessoWhere(f: ProcessoFiltro): Prisma.ProcessoWhereInput {
  const where: Prisma.ProcessoWhereInput = {};
  if (f.fonteId) where.fonteId = f.fonteId;
  if (f.area && AREAS.has(f.area)) where.fonte = { area: f.area as Area };
  if (f.classe) where.classe = { contains: f.classe, mode: "insensitive" };
  if (f.varas && f.varas.length > 0) where.orgaoJulgador = { in: f.varas };
  if (f.assuntos && f.assuntos.length > 0) {
    where.AND = [
      { OR: f.assuntos.map((a) => ({ assuntos: { contains: a, mode: "insensitive" as const } })) },
    ];
  }

  const data: Prisma.DateTimeFilter = {};
  if (f.dataIni) data.gte = new Date(`${f.dataIni}T00:00:00.000Z`);
  if (f.dataFim) data.lte = new Date(`${f.dataFim}T23:59:59.999Z`);
  if (data.gte || data.lte) where.dataAjuizamento = data;

  if (f.q && f.q.trim()) {
    const dig = digits(f.q);
    if (dig.length >= 6) {
      where.numeroDigits = { contains: dig };
    } else {
      where.partes = { some: { nomeNorm: { contains: normEmpresa(f.q) } } };
    }
  }
  return where;
}
