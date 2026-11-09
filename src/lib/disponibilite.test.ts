import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  chambreLibre,
  finOccupationSejour,
  periodesSeChevauchent,
  type Periode,
  verifierCapacite,
  verifierDisponibilite,
} from "@/lib/disponibilite";
import { ErreurMetier } from "@/lib/erreurs";

// Ces tests n'ont pas besoin de la base : le client Prisma global est remplacé.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const jour = (texte: string) => new Date(`${texte}T00:00:00.000Z`);
const periode = (debut: string, fin: string): Periode => ({ debut: jour(debut), fin: jour(fin) });

const DEMANDE = periode("2026-11-10", "2026-11-13");

describe("RG4 : chevauchement de périodes", () => {
  it.each([
    ["identique", "2026-11-10", "2026-11-13"],
    ["à cheval sur le début", "2026-11-08", "2026-11-11"],
    ["à cheval sur la fin", "2026-11-12", "2026-11-15"],
    ["incluse dans la demande", "2026-11-11", "2026-11-12"],
    ["englobant la demande", "2026-11-01", "2026-11-30"],
  ])("détecte une occupation %s", (_nom, debut, fin) => {
    expect(periodesSeChevauchent(periode(debut, fin), DEMANDE)).toBe(true);
  });

  it.each([
    ["se terminant le jour de l'arrivée", "2026-11-08", "2026-11-10"],
    ["commençant le jour du départ", "2026-11-13", "2026-11-15"],
    ["entièrement avant", "2026-11-01", "2026-11-05"],
    ["entièrement après", "2026-11-20", "2026-11-25"],
  ])("ne bloque pas une occupation %s", (_nom, debut, fin) => {
    expect(periodesSeChevauchent(periode(debut, fin), DEMANDE)).toBe(false);
  });

  it("déclare libre une chambre sans occupation", () => {
    expect(chambreLibre([], DEMANDE)).toBe(true);
  });

  it("déclare occupée une chambre dès qu'une période chevauche", () => {
    expect(chambreLibre([periode("2026-11-01", "2026-11-02"), periode("2026-11-12", "2026-11-14")], DEMANDE)).toBe(false);
  });
});

describe("Fin d'occupation d'un séjour en cours", () => {
  const aujourdhui = jour("2026-11-10");

  it("reprend le départ prévu s'il n'est pas dépassé", () => {
    expect(finOccupationSejour(jour("2026-11-12"), aujourdhui)).toEqual(jour("2026-11-12"));
    expect(finOccupationSejour(aujourdhui, aujourdhui)).toEqual(aujourdhui);
  });

  it("garde la chambre occupée jusqu'à demain si le départ prévu est dépassé", () => {
    expect(finOccupationSejour(jour("2026-11-08"), aujourdhui)).toEqual(jour("2026-11-11"));
  });
});

describe("RG5 : capacité", () => {
  it("accepte jusqu'à la capacité", () => {
    expect(() => verifierCapacite(2, 2)).not.toThrow();
  });

  it("refuse au-delà de la capacité", () => {
    expect(() => verifierCapacite(3, 2)).toThrow(ErreurMetier);
  });
});

interface Scenario {
  etat?: string;
  reservations?: Array<{ chambreId: number; dateArriveePrevue: Date; dateDepartPrevue: Date }>;
  sejours?: Array<{ chambreId: number; dateArriveeEffective: Date; dateDepartPrevue: Date }>;
}

/** Faux client de transaction, qui trace l'ordre des opérations. */
function fauxClient({ etat = "DISPONIBLE", reservations = [], sejours = [] }: Scenario) {
  const appels: string[] = [];
  const client = {
    $queryRaw: vi.fn(async () => {
      appels.push("verrou");
      return [];
    }),
    chambre: {
      findUnique: vi.fn(async () => {
        appels.push("lecture");
        return etat === "ABSENTE" ? null : { id: 1, numero: "101", etat, type: { capacite: 2, tarifNuit: 25_000 } };
      }),
    },
    reservation: { findMany: vi.fn(async () => reservations) },
    sejour: { findMany: vi.fn(async () => sejours) },
  };
  return { client: client as unknown as Prisma.TransactionClient, brut: client, appels };
}

describe("RG4 : vérification dans la transaction", () => {
  it("verrouille la chambre avant toute lecture", async () => {
    const { client, appels } = fauxClient({});
    await verifierDisponibilite(client, 1, DEMANDE);
    expect(appels).toEqual(["verrou", "lecture"]);
  });

  it("renvoie la chambre si elle est libre", async () => {
    const { client } = fauxClient({});
    await expect(verifierDisponibilite(client, 1, DEMANDE)).resolves.toMatchObject({ numero: "101" });
  });

  it("refuse une chambre hors service", async () => {
    const { client } = fauxClient({ etat: "HORS_SERVICE" });
    await expect(verifierDisponibilite(client, 1, DEMANDE)).rejects.toThrow("hors service");
  });

  it("refuse une chambre inexistante", async () => {
    const { client } = fauxClient({ etat: "ABSENTE" });
    await expect(verifierDisponibilite(client, 1, DEMANDE)).rejects.toThrow(ErreurMetier);
  });

  it("refuse une chambre déjà réservée sur la période", async () => {
    const { client } = fauxClient({
      reservations: [{ chambreId: 1, dateArriveePrevue: jour("2026-11-12"), dateDepartPrevue: jour("2026-11-14") }],
    });
    await expect(verifierDisponibilite(client, 1, DEMANDE)).rejects.toThrow("n'est pas disponible");
  });

  it("ignore l'occupation d'une autre chambre", async () => {
    const { client } = fauxClient({
      reservations: [{ chambreId: 2, dateArriveePrevue: jour("2026-11-12"), dateDepartPrevue: jour("2026-11-14") }],
    });
    await expect(verifierDisponibilite(client, 1, DEMANDE)).resolves.toBeDefined();
  });

  it("transmet la réservation à exclure lors d'une modification", async () => {
    const { client, brut } = fauxClient({});
    await verifierDisponibilite(client, 1, DEMANDE, 42);
    expect(brut.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: 42 } }) }),
    );
  });
});
