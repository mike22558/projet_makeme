import type {
  EtatChambre,
  ModePaiement,
  Role,
  Sexe,
  StatutReservation,
  StatutSejour,
  TypePiece,
} from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const formatEntier = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export const LIBELLES_ROLES: Record<Role, string> = {
  ADMIN: "Administrateur",
  RECEPTIONNISTE: "Réceptionniste",
  COMPTABLE: "Comptable",
  RESPONSABLE: "Responsable",
};

export const LIBELLES_SEXE: Record<Sexe, string> = {
  MASCULIN: "Masculin",
  FEMININ: "Féminin",
};

export const LIBELLES_PIECES: Record<TypePiece, string> = {
  CNI: "Carte nationale d'identité",
  PASSEPORT: "Passeport",
  PERMIS: "Permis de conduire",
  AUTRE: "Autre",
};

export const LIBELLES_ETATS: Record<EtatChambre, string> = {
  DISPONIBLE: "Disponible",
  OCCUPEE: "Occupée",
  NETTOYAGE: "Nettoyage",
  HORS_SERVICE: "Hors service",
};

export const LIBELLES_STATUTS_RESERVATION: Record<StatutReservation, string> = {
  CONFIRMEE: "Confirmée",
  ANNULEE: "Annulée",
  HONOREE: "Honorée",
};

export const LIBELLES_STATUTS_SEJOUR: Record<StatutSejour, string> = {
  EN_COURS: "En cours",
  TERMINE: "Terminé",
};

export const LIBELLES_MODES: Record<ModePaiement, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  VIREMENT: "Virement",
};

export interface OptionListe {
  valeur: string;
  libelle: string;
}

/** Transforme un dictionnaire de libellés en options de liste déroulante. */
export function options(libelles: Record<string, string>): OptionListe[] {
  return Object.entries(libelles).map(([valeur, libelle]) => ({ valeur, libelle }));
}

/**
 * Convertit une date pour que date-fns affiche l'heure GMT de la Côte d'Ivoire,
 * quel que soit le fuseau horaire configuré sur la machine qui exécute le serveur.
 */
function versHeureGmt(date: Date): Date {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60_000);
}

/** Exemple : 25 000 (espace insécable simple, lisible à l'impression et en CSV). */
export function formaterEntier(valeur: number): string {
  return formatEntier.format(valeur).replace(/\s/g, " ");
}

/** Exemple : 25 000 FCFA. */
export function formaterFcfa(montant: number): string {
  return `${formaterEntier(montant)} FCFA`;
}

/** Exemple : 52,6 %. */
export function formaterTaux(taux: number): string {
  return `${String(taux).replace(".", ",")} %`;
}

/** Exemple : 09/11/2026. */
export function formaterDate(date: Date): string {
  return format(versHeureGmt(date), "dd/MM/yyyy", { locale: fr });
}

/** Exemple : 09/11/2026 à 14:30. */
export function formaterDateHeure(date: Date): string {
  return format(versHeureGmt(date), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
}

/** Exemple : 09/11. */
export function formaterJourCourt(date: Date): string {
  return format(versHeureGmt(date), "dd/MM", { locale: fr });
}

/** Exemple : nov. 2026. */
export function formaterMois(date: Date): string {
  return format(versHeureGmt(date), "MMM yyyy", { locale: fr });
}

export function nomComplet(personne: { nom: string; prenoms: string }): string {
  return `${personne.prenoms} ${personne.nom}`;
}
