import { Champ, ChampSelect } from "@/components/commun/formulaire-action";
import { LIBELLES_ROLES, options } from "@/lib/format";

interface Valeurs {
  nom: string;
  prenoms: string;
  email: string;
  telephone: string;
  role: string;
}

export function ChampsUtilisateur({ valeurs }: { valeurs?: Valeurs }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Champ nom="nom" libelle="Nom" defaultValue={valeurs?.nom} required />
      <Champ nom="prenoms" libelle="Prénoms" defaultValue={valeurs?.prenoms} required />
      <Champ nom="email" libelle="Adresse e-mail" type="email" defaultValue={valeurs?.email} required />
      <Champ nom="telephone" libelle="Téléphone" type="tel" defaultValue={valeurs?.telephone} required />
      <ChampSelect nom="role" libelle="Rôle" options={options(LIBELLES_ROLES)} defaut={valeurs?.role} required />
    </div>
  );
}
