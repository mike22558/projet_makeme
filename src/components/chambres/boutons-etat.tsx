import type { EtatChambre } from "@prisma/client";

import { changerEtatChambre } from "@/actions/chambres";
import { BoutonEnvoi, FormulaireAction } from "@/components/commun/formulaire-action";
import { TRANSITIONS_ETAT } from "@/lib/chambres";
import { LIBELLES_ETATS } from "@/lib/format";

/** Un bouton par changement d'état autorisé depuis l'état actuel de la chambre. */
export function BoutonsEtat({ id, etat }: { id: number; etat: EtatChambre }) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {TRANSITIONS_ETAT[etat].map((cible) => {
        const action = async () => {
          "use server";
          return changerEtatChambre(id, cible);
        };
        return (
          <FormulaireAction key={cible} action={action}>
            <BoutonEnvoi variant="outline" size="sm">
              {LIBELLES_ETATS[cible]}
            </BoutonEnvoi>
          </FormulaireAction>
        );
      })}
    </div>
  );
}
