import { Router } from "express";
import { Polo } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth } from "../auth";
import { wrap } from "../http/wrap";
import { buildProcessoWhere, ProcessoFiltro } from "../lib/filters";
import { toCsv } from "../lib/csv";

const router = Router();
router.use(requireAuth);

function filtro(q: Record<string, unknown>): ProcessoFiltro {
  const s = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  return {
    fonteId: s(q.fonteId),
    area: s(q.area),
    q: s(q.q),
    dataIni: s(q.dataIni),
    dataFim: s(q.dataFim),
    classe: s(q.classe),
  };
}

const num = (v: unknown, def: number) => Number(v ?? def) || def;

// Lista paginada de processos (com partes).
router.get(
  "/processos",
  wrap(async (req, res) => {
    const where = buildProcessoWhere(filtro(req.query));
    const page = Math.max(1, num(req.query.page, 1));
    const pageSize = Math.min(200, Math.max(1, num(req.query.pageSize, 50)));
    const [total, items] = await prisma.$transaction([
      prisma.processo.count({ where }),
      prisma.processo.findMany({
        where,
        include: { partes: true, fonte: { select: { nome: true, area: true } } },
        orderBy: { dataAjuizamento: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    res.json({ total, page, pageSize, items });
  })
);

// Detalhe de um processo.
router.get(
  "/processos/:id",
  wrap(async (req, res) => {
    const p = await prisma.processo.findUnique({
      where: { id: req.params.id },
      include: { partes: true, fonte: true },
    });
    if (!p) {
      res.status(404).json({ error: "Processo não encontrado" });
      return;
    }
    res.json(p);
  })
);

// Ranking de empresas mais demandadas (reclamados, polo P).
router.get(
  "/ranking",
  wrap(async (req, res) => {
    const where = buildProcessoWhere(filtro(req.query));
    const limit = Math.min(500, Math.max(1, num(req.query.limit, 50)));
    const grouped = await prisma.parte.groupBy({
      by: ["nomeNorm"],
      where: { polo: Polo.P, processo: where },
      _count: { _all: true },
      orderBy: { _count: { nomeNorm: "desc" } },
      take: limit,
    });
    res.json({ items: grouped.map((g) => ({ empresa: g.nomeNorm, qtd: g._count._all })) });
  })
);

// Contagens básicas.
router.get(
  "/stats",
  wrap(async (req, res) => {
    const where = buildProcessoWhere(filtro(req.query));
    const [total, comPartes] = await prisma.$transaction([
      prisma.processo.count({ where }),
      prisma.processo.count({ where: { ...where, partesBuscadas: true } }),
    ]);
    res.json({ total, comPartes, semPartes: total - comPartes });
  })
);

// Exportar processos filtrados em CSV.
router.get(
  "/processos.csv",
  wrap(async (req, res) => {
    const where = buildProcessoWhere(filtro(req.query));
    const items = await prisma.processo.findMany({
      where,
      include: { partes: true },
      orderBy: { dataAjuizamento: "desc" },
      take: 50000,
    });
    const rows = items.map((p) => [
      p.numero,
      p.dataAjuizamento.toISOString().slice(0, 10),
      p.orgaoJulgador ?? "",
      p.classe ?? "",
      p.assuntos ?? "",
      p.partes.filter((x) => x.polo === Polo.A).map((x) => x.nome).join(" | "),
      p.partes.filter((x) => x.polo === Polo.P).map((x) => x.nome).join(" | "),
    ]);
    const csv = toCsv(
      ["Numero", "Data", "Vara", "Classe", "Assuntos", "Reclamante", "Reclamado"],
      rows
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="processos.csv"');
    res.send(csv);
  })
);

// Exportar ranking em CSV.
router.get(
  "/ranking.csv",
  wrap(async (req, res) => {
    const where = buildProcessoWhere(filtro(req.query));
    const grouped = await prisma.parte.groupBy({
      by: ["nomeNorm"],
      where: { polo: Polo.P, processo: where },
      _count: { _all: true },
      orderBy: { _count: { nomeNorm: "desc" } },
      take: 2000,
    });
    const csv = toCsv(
      ["Reclamado", "Qtd processos"],
      grouped.map((g) => [g.nomeNorm, String(g._count._all)])
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="ranking_reclamados.csv"');
    res.send(csv);
  })
);

export default router;
