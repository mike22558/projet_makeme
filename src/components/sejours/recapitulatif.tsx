import { LigneInfo } from "@/components/commun/elements";
import type { Solde } from "@/lib/calculs";
import { formaterFcfa } from "@/lib/format";

/** Récapitulatif financier d'un séjour : nuits, total, payé, reste. */
export function RecapitulatifSolde({ solde, tarif }: { solde: Solde; tarif: number }) {
  return (
    <dl className="divide-y">
      <LigneInfo libelle="Nuits">{solde.nuits}</LigneInfo>
      <LigneInfo libelle="Tarif par nuit">{formaterFcfa(tarif)}</LigneInfo>
      <LigneInfo libelle="Total">{formaterFcfa(solde.total)}</LigneInfo>
      <LigneInfo libelle="Payé">{formaterFcfa(solde.paye)}</LigneInfo>
      {solde.rembourse > 0 && <LigneInfo libelle="Rendu au client">{formaterFcfa(solde.rembourse)}</LigneInfo>}
      {solde.tropPercu > 0 && <LigneInfo libelle="À rendre au client">{formaterFcfa(solde.tropPercu)}</LigneInfo>}
      <LigneInfo libelle="Reste à payer">{formaterFcfa(solde.reste)}</LigneInfo>
    </dl>
  );
}
