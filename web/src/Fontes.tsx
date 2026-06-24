import { FormEvent, useEffect, useState } from "react";
import { api, Fonte } from "./api";
import { Button, Field, Input, Select, Spinner } from "./ui";

const NOVA_VAZIA = {
  nome: "",
  datajudAlias: "",
  orgaoContains: "",
  orgaoContainsAny: "",
  classeContainsAny: "",
  area: "TRABALHISTA",
  cursorAjuizamento: "20260101000000",
};

export default function Fontes({ onClose }: { onClose: () => void }) {
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [nova, setNova] = useState({ ...NOVA_VAZIA });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const r = await api.fontes();
      setFontes(r.items);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => {
    void carregar();
  }, []);

  async function criar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await api.criarFonte(nova);
      setNova({ ...NOVA_VAZIA });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setSalvando(false);
    }
  }
  async function toggle(f: Fonte) {
    await api.patchFonte(f.id, { ativo: !f.ativo });
    await carregar();
  }
  async function rodar(f: Fonte) {
    await api.runFonte(f.id);
    alert(`Ingestão de "${f.nome}" iniciada em segundo plano.`);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-slate-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="font-bold text-slate-800">Fontes</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            Fechar
          </button>
        </div>
        <div className="space-y-4 p-5">
          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="space-y-2">
            {carregando ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : (
              fontes.map((f) => (
                <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{f.nome}</div>
                      <div className="text-xs text-slate-500">
                        {f.datajudAlias} · {f.orgaoContains} · {f.area}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {f._count?.processos ?? 0} processos · última ingestão:{" "}
                        {f.ultimaIngestaoAt
                          ? new Date(f.ultimaIngestaoAt).toLocaleString("pt-BR")
                          : "nunca"}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        f.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {f.ativo ? "ativa" : "inativa"}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" onClick={() => void rodar(f)}>
                      Rodar agora
                    </Button>
                    <Button variant="ghost" onClick={() => void toggle(f)}>
                      {f.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={criar} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-700">
              Adicionar fonte (outra comarca/justiça)
            </h3>
            <Field label="Nome">
              <Input
                value={nova.nome}
                onChange={(e) => setNova({ ...nova, nome: e.target.value })}
                placeholder="Cível — Ribeirão Preto"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="DataJud alias">
                <Input
                  value={nova.datajudAlias}
                  onChange={(e) => setNova({ ...nova, datajudAlias: e.target.value })}
                  placeholder="api_publica_tjsp"
                  required
                />
              </Field>
              <Field label="Órgão contém">
                <Input
                  value={nova.orgaoContains}
                  onChange={(e) => setNova({ ...nova, orgaoContains: e.target.value })}
                  placeholder="Ribeirão Preto"
                  required
                />
              </Field>
            </div>
            <Field label="Órgão contém qualquer (opcional — separe por vírgula)">
              <Input
                value={nova.orgaoContainsAny}
                onChange={(e) => setNova({ ...nova, orgaoContainsAny: e.target.value })}
                placeholder="Criminal,Júri"
              />
            </Field>
            <Field label="Classe contém qualquer (opcional — varas mistas/Federal)">
              <Input
                value={nova.classeContainsAny}
                onChange={(e) => setNova({ ...nova, classeContainsAny: e.target.value })}
                placeholder="Penal,Inquérito,Habeas Corpus"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Área">
                <Select
                  value={nova.area}
                  onChange={(e) => setNova({ ...nova, area: e.target.value })}
                >
                  <option value="TRABALHISTA">Trabalhista</option>
                  <option value="CRIMINAL">Criminal</option>
                  <option value="ESTADUAL">Estadual</option>
                  <option value="FEDERAL">Federal</option>
                  <option value="ELEITORAL">Eleitoral</option>
                  <option value="OUTRO">Outro</option>
                </Select>
              </Field>
              <Field label="Início (AAAAMMDDHHMMSS)">
                <Input
                  value={nova.cursorAjuizamento}
                  onChange={(e) => setNova({ ...nova, cursorAjuizamento: e.target.value })}
                />
              </Field>
            </div>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Adicionar fonte"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
