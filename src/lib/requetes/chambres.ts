import type { OptionListe } from "@/lib/format";
import { formaterFcfa } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function lireOptionsTypes(): Promise<OptionListe[]> {
  const types = await prisma.typeChambre.findMany({ orderBy: { tarifNuit: "asc" } });
  return types.map((t) => ({ valeur: String(t.id), libelle: t.libelle }));
}

/** Options « 101 · Standard · 25 000 FCFA » pour choisir une chambre. */
export async function lireOptionsChambres(): Promise<OptionListe[]> {
  const chambres = await prisma.chambre.findMany({
    where: { etat: { not: "HORS_SERVICE" } },
    include: { type: true },
    orderBy: { numero: "asc" },
  });
  return chambres.map((c) => ({
    valeur: String(c.id),
    libelle: `${c.numero} · ${c.type.libelle} · ${formaterFcfa(c.type.tarifNuit)}`,
  }));
}
