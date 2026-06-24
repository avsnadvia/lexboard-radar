import { Router } from "express";
import { Area } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../auth";
import { wrap } from "../http/wrap";
import { runFonte } from "../services/ingest";

const router = Router();
router.use(requireAuth);

const AREAS = new Set<string>(Object.values(Area));

// Listar fontes (com contagem de processos).
router.get(
  "/fontes",
  wrap(async (_req, res) => {
    const items = await prisma.fonte.findMany({
      orderBy: { nome: "asc" },
      include: { _count: { select: { processos: true } } },
    });
    res.json({ items });
  })
);

// Criar fonte (admin) — é assim que se adiciona outra comarca/justiça.
router.post(
  "/fontes",
  requireAdmin,
  wrap(async (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const nome = typeof b.nome === "string" ? b.nome.trim() : "";
    const datajudAlias = typeof b.datajudAlias === "string" ? b.datajudAlias.trim() : "";
    const orgaoContains = typeof b.orgaoContains === "string" ? b.orgaoContains.trim() : "";
    const orgaoContainsAny =
      typeof b.orgaoContainsAny === "string" && b.orgaoContainsAny.trim()
        ? b.orgaoContainsAny.trim()
        : null;
    const area = typeof b.area === "string" && AREAS.has(b.area) ? (b.area as Area) : Area.OUTRO;
    const cursorAjuizamento =
      typeof b.cursorAjuizamento === "string" && b.cursorAjuizamento
        ? b.cursorAjuizamento
        : undefined;
    if (!nome || !datajudAlias || !orgaoContains) {
      res.status(400).json({ error: "nome, datajudAlias e orgaoContains são obrigatórios" });
      return;
    }
    try {
      const fonte = await prisma.fonte.create({
        data: { nome, datajudAlias, orgaoContains, orgaoContainsAny, area, cursorAjuizamento },
      });
      res.status(201).json(fonte);
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") {
        res.status(409).json({ error: "Já existe fonte com esse tribunal + comarca + área" });
        return;
      }
      throw e;
    }
  })
);

// Editar fonte (admin): ativar/desativar, renomear, ajustar cursor.
router.patch(
  "/fontes/:id",
  requireAdmin,
  wrap(async (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const fonte = await prisma.fonte.update({
      where: { id: req.params.id },
      data: {
        nome: typeof b.nome === "string" ? b.nome : undefined,
        ativo: typeof b.ativo === "boolean" ? b.ativo : undefined,
        orgaoContains: typeof b.orgaoContains === "string" ? b.orgaoContains : undefined,
        cursorAjuizamento:
          typeof b.cursorAjuizamento === "string" ? b.cursorAjuizamento : undefined,
      },
    });
    res.json(fonte);
  })
);

// Disparar ingestão da fonte em segundo plano (admin).
router.post(
  "/fontes/:id/run",
  requireAdmin,
  wrap(async (req, res) => {
    const id = req.params.id;
    const fonte = await prisma.fonte.findUnique({ where: { id } });
    if (!fonte) {
      res.status(404).json({ error: "Fonte não encontrada" });
      return;
    }
    res.json({ ok: true, message: "Ingestão iniciada em segundo plano" });
    runFonte(id, 2000).catch((err) => console.error("Erro na ingestão da fonte", id, err));
  })
);

export default router;
