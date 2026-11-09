import { describe, expect, it } from "vitest";

import {
  finFacturationEstimee,
  montantTotal,
  nombreNuits,
  nuitsDansPeriode,
  sommePaiements,
  soldeSejour,
  type SejourAFacturer,
  tauxOccupation,
} from "@/lib/calculs";

const jour = (texte: string) => new Date(`${texte}T00:00:00.000Z`);
const instant = (texte: string) => new Date(`${texte}Z`);

function sejour(modifications: Partial<SejourAFacturer> = {}): SejourAFacturer {
  return {
    dateArriveeEffective: instant("2026-11-10T14:00:00"),
    dateDepartPrevue: jour("2026-11-13"),
    dateDepartEffective: null,
    tarifNuitApplique: 25_000,
    montantRembourse: 0,
    paiements: [],
    ...modifications,
  };
}

describe("RG9 : nombre de nuits", () => {
  it("compte les jours calendaires entre arrivée et départ", () => {
    expect(nombreNuits(jour("2026-11-10"), jour("2026-11-13"))).toBe(3);
  });

  it("ignore les heures d'arrivée et de départ", () => {
    expect(nombreNuits(instant("2026-11-10T18:45:00"), instant("2026-11-11T09:00:00"))).toBe(1);
  });

  it("facture au minimum une nuit pour un départ le jour même", () => {
    expect(nombreNuits(instant("2026-11-10T08:00:00"), instant("2026-11-10T20:00:00"))).toBe(1);
  });

  it("traverse correctement les fins de mois et d'année", () => {
    expect(nombreNuits(jour("2026-12-30"), jour("2027-01-02"))).toBe(3);
  });
});

describe("RG9 et RG10 : montants", () => {
  it("multiplie les nuits par le tarif", () => {
    expect(montantTotal(3, 25_000)).toBe(75_000);
  });

  it("additionne les paiements", () => {
    expect(sommePaiements([{ montant: 10_000 }, { montant: 15_000 }])).toBe(25_000);
    expect(sommePaiements([])).toBe(0);
  });

  it("calcule le reste à payer d'un séjour partiellement réglé", () => {
    const solde = soldeSejour(sejour({ paiements: [{ montant: 30_000 }] }), jour("2026-11-13"));
    expect(solde).toMatchObject({ nuits: 3, total: 75_000, paye: 30_000, reste: 45_000, tropPercu: 0 });
  });

  it("donne un reste nul pour un séjour soldé (RG11)", () => {
    const solde = soldeSejour(sejour({ paiements: [{ montant: 75_000 }] }), jour("2026-11-13"));
    expect(solde.reste).toBe(0);
  });
});

describe("Facturation des nuits réellement passées", () => {
  it("crée un trop-perçu lors d'un départ anticipé", () => {
    const solde = soldeSejour(sejour({ paiements: [{ montant: 75_000 }] }), jour("2026-11-11"));
    expect(solde).toMatchObject({ nuits: 1, total: 25_000, reste: 0, tropPercu: 50_000 });
  });

  it("ajoute les nuits supplémentaires d'un départ tardif", () => {
    const solde = soldeSejour(sejour({ paiements: [{ montant: 75_000 }] }), jour("2026-11-15"));
    expect(solde).toMatchObject({ nuits: 5, total: 125_000, reste: 50_000, tropPercu: 0 });
  });

  it("utilise le départ effectif d'un séjour terminé", () => {
    const solde = soldeSejour(
      sejour({ dateDepartEffective: instant("2026-11-12T10:00:00"), paiements: [{ montant: 50_000 }] }),
      jour("2030-01-01"),
    );
    expect(solde).toMatchObject({ nuits: 2, total: 50_000, reste: 0 });
  });

  it("considère un trop-perçu rendu comme soldé", () => {
    const solde = soldeSejour(
      sejour({
        dateDepartEffective: instant("2026-11-11T10:00:00"),
        montantRembourse: 50_000,
        paiements: [{ montant: 75_000 }],
      }),
      jour("2026-11-11"),
    );
    expect(solde).toMatchObject({ total: 25_000, paye: 75_000, rembourse: 50_000, reste: 0, tropPercu: 0 });
  });

  it("estime la fin sur le départ prévu, ou aujourd'hui si le client est resté", () => {
    expect(finFacturationEstimee(jour("2026-11-13"), jour("2026-11-11"))).toEqual(jour("2026-11-13"));
    expect(finFacturationEstimee(jour("2026-11-13"), jour("2026-11-15"))).toEqual(jour("2026-11-15"));
  });
});

describe("Taux d'occupation", () => {
  const debut = jour("2026-11-01");
  const fin = jour("2026-12-01");

  it("compte les nuits entièrement dans la période", () => {
    expect(nuitsDansPeriode(jour("2026-11-10"), jour("2026-11-13"), debut, fin)).toBe(3);
  });

  it("coupe un séjour à cheval sur le début ou la fin de la période", () => {
    expect(nuitsDansPeriode(jour("2026-10-30"), jour("2026-11-02"), debut, fin)).toBe(1);
    expect(nuitsDansPeriode(jour("2026-11-29"), jour("2026-12-03"), debut, fin)).toBe(2);
  });

  it("ignore un séjour hors période", () => {
    expect(nuitsDansPeriode(jour("2026-10-01"), jour("2026-10-05"), debut, fin)).toBe(0);
  });

  it("compte une nuit pour un séjour d'une seule journée", () => {
    expect(nuitsDansPeriode(instant("2026-11-10T08:00:00"), instant("2026-11-10T20:00:00"), debut, fin)).toBe(1);
  });

  it("calcule un pourcentage arrondi à une décimale", () => {
    expect(tauxOccupation(10, 20, 1)).toBe(50);
    expect(tauxOccupation(1, 3, 1)).toBe(33.3);
  });

  it("renvoie 0 sans chambre en service", () => {
    expect(tauxOccupation(0, 0, 30)).toBe(0);
  });
});
