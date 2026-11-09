import { EtatChambre, StatutReservation, StatutSejour } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";

import { BadgeEtat, EnTetePage, EtatVide } from "@/components/commun/elements";
import { Chargement } from "@/components/layout/chargement";
import { GraphiqueBarres } from "@/components/tableau-de-bord/graphique-barres";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tauxOccupation } from "@/lib/calculs";
import { ajouterJours, aujourdhui, debutMois, ajouterMois } from "@/lib/dates";
import { formaterDate, formaterFcfa, formaterTaux, nomComplet } from "@/lib/format";
import { aPermission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { lireRecettes, occupationDesDerniersMois, serieRecettes } from "@/lib/requetes/statistiques";

export const metadata: Metadata = { title: "Tableau de bord" };

function Tuile({ libelle, valeur, detail }: { libelle: string; valeur: ReactNode; detail?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <p className="text-sm text-muted-foreground">{libelle}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{valeur}</p>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}

function CarteListe({ titre, vide, children }: { titre: string; vide: string; children: ReactNode[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titre}</CardTitle>
      </CardHeader>
      <CardContent>
        {children.length === 0 ? <EtatVide message={vide} /> : <ul className="divide-y">{children}</ul>}
      </CardContent>
    </Card>
  );
}

function LigneListe({ href, principal, secondaire }: { href: string; principal: string; secondaire: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between gap-3 py-2 text-sm hover:underline">
        <span className="truncate font-medium">{principal}</span>
        <span className="shrink-0 text-muted-foreground">{secondaire}</span>
      </Link>
    </li>
  );
}

async function VolumeOperationnel() {
  const jour = aujourdhui();
  const [etats, arrivees, departs, enCours, occupation] = await Promise.all([
    prisma.chambre.groupBy({ by: ["etat"], _count: { _all: true } }),
    prisma.reservation.findMany({
      where: { statut: StatutReservation.CONFIRMEE, dateArriveePrevue: jour },
      include: { client: true, chambre: true },
      orderBy: { chambre: { numero: "asc" } },
    }),
    prisma.sejour.findMany({
      where: { statut: StatutSejour.EN_COURS, dateDepartPrevue: { lte: jour } },
      include: { client: true, chambre: true },
      orderBy: { chambre: { numero: "asc" } },
    }),
    prisma.sejour.count({ where: { statut: StatutSejour.EN_COURS } }),
    occupationDesDerniersMois(),
  ]);

  const nombre = (etat: EtatChambre) => etats.find((e) => e.etat === etat)?._count._all ?? 0;
  const enService = etats.reduce((s, e) => s + e._count._all, 0) - nombre(EtatChambre.HORS_SERVICE);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tuile
          libelle="Taux d'occupation du jour"
          valeur={formaterTaux(tauxOccupation(nombre(EtatChambre.OCCUPEE), enService, 1))}
          detail={`${nombre(EtatChambre.OCCUPEE)} chambres sur ${enService} en service`}
        />
        <Tuile libelle="Arrivées du jour" valeur={arrivees.length} />
        <Tuile libelle="Départs du jour" valeur={departs.length} />
        <Tuile libelle="Séjours en cours" valeur={enCours} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chambres par état</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-8 gap-y-3">
          {Object.values(EtatChambre).map((etat) => (
            <div key={etat} className="flex items-center gap-2">
              <span className="text-xl font-semibold tabular-nums">{nombre(etat)}</span>
              <BadgeEtat etat={etat} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <CarteListe titre="Arrivées prévues aujourd'hui" vide="Aucune arrivée prévue aujourd'hui.">
          {arrivees.map((r) => (
            <LigneListe key={r.id} href={`/reservations/${r.id}`} principal={nomComplet(r.client)} secondaire={`Chambre ${r.chambre.numero}`} />
          ))}
        </CarteListe>
        <CarteListe titre="Départs attendus aujourd'hui" vide="Aucun départ attendu aujourd'hui.">
          {departs.map((s) => (
            <LigneListe
              key={s.id}
              href={`/sejours/${s.id}`}
              principal={nomComplet(s.client)}
              secondaire={
                s.dateDepartPrevue < jour
                  ? `Chambre ${s.chambre.numero} · prévu le ${formaterDate(s.dateDepartPrevue)}`
                  : `Chambre ${s.chambre.numero}`
              }
            />
          ))}
        </CarteListe>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Taux d&apos;occupation mensuel</CardTitle>
        </CardHeader>
        <CardContent>
          {occupation.length === 0 ? (
            <EtatVide message="Aucun séjour sur les six derniers mois." />
          ) : (
            <GraphiqueBarres donnees={occupation.map((l) => ({ libelle: l.libelle, valeur: l.taux }))} unite="pourcent" />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

async function VoletFinancier() {
  const jour = aujourdhui();
  const demain = ajouterJours(jour, 1);
  const mois = debutMois(jour);
  const [recettesJour, recettesMois, serie] = await Promise.all([
    lireRecettes(jour, demain),
    lireRecettes(mois, ajouterMois(mois, 1)),
    serieRecettes(ajouterJours(jour, -29), demain, "jour"),
  ]);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Tuile libelle="Recettes du jour" valeur={formaterFcfa(recettesJour.net)} />
        <Tuile libelle="Recettes du mois" valeur={formaterFcfa(recettesMois.net)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recettes des 30 derniers jours</CardTitle>
        </CardHeader>
        <CardContent>
          <GraphiqueBarres donnees={serie} unite="fcfa" />
        </CardContent>
      </Card>
    </section>
  );
}

export default async function PageTableauDeBord() {
  const utilisateur = await requirePermission("dashboard.lire");

  return (
    <div className="space-y-6">
      <EnTetePage titre="Tableau de bord" description={`Situation au ${formaterDate(aujourdhui())}`} />
      <Suspense fallback={<Chargement />}>
        {aPermission(utilisateur.role, "dashboard.financier") && <VoletFinancier />}
      </Suspense>
      <Suspense fallback={<Chargement />}>
        {aPermission(utilisateur.role, "dashboard.operationnel") && <VolumeOperationnel />}
      </Suspense>
    </div>
  );
}
