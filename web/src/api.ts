const BASE = import.meta.env.VITE_API_URL ?? "";

let token: string | null = localStorage.getItem("radar_token");

export function getToken(): string | null {
  return token;
}
export function setToken(t: string | null): void {
  token = t;
  if (t) localStorage.setItem("radar_token", t);
  else localStorage.removeItem("radar_token");
}

export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}
export interface Parte {
  id: string;
  nome: string;
  nomeNorm: string;
  polo: "A" | "P";
  ehEmpresa: boolean;
}
export interface Processo {
  id: string;
  numero: string;
  orgaoJulgador: string | null;
  classe: string | null;
  assuntos: string | null;
  dataAjuizamento: string;
  partesBuscadas: boolean;
  partes: Parte[];
  fonte?: { nome: string; area: string };
}
export interface Fonte {
  id: string;
  nome: string;
  datajudAlias: string;
  orgaoContains: string;
  orgaoContainsAny?: string | null;
  area: string;
  ativo: boolean;
  cursorAjuizamento: string | null;
  ultimaIngestaoAt: string | null;
  _count?: { processos: number };
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + path, { ...opts, headers });
  if (r.status === 401) {
    setToken(null);
    throw new Error("Sessão expirada. Entre novamente.");
  }
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(e.error ?? `Erro ${r.status}`);
  }
  return (await r.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    req<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => req<{ user: { sub: string; email: string; isAdmin: boolean } }>("/me"),
  processos: (qs: string) =>
    req<{ total: number; page: number; pageSize: number; items: Processo[] }>(
      `/api/processos?${qs}`
    ),
  ranking: (qs: string) =>
    req<{ items: { empresa: string; qtd: number }[] }>(`/api/ranking?${qs}`),
  evolucao: (qs: string) =>
    req<{ items: { mes: string; qtd: number }[] }>(`/api/evolucao?${qs}`),
  agregado: (qs: string) =>
    req<{ items: { rotulo: string; qtd: number }[] }>(`/api/agregado?${qs}`),
  stats: (qs: string) =>
    req<{ total: number; comPartes: number; semPartes: number }>(`/api/stats?${qs}`),
  fontes: () => req<{ items: Fonte[] }>("/api/fontes"),
  criarFonte: (data: Record<string, unknown>) =>
    req<Fonte>("/api/fontes", { method: "POST", body: JSON.stringify(data) }),
  patchFonte: (id: string, data: Record<string, unknown>) =>
    req<Fonte>(`/api/fontes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  runFonte: (id: string) =>
    req<{ ok: boolean; message: string }>(`/api/fontes/${id}/run`, { method: "POST" }),
};

export async function baixarCsv(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + path, { headers });
  if (!r.ok) throw new Error("Falha ao exportar");
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
