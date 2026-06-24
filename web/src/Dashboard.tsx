import { useCallback, useEffect, useState } from "react";
import { api, baixarCsv, Fonte, Processo, User } from "./api";
import { Button, Card, Field, Input, Select, Spinner } from "./ui";
import Fontes from "./Fontes";

interface Filtros {
  fonteId: string;
  area: string;
  q: string;
  dataIni: string;
  dataFim: string;
  classe: string;
}
const FILTROS_VAZIO: Filtros = {
  fonteId: "",
  area: "",
  q: "",
  dataIni: "",
  dataFim: "",
  classe: "",
};

function qsDe(f: Filtros, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  (Object.entries(f) as [string, string][]).forEach(([k, v]) => {
    if (v) p.set(k, v);
  });
  Object.entries(extra).forEach(([k, v]) => {
    if (v) p.set(k, v);
  });
  return p.toString();
}

const fmtData = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
};

const PAGE_SIZE = 25;

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIO);
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [stats, setStats] = useState<{ total: number; comPartes: number; semPartes: number } | null>(
    null
  );
  const [ranking, setRanking] = useState<{ empresa: string; qtd: number }[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [showFontes, setShowFontes] = useState(false);

  const carregarFontes = useCallback(async () => {
    try {
      const r = await api.fontes();
      setFontes(r.items);
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    void carregarFontes();
  }, [carregarFontes]);

  const carregar = useCallback(async (f: Filtros, pg: number) => {
    setCarregando(true);
    setErro("");
    try {
      const [st, rk, pr] = await Promise.all([
        api.stats(qsDe(f)),
        api.ranking(qsDe(f, { limit: "15" })),
        api.processos(qsDe(f, { page: String(pg), pageSize: String(PAGE_SIZE) })),
      ]);
      setStats(st);
      setRanking(rk.items);
      setProcessos(pr.items);
      setTotal(pr.total);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar(filtros, page);
  }, [carregar, filtros, page]);

  function aplicar(parc: Partial<Filtros>) {
    setPage(1);
    setFiltros((f) => ({ ...f, ...parc }));
  }

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const maxQtd = ranking.length ? ranking[0].qtd : 1;

  return (
    <div className="min-h-full">
      <header className="bg-brand-dark text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white px-2.5 py-1.5">
              <img src="/lexboard-logo.png" alt="LexBoard" className="h-6 w-auto" />
            </div>
            <div className="text-xs text-slate-400">Radar de Distribuições</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user.isAdmin && (
              <Button
                variant="outline"
                className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/20"
                onClick={() => setShowFontes(true)}
              >
                Fontes
              </Button>
            )}
            <span className="text-slate-300">{user.name}</span>
            <button onClick={onLogout} className="text-slate-400 hover:text-white">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 p-4">
        <Card className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Field label="Fonte">
              <Select value={filtros.fonteId} onChange={(e) => aplicar({ fonteId: e.target.value })}>
                <option value="">Todas</option>
                {fontes.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Área">
              <Select value={filtros.area} onChange={(e) => aplicar({ area: e.target.value })}>
                <option value="">Todas</option>
                <option value="TRABALHISTA">Trabalhista</option>
                <option value="ESTADUAL">Estadual</option>
                <option value="FEDERAL">Federal</option>
                <option value="ELEITORAL">Eleitoral</option>
                <option value="OUTRO">Outro</option>
              </Select>
            </Field>
            <Field label="De">
              <Input
                type="date"
                value={filtros.dataIni}
                onChange={(e) => aplicar({ dataIni: e.target.value })}
              />
            </Field>
            <Field label="Até">
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => aplicar({ dataFim: e.target.value })}
              />
            </Field>
            <Field label="Classe">
              <Input
                value={filtros.classe}
                onChange={(e) => aplicar({ classe: e.target.value })}
                placeholder="ex.: ATSum"
              />
            </Field>
            <Field label="Busca (nº ou parte)">
              <Input
                value={filtros.q}
                onChange={(e) => aplicar({ q: e.target.value })}
                placeholder="número ou empresa"
              />
            </Field>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => {
                setPage(1);
                setFiltros(FILTROS_VAZIO);
              }}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Limpar filtros
            </button>
            {carregando && (
              <span className="flex items-center gap-2 text-sm text-slate-400">
                <Spinner /> carregando…
              </span>
            )}
          </div>
        </Card>

        {erro && (
          <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</Card>
        )}

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Distribuídos" value={stats?.total ?? 0} />
          <StatCard label="Com partes (DJEN)" value={stats?.comPartes ?? 0} />
          <StatCard label="Aguardando partes" value={stats?.semPartes ?? 0} />
        </div>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">
              Empresas mais demandadas (reclamadas)
            </h2>
            <Button
              variant="outline"
              onClick={() => void baixarCsv(`/api/ranking.csv?${qsDe(filtros)}`, "ranking_reclamados.csv")}
            >
              Exportar ranking
            </Button>
          </div>
          {ranking.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Sem dados para os filtros.</p>
          ) : (
            <div className="space-y-1.5">
              {ranking.map((r, i) => (
                <div key={r.empresa} className="flex items-center gap-3">
                  <div className="w-6 text-right text-xs font-semibold text-slate-400">{i + 1}</div>
                  <div className="flex-1">
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span className="truncate pr-2 font-medium text-slate-700" title={r.empresa}>
                        {r.empresa}
                      </span>
                      <span className="font-semibold text-slate-500">{r.qtd}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-blue"
                        style={{ width: `${Math.max(3, (r.qtd / maxQtd) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-700">
              Processos distribuídos <span className="font-normal text-slate-400">({total})</span>
            </h2>
            <Button
              variant="outline"
              onClick={() => void baixarCsv(`/api/processos.csv?${qsDe(filtros)}`, "processos.csv")}
            >
              Exportar CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 font-semibold">Data</th>
                  <th className="px-4 py-2 font-semibold">Número</th>
                  <th className="px-4 py-2 font-semibold">Vara</th>
                  <th className="px-4 py-2 font-semibold">Classe</th>
                  <th className="px-4 py-2 font-semibold">Reclamante</th>
                  <th className="px-4 py-2 font-semibold">Reclamado</th>
                </tr>
              </thead>
              <tbody>
                {processos.map((p) => {
                  const rec = p.partes
                    .filter((x) => x.polo === "A")
                    .map((x) => x.nome)
                    .join(", ");
                  const rda = p.partes
                    .filter((x) => x.polo === "P")
                    .map((x) => x.nome)
                    .join(", ");
                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                        {fmtData(p.dataAjuizamento)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-slate-600">
                        {p.numero}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{p.orgaoJulgador}</td>
                      <td className="px-4 py-2 text-slate-600">{p.classe}</td>
                      <td className="px-4 py-2 text-slate-700">
                        {rec || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {rda || (
                          <span className="text-slate-300">
                            {p.partesBuscadas ? "—" : "buscando…"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {processos.length === 0 && !carregando && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Nenhum processo para os filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-4 text-sm text-slate-500">
            <span>
              Página {page} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPaginas}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </Card>
      </main>

      {showFontes && (
        <Fontes
          onClose={() => {
            setShowFontes(false);
            void carregarFontes();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-extrabold text-brand-dark">{value.toLocaleString("pt-BR")}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </Card>
  );
}
