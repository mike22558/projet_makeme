import type { Metadata } from "next";

import {
  BarreFiltres,
  BadgeEtat,
  CadreTableau,
  EnTetePage,
  EtatVide,
  FiltreSelect,
  FiltreTexte,
  LienRetour,
} from "@/components/commun/elements";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { chercherChambresDisponibles } from "@/lib/disponibilite";
import { formaterFcfa } from "@/lib/format";
import { requirePermission } from "@/lib/permissions";
import { lireOptionsTypes } from "@/lib/requetes/chambres";
import { dateUrl, entierUrl, type ParametresRecherche, texte } from "@/lib/url";

export const metadata: Metadata = { title: "Chambres disponibles" };

export default async function PageDisponibles({ searchParams }: { searchParams: ParametresRecherche }) {
  await requirePermission("chambres.lire");
  const parametres = await searchParams;
  const types = await lireOptionsTypes();
  const debut = dateUrl(parametres, "arrivee");
  const fin = dateUrl(parametres, "depart");
  const periodeValide = debut && fin && fin > debut;
  const chambres = periodeValide
    ? await chercherChambresDisponibles({ debut, fin }, { typeId: entierUrl(parametres, "type") })
    : null;

  return (
    <div>
      <LienRetour href="/chambres" libelle="Chambres" />
      <EnTetePage titre="Chambres disponibles" description="Recherche sur une période donnée." />
      <BarreFiltres chemin="/chambres/disponibles">
        <FiltreTexte nom="arrivee" libelle="Arrivée" type="date" valeur={texte(parametres, "arrivee")} />
        <FiltreTexte nom="depart" libelle="Départ" type="date" valeur={texte(parametres, "depart")} />
        <FiltreSelect nom="type" libelle="Type" valeur={texte(parametres, "type")} options={types} />
      </BarreFiltres>

      {!chambres && <EtatVide message="Indiquez une date d'arrivée et une date de départ postérieure." />}
      {chambres?.length === 0 && <EtatVide message="Aucune chambre disponible sur cette période." />}
      {chambres && chambres.length > 0 && (
        <CadreTableau>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Étage</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacité</TableHead>
                <TableHead>Tarif par nuit</TableHead>
                <TableHead>État actuel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chambres.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.numero}</TableCell>
                  <TableCell>{c.etage}</TableCell>
                  <TableCell>{c.type.libelle}</TableCell>
                  <TableCell>{c.type.capacite}</TableCell>
                  <TableCell>{formaterFcfa(c.type.tarifNuit)}</TableCell>
                  <TableCell>
                    <BadgeEtat etat={c.etat} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CadreTableau>
      )}
    </div>
  );
}
