import { env } from "../config/env";
import { sleep } from "../lib/util";

export interface DataJudHit {
  numeroProcesso: string;
  tribunal?: string;
  dataAjuizamento?: string; // AAAAMMDDHHMMSS
  grau?: string;
  nivelSigilo?: number;
  classe?: { nome?: string } | null;
  orgaoJulgador?: { nome?: string } | null;
  assuntos?: Array<{ nome?: string }> | null;
}

export interface DataJudQuery {
  alias: string; // ex.: "api_publica_trt15"
  orgaoContains: string; // ex.: "Ribeirão Preto"
  // Opcional: o órgão deve conter PELO MENOS UMA destas palavras (ex.: ["Criminal","Júri"]).
  orgaoContainsAny?: string[];
  gte: string; // AAAAMMDDHHMMSS
  lte: string; // AAAAMMDDHHMMSS
  pageSize?: number;
  onPage?: (total: number) => void;
}

/**
 * Distribuídos no período, filtrando pelo nome do órgão julgador.
 * Paginação por search_after (sort por numeroProcesso.keyword) — robusta para
 * milhares de resultados. Porta da lógica validada em Python.
 */
export async function datajudDistribuidos(q: DataJudQuery): Promise<DataJudHit[]> {
  const pageSize = q.pageSize ?? 200;
  const url = `${env.datajudBase}/${q.alias}/_search`;
  const out: DataJudHit[] = [];
  let searchAfter: unknown[] | null = null;

  // teto de segurança contra loop infinito (~20M registros)
  for (let guard = 0; guard < 100000; guard++) {
    const must: Record<string, unknown>[] = [
      { range: { dataAjuizamento: { gte: q.gte, lte: q.lte } } },
      {
        bool: {
          minimum_should_match: 1,
          should: [
            { match_phrase: { "orgaoJulgador.nome": q.orgaoContains } },
            { wildcard: { "orgaoJulgador.nome": `*${q.orgaoContains}*` } },
          ],
        },
      },
    ];
    if (q.orgaoContainsAny && q.orgaoContainsAny.length > 0) {
      must.push({
        bool: {
          minimum_should_match: 1,
          should: q.orgaoContainsAny.flatMap((kw) => [
            { match_phrase: { "orgaoJulgador.nome": kw } },
            { wildcard: { "orgaoJulgador.nome": `*${kw}*` } },
          ]),
        },
      });
    }
    const body: Record<string, unknown> = {
      size: pageSize,
      query: { bool: { must } },
      sort: [{ "numeroProcesso.keyword": { order: "asc" } }],
    };
    if (searchAfter) body.search_after = searchAfter;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: env.datajudApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`DataJud ${resp.status}: ${txt.slice(0, 300)}`);
    }
    const data = (await resp.json()) as {
      hits?: { hits?: Array<{ _source?: DataJudHit; sort?: unknown[] }> };
    };
    const hits = data.hits?.hits ?? [];
    if (hits.length === 0) break;
    for (const h of hits) {
      if (h._source) out.push(h._source);
    }
    searchAfter = hits[hits.length - 1].sort ?? null;
    q.onPage?.(out.length);
    if (!searchAfter) break;
    await sleep(200);
  }
  return out;
}
