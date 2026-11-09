import type { Chambre, TypeChambre } from "@prisma/client";

import { Champ, ChampSelect, ChampZone } from "@/components/commun/formulaire-action";
import type { OptionListe } from "@/lib/format";

export function ChampsTypeChambre({ type }: { type?: TypeChambre }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Champ nom="libelle" libelle="Libellé" defaultValue={type?.libelle} required className="space-y-2 sm:col-span-2" />
      <ChampZone nom="description" libelle="Description" defaultValue={type?.description ?? undefined} className="space-y-2 sm:col-span-2" />
      <Champ nom="capacite" libelle="Capacité (personnes)" type="number" min={1} defaultValue={type?.capacite} required />
      <Champ
        nom="tarifNuit"
        libelle="Tarif par nuit (FCFA)"
        type="number"
        min={1}
        defaultValue={type?.tarifNuit}
        aide="Un changement de tarif ne modifie pas les réservations existantes."
        required
      />
    </div>
  );
}

export function ChampsChambre({ chambre, types }: { chambre?: Chambre; types: OptionListe[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Champ nom="numero" libelle="Numéro" defaultValue={chambre?.numero} required />
      <Champ nom="etage" libelle="Étage" type="number" min={0} defaultValue={chambre?.etage} required />
      <ChampSelect nom="typeId" libelle="Type" options={types} defaut={chambre?.typeId} required />
    </div>
  );
}
