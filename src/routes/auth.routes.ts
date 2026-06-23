import { Router } from "express";
import { login } from "../auth";
import { wrap } from "../http/wrap";

const router = Router();

router.post(
  "/login",
  wrap(async (req, res) => {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Informe e-mail e senha" });
      return;
    }
    const result = await login(String(email), String(password));
    if (!result) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }
    res.json(result);
  })
);

export default router;
