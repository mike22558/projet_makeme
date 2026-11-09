import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { modifierReservation } from "@/actions/reservations";
import { EnTetePage, LienRetour } from "@/components/commun/elements";
import { BoutonEnvoi, Champ, ChampSelect, FormulaireAction } from "@/components/commun/formulaire-action";
import { Card, CardContent } from "@/components/ui/card";
import { versDateIso } from "@/lib/dates";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { lireOptionsChambres } from "@/lib/requetes/chambres";
import { idDeRoute } from "@/lib/url";

export const metadata: Metadata = { title: "Modifier une réservation" };

export default async function PageModifierReservation({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("reservations.ecrire");
  const id = await idDeRoute(params);
  const [reservation, chambres] = await Promise.all([
    prisma.reservation.findUnique({ where: { id } }),
    lireOptionsChambres(),
  ]);
  if (!reservation) notFound();
  if (reservation.statut !== "CONFIRMEE") redirect(`/reservations/${id}`); // RG12

  return (
    <div className="max-w-2xl">
      <LienRetour href={`/reservations/${id}`} libelle={reservation.code} />
      <EnTetePage titre="Modifier la réservation" description="La disponibilité est vérifiée à l'enregistrement." />
      <Card>
        <CardContent>
          <FormulaireAction action={modifierReservation.bind(null, id)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Champ nom="arrivee" libelle="Arrivée" type="date" defaultValue={versDateIso(reservation.dateArriveePrevue)} required />
              <Champ nom="depart" libelle="Départ" type="date" defaultValue={versDateIso(reservation.dateDepartPrevue)} required />
              <Champ nom="nbPersonnes" libelle="Personnes" type="number" min={1} defaultValue={reservation.nbPersonnes} required />
            </div>
            <ChampSelect nom="chambreId" libelle="Chambre" options={chambres} defaut={reservation.chambreId} required />
            <BoutonEnvoi>Enregistrer</BoutonEnvoi>
          </FormulaireAction>
        </CardContent>
      </Card>
    </div>
  );
}
