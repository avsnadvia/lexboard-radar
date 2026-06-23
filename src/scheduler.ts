import { runFontesAtivas } from "./services/ingest";

// Hora (do servidor — UTC no container) para a ingestão diária.
// Ex.: 08 ≈ 05:00 no horário de Brasília. Ajuste via INGEST_HOUR.
const HORA = Number(process.env.INGEST_HOUR ?? "8");
let ultimoDiaRodado = "";
let rodando = false;

async function rodar(): Promise<void> {
  if (rodando) return;
  rodando = true;
  console.log("[scheduler] ingestão diária iniciando…");
  try {
    const r = await runFontesAtivas(5000);
    console.log("[scheduler] ingestão concluída:", JSON.stringify(r));
  } catch (e) {
    console.error("[scheduler] erro na ingestão:", e);
  } finally {
    rodando = false;
  }
}

/** Checa a cada minuto; dispara uma vez por dia na hora configurada. */
export function iniciarScheduler(): void {
  console.log(`[scheduler] ativo — ingestão diária às ${HORA}h (hora do servidor).`);
  setInterval(() => {
    const agora = new Date();
    const dia = agora.toISOString().slice(0, 10);
    if (agora.getUTCHours() === HORA && ultimoDiaRodado !== dia) {
      ultimoDiaRodado = dia;
      void rodar();
    }
  }, 60_000);
}
