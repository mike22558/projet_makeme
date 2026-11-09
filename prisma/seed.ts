/**
 * Données de démonstration de l'application.
 *
 * ATTENTION : ce script VIDE puis remplit la base désignée par DATABASE_URL.
 *
 * Le jeu de données est reproductible : le générateur pseudo-aléatoire a une
 * graine fixe et toutes les dates sont calculées par rapport au jour courant.
 * Le tableau de bord reste donc alimenté quel que soit le jour de l'exécution.
 *
 * Les règles de gestion sont respectées par construction :
 *  - RG4 : chaque chambre suit une chronologie sans chevauchement ;
 *  - RG5 : le nombre de personnes ne dépasse jamais la capacité du type ;
 *  - RG7 : un séjour vient d'une réservation HONOREE ou d'un walk-in ;
 *  - RG8 : l'état final des chambres découle des séjours ;
 *  - RG10 et RG11 : un séjour terminé est soldé, un paiement ne dépasse pas le reste.
 *
 * Les dates sont en UTC, ce qui correspond à l'heure de la Côte d'Ivoire (GMT).
 */
import {
  EtatChambre,
  ModePaiement,
  Prisma,
  PrismaClient,
  Role,
  Sexe,
  StatutReservation,
  StatutSejour,
  TypePiece,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MOT_DE_PASSE_DEMO = "Hotel@2026";
const JOURS_HISTORIQUE = 60;
const JOURS_A_VENIR = 21;
const MS_PAR_JOUR = 86_400_000;
const PROBA_ANNULATION = 0.1;
const PROBA_WALK_IN = 0.2;
/** Numéro de la chambre présentée comme hors service. */
const CHAMBRE_HORS_SERVICE = "306";
const NB_CHAMBRES_EN_NETTOYAGE = 2;

/** Identifiants des comptes de démonstration, dans l'ordre de UTILISATEURS. */
const ID_RECEPTIONNISTE = 2;
const ID_COMPTABLE = 3;

// ---------------------------------------------------------------------------
// Outils : aléatoire reproductible et dates relatives
// ---------------------------------------------------------------------------

/** Générateur pseudo-aléatoire « mulberry32 » : même graine, mêmes données. */
function creerGenerateur(graine: number): () => number {
  let etat = graine;
  return () => {
    etat = (etat + 0x6d2b79f5) | 0;
    let t = Math.imul(etat ^ (etat >>> 15), 1 | etat);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const alea = creerGenerateur(20260101);

function entier(min: number, max: number): number {
  return min + Math.floor(alea() * (max - min + 1));
}

function choisir<T>(valeurs: readonly T[]): T {
  return valeurs[entier(0, valeurs.length - 1)];
}

const maintenant = new Date();
const minuitAujourdhui = Date.UTC(
  maintenant.getUTCFullYear(),
  maintenant.getUTCMonth(),
  maintenant.getUTCDate(),
);

/** Jour situé à `decalage` jours d'aujourd'hui (à minuit UTC). */
function jour(decalage: number): Date {
  return new Date(minuitAujourdhui + decalage * MS_PAR_JOUR);
}

/** Instant précis d'un jour relatif, dans une plage d'heures donnée. */
function instant(decalage: number, heureMin: number, heureMax: number): Date {
  const date = jour(decalage);
  date.setUTCHours(entier(heureMin, heureMax), entier(0, 59));
  return date;
}

function plusTot(a: Date, b: Date): Date {
  return a < b ? a : b;
}

// ---------------------------------------------------------------------------
// Référentiels
// ---------------------------------------------------------------------------

const UTILISATEURS = [
  { nom: "Kouamé", prenoms: "Adjoua Marie", email: "admin@hotel.test", telephone: "0701020304", role: Role.ADMIN },
  { nom: "Bakayoko", prenoms: "Mariam", email: "reception@hotel.test", telephone: "0502030405", role: Role.RECEPTIONNISTE },
  { nom: "Assi", prenoms: "Jean-Marc", email: "comptable@hotel.test", telephone: "0103040506", role: Role.COMPTABLE },
  { nom: "Tanoh", prenoms: "Serge Olivier", email: "responsable@hotel.test", telephone: "0704050607", role: Role.RESPONSABLE },
];

const TYPES_CHAMBRE = [
  { id: 1, libelle: "Standard", description: "Chambre simple avec climatisation et salle d'eau", capacite: 2, tarifNuit: 25_000 },
  { id: 2, libelle: "Confort", description: "Chambre spacieuse avec bureau et mini-bar", capacite: 2, tarifNuit: 35_000 },
  { id: 3, libelle: "Familiale", description: "Grande chambre avec un lit double et deux lits simples", capacite: 4, tarifNuit: 45_000 },
  { id: 4, libelle: "Suite", description: "Suite avec salon séparé et terrasse", capacite: 3, tarifNuit: 60_000 },
];

/** Répartition des 20 chambres : numéro → identifiant du type. */
const PLAN_CHAMBRES: ReadonlyArray<readonly [numero: string, typeId: number]> = [
  ["101", 1], ["102", 1], ["103", 1], ["104", 1], ["105", 2], ["106", 2], ["107", 3],
  ["201", 1], ["202", 1], ["203", 1], ["204", 2], ["205", 2], ["206", 3], ["207", 3],
  ["301", 1], ["302", 2], ["303", 2], ["304", 3], ["305", 4], ["306", 4],
];

const CHAMBRES = PLAN_CHAMBRES.map(([numero, typeId], index) => ({
  id: index + 1,
  numero,
  etage: Number(numero[0]),
  typeId,
}));

type ChambreDemo = (typeof CHAMBRES)[number];

const CLIENTS: Array<Omit<Prisma.ClientCreateManyInput, "id" | "creeLe">> = [
  { nom: "Kouassi", prenoms: "Yao Bernard", sexe: Sexe.MASCULIN, dateNaissance: new Date("1984-03-12"), nationalite: "Ivoirienne", typePiece: TypePiece.CNI, numeroPiece: "CI0084120031", telephone: "0707112233", email: "yao.kouassi@example.com", adresse: "Cocody Angré, Abidjan" },
  { nom: "Koné", prenoms: "Fatoumata", sexe: Sexe.FEMININ, dateNaissance: new Date("1990-07-25"), nationalite: "Ivoirienne", typePiece: TypePiece.CNI, numeroPiece: "CI0090450172", telephone: "0505223344", email: "f.kone@example.com", adresse: "Korhogo, quartier Soba" },
  { nom: "Traoré", prenoms: "Moussa", sexe: Sexe.MASCULIN, dateNaissance: new Date("1978-11-02"), nationalite: "Malienne", typePiece: TypePiece.PASSEPORT, numeroPiece: "AA7845123", telephone: "0101334455", adresse: "Bamako, Hamdallaye" },
  { nom: "Yao", prenoms: "Akissi Clarisse", sexe: Sexe.FEMININ, dateNaissance: new Date("1995-01-18"), nationalite: "Ivoirienne", typePiece: TypePiece.CNI, numeroPiece: "CI0095330288", telephone: "0708445566", email: "akissi.yao@example.com", adresse: "Yamoussoukro, Habitat" },
  { nom: "Bamba", prenoms: "Lassina", sexe: Sexe.MASCULIN, dateNaissance: new Date("1982-05-30"), nationalite: "Ivoirienne", typePiece: TypePiece.PERMIS, numeroPiece: "PC2019-44871", telephone: "0506556677", adresse: "Bouaké, Air France" },
  { nom: "Ouattara", prenoms: "Aminata", sexe: Sexe.FEMININ, dateNaissance: new Date("1988-09-14"), nationalite: "Ivoirienne", typePiece: TypePiece.CNI, numeroPiece: "CI0088210945", telephone: "0102667788", email: "aminata.ouattara@example.com", adresse: "Marcory Zone 4, Abidjan" },
  { nom: "N'Guessan", prenoms: "Kouadio Hervé", sexe: Sexe.MASCULIN, dateNaissance: new Date("1975-12-08"), nationalite: "Ivoirienne", typePiece: TypePiece.CNI, numeroPiece: "CI0075660413", telephone: "0709778899", adresse: "Daloa, Tazibouo" },
  { nom: "Coulibaly", prenoms: "Salimata", sexe: Sexe.FEMININ, dateNaissance: null, nationalite: "Burkinabè", typePiece: TypePiece.PASSEPORT, numeroPiece: "BF1120457", telephone: "0507889900", email: "s.coulibaly@example.com" },
  { nom: "Diabaté", prenoms: "Ibrahim", sexe: Sexe.MASCULIN, dateNaissance: new Date("1992-04-21"), nationalite: "Ivoirienne", typePiece: TypePiece.CNI, numeroPiece: "CI0092170566", telephone: "0103990011", adresse: "Odienné, Centre" },
  { nom: "Aka", prenoms: "Ahou Bénédicte", sexe: Sexe.FEMININ, dateNaissance: new Date("1986-06-03"), nationalite: "Ivoirienne", typePiece: TypePiece.CNI, numeroPiece: "CI0086540127", telephone: "0701102030", email: "ahou.aka@example.com", adresse: "Grand-Bassam, France" },
  { nom: "Brou", prenoms: "Konan Michel", sexe: Sexe.MASCULIN, dateNaissance: new Date("1970-02-27"), nationalite: "Ivoirienne", typePiece: TypePiece.AUTRE, numeroPiece: "CC-558214", telephone: "0504203040", adresse: "Abengourou, Dioulakro" },
  { nom: "Gnagne", prenoms: "Marie-Laure", sexe: Sexe.FEMININ, dateNaissance: new Date("1993-10-11"), nationalite: "Ivoirienne", typePiece: TypePiece.CNI, numeroPiece: "CI0093880374", telephone: "0105304050", email: "ml.gnagne@example.com", adresse: "Dabou, Résidentiel" },
  { nom: "Dosso", prenoms: "Abdoulaye", sexe: Sexe.MASCULIN, dateNaissance: new Date("1981-08-19"), nationalite: "Ivoirienne", typePiece: TypePiece.PERMIS, numeroPiece: "PC2021-10932", telephone: "0702405060", adresse: "Séguéla, Commerce" },
  { nom: "Touré", prenoms: "Awa", sexe: Sexe.FEMININ, dateNaissance: new Date("1997-03-05"), nationalite: "Sénégalaise", typePiece: TypePiece.PASSEPORT, numeroPiece: "SN4471208", telephone: "0506506070", email: "awa.toure@example.com", adresse: "Dakar, Mermoz" },
  { nom: "Konan", prenoms: "Affoué Rachelle", sexe: Sexe.FEMININ, dateNaissance: null, nationalite: "Ivoirienne", typePiece: TypePiece.CNI, numeroPiece: "CI0099120658", telephone: "0108607080", adresse: "San-Pédro, Bardot" },
];

const PARAMETRES = [
  { cle: "nom_hotel", valeur: "Hôtel Ébène (démonstration)" },
  { cle: "adresse", valeur: "Boulevard de la Lagune, Abidjan, Côte d'Ivoire" },
  { cle: "telephone", valeur: "27 00 00 00 00" },
  { cle: "heure_liberation", valeur: "12:00" },
];

const MOTIFS_ANNULATION = [
  "Voyage reporté par le client",
  "Changement de programme professionnel",
  "Raison familiale",
  "Réservation effectuée en double",
  "Client injoignable",
];

/** Pondération réaliste des modes de paiement. */
const MODES_PONDERES: readonly ModePaiement[] = [
  ...Array<ModePaiement>(9).fill(ModePaiement.ESPECES),
  ...Array<ModePaiement>(7).fill(ModePaiement.MOBILE_MONEY),
  ...Array<ModePaiement>(3).fill(ModePaiement.CARTE),
  ModePaiement.VIREMENT,
];

const PREFIXES_REFERENCE: Partial<Record<ModePaiement, string>> = {
  [ModePaiement.MOBILE_MONEY]: "MM",
  [ModePaiement.CARTE]: "CB",
  [ModePaiement.VIREMENT]: "VIR",
};

// ---------------------------------------------------------------------------
// Génération de la chronologie
// ---------------------------------------------------------------------------

type Phase = "TERMINE" | "EN_COURS" | "A_VENIR";

/** Une occupation (réelle ou annulée) d'une chambre sur une période. */
interface Creneau {
  chambre: ChambreDemo;
  arrivee: number; // décalage en jours par rapport à aujourd'hui
  nuits: number;
  annule: boolean;
  walkIn: boolean;
  clientId: number;
  arriveeReelle: Date;
  departReel: Date;
  reservationId?: number;
  code?: string;
  creeLe?: Date;
}

function depart(c: Pick<Creneau, "arrivee" | "nuits">): number {
  return c.arrivee + c.nuits;
}

function phaseDe(c: Pick<Creneau, "arrivee" | "nuits">): Phase {
  if (c.arrivee >= 0) return "A_VENIR";
  return depart(c) >= 0 ? "EN_COURS" : "TERMINE";
}

/** Crée les créneaux d'une chambre, sans chevauchement (RG4). */
function creneauxDeChambre(chambre: ChambreDemo): Creneau[] {
  const creneaux: Creneau[] = [];
  const horsService = chambre.numero === CHAMBRE_HORS_SERVICE;
  let curseur = -JOURS_HISTORIQUE + entier(0, 3);

  while (curseur <= JOURS_A_VENIR) {
    const nuits = entier(1, 5);
    // Une chambre hors service n'a ni séjour en cours ni réservation à venir.
    if (horsService && curseur + nuits >= -3) break;

    const annule = alea() < PROBA_ANNULATION;
    const passe = phaseDe({ arrivee: curseur, nuits }) !== "A_VENIR";
    creneaux.push({
      chambre,
      arrivee: curseur,
      nuits,
      annule,
      walkIn: !annule && passe && alea() < PROBA_WALK_IN,
      clientId: 0,
      arriveeReelle: instant(curseur, 13, 19),
      departReel: instant(curseur + nuits, 9, 11),
    });
    curseur += nuits + entier(0, 4);
  }
  return creneaux;
}

/**
 * Attribue un client à chaque créneau, en évitant qu'un même client occupe
 * deux chambres en même temps. Un créneau sans client libre est abandonné.
 */
function attribuerClients(creneaux: Creneau[]): Creneau[] {
  const libreLe = new Map<number, number>();
  const conserves: Creneau[] = [];

  for (const creneau of creneaux) {
    const libres = CLIENTS.map((_, i) => i + 1).filter(
      (id) => creneau.annule || (libreLe.get(id) ?? -Infinity) <= creneau.arrivee,
    );
    if (libres.length === 0) continue;

    creneau.clientId = choisir(libres);
    if (!creneau.annule) libreLe.set(creneau.clientId, depart(creneau));
    conserves.push(creneau);
  }
  return conserves;
}

/** Date de création d'une réservation : avant l'arrivée et jamais dans le futur. */
function dateCreationReservation(creneau: Creneau): Date {
  const candidate = instant(creneau.arrivee - entier(1, 10), 8, 17);
  return candidate <= maintenant ? candidate : instant(-entier(1, 5), 8, 17);
}

/** Numérote les réservations par ordre de création : RES-2026-0001, etc. */
function numeroterReservations(creneaux: Creneau[]): void {
  const avecReservation = creneaux.filter((c) => !c.walkIn);
  avecReservation.forEach((c) => (c.creeLe = dateCreationReservation(c)));
  avecReservation.sort((a, b) => a.creeLe!.getTime() - b.creeLe!.getTime());

  const compteurs = new Map<number, number>();
  avecReservation.forEach((c, index) => {
    const annee = c.creeLe!.getUTCFullYear();
    const rang = (compteurs.get(annee) ?? 0) + 1;
    compteurs.set(annee, rang);
    c.reservationId = index + 1;
    c.code = `RES-${annee}-${String(rang).padStart(4, "0")}`;
  });
}

function genererCreneaux(): Creneau[] {
  const tous = CHAMBRES.flatMap(creneauxDeChambre).sort((a, b) => a.arrivee - b.arrivee);
  const conserves = attribuerClients(tous);
  numeroterReservations(conserves);
  return conserves;
}

// ---------------------------------------------------------------------------
// Construction des lignes à insérer
// ---------------------------------------------------------------------------

function tarifDe(chambre: ChambreDemo): number {
  return TYPES_CHAMBRE.find((t) => t.id === chambre.typeId)!.tarifNuit;
}

function capaciteDe(chambre: ChambreDemo): number {
  return TYPES_CHAMBRE.find((t) => t.id === chambre.typeId)!.capacite;
}

function ligneReservation(c: Creneau): Prisma.ReservationCreateManyInput {
  const statutActif =
    phaseDe(c) === "A_VENIR" ? StatutReservation.CONFIRMEE : StatutReservation.HONOREE;
  return {
    id: c.reservationId,
    code: c.code!,
    clientId: c.clientId,
    chambreId: c.chambre.id,
    dateArriveePrevue: jour(c.arrivee),
    dateDepartPrevue: jour(depart(c)),
    nbPersonnes: entier(1, capaciteDe(c.chambre)),
    tarifNuitApplique: tarifDe(c.chambre),
    statut: c.annule ? StatutReservation.ANNULEE : statutActif,
    motifAnnulation: c.annule ? choisir(MOTIFS_ANNULATION) : null,
    creeLe: c.creeLe!,
    creeParId: ID_RECEPTIONNISTE,
  };
}

/** Un créneau produit un séjour s'il n'est ni annulé ni à venir. */
function produitSejour(c: Creneau): boolean {
  return !c.annule && phaseDe(c) !== "A_VENIR";
}

function ligneSejour(c: Creneau, id: number): Prisma.SejourCreateManyInput {
  const termine = phaseDe(c) === "TERMINE";
  return {
    id,
    reservationId: c.reservationId ?? null,
    clientId: c.clientId,
    chambreId: c.chambre.id,
    dateArriveeEffective: c.arriveeReelle,
    dateDepartPrevue: jour(depart(c)),
    dateDepartEffective: termine ? c.departReel : null,
    tarifNuitApplique: tarifDe(c.chambre),
    statut: termine ? StatutSejour.TERMINE : StatutSejour.EN_COURS,
    arriveeParId: ID_RECEPTIONNISTE,
    departParId: termine ? ID_RECEPTIONNISTE : null,
  };
}

function lignePaiement(
  sejourId: number,
  montant: number,
  date: Date,
): Prisma.PaiementCreateManyInput {
  const mode = choisir(MODES_PONDERES);
  const prefixe = PREFIXES_REFERENCE[mode];
  return {
    sejourId,
    montant,
    mode,
    reference: prefixe ? `${prefixe}${entier(100_000_000, 999_999_999)}` : null,
    datePaiement: date,
    enregistreParId: ID_COMPTABLE,
  };
}

/** Acompte de la moitié du total, arrondi à 5 000 FCFA près. */
function acompte(total: number): number {
  return Math.round(total / 2 / 5_000) * 5_000;
}

/** Un séjour terminé est intégralement payé (RG11). */
function paiementsSejourTermine(
  c: Creneau,
  sejourId: number,
  total: number,
): Prisma.PaiementCreateManyInput[] {
  if (alea() < 0.7) return [lignePaiement(sejourId, total, c.departReel)];
  const verse = acompte(total);
  return [
    lignePaiement(sejourId, verse, c.arriveeReelle),
    lignePaiement(sejourId, total - verse, c.departReel),
  ];
}

/** Un séjour en cours peut être impayé, partiellement payé ou soldé. */
function paiementsSejourEnCours(
  c: Creneau,
  sejourId: number,
  total: number,
): Prisma.PaiementCreateManyInput[] {
  const tirage = alea();
  if (tirage < 0.3) return [];
  if (tirage < 0.6) return [lignePaiement(sejourId, acompte(total), c.arriveeReelle)];
  // Solde réglé ce matin : alimente les « recettes du jour » du tableau de bord.
  return [lignePaiement(sejourId, total, plusTot(instant(0, 8, 11), maintenant))];
}

function lignesPaiements(c: Creneau, sejourId: number): Prisma.PaiementCreateManyInput[] {
  const total = c.nuits * tarifDe(c.chambre); // RG9
  return phaseDe(c) === "TERMINE"
    ? paiementsSejourTermine(c, sejourId, total)
    : paiementsSejourEnCours(c, sejourId, total);
}

/** État final de chaque chambre, déduit des séjours (RG8). */
function etatsDesChambres(creneaux: Creneau[]): Map<number, EtatChambre> {
  const etats = new Map<number, EtatChambre>();
  const sejours = creneaux.filter(produitSejour);

  for (const chambre of CHAMBRES) {
    const occupee = sejours.some((c) => c.chambre.id === chambre.id && phaseDe(c) === "EN_COURS");
    if (occupee) etats.set(chambre.id, EtatChambre.OCCUPEE);
    if (chambre.numero === CHAMBRE_HORS_SERVICE) etats.set(chambre.id, EtatChambre.HORS_SERVICE);
  }

  // Les dernières chambres libérées sont encore en cours de nettoyage.
  [...sejours]
    .filter((c) => phaseDe(c) === "TERMINE" && !etats.has(c.chambre.id))
    .sort((a, b) => depart(b) - depart(a))
    .map((c) => c.chambre.id)
    .filter((id, index, liste) => liste.indexOf(id) === index)
    .slice(0, NB_CHAMBRES_EN_NETTOYAGE)
    .forEach((id) => etats.set(id, EtatChambre.NETTOYAGE));

  return etats;
}

// ---------------------------------------------------------------------------
// Journal d'activité (RG13)
// ---------------------------------------------------------------------------

function entreeJournal(
  utilisateurId: number,
  action: string,
  date: Date,
  details: Prisma.InputJsonObject,
): Prisma.JournalActiviteCreateManyInput {
  return { utilisateurId, action, date, details };
}

function journalReservation(c: Creneau): Prisma.JournalActiviteCreateManyInput[] {
  const creation = entreeJournal(ID_RECEPTIONNISTE, "RESERVATION_CREEE", c.creeLe!, { code: c.code! });
  if (!c.annule) return [creation];

  const dateAnnulation = plusTot(new Date(c.creeLe!.getTime() + MS_PAR_JOUR), maintenant);
  return [
    creation,
    entreeJournal(ID_RECEPTIONNISTE, "RESERVATION_ANNULEE", dateAnnulation, { code: c.code! }),
  ];
}

function journalSejour(
  c: Creneau,
  sejourId: number,
): Prisma.JournalActiviteCreateManyInput[] {
  const arrivee = entreeJournal(ID_RECEPTIONNISTE, "ARRIVEE", c.arriveeReelle, {
    sejourId,
    chambre: c.chambre.numero,
  });
  if (phaseDe(c) !== "TERMINE") return [arrivee];
  return [
    arrivee,
    entreeJournal(ID_RECEPTIONNISTE, "DEPART", c.departReel, {
      sejourId,
      chambre: c.chambre.numero,
    }),
  ];
}

function journalPaiement(
  paiement: Prisma.PaiementCreateManyInput,
): Prisma.JournalActiviteCreateManyInput {
  return entreeJournal(ID_COMPTABLE, "PAIEMENT", paiement.datePaiement as Date, {
    sejourId: paiement.sejourId,
    montant: paiement.montant,
    mode: paiement.mode,
  });
}

// ---------------------------------------------------------------------------
// Assemblage et écriture en base
// ---------------------------------------------------------------------------

function construireOperations(creneaux: Creneau[]) {
  const reservations = creneaux.filter((c) => !c.walkIn).map(ligneReservation);
  const sejours: Prisma.SejourCreateManyInput[] = [];
  const paiements: Prisma.PaiementCreateManyInput[] = [];
  const journal = creneaux.filter((c) => !c.walkIn).flatMap(journalReservation);

  creneaux.filter(produitSejour).forEach((c, index) => {
    const sejourId = index + 1;
    const lignes = lignesPaiements(c, sejourId);
    sejours.push(ligneSejour(c, sejourId));
    paiements.push(...lignes);
    journal.push(...journalSejour(c, sejourId), ...lignes.map(journalPaiement));
  });
  journal.sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());

  return { reservations, sejours, paiements, journal };
}

/** Vide les tables, des dépendantes vers les référentiels. */
function operationsDeNettoyage() {
  return [
    prisma.paiement.deleteMany(),
    prisma.sejour.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.journalActivite.deleteMany(),
    prisma.chambre.deleteMany(),
    prisma.typeChambre.deleteMany(),
    prisma.client.deleteMany(),
    prisma.utilisateur.deleteMany(),
    prisma.parametre.deleteMany(),
  ];
}

async function lignesUtilisateurs(): Promise<Prisma.UtilisateurCreateManyInput[]> {
  return Promise.all(
    UTILISATEURS.map(async (utilisateur, index) => ({
      ...utilisateur,
      id: index + 1,
      motDePasse: await bcrypt.hash(MOT_DE_PASSE_DEMO, 10),
      creeLe: jour(-120),
    })),
  );
}

async function main(): Promise<void> {
  const creneaux = genererCreneaux();
  const etats = etatsDesChambres(creneaux);
  const { reservations, sejours, paiements, journal } = construireOperations(creneaux);
  const utilisateurs = await lignesUtilisateurs();

  // Tout ou rien : en cas d'erreur, la base reste dans son état précédent.
  await prisma.$transaction([
    ...operationsDeNettoyage(),
    prisma.parametre.createMany({ data: PARAMETRES }),
    prisma.utilisateur.createMany({ data: utilisateurs }),
    prisma.typeChambre.createMany({ data: TYPES_CHAMBRE }),
    prisma.chambre.createMany({
      data: CHAMBRES.map((c) => ({ ...c, etat: etats.get(c.id) ?? EtatChambre.DISPONIBLE })),
    }),
    prisma.client.createMany({
      data: CLIENTS.map((c, i) => ({ ...c, id: i + 1, creeLe: jour(-90 + i) })),
    }),
    prisma.reservation.createMany({ data: reservations }),
    prisma.sejour.createMany({ data: sejours }),
    prisma.paiement.createMany({ data: paiements }),
    prisma.journalActivite.createMany({ data: journal }),
  ]);

  console.log("Données de démonstration créées :");
  console.table({
    utilisateurs: utilisateurs.length,
    "types de chambre": TYPES_CHAMBRE.length,
    chambres: CHAMBRES.length,
    clients: CLIENTS.length,
    réservations: reservations.length,
    séjours: sejours.length,
    paiements: paiements.length,
    "entrées du journal": journal.length,
  });
  console.log(`Comptes : ${UTILISATEURS.map((u) => u.email).join(", ")}`);
  console.log(`Mot de passe commun : ${MOT_DE_PASSE_DEMO}`);
}

main()
  .catch((erreur) => {
    console.error("Échec du seed :", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
