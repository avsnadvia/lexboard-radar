import { FormEvent, useState } from "react";
import { api, setToken, User } from "./api";
import { Button, Field, Input } from "./ui";

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const r = await api.login(email, password);
      setToken(r.token);
      onLogin(r.user);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-brand-dark p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue text-lg font-extrabold text-white">
            LB
          </div>
          <h1 className="text-xl font-bold text-white">LexBoard</h1>
          <p className="text-sm text-slate-400">Radar de Distribuições</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <Field label="E-mail">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button type="submit" disabled={carregando} className="w-full">
            {carregando ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
