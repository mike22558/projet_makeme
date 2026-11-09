import type { Client } from "@prisma/client";

import { Champ, ChampSelect } from "@/components/commun/formulaire-action";
import { versDateIso } from "@/lib/dates";
import { LIBELLES_PIECES, LIBELLES_SEXE, options } from "@/lib/format";

/** Champs de la fiche client, réutilisés dans les assistants de réservation et d'arrivée. */
export function ChampsClient({ client }: { client?: Client }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Champ nom="nom" libelle="Nom" defaultValue={client?.nom} required />
      <Champ nom="prenoms" libelle="Prénoms" defaultValue={client?.prenoms} required />
      <ChampSelect nom="sexe" libelle="Sexe" options={options(LIBELLES_SEXE)} defaut={client?.sexe} required />
      <Champ
        nom="dateNaissance"
        libelle="Date de naissance"
        type="date"
        defaultValue={client?.dateNaissance ? versDateIso(client.dateNaissance) : undefined}
      />
      <Champ nom="nationalite" libelle="Nationalité" defaultValue={client?.nationalite ?? "Ivoirienne"} required />
      <ChampSelect nom="typePiece" libelle="Type de pièce" options={options(LIBELLES_PIECES)} defaut={client?.typePiece} required />
      <Champ nom="numeroPiece" libelle="Numéro de pièce" defaultValue={client?.numeroPiece} required />
      <Champ nom="telephone" libelle="Téléphone" type="tel" defaultValue={client?.telephone} required />
      <Champ nom="email" libelle="Adresse e-mail" type="email" defaultValue={client?.email ?? undefined} />
      <Champ nom="adresse" libelle="Adresse" defaultValue={client?.adresse ?? undefined} />
    </div>
  );
}
