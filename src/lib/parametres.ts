import { cache } from "react";

import { prisma } from "@/lib/prisma";

const NOM_HOTEL_PAR_DEFAUT = "Gestion hôtelière";

export interface ParametresHotel {
  nom_hotel: string;
  adresse: string;
  telephone: string;
  heure_liberation: string;
}

/** Paramètres de l'hôtel, lus au plus une fois par requête grâce à cache(). */
export const lireParametres = cache(async (): Promise<ParametresHotel> => {
  const lignes = await prisma.parametre.findMany();
  const valeurs = Object.fromEntries(lignes.map((l) => [l.cle, l.valeur]));
  return {
    nom_hotel: valeurs.nom_hotel ?? NOM_HOTEL_PAR_DEFAUT,
    adresse: valeurs.adresse ?? "",
    telephone: valeurs.telephone ?? "",
    heure_liberation: valeurs.heure_liberation ?? "12:00",
  };
});

export async function lireNomHotel(): Promise<string> {
  return (await lireParametres()).nom_hotel;
}
