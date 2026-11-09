import { StatutSejour } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { enregistrerPaiement } from "@/actions/paiements";
import { CadreTableau, EnTetePage, EtatVide, LienRetour } from "@/components/commun/elements";
import { BoutonEnvoi, Champ, ChampSelect, FormulaireAction } from "@/components/commun/formulaire-action";
import { RecapitulatifSolde } from "@/components/sejours/recapitulatif";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formaterFcfa, LIBELLES_MODES, nomComplet, options } from "@/lib/format";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { INCLUSION_SEJOUR, soldeActuel } from "@/lib/requetes/sejours";
import { entierUrl, type ParametresRecherche } from "@/lib/url";

export const metadata: Metadata = { title: "Enregistrer un paiement" };

async function ChoixSejour() {
  const sejours = await prisma.sejour.findMany({
    where: { statut: StatutSejour.EN_COURS },
    include: INCLUSION_SEJOUR,
    orderBy: { chambre: { numero: "asc" } },
  });
  const aRegler = sejours
    .map((sejour) => ({ sejour, reste: soldeActuel(sejour).reste }))
    .filter(({ reste }) => reste > 0);

  if (aRegler.length === 0) return <EtatVide message="Aucun séjour en cours n'a de reste à payer." />;

  return (
    <CadreTableau>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Chambre</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="text-right">Reste à payer</TableHead>
            <TableHead className="text-right">Choix</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aRegler.map(({ sejour, reste }) => (
            <TableRow key={sejour.id}>
              <TableCell className="font-medium">{sejour.chambre.numero}</TableCell>
              <TableCell>{nomComplet(sejour.client)}</TableCell>
              <TableCell className="text-right">{formaterFcfa(reste)}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" asChild>
                  <Link href={`/paiements/nouveau?sejour=${sejour.id}`}>Choisir</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CadreTableau>
  );
}

async function FormulairePaiement({ sejourId }: { sejourId: number }) {
  const sejour = await prisma.sejour.findUnique({ where: { id: sejourId }, include: INCLUSION_SEJOUR });
  if (!sejour) notFound();
  if (sejour.statut !== StatutSejour.EN_COURS) {
    return <EtatVide message="Ce séjour est terminé : aucun paiement ne peut être ajouté." />;
  }
  const solde = soldeActuel(sejour);

  return (
    <div className="grid max-w-4xl gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>
            Chambre {sejour.chambre.numero} · {nomComplet(sejour.client)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecapitulatifSolde solde={solde} tarif={sejour.tarifNuitApplique} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Paiement</CardTitle>
        </CardHeader>
        <CardContent>
          {solde.reste === 0 ? (
            <EtatVide message="Ce séjour est déjà entièrement payé." />
          ) : (
            <FormulaireAction action={enregistrerPaiement.bind(null, sejourId)} className="space-y-4">
              <Champ
                nom="montant"
                libelle="Montant (FCFA)"
                type="number"
                min={1}
                max={solde.reste}
                defaultValue={solde.reste}
                required
              />
              <ChampSelect nom="mode" libelle="Mode de paiement" options={options(LIBELLES_MODES)} required />
              <Champ nom="reference" libelle="Référence" aide="Numéro de transaction, si le mode de paiement en fournit un." />
              <BoutonEnvoi>Enregistrer le paiement</BoutonEnvoi>
            </FormulaireAction>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function PageNouveauPaiement({ searchParams }: { searchParams: ParametresRecherche }) {
  await requirePermission("paiements.ecrire");
  const sejourId = entierUrl(await searchParams, "sejour");

  return (
    <div>
      <LienRetour href="/paiements" libelle="Paiements" />
      <EnTetePage titre="Enregistrer un paiement" />
      {sejourId ? <FormulairePaiement sejourId={sejourId} /> : <ChoixSejour />}
    </div>
  );
}
