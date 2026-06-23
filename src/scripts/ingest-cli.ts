import { prisma } from "../db";
import { runFonte, runFontesAtivas } from "../services/ingest";

/**
 * Roda a ingestão manualmente (backfill / testes), antes do job automático.
 *   npm run ingest            -> todas as fontes ativas
 *   npm run ingest "<id|nome>" -> uma fonte específica
 * Pode rodar várias vezes: a captura é incremental e o enriquecimento retoma.
 */
async function main() {
  const arg = process.argv[2];
  if (arg) {
    const fonte = await prisma.fonte.findFirst({
      where: { OR: [{ id: arg }, { nome: arg }] },
    });
    if (!fonte) {
      console.error(`Fonte não encontrada: ${arg}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Rodando fonte: ${fonte.nome}…`);
    console.log(JSON.stringify(await runFonte(fonte.id, 5000), null, 2));
  } else {
    console.log("Rodando todas as fontes ativas…");
    console.log(JSON.stringify(await runFontesAtivas(5000), null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
