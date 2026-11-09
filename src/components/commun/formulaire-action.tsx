"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { CLASSES_SELECT } from "@/components/commun/select-classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionFormulaire, EtatAction } from "@/lib/actions";
import type { OptionListe } from "@/lib/format";

const ContexteFormulaire = createContext<{ etat: EtatAction; enCours: boolean }>({
  etat: {},
  enCours: false,
});

interface ProprietesFormulaire {
  action: ActionFormulaire;
  children: ReactNode;
  className?: string;
  /** Vide le formulaire après un succès. */
  reinitialiser?: boolean;
  surSucces?: () => void;
}

/**
 * Formulaire relié à une Server Action : envoie les données, affiche le toast,
 * les erreurs de chaque champ, et suit la redirection demandée par l'action.
 * Les valeurs saisies sont conservées en cas d'erreur.
 */
export function FormulaireAction({
  action,
  children,
  className,
  reinitialiser,
  surSucces,
}: ProprietesFormulaire) {
  const [etat, definirEtat] = useState<EtatAction>({});
  const [enCours, demarrer] = useTransition();
  const formulaire = useRef<HTMLFormElement>(null);
  const routeur = useRouter();

  /**
   * Le toast part dès le retour de l'action, et non dans un effet : le formulaire
   * peut avoir disparu de la page rafraîchie (ligne sortie d'une liste filtrée).
   */
  function traiterResultat(resultat: EtatAction) {
    definirEtat(resultat);
    if (!resultat.message) return;
    if (!resultat.succes) {
      toast.error(resultat.message);
      return;
    }
    toast.success(resultat.message);
    if (reinitialiser) formulaire.current?.reset();
    surSucces?.();
    if (resultat.redirection) routeur.push(resultat.redirection);
  }

  return (
    <ContexteFormulaire.Provider value={{ etat, enCours }}>
      <form
        ref={formulaire}
        className={className}
        onSubmit={(evenement) => {
          evenement.preventDefault();
          const donnees = new FormData(evenement.currentTarget);
          demarrer(async () => traiterResultat(await action(etat, donnees)));
        }}
      >
        {children}
      </form>
    </ContexteFormulaire.Provider>
  );
}

function MessageErreur({ nom }: { nom: string }) {
  const { etat } = useContext(ContexteFormulaire);
  const message = etat.erreurs?.[nom]?.[0];
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function useChampInvalide(nom: string): boolean {
  return Boolean(useContext(ContexteFormulaire).etat.erreurs?.[nom]);
}

interface ProprietesCommunes {
  nom: string;
  libelle: string;
  aide?: string;
  className?: string;
}

function CadreChamp({ nom, libelle, aide, className, children }: ProprietesCommunes & { children: ReactNode }) {
  return (
    <div className={className ?? "space-y-2"}>
      <Label htmlFor={nom}>{libelle}</Label>
      {children}
      {aide && <p className="text-xs text-muted-foreground">{aide}</p>}
      <MessageErreur nom={nom} />
    </div>
  );
}

type ProprietesChamp = ProprietesCommunes & Omit<ComponentProps<typeof Input>, "name" | "id" | "className">;

export function Champ({ nom, libelle, aide, className, ...reste }: ProprietesChamp) {
  const invalide = useChampInvalide(nom);
  return (
    <CadreChamp nom={nom} libelle={libelle} aide={aide} className={className}>
      <Input id={nom} name={nom} aria-invalid={invalide} {...reste} />
    </CadreChamp>
  );
}

type ProprietesZone = ProprietesCommunes & Omit<ComponentProps<typeof Textarea>, "name" | "id" | "className">;

export function ChampZone({ nom, libelle, aide, className, ...reste }: ProprietesZone) {
  const invalide = useChampInvalide(nom);
  return (
    <CadreChamp nom={nom} libelle={libelle} aide={aide} className={className}>
      <Textarea id={nom} name={nom} aria-invalid={invalide} {...reste} />
    </CadreChamp>
  );
}

interface ProprietesSelect extends ProprietesCommunes {
  options: readonly OptionListe[];
  defaut?: string | number;
  /** Libellé d'une première option vide. */
  vide?: string;
  required?: boolean;
}

export function ChampSelect({ nom, libelle, aide, className, options, defaut, vide, required }: ProprietesSelect) {
  const invalide = useChampInvalide(nom);
  return (
    <CadreChamp nom={nom} libelle={libelle} aide={aide} className={className}>
      <select
        id={nom}
        name={nom}
        defaultValue={defaut}
        required={required}
        aria-invalid={invalide}
        className={CLASSES_SELECT}
      >
        {vide !== undefined && <option value="">{vide}</option>}
        {options.map((option) => (
          <option key={option.valeur} value={option.valeur}>
            {option.libelle}
          </option>
        ))}
      </select>
    </CadreChamp>
  );
}

export function BoutonEnvoi({ children, disabled, ...reste }: ComponentProps<typeof Button>) {
  const { enCours } = useContext(ContexteFormulaire);
  return (
    <Button type="submit" disabled={enCours || disabled} {...reste}>
      {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}
