import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const dossierCourant = dirname(fileURLToPath(import.meta.url));
const compatibilite = new FlatCompat({ baseDirectory: dossierCourant });

const configuration = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compatibilite.extends("next/core-web-vitals", "next/typescript"),
];

export default configuration;
