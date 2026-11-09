import path from "node:path";
import type { NextConfig } from "next";

const configuration: NextConfig = {
  reactStrictMode: true,
  // Désigne ce dossier comme racine du projet, même si un autre fichier
  // package-lock.json existe dans un dossier parent de la machine.
  outputFileTracingRoot: path.join(__dirname),
};

export default configuration;
