"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formaterEntier, formaterFcfa, formaterTaux } from "@/lib/format";

export interface PointGraphique {
  libelle: string;
  valeur: number;
}

type Unite = "fcfa" | "pourcent";

// Couleur validée (lisibilité et daltonisme) pour une série unique sur fond clair.
const COULEUR_SERIE = "#0d8a5e";

function formaterValeur(valeur: number, unite: Unite): string {
  return unite === "fcfa" ? formaterFcfa(valeur) : formaterTaux(valeur);
}

function formaterAxe(valeur: number, unite: Unite): string {
  if (unite === "pourcent") return `${valeur} %`;
  return valeur >= 1000 ? `${formaterEntier(valeur / 1000)} k` : String(valeur);
}

interface ProprietesInfobulle {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: PointGraphique }>;
  unite: Unite;
}

function Infobulle({ active, payload, unite }: ProprietesInfobulle) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
      <p className="text-muted-foreground">{point.libelle}</p>
      <p className="font-medium">{formaterValeur(point.valeur, unite)}</p>
    </div>
  );
}

const STYLE_AXE = { fontSize: 12, fill: "var(--muted-foreground)" };

/** Histogramme à une seule série. Le titre, porté par la carte, nomme la mesure. */
export function GraphiqueBarres({ donnees, unite }: { donnees: readonly PointGraphique[]; unite: Unite }) {
  return (
    <div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...donnees]} barCategoryGap="12%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="libelle" tick={STYLE_AXE} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis
              tick={STYLE_AXE}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={unite === "pourcent" ? [0, 100] : undefined}
              tickFormatter={(valeur: number) => formaterAxe(valeur, unite)}
            />
            <Tooltip content={<Infobulle unite={unite} />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="valeur" fill={COULEUR_SERIE} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm print:hidden">
        <summary className="cursor-pointer text-muted-foreground">Voir les données</summary>
        <table className="mt-2 w-full">
          <tbody>
            {donnees.map((point) => (
              <tr key={point.libelle} className="border-b last:border-0">
                <th scope="row" className="py-1 text-left font-normal text-muted-foreground">
                  {point.libelle}
                </th>
                <td className="py-1 text-right">{formaterValeur(point.valeur, unite)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
