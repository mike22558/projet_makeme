import type { Metadata } from "next";
import Form from "next/form";

import { walkInClientExistant, walkInNouveauClient } from "@/actions/sejours";
import { EnTetePage, LienRetour } from "@/components/commun/elements";
import { ChoixChambre, ChoixClient, EtapesAssistant } from "@/components/reservations/assistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ajouterJours, aujourdhui, versDateIso } from "@/lib/dates";
import { chercherChambresDisponibles } from "@/lib/disponibilite";
import { formaterDate } from "@/lib/format";
import { requirePermission } from "@/lib/permissions";
import { entierUrl, type ParametresRecherche, texte } from "@/lib/url";
import { schemaPeriodeWalkIn } from "@/validations/sejours";

export const metadata: Metadata = { title: "Arrivée sans réservation" };

const ETAPES = ["Départ et personnes", "Chambre", "Client"] as const;
const CHEMIN = "/sejours/nouveau";

function FormulaireDepart({ depart, nb, erreur }: { depart: string; nb: string; erreur?: string }) {
  const demain = versDateIso(ajouterJours(aujourdhui(), 1));
  return (
    <Card className="max-w-xl">
      <CardContent>
        <Form action={CHEMIN} className="space-y-4">
          {erreur && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erreur}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="depart">Départ prévu</Label>
              <Input id="depart" name="depart" type="date" min={demain} defaultValue={depart || demain} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nb">Personnes</Label>
              <Input id="nb" name="nb" type="number" min={1} defaultValue={nb || "1"} required />
            </div>
          </div>
          <Button type="submit">Voir les chambres prêtes</Button>
        </Form>
      </CardContent>
    </Card>
  );
}

export default async function PageNouveauSejour({ searchParams }: { searchParams: ParametresRecherche }) {
  await requirePermission("sejours.ecrire");
  const parametres = await searchParams;
  const departTexte = texte(parametres, "depart");
  const nbTexte = texte(parametres, "nb");
  const periode = schemaPeriodeWalkIn.safeParse({ depart: departTexte, nbPersonnes: nbTexte });
  const chambreId = entierUrl(parametres, "chambre");

  let contenu;
  let etape = 0;
  if (!departTexte || !periode.success) {
    contenu = (
      <FormulaireDepart
        depart={departTexte}
        nb={nbTexte}
        erreur={departTexte && !periode.success ? periode.error.issues[0].message : undefined}
      />
    );
  } else if (!chambreId) {
    etape = 1;
    const { depart, nbPersonnes } = periode.data;
    const chambres = await chercherChambresDisponibles(
      { debut: aujourdhui(), fin: depart },
      { nbPersonnes, seulementPretes: true },
    );
    const base = `${CHEMIN}?depart=${departTexte}&nb=${nbPersonnes}`;
    contenu = (
      <>
        <p className="mb-3 text-sm text-muted-foreground">
          {chambres.length} chambre(s) prête(s) jusqu&apos;au {formaterDate(depart)}.
        </p>
        <ChoixChambre chambres={chambres} lien={(id) => `${base}&chambre=${id}`} />
      </>
    );
  } else {
    etape = 2;
    const demande = { depart: departTexte, nbPersonnes: periode.data.nbPersonnes, chambreId };
    contenu = (
      <ChoixClient
        chemin={CHEMIN}
        conserves={{ depart: departTexte, nb: nbTexte, chambre: String(chambreId) }}
        q={texte(parametres, "q")}
        lierClientExistant={(clientId) => walkInClientExistant.bind(null, demande, clientId)}
        actionNouveauClient={walkInNouveauClient.bind(null, demande)}
        libelleValider="Enregistrer l'arrivée"
      />
    );
  }

  return (
    <div>
      <LienRetour href="/sejours" libelle="Séjours" />
      <EnTetePage titre="Arrivée sans réservation" description="Le client arrive aujourd'hui." />
      <EtapesAssistant etapes={ETAPES} courante={etape} />
      {contenu}
    </div>
  );
}
