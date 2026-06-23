/** Só os dígitos do número CNJ. */
export function digits(num: string): string {
  return (num || "").replace(/\D/g, "");
}

/** Aplica a máscara CNJ NNNNNNN-DD.AAAA.J.TR.OOOO (se tiver 20 dígitos). */
export function mascaraCnj(num: string): string {
  const d = digits(num);
  if (d.length !== 20) return num;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}

/** Normaliza nome de empresa para ranking (uppercase, remove sufixos/ruídos). */
export function normEmpresa(nome: string): string {
  let s = (nome || "").replace(/\s+/g, " ").trim().toUpperCase();
  s = s.replace(/\s*-?\s*EM RECUPERA[ÇC][ÃA]O JUDICIAL$/u, "");
  s = s.replace(/\s*-\s*(ME|EPP|EIRELI)$/u, "");
  return s.replace(/^[.\-\s]+|[.\-\s]+$/gu, "");
}

/** Heurística: o nome parece pessoa jurídica / ente público? */
export function ehEmpresa(nome: string): boolean {
  const s = (nome || "").toUpperCase();
  if (/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/.test(s)) return true; // CNPJ
  return /\b(LTDA|EIRELI|EPP|MEI|S\.?A\b|S\/A|CIA\b|COMPANHIA|BANCO|ASSOCIA|COOPERATIV|SINDICAT|FUNDA[ÇC][ÃA]O|INSTITUT|IND[ÚU]STRIA|COM[ÉE]RCIO|SERVI[ÇC]OS?|TRANSPORTES?|CONSTRU|HOSPITAL|CL[ÍI]NICA|MUNIC[ÍI]PIO|ESTADO DE|UNI[ÃA]O|PREFEITURA|AUTARQUIA|SUPERMERCAD|DISTRIBUIDOR)\b/u.test(
    s
  );
}
