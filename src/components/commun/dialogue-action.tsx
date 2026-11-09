"use client";

import { type ComponentProps, type ReactNode, useState } from "react";

import { BoutonEnvoi, FormulaireAction } from "@/components/commun/formulaire-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionFormulaire } from "@/lib/actions";

interface Proprietes {
  action: ActionFormulaire;
  declencheur: ReactNode;
  titre: string;
  description?: string;
  libelleConfirmation: string;
  variante?: ComponentProps<typeof Button>["variant"];
  /** Contenu du dialogue : récapitulatif ou champs supplémentaires. */
  children?: ReactNode;
  confirmationDesactivee?: boolean;
}

/** Dialogue de confirmation avant une action irréversible (annulation, départ…). */
export function DialogueAction({
  action,
  declencheur,
  titre,
  description,
  libelleConfirmation,
  variante,
  children,
  confirmationDesactivee,
}: Proprietes) {
  const [ouvert, definirOuvert] = useState(false);

  return (
    <Dialog open={ouvert} onOpenChange={definirOuvert}>
      <DialogTrigger asChild>{declencheur}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <FormulaireAction action={action} surSucces={() => definirOuvert(false)} className="space-y-4">
          {children}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Retour
              </Button>
            </DialogClose>
            <BoutonEnvoi variant={variante} disabled={confirmationDesactivee}>
              {libelleConfirmation}
            </BoutonEnvoi>
          </DialogFooter>
        </FormulaireAction>
      </DialogContent>
    </Dialog>
  );
}
