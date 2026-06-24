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

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (m: string) => {
  const [ano, mm] = m.split("-");
  return `${MESES[Number(mm) - 1] ?? mm}/${ano.slice(2)}`;
};

const AREA_LABEL: Record<string, string> = {
  TRABALHISTA: "Trabalhista",
  CRIMINAL: "Criminal",
  ESTADUAL: "Cível/Estadual",
  FEDERAL: "Federal",
  ELEITORAL: "Eleitoral",
  OUTRO: "Outros",
};
const AREA_ORDEM = ["TRABALHISTA", "CRIMINAL", "ESTADUAL", "FEDERAL", "ELEITORAL", "OUTRO"];

const PAGE_SIZE = 25;

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIO);
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [stats, setStats] = useState<{ total: number; comPartes: number; semPartes: number } | null>(
    null
  );
  const [ranking, setRanking] = useState<{ empresa: string; qtd: number }[]>([]);
  const [crimePorTipo, setCrimePorTipo] = useState<{ rotulo: string; qtd: number }[]>([]);
  const [crimePorVara, setCrimePorVara] = useState<{ rotulo: string; qtd: number }[]>([]);
  const [evolucao, setEvolucao] = useState<{ mes: string; qtd: number }[]>([]);
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

  // Aba padrão = primeira área disponível (assim que as fontes carregam).
  useEffect(() => {
    if (!filtros.area && fontes.length > 0) {
      const primeira = AREA_ORDEM.find((a) => fontes.some((f) => f.area === a));
      if (primeira) setFiltros((prev) => ({ ...prev, area: primeira }));
    }
  }, [fontes, filtros.area]);

  const carregar = useCallback(async (f: Filtros, pg: number) => {
    setCarregando(true);
    setErro("");
    try {
      const base = qsDe(f);
      const [st, ev, pr] = await Promise.all([
        api.stats(base),
        api.evolucao(base),
        api.processos(qsDe(f, { page: String(pg), pageSize: String(PAGE_SIZE) })),
      ]);
      setStats(st);
      setEvolucao(ev.items);
      setProcessos(pr.items);
      setTotal(pr.total);
      if (f.area === "CRIMINAL") {
        const [tipos, varas] = await Promise.all([
          api.agregado(qsDe(f, { campo: "assunto", limit: "15" })),
          api.agregado(qsDe(f, { campo: "orgao", limit: "15" })),
        ]);
        setCrimePorTipo(tipos.items);
        setCrimePorVara(varas.items);
        setRanking([]);
      } else {
        const rk = await api.ranking(qsDe(f, { limit: "15" }));
        setRanking(rk.items);
        setCrimePorTipo([]);
        setCrimePorVara([]);
      }
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
  const maxMes = evolucao.length ? Math.max(...evolucao.map((e) => e.qtd)) : 1;
  const ehCriminal = filtros.area === "CRIMINAL";
  const maxTipo = crimePorTipo.length ? crimePorTipo[0].qtd : 1;
  const maxVara = crimePorVara.length ? crimePorVara[0].qtd : 1;
  const areasDisponiveis = AREA_ORDEM.filter((a) => fontes.some((f) => f.area === a));
  const trocarAba = (area: string) => {
    setPage(1);
    setFiltros({ ...FILTROS_VAZIO, area });
  };

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
        {areasDisponiveis.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {areasDisponiveis.map((a) => (
              <button
                key={a}
                onClick={() => trocarAba(a)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  filtros.area === a
                    ? "bg-brand-dark text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {AREA_LABEL[a] ?? a}
              </button>
            ))}
          </div>
        )}

        <Card className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Fonte">
              <Select value={filtros.fonteId} onChange={(e) => aplicar({ fonteId: e.target.value })}>
                <option value="">Todas desta área</option>
                {fontes
                  .filter((f) => f.area === filtros.area)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
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
                setFiltros({ ...FILTROS_VAZIO, area: filtros.area });
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

        {evolucao.length > 0 && (
          <Card className="p-4">
            <h2 className="mb-4 text-sm font-bold text-slate-700">Distribuídos por mês</h2>
            <div className="flex items-end gap-2" style={{ height: 150 }}>
              {evolucao.map((e) => (
                <div key={e.mes} className="flex flex-1 flex-col items-center justify-end">
                  <div className="mb-1 text-xs font-semibold text-slate-500">
                    {e.qtd.toLocaleString("pt-BR")}
                  </div>
                  <div
                    className="w-full rounded-t bg-brand-blue"
                    style={{ height: `${Math.max(3, (e.qtd / maxMes) * 110)}px` }}
                    title={`${rotuloMes(e.mes)}: ${e.qtd}`}
                  />
                  <div className="mt-1.5 text-[11px] font-medium text-slate-500">
                    {rotuloMes(e.mes)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {ehCriminal && (
          <div className="grid gap-5 lg:grid-cols-2">
            <CardBarras
              titulo="Tipos de crime / ação mais distribuídos"
              itens={crimePorTipo}
              max={maxTipo}
            />
            <CardBarras titulo="Distribuição por vara" itens={crimePorVara} max={maxVara} />
          </div>
        )}

        {!ehCriminal && (
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
        )}

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
                  <th className="px-4 py-2 font-semibold">{ehCriminal ? "Autor (MP)" : "Reclamante"}</th>
                  <th className="px-4 py-2 font-semibold">{ehCriminal ? "Réu" : "Reclamado"}</th>
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

function CardBarras({
  titulo,
  itens,
  max,
}: {
  titulo: string;
  itens: { rotulo: string; qtd: number }[];
  max: number;
}) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-bold text-slate-700">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Sem dados para os filtros.</p>
      ) : (
        <div className="space-y-1.5">
          {itens.map((r, i) => (
            <div key={r.rotulo} className="flex items-center gap-3">
              <div className="w-6 text-right text-xs font-semibold text-slate-400">{i + 1}</div>
              <div className="flex-1">
                <div className="mb-0.5 flex justify-between text-xs">
                  <span className="truncate pr-2 font-medium text-slate-700" title={r.rotulo}>
                    {r.rotulo}
                  </span>
                  <span className="font-semibold text-slate-500">{r.qtd}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-blue"
                    style={{ width: `${Math.max(3, (r.qtd / max) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
