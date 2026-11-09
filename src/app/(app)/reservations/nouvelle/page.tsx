import type { Metadata } from "next";
import Form from "next/form";

import { creerReservationClientExistant, creerReservationNouveauClient } from "@/actions/reservations";
import { EnTetePage, LienRetour, LigneInfo } from "@/components/commun/elements";
import { ChoixChambre, ChoixClient, EtapesAssistant } from "@/components/reservations/assistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { montantTotal, nombreNuits } from "@/lib/calculs";
import { aujourdhui, versDateIso } from "@/lib/dates";
import { chercherChambresDisponibles } from "@/lib/disponibilite";
import { formaterDate, formaterFcfa } from "@/lib/format";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { entierUrl, type ParametresBruts, type ParametresRecherche, texte } from "@/lib/url";
import { type DemandeReservation, schemaPeriode } from "@/validations/reservations";

export const metadata: Metadata = { title: "Nouvelle réservation" };

const ETAPES = ["Dates et personnes", "Chambre", "Client"] as const;
const CHEMIN = "/reservations/nouvelle";

function FormulaireDates({ parametres, erreur }: { parametres: ParametresBruts; erreur?: string }) {
  return (
    <Card className="max-w-xl">
      <CardContent>
        <Form action={CHEMIN} className="space-y-4">
          {erreur && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erreur}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="arrivee">Arrivée</Label>
              <Input id="arrivee" name="arrivee" type="date" min={versDateIso(aujourdhui())} defaultValue={texte(parametres, "arrivee")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depart">Départ</Label>
              <Input id="depart" name="depart" type="date" defaultValue={texte(parametres, "depart")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nb">Personnes</Label>
              <Input id="nb" name="nb" type="number" min={1} defaultValue={texte(parametres, "nb") || "1"} required />
            </div>
          </div>
          <Button type="submit">Voir les chambres disponibles</Button>
        </Form>
      </CardContent>
    </Card>
  );
}

async function EtapeClient({ demande, q }: { demande: DemandeReservation; q: string }) {
  const chambre = await prisma.chambre.findUnique({
    where: { id: demande.chambreId },
    include: { type: true },
  });
  if (!chambre) return null;
  const arrivee = new Date(`${demande.arrivee}T00:00:00.000Z`);
  const depart = new Date(`${demande.depart}T00:00:00.000Z`);
  const nuits = nombreNuits(arrivee, depart);

  return (
    <div className="space-y-6">
      <Card className="max-w-xl">
        <CardContent>
          <dl className="divide-y">
            <LigneInfo libelle="Chambre">
              {chambre.numero} · {chambre.type.libelle}
            </LigneInfo>
            <LigneInfo libelle="Séjour">
              du {formaterDate(arrivee)} au {formaterDate(depart)} ({nuits} nuit{nuits > 1 ? "s" : ""})
            </LigneInfo>
            <LigneInfo libelle="Personnes">{demande.nbPersonnes}</LigneInfo>
            <LigneInfo libelle="Montant estimé">{formaterFcfa(montantTotal(nuits, chambre.type.tarifNuit))}</LigneInfo>
          </dl>
        </CardContent>
      </Card>
      <ChoixClient
        chemin={CHEMIN}
        conserves={{
          arrivee: demande.arrivee,
          depart: demande.depart,
          nb: String(demande.nbPersonnes),
          chambre: String(demande.chambreId),
        }}
        q={q}
        lierClientExistant={(clientId) => creerReservationClientExistant.bind(null, demande, clientId)}
        actionNouveauClient={creerReservationNouveauClient.bind(null, demande)}
        libelleValider="Réserver"
      />
    </div>
  );
}

export default async function PageNouvelleReservation({ searchParams }: { searchParams: ParametresRecherche }) {
  await requirePermission("reservations.ecrire");
  const parametres = await searchParams;
  const saisie = texte(parametres, "arrivee") !== "";
  const periode = schemaPeriode.safeParse({
    arrivee: texte(parametres, "arrivee"),
    depart: texte(parametres, "depart"),
    nbPersonnes: texte(parametres, "nb"),
  });
  const chambreId = entierUrl(parametres, "chambre");

  let contenu;
  let etape = 0;
  if (!saisie || !periode.success) {
    contenu = (
      <FormulaireDates
        parametres={parametres}
        erreur={saisie && !periode.success ? periode.error.issues[0].message : undefined}
      />
    );
  } else if (!chambreId) {
    etape = 1;
    const { arrivee, depart, nbPersonnes } = periode.data;
    const chambres = await chercherChambresDisponibles({ debut: arrivee, fin: depart }, { nbPersonnes });
    const base = `${CHEMIN}?arrivee=${texte(parametres, "arrivee")}&depart=${texte(parametres, "depart")}&nb=${nbPersonnes}`;
    contenu = (
      <>
        <p className="mb-3 text-sm text-muted-foreground">
          {chambres.length} chambre(s) disponible(s) du {formaterDate(arrivee)} au {formaterDate(depart)} pour{" "}
          {nbPersonnes} personne(s).
        </p>
        <ChoixChambre chambres={chambres} lien={(id) => `${base}&chambre=${id}`} />
      </>
    );
  } else {
    etape = 2;
    contenu = (
      <EtapeClient
        demande={{
          arrivee: texte(parametres, "arrivee"),
          depart: texte(parametres, "depart"),
          nbPersonnes: periode.data.nbPersonnes,
          chambreId,
        }}
        q={texte(parametres, "q")}
      />
    );
  }

  return (
    <div>
      <LienRetour href="/reservations" libelle="Réservations" />
      <EnTetePage titre="Nouvelle réservation" />
      <EtapesAssistant etapes={ETAPES} courante={etape} />
      {contenu}
    </div>
  );
}
