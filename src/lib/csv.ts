type Cellule = string | number;

/**
 * Protège une cellule CSV : encadre les valeurs contenant un séparateur, et neutralise
 * les textes commençant par = + - @, qu'Excel exécuterait comme des formules.
 */
function echapper(valeur: Cellule): string {
  if (typeof valeur === "number") return String(valeur);
  const sure = /^[=+\-@\t\r]/.test(valeur) ? `'${valeur}` : valeur;
  return /[";\r\n]/.test(sure) ? `"${sure.replace(/"/g, '""')}"` : sure;
}

/** Point-virgule et BOM UTF-8 : le fichier s'ouvre correctement dans Excel en français. */
export function versCsv(entetes: readonly string[], lignes: ReadonlyArray<readonly Cellule[]>): string {
  const contenu = [entetes, ...lignes].map((ligne) => ligne.map(echapper).join(";")).join("\r\n");
  return `﻿${contenu}\r\n`;
}
