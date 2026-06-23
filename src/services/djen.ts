import { env } from "../config/env";
import { mascaraCnj } from "../lib/cnj";
import { sleep, uniq, upper } from "../lib/util";

export interface PartesDjen {
  reclamantes: string[]; // polo A (ativo)
  reclamados: string[]; // polo P (passivo) — o que ranqueamos
}

interface DjenDestinatario {
  nome?: string;
  polo?: string;
}

/**
 * Partes de um processo a partir do DJEN (Comunica/CNJ): primeiro item com
 * 'destinatarios' preenchido. Lança erro em falha persistente (para a ingestão
 * não marcar o processo como "buscado" e tentar de novo depois).
 */
export async function djenPartes(numero: string, retries = 2): Promise<PartesDjen> {
  const url = `${env.djenBase}?numeroProcesso=${encodeURIComponent(
    mascaraCnj(numero)
  )}&itensPorPagina=5`;
  let last: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await fetch(url, { headers: { Accept: "application/json" } });
      if (!resp.ok) throw new Error(`DJEN ${resp.status}`);
      const data = (await resp.json()) as
        | DjenItem[]
        | { items?: DjenItem[]; content?: DjenItem[] };
      const itens: DjenItem[] = Array.isArray(data)
        ? data
        : data.items ?? data.content ?? [];
      for (const it of itens) {
        const dest = it.destinatarios ?? [];
        if (dest.length === 0) continue;
        const reclamantes = uniq(
          dest.filter((d) => upper(d.polo) === "A" && d.nome).map((d) => d.nome as string)
        );
        const reclamados = uniq(
          dest.filter((d) => upper(d.polo) === "P" && d.nome).map((d) => d.nome as string)
        );
        if (reclamantes.length || reclamados.length) {
          return { reclamantes, reclamados };
        }
      }
      return { reclamantes: [], reclamados: [] };
    } catch (e) {
      last = e;
      await sleep(1000);
    }
  }
  throw last instanceof Error ? last : new Error("erro DJEN");
}

interface DjenItem {
  destinatarios?: DjenDestinatario[];
}
