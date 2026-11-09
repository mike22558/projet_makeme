import { type Prisma, StatutReservation } from "@prisma/client";
import { CalendarCheck, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  BadgeReservation,
  BarreFiltres,
  CadreTableau,
  EnTetePage,
  EtatVide,
  FiltreSelect,
  FiltreTexte,
  Pagination,
} from "@/components/commun/elements";
import { Chargement } from "@/components/layout/chargement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { aujourdhui, versDateIso } from "@/lib/dates";
import { formaterDate, LIBELLES_STATUTS_RESERVATION, nomComplet, options } from "@/lib/format";
import { aPermission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  dateUrl,
  enumUrl,
  fenetre,
  numeroPage,
  type ParametresBruts,
  type ParametresRecherche,
  texte,
} from "@/lib/url";

export const metadata: Metadata = { title: "Réservations" };

function construireFiltre(parametres: ParametresBruts): Prisma.ReservationWhereInput {
  const q = texte(parametres, "q");
  return {
    statut: enumUrl(parametres, "statut", StatutReservation),
    dateArriveePrevue: { gte: dateUrl(parametres, "du"), lte: dateUrl(parametres, "au") },
    OR: q
      ? [
          { code: { contains: q } },
          { client: { nom: { contains: q } } },
          { client: { prenoms: { contains: q } } },
          { chambre: { numero: { contains: q } } },
        ]
      : undefined,
  };
}

async function ListeReservations({ parametres }: { parametres: ParametresBruts }) {
  const page = numeroPage(parametres);
  const where = construireFiltre(parametres);
  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: { client: true, chambre: true },
      orderBy: { dateArriveePrevue: "desc" },
      ...fenetre(page),
    }),
    prisma.reservation.count({ where }),
  ]);

  if (reservations.length === 0) return <EtatVide message="Aucune réservation sur ces critères." />;

  return (
    <>
      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Chambre</TableHead>
              <TableHead>Arrivée</TableHead>
              <TableHead>Départ</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/reservations/${r.id}`} className="font-medium hover:underline">
                    {r.code}
                  </Link>
                </TableCell>
                <TableCell>{nomComplet(r.client)}</TableCell>
                <TableCell>{r.chambre.numero}</TableCell>
                <TableCell>{formaterDate(r.dateArriveePrevue)}</TableCell>
                <TableCell>{formaterDate(r.dateDepartPrevue)}</TableCell>
                <TableCell>
                  <BadgeReservation statut={r.statut} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CadreTableau>
      <Pagination chemin="/reservations" parametres={parametres} page={page} total={total} />
    </>
  );
}

export default async function PageReservations({ searchParams }: { searchParams: ParametresRecherche }) {
  const utilisateur = await requirePermission("reservations.lire");
  const parametres = await searchParams;
  const jour = versDateIso(aujourdhui());

  return (
    <div>
      <EnTetePage titre="Réservations">
        <Button variant="outline" asChild>
          <Link href={`/reservations?statut=CONFIRMEE&du=${jour}&au=${jour}`}>
            <CalendarCheck aria-hidden /> Arrivées du jour
          </Link>
        </Button>
        {aPermission(utilisateur.role, "reservations.ecrire") && (
          <Button asChild>
            <Link href="/reservations/nouvelle">
              <Plus aria-hidden /> Nouvelle réservation
            </Link>
          </Button>
        )}
      </EnTetePage>
      <BarreFiltres chemin="/reservations">
        <FiltreTexte nom="q" libelle="Recherche" valeur={texte(parametres, "q")} placeholder="Code, client, chambre" />
        <FiltreSelect
          nom="statut"
          libelle="Statut"
          valeur={texte(parametres, "statut")}
          options={options(LIBELLES_STATUTS_RESERVATION)}
        />
        <FiltreTexte nom="du" libelle="Arrivée du" type="date" valeur={texte(parametres, "du")} />
        <FiltreTexte nom="au" libelle="Arrivée au" type="date" valeur={texte(parametres, "au")} />
      </BarreFiltres>
      <Suspense key={JSON.stringify(parametres)} fallback={<Chargement />}>
        <ListeReservations parametres={parametres} />
      </Suspense>
    </div>
  );
}
