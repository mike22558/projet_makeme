# Plan de tests

Chaque règle de gestion est vérifiée soit par un test unitaire automatisé (`npm test`), soit par un scénario manuel dans le navigateur. Les scénarios utilisent les comptes de démonstration décrits dans [installation.md](installation.md).

## 1. Tests unitaires

| Fichier | Portée |
|---|---|
| `src/lib/calculs.test.ts` | Nuits, montants, reste, trop-perçu, taux d'occupation |
| `src/lib/disponibilite.test.ts` | Chevauchement, capacité, verrou, exclusion lors d'une modification |
| `src/lib/csv.test.ts` | Format de l'export et neutralisation des formules |

## 2. Scénarios par règle de gestion

| Règle | Scénario | Résultat attendu | Type |
|---|---|---|---|
| RG1 | Désactiver un compte, puis tenter de s'y connecter | Connexion refusée avec le message « compte désactivé » | Manuel |
| RG1 | Désactiver un compte pendant qu'il est connecté | Déconnexion dès la requête suivante | Manuel |
| RG2 | Créer une réservation | Elle porte un seul client et une seule chambre | Manuel |
| RG3 | Saisir un départ antérieur ou égal à l'arrivée | Message d'erreur à l'étape 1 | Manuel |
| RG3 | Saisir une arrivée dans le passé | Message d'erreur à l'étape 1 | Manuel |
| RG4 | Réserver une période qui chevauche une réservation confirmée | La chambre n'est pas proposée | Unitaire et manuel |
| RG4 | Réserver du 12 au 15 une chambre libérée le 12 | La réservation est acceptée | Unitaire |
| RG4 | Deux réceptionnistes réservent la même chambre au même instant | Une seule réservation est enregistrée | Manuel |
| RG4 | Réserver une chambre hors service | La chambre n'est pas proposée | Unitaire et manuel |
| RG5 | Demander 3 personnes en chambre Standard | La chambre n'est pas proposée | Unitaire et manuel |
| RG6 | Modifier le tarif d'un type, puis ouvrir une réservation existante | Le tarif de la réservation est inchangé | Manuel |
| RG7 | Enregistrer l'arrivée d'une réservation | Séjour créé, réservation HONOREE | Manuel |
| RG7 | Enregistrer une arrivée sans réservation | Séjour créé sans réservation d'origine | Manuel |
| RG8 | Enregistrer une arrivée | Chambre OCCUPEE | Manuel |
| RG8 | Enregistrer un départ | Séjour TERMINE, chambre NETTOYAGE | Manuel |
| RG8 | Remettre une chambre en état après nettoyage | Chambre DISPONIBLE | Manuel |
| RG9 | Séjour de 3 nuits à 25 000 FCFA | Total de 75 000 FCFA | Unitaire |
| RG9 | Arrivée et départ le même jour | Une nuit facturée | Unitaire |
| RG10 | Payer un montant supérieur au reste | Paiement refusé | Manuel |
| RG10 | Payer 0 FCFA | Paiement refusé | Manuel |
| RG11 | Enregistrer le départ d'un séjour non soldé | Bouton de confirmation désactivé et refus côté serveur | Unitaire et manuel |
| RG12 | Annuler sans motif | Annulation refusée | Manuel |
| RG12 | Modifier une réservation annulée | Les boutons n'apparaissent pas, l'action est refusée | Manuel |
| RG13 | Effectuer chaque action sensible | Une ligne correspondante apparaît dans le journal | Manuel |
| C4 | Payer 3 nuits, partir après 1 nuit | 2 nuits rendues au client, recettes réduites d'autant | Unitaire et manuel |

## 3. Contrôle des droits

Pour chaque rôle, se connecter et ouvrir directement l'adresse de chaque module.

| Module | Admin | Réceptionniste | Comptable | Responsable |
|---|---|---|---|---|
| /utilisateurs, /parametres | Accès | Refus | Refus | Refus |
| /journal | Accès | Refus | Refus | Accès |
| /rapports | Accès | Refus | Accès, partie financière | Accès |
| /clients, /chambres, /reservations, /sejours, /paiements | Accès | Accès | Accès | Accès |

Les boutons d'écriture n'apparaissent que pour les rôles autorisés, et chaque Server Action contrôle de nouveau le droit côté serveur.
