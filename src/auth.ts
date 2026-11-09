import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { journaliser } from "@/lib/journal";
import { prisma } from "@/lib/prisma";
import { schemaConnexion } from "@/validations/auth";

/** Erreur levée lorsque le mot de passe est juste mais le compte désactivé (RG1). */
class CompteDesactive extends CredentialsSignin {
  code = "compte_desactive";
}

/**
 * Empreinte comparée quand l'email est inconnu : la réponse prend le même temps
 * que pour un compte existant, ce qui empêche de deviner les emails enregistrés.
 */
const EMPREINTE_FACTICE = bcrypt.hashSync("compte-inexistant", 10);

/** Date la connexion et l'écrit dans le journal (RG13). */
async function enregistrerConnexion(utilisateurId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.utilisateur.update({
      where: { id: utilisateurId },
      data: { derniereConnexion: new Date() },
    });
    await journaliser(tx, utilisateurId, "CONNEXION");
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, motDePasse: {} },
      async authorize(identifiants) {
        const donnees = schemaConnexion.safeParse(identifiants);
        if (!donnees.success) return null;

        const { email, motDePasse } = donnees.data;
        const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });
        const empreinte = utilisateur?.motDePasse ?? EMPREINTE_FACTICE;
        const motDePasseValide = await bcrypt.compare(motDePasse, empreinte);

        if (!utilisateur || !motDePasseValide) return null;
        if (!utilisateur.actif) throw new CompteDesactive();

        await enregistrerConnexion(utilisateur.id);
        return {
          id: String(utilisateur.id),
          name: `${utilisateur.prenoms} ${utilisateur.nom}`,
          email: utilisateur.email,
          role: utilisateur.role,
        };
      },
    }),
  ],
});
