import { DoorOpen, Pencil, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { annulerReservation } from "@/actions/reservations";
import { enregistrerArrivee } from "@/actions/sejours";
import { DialogueAction } from "@/components/commun/dialogue-action";
import { BadgeEtat, BadgeReservation, EnTetePage, LienRetour, LigneInfo } from "@/components/commun/elements";
import { ChampZone } from "@/components/commun/formulaire-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { montantTotal, nombreNuits } from "@/lib/calculs";
import { aujourdhui } from "@/lib/dates";
import { formaterDate, formaterDateHeure, formaterFcfa, nomComplet } from "@/lib/format";
import { aPermission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { arriveePossibleLe } from "@/lib/sejours";
import { idDeRoute } from "@/lib/url";

export const metadata: Metadata = { title: "Réservation" };

export default async function PageReservation({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await requirePermission("reservations.lire");
  const id = await idDeRoute(params);
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      client: true,
      chambre: { include: { type: true } },
      sejour: { select: { id: true } },
      creePar: { select: { nom: true, prenoms: true } },
    },
  });
  if (!reservation) notFound();

  const confirmee = reservation.statut === "CONFIRMEE";
  const peutEcrire = confirmee && aPermission(utilisateur.role, "reservations.ecrire");
  const peutArriver =
    confirmee &&
    aPermission(utilisateur.role, "sejours.ecrire") &&
    arriveePossibleLe(reservation.dateArriveePrevue, reservation.dateDepartPrevue, aujourdhui());
  const chambrePrete = reservation.chambre.etat === "DISPONIBLE";
  const nuits = nombreNuits(reservation.dateArriveePrevue, reservation.dateDepartPrevue);

  const arriver = async () => {
    "use server";
    return enregistrerArrivee(id);
  };

  return (
    <div className="max-w-2xl">
      <LienRetour href="/reservations" libelle="Réservations" />
      <EnTetePage titre={reservation.code} description={<BadgeReservation statut={reservation.statut} />}>
        {peutArriver && (
          <DialogueAction
            action={arriver}
            declencheur={
              <Button>
                <DoorOpen aria-hidden /> Enregistrer l&apos;arrivée
              </Button>
            }
            titre="Enregistrer l'arrivée ?"
            description={
              chambrePrete
                ? `La chambre ${reservation.chambre.numero} passera à l'état « Occupée ».`
                : `La chambre ${reservation.chambre.numero} n'est pas prête : remettez-la d'abord à l'état « Disponible ».`
            }
            libelleConfirmation="Confirmer l'arrivée"
            confirmationDesactivee={!chambrePrete}
          />
        )}
        {peutEcrire && (
          <>
            <Button variant="outline" asChild>
              <Link href={`/reservations/${id}/modifier`}>
                <Pencil aria-hidden /> Modifier
              </Link>
            </Button>
            <DialogueAction
              action={annulerReservation.bind(null, id)}
              declencheur={
                <Button variant="outline">
                  <XCircle aria-hidden /> Annuler
                </Button>
              }
              titre="Annuler cette réservation ?"
              description="Cette action libère la chambre. Elle est définitive."
              libelleConfirmation="Annuler la réservation"
              variante="destructive"
            >
              <ChampZone nom="motif" libelle="Motif de l'annulation" required maxLength={255} />
            </DialogueAction>
          </>
        )}
        {reservation.sejour && (
          <Button variant="outline" asChild>
            <Link href={`/sejours/${reservation.sejour.id}`}>Voir le séjour</Link>
          </Button>
        )}
      </EnTetePage>

      <Card>
        <CardContent>
          <dl className="divide-y">
            <LigneInfo libelle="Client">
              <Link href={`/clients/${reservation.clientId}`} className="hover:underline">
                {nomComplet(reservation.client)}
              </Link>
            </LigneInfo>
            <LigneInfo libelle="Chambre">
              {reservation.chambre.numero} · {reservation.chambre.type.libelle}
            </LigneInfo>
            <LigneInfo libelle="État de la chambre">
              <BadgeEtat etat={reservation.chambre.etat} />
            </LigneInfo>
            <LigneInfo libelle="Arrivée prévue">{formaterDate(reservation.dateArriveePrevue)}</LigneInfo>
            <LigneInfo libelle="Départ prévu">{formaterDate(reservation.dateDepartPrevue)}</LigneInfo>
            <LigneInfo libelle="Nuits">{nuits}</LigneInfo>
            <LigneInfo libelle="Personnes">{reservation.nbPersonnes}</LigneInfo>
            <LigneInfo libelle="Tarif appliqué">{formaterFcfa(reservation.tarifNuitApplique)} / nuit</LigneInfo>
            <LigneInfo libelle="Montant prévu">
              {formaterFcfa(montantTotal(nuits, reservation.tarifNuitApplique))}
            </LigneInfo>
            {reservation.motifAnnulation && (
              <LigneInfo libelle="Motif d'annulation">{reservation.motifAnnulation}</LigneInfo>
            )}
            <LigneInfo libelle="Créée le">
              {formaterDateHeure(reservation.creeLe)} par {nomComplet(reservation.creePar)}
            </LigneInfo>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
