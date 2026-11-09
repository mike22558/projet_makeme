# Guide d'installation

Ce guide permet d'installer et de lancer l'application sur un poste Windows.

## 1. Prérequis

| Logiciel | Version | Remarque |
|---|---|---|
| Node.js | 20 ou plus récent | Vérifier avec `node -v` |
| Serveur MySQL | MySQL 8 ou MariaDB 10.6 et plus | Fourni par XAMPP ou WAMP |

Démarrez le service MySQL depuis le panneau de contrôle de XAMPP ou de WAMP.

## 2. Installation

Dans un terminal ouvert sur le dossier `hotel` :

```bash
npm install
```

Copiez `.env.example` vers un nouveau fichier `.env`, puis renseignez ses deux valeurs :

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/hotel"
AUTH_SECRET="valeur-aleatoire"
```

Pour générer `AUTH_SECRET` :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 3. Création de la base

La commande suivante crée la base `hotel` et ses tables :

```bash
npm run db:deploy
```

Pour charger les données de démonstration :

```bash
npm run db:seed
```

Cette commande vide d'abord la base. Ne la lancez jamais sur des données réelles.

## 4. Lancement

| Usage | Commande | Adresse |
|---|---|---|
| Développement | `npm run dev` | http://localhost:3000 |
| Production | `npm run build`, puis `npm run start` | http://localhost:3000 |

## 5. Comptes de démonstration

Le mot de passe de tous les comptes est `Hotel@2026`.

| Rôle | Adresse e-mail |
|---|---|
| Administrateur | admin@hotel.test |
| Réceptionniste | reception@hotel.test |
| Comptable | comptable@hotel.test |
| Responsable | responsable@hotel.test |

## 6. Commandes utiles

| Commande | Rôle |
|---|---|
| `npm test` | Lance les tests unitaires |
| `npm run lint` | Contrôle la qualité du code |
| `npm run db:studio` | Ouvre un explorateur de la base dans le navigateur |

## 7. Résolution des problèmes

| Symptôme | Cause et solution |
|---|---|
| `Can't reach database server` | Le service MySQL n'est pas démarré, ou le port de `DATABASE_URL` est incorrect |
| `EPERM: operation not permitted` lors de `prisma generate` | Le serveur de développement utilise le moteur Prisma. Arrêtez `npm run dev`, relancez la commande, puis redémarrez le serveur |
| `Unknown field` ou erreur Prisma juste après une migration | Arrêtez puis relancez `npm run dev` pour charger le nouveau client Prisma |
| Déconnexion immédiate après la connexion | `AUTH_SECRET` est absent de `.env` |

**Moteur de stockage.** Les tables sont créées explicitement en InnoDB. Si vous ajoutez une migration qui crée une table sur un serveur WAMP, ajoutez `ENGINE=InnoDB` à son `CREATE TABLE`, car WAMP utilise MyISAM par défaut.
