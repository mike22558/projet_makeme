import type {
  EtatChambre,
  StatutReservation,
  StatutSejour,
} from "@prisma/client";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";

import { CLASSES_SELECT } from "@/components/commun/select-classes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LIBELLES_ETATS,
  LIBELLES_STATUTS_RESERVATION,
  LIBELLES_STATUTS_SEJOUR,
  type OptionListe,
} from "@/lib/format";
import { type ParametresBruts, TAILLE_PAGE } from "@/lib/url";

export function EnTetePage({
  titre,
  description,
  children,
}: {
  titre: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{titre}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 print:hidden">{children}</div>}
    </div>
  );
}

export function EtatVide({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-card p-10 text-center">
      <Inbox className="size-7 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function CadreTableau({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-lg border bg-card">{children}</div>;
}

function creerLien(chemin: string, parametres: ParametresBruts, page: number): string {
  const requete = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(parametres)) {
    if (typeof valeur === "string" && valeur && cle !== "page") requete.set(cle, valeur);
  }
  requete.set("page", String(page));
  return `${chemin}?${requete.toString()}`;
}

/** Pagination côté serveur : conserve les filtres présents dans l'URL. */
export function Pagination({
  chemin,
  parametres,
  page,
  total,
}: {
  chemin: string;
  parametres: ParametresBruts;
  page: number;
  total: number;
}) {
  const pages = Math.max(Math.ceil(total / TAILLE_PAGE), 1);
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 print:hidden">
      <p className="text-sm text-muted-foreground">
        {total} résultat{total > 1 ? "s" : ""} · page {page} sur {pages}
      </p>
      <div className="flex gap-2">
        <BoutonPage href={page > 1 ? creerLien(chemin, parametres, page - 1) : undefined} libelle="Précédente">
          <ChevronLeft aria-hidden />
        </BoutonPage>
        <BoutonPage href={page < pages ? creerLien(chemin, parametres, page + 1) : undefined} libelle="Suivante">
          <ChevronRight aria-hidden />
        </BoutonPage>
      </div>
    </nav>
  );
}

function BoutonPage({ href, libelle, children }: { href?: string; libelle: string; children: ReactNode }) {
  if (!href) {
    return (
      <Button variant="outline" size="icon" disabled aria-label={libelle}>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="outline" size="icon" asChild>
      <Link href={href} aria-label={libelle}>
        {children}
      </Link>
    </Button>
  );
}

/** Barre de filtres : un formulaire GET, dont les valeurs sont portées par l'URL. */
export function BarreFiltres({ chemin, children }: { chemin: string; children: ReactNode }) {
  return (
    <Form action={chemin} className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
      {children}
      <Button type="submit" variant="secondary">
        Filtrer
      </Button>
      <Button type="button" variant="ghost" asChild>
        <Link href={chemin}>Réinitialiser</Link>
      </Button>
    </Form>
  );
}

export function FiltreTexte({
  nom,
  libelle,
  valeur,
  type = "search",
  placeholder,
}: {
  nom: string;
  libelle: string;
  valeur?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`filtre-${nom}`}>{libelle}</Label>
      <Input id={`filtre-${nom}`} name={nom} type={type} defaultValue={valeur} placeholder={placeholder} className="w-44" />
    </div>
  );
}

export function FiltreSelect({
  nom,
  libelle,
  valeur,
  options,
}: {
  nom: string;
  libelle: string;
  valeur?: string;
  options: readonly OptionListe[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`filtre-${nom}`}>{libelle}</Label>
      <select id={`filtre-${nom}`} name={nom} defaultValue={valeur ?? ""} className={`${CLASSES_SELECT} w-44`}>
        <option value="">Tous</option>
        {options.map((option) => (
          <option key={option.valeur} value={option.valeur}>
            {option.libelle}
          </option>
        ))}
      </select>
    </div>
  );
}

const TEINTES = {
  vert: "border-transparent bg-emerald-100 text-emerald-900",
  bleu: "border-transparent bg-sky-100 text-sky-900",
  ambre: "border-transparent bg-amber-100 text-amber-900",
  gris: "border-transparent bg-stone-200 text-stone-800",
  rouge: "border-transparent bg-red-100 text-red-900",
} as const;

function Pastille({ teinte, children }: { teinte: keyof typeof TEINTES; children: ReactNode }) {
  return (
    <Badge variant="outline" className={TEINTES[teinte]}>
      {children}
    </Badge>
  );
}

const TEINTES_ETATS: Record<EtatChambre, keyof typeof TEINTES> = {
  DISPONIBLE: "vert",
  OCCUPEE: "bleu",
  NETTOYAGE: "ambre",
  HORS_SERVICE: "gris",
};

export function BadgeEtat({ etat }: { etat: EtatChambre }) {
  return <Pastille teinte={TEINTES_ETATS[etat]}>{LIBELLES_ETATS[etat]}</Pastille>;
}

const TEINTES_RESERVATIONS: Record<StatutReservation, keyof typeof TEINTES> = {
  CONFIRMEE: "bleu",
  ANNULEE: "rouge",
  HONOREE: "vert",
};

export function BadgeReservation({ statut }: { statut: StatutReservation }) {
  return <Pastille teinte={TEINTES_RESERVATIONS[statut]}>{LIBELLES_STATUTS_RESERVATION[statut]}</Pastille>;
}

export function BadgeSejour({ statut }: { statut: StatutSejour }) {
  return (
    <Pastille teinte={statut === "EN_COURS" ? "bleu" : "gris"}>{LIBELLES_STATUTS_SEJOUR[statut]}</Pastille>
  );
}

export function BadgeActif({ actif }: { actif: boolean }) {
  return <Pastille teinte={actif ? "vert" : "gris"}>{actif ? "Actif" : "Désactivé"}</Pastille>;
}

/** Ligne libellé / valeur des fiches détaillées et des récapitulatifs. */
export function LigneInfo({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{libelle}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export function LienRetour({ href, libelle }: { href: string; libelle: string }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden">
      <ChevronLeft className="size-4" aria-hidden />
      {libelle}
    </Link>
  );
}
