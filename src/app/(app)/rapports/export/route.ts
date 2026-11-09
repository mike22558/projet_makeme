import { ModePaiement } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

import { versCsv } from "@/lib/csv";
import { ajouterJours, aujourdhui, debutMois, lireDateIso } from "@/lib/dates";
import { formaterDate, LIBELLES_MODES, nomComplet } from "@/lib/format";
import { type Permission, requirePermission } from "@/lib/permissions";
import {
  granulariteAdaptee,
  lireAnnulations,
  lireRecettes,
  serieOccupation,
  serieRecettes,
} from "@/lib/requetes/statistiques";

/** Chaque export produit des lignes CSV et exige son propre droit. */
const EXPORTS: Record<string, { permission: Permission; produire: (debut: Date, fin: Date) => Promise<string> }> = {
  modes: {
    permission: "rapports.financiers",
    async produire(debut, fin) {
      const r = await lireRecettes(debut, fin);
      const lignes = Object.values(ModePaiement).map((m) => [LIBELLES_MODES[m], r.parMode[m]] as const);
      return versCsv(["Mode", "Montant (FCFA)"], [
        ...lignes,
        ["Rendu aux clients", -r.rembourse],
        ["Recettes nettes", r.net],
      ]);
    },
  },
  recettes: {
    permission: "rapports.financiers",
    async produire(debut, fin) {
      const serie = await serieRecettes(debut, fin, granulariteAdaptee(debut, fin));
      return versCsv(["Période", "Recettes nettes (FCFA)"], serie.map((l) => [l.libelle, l.valeur]));
    },
  },
  occupation: {
    permission: "rapports.occupation",
    async produire(debut, fin) {
      const serie = await serieOccupation(debut, fin, granulariteAdaptee(debut, fin));
      // Virgule décimale : Excel en français lit ainsi le taux comme un nombre.
      return versCsv(
        ["Période", "Nuits vendues", "Taux (%)"],
        serie.map((l) => [l.libelle, l.nuits, String(l.taux).replace(".", ",")]),
      );
    },
  },
  annulations: {
    permission: "rapports.occupation",
    async produire(debut, fin) {
      const lignes = await lireAnnulations(debut, fin);
      return versCsv(
        ["Code", "Client", "Chambre", "Arrivée prévue", "Motif"],
        lignes.map((r) => [
          r.code,
          nomComplet(r.client),
          r.chambre.numero,
          formaterDate(r.dateArriveePrevue),
          r.motifAnnulation ?? "",
        ]),
      );
    },
  },
};

export async function GET(requete: NextRequest): Promise<NextResponse> {
  const parametres = requete.nextUrl.searchParams;
  const type = parametres.get("type") ?? "";
  const definition = Object.hasOwn(EXPORTS, type) ? EXPORTS[type] : undefined;
  if (!definition) return new NextResponse("Export inconnu.", { status: 404 });

  await requirePermission(definition.permission);

  const jour = aujourdhui();
  const debut = lireDateIso(parametres.get("du") ?? undefined) ?? debutMois(jour);
  const au = lireDateIso(parametres.get("au") ?? undefined) ?? jour;
  const csv = await definition.produire(debut, ajouterJours(au, 1));

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rapport-${type}.csv"`,
    },
  });
}
