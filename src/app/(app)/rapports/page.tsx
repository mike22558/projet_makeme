import { ModePaiement } from "@prisma/client";
import { Download } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { BoutonImprimer } from "@/components/commun/bouton-imprimer";
import { BarreFiltres, CadreTableau, EnTetePage, EtatVide, FiltreTexte } from "@/components/commun/elements";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ajouterJours, aujourdhui, debutMois, versDateIso } from "@/lib/dates";
import { formaterDate, formaterFcfa, formaterTaux, LIBELLES_MODES, nomComplet } from "@/lib/format";
import { aPermission, requirePermission } from "@/lib/permissions";
import {
  granulariteAdaptee,
  lireAnnulations,
  lireRecettes,
  serieOccupation,
  serieRecettes,
} from "@/lib/requetes/statistiques";
import { dateUrl, type ParametresRecherche, texte } from "@/lib/url";

export const metadata: Metadata = { title: "Rapports" };

function Section({ titre, exportHref, children }: { titre: string; exportHref?: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{titre}</h2>
        {exportHref && (
          <Button variant="outline" size="sm" asChild className="print:hidden">
            <a href={exportHref}>
              <Download aria-hidden /> CSV
            </a>
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

async function SectionsFinancieres({ debut, fin, requete }: { debut: Date; fin: Date; requete: string }) {
  const granularite = granulariteAdaptee(debut, fin);
  const [recettes, serie] = await Promise.all([lireRecettes(debut, fin), serieRecettes(debut, fin, granularite)]);

  return (
    <>
      <Section titre="Recettes par mode de paiement" exportHref={`/rapports/export?type=modes&${requete}`}>
        <CadreTableau>
          <Table>
            <TableBody>
              {Object.values(ModePaiement).map((mode) => (
                <TableRow key={mode}>
                  <TableCell>{LIBELLES_MODES[mode]}</TableCell>
                  <TableCell className="text-right">{formaterFcfa(recettes.parMode[mode])}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>Rendu aux clients (trop-perçus)</TableCell>
                <TableCell className="text-right">− {formaterFcfa(recettes.rembourse)}</TableCell>
              </TableRow>
              <TableRow className="font-semibold">
                <TableCell>Recettes nettes</TableCell>
                <TableCell className="text-right">{formaterFcfa(recettes.net)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CadreTableau>
      </Section>

      <Section titre={`Recettes par ${granularite}`} exportHref={`/rapports/export?type=recettes&${requete}`}>
        <CadreTableau>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead>
                <TableHead className="text-right">Recettes nettes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serie.map((ligne) => (
                <TableRow key={ligne.libelle}>
                  <TableCell>{ligne.libelle}</TableCell>
                  <TableCell className="text-right">{formaterFcfa(ligne.valeur)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CadreTableau>
      </Section>
    </>
  );
}

async function SectionsOccupation({ debut, fin, requete }: { debut: Date; fin: Date; requete: string }) {
  const granularite = granulariteAdaptee(debut, fin);
  const [occupation, annulations] = await Promise.all([
    serieOccupation(debut, fin, granularite),
    lireAnnulations(debut, fin),
  ]);

  return (
    <>
      <Section titre="Taux d'occupation" exportHref={`/rapports/export?type=occupation&${requete}`}>
        {occupation.length === 0 ? (
          <EtatVide message="Aucune donnée d'occupation sur cette période." />
        ) : (
          <CadreTableau>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Nuits vendues</TableHead>
                  <TableHead className="text-right">Taux</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {occupation.map((ligne) => (
                  <TableRow key={ligne.libelle}>
                    <TableCell>{ligne.libelle}</TableCell>
                    <TableCell className="text-right">{ligne.nuits}</TableCell>
                    <TableCell className="text-right">{formaterTaux(ligne.taux)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CadreTableau>
        )}
      </Section>

      <Section titre="Réservations annulées" exportHref={`/rapports/export?type=annulations&${requete}`}>
        {annulations.length === 0 ? (
          <EtatVide message="Aucune réservation annulée sur cette période." />
        ) : (
          <CadreTableau>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Chambre</TableHead>
                  <TableHead>Arrivée prévue</TableHead>
                  <TableHead>Motif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {annulations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.code}</TableCell>
                    <TableCell>{nomComplet(r.client)}</TableCell>
                    <TableCell>{r.chambre.numero}</TableCell>
                    <TableCell>{formaterDate(r.dateArriveePrevue)}</TableCell>
                    <TableCell className="whitespace-normal">{r.motifAnnulation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CadreTableau>
        )}
      </Section>
    </>
  );
}

export default async function PageRapports({ searchParams }: { searchParams: ParametresRecherche }) {
  const utilisateur = await requirePermission("rapports.financiers");
  const parametres = await searchParams;
  const jour = aujourdhui();
  const debut = dateUrl(parametres, "du") ?? debutMois(jour);
  const au = dateUrl(parametres, "au") ?? jour;
  const fin = ajouterJours(au, 1);
  const requete = `du=${versDateIso(debut)}&au=${versDateIso(au)}`;
  const peutVoirOccupation = aPermission(utilisateur.role, "rapports.occupation");

  return (
    <div className="space-y-6">
      <EnTetePage titre="Rapports" description={`Du ${formaterDate(debut)} au ${formaterDate(au)}`}>
        <BoutonImprimer />
      </EnTetePage>
      <BarreFiltres chemin="/rapports">
        <FiltreTexte nom="du" libelle="Du" type="date" valeur={texte(parametres, "du") || versDateIso(debut)} />
        <FiltreTexte nom="au" libelle="Au" type="date" valeur={texte(parametres, "au") || versDateIso(au)} />
      </BarreFiltres>
      {debut > au ? (
        <EtatVide message="La date de début doit précéder la date de fin." />
      ) : (
        <>
          <SectionsFinancieres debut={debut} fin={fin} requete={requete} />
          {peutVoirOccupation && <SectionsOccupation debut={debut} fin={fin} requete={requete} />}
        </>
      )}
    </div>
  );
}
