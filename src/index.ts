import path from "path";
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { requireAuth } from "./auth";
import { iniciarScheduler } from "./scheduler";
import authRoutes from "./routes/auth.routes";
import processosRoutes from "./routes/processos.routes";
import fontesRoutes from "./routes/fontes.routes";

const app = express();

app.use(
  cors({
    origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(",").map((s) => s.trim()),
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "lexboard-radar" });
});

app.use("/auth", authRoutes);
app.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
app.use("/api", processosRoutes);
app.use("/api", fontesRoutes);

// Serve o front (build estático) na mesma origem → um único deploy.
const webDir = process.env.WEB_DIR ?? path.join(process.cwd(), "web", "dist");
app.use(express.static(webDir));
// SPA fallback (tudo que não for API devolve o index.html).
app.get(/^(?!\/(api|auth|me|health)).*/, (_req, res) => {
  res.sendFile(path.join(webDir, "index.html"));
});

// Error handler central.
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
);

app.listen(env.port, () => {
  console.log(`LexBoard Radar ouvindo em :${env.port}`);
  if (process.env.ENABLE_SCHEDULER !== "false") iniciarScheduler();
});
