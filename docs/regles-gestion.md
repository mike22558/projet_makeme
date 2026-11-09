# Règles de gestion

Les règles de gestion décrivent le fonctionnement de l'hôtel que l'application doit garantir. La colonne « Mise en œuvre » indique où chaque règle est contrôlée.

## 1. Liste des règles

| N° | Règle | Mise en œuvre |
|---|---|---|
| RG1 | Un utilisateur a un seul rôle. Un compte désactivé ne peut plus se connecter : on désactive, on ne supprime jamais. | Champ `role` unique, contrôle de `actif` à la connexion |
| RG2 | Une réservation concerne un seul client et une seule chambre. | Clés étrangères obligatoires `clientId` et `chambreId` |
| RG3 | Le départ prévu est strictement postérieur à l'arrivée. Une réservation ne peut pas commencer dans le passé. | Schéma Zod et Server Action |
| RG4 | Une chambre est disponible sur une période si aucune réservation CONFIRMEE ni aucun séjour EN_COURS ne la chevauche, et si elle n'est pas HORS_SERVICE. La vérification est refaite côté serveur, dans une transaction, à l'enregistrement. | `lib/disponibilite.ts`, dans `prisma.$transaction` |
| RG5 | Le nombre de personnes ne dépasse pas la capacité du type de chambre. | Server Action de réservation |
| RG6 | Le tarif est copié dans la réservation ou le séjour à la création. Changer un tarif ne modifie pas l'historique. | Champs `tarifNuitApplique` |
| RG7 | Un séjour naît d'une réservation (qui passe à HONOREE) ou d'un client sans réservation (walk-in). | `reservationId` facultatif et unique |
| RG8 | Arrivée : chambre OCCUPEE. Départ : séjour TERMINE et chambre NETTOYAGE. Le réceptionniste remet ensuite la chambre DISPONIBLE. | Server Actions de séjour et de chambre |
| RG9 | Nuits = différence en jours entre arrivée et départ, minimum 1. Total = nuits × tarifNuitApplique. | `lib/calculs.ts` |
| RG10 | Reste = total − somme des paiements. Un paiement doit être supérieur à 0 et au plus égal au reste. | `lib/calculs.ts`, Server Action de paiement |
| RG11 | Le départ est refusé tant que le reste n'est pas nul. | Server Action de départ |
| RG12 | Seule une réservation CONFIRMEE peut être modifiée ou annulée. L'annulation exige un motif. | Server Actions de réservation |
| RG13 | Chaque action sensible (connexion, création, modification, annulation, paiement, arrivée, départ) est écrite dans le journal. | `lib/journal.ts` |

## 2. Formule de chevauchement (RG4)

Deux périodes se chevauchent si :

```
debutExistant < finDemandee  ET  finExistante > debutDemandee
```

Les inégalités sont strictes. Une chambre libérée le 12 peut donc être reprise le 12.

| Occupation existante | Début | Fin |
|---|---|---|
| Réservation CONFIRMEE | dateArriveePrevue | dateDepartPrevue |
| Séjour EN_COURS | jour de dateArriveeEffective | dateDepartPrevue |

## 3. Choix de conception

Ces points n'étaient pas précisés par le cahier des charges. La solution retenue est la plus simple et réaliste pour un hôtel.

| N° | Sujet | Choix retenu | Justification |
|---|---|---|---|
| C1 | Sexe du client | Énumération MASCULIN / FEMININ | Correspond aux pièces d'identité enregistrées |
| C2 | Précision des dates | Les dates prévues sont des jours, les dates effectives des instants | Une réservation porte sur des nuits, un passage en réception a une heure |
| C3 | Fuseau horaire | Dates calculées en UTC | La Côte d'Ivoire est à GMT toute l'année, sans heure d'été |
| C4 | Fin de facturation | Le client paie les nuits réellement passées. Pendant le séjour, le total est estimé sur le départ prévu. Au départ, il est calculé sur la date de départ effective. Un trop-perçu éventuel est rendu au client et enregistré dans `montantRembourse`. | Choix du maître d'ouvrage. Le champ ajouté au modèle garde une trace de l'argent rendu et maintient des recettes exactes |
| C5 | Personnes en walk-in | Le nombre de personnes est contrôlé (RG5) mais non conservé, car `Sejour` n'a pas ce champ | Respect du modèle de données imposé |
| C6 | Numérotation des réservations | Compteur par année, calculé dans la transaction de création | Code lisible, unicité garantie par la contrainte `@unique` |
| C7 | Connexions journalisées | Seules les connexions réussies sont tracées | `utilisateurId` est obligatoire dans le journal, or une tentative échouée peut ne correspondre à aucun compte |
| C8 | Double réservation simultanée | La ligne de la chambre est verrouillée (`SELECT … FOR UPDATE`) au début de la transaction | Sans verrou, deux réceptionnistes pourraient réserver la même chambre au même instant, chacun voyant la chambre libre |
| C9 | Moteur de stockage | `ENGINE=InnoDB` imposé dans la migration | WAMP utilise MyISAM par défaut, un moteur qui ignore les clés étrangères et les transactions |
| C10 | Client resté au-delà du départ prévu | La chambre reste indisponible jusqu'à son départ effectif, et les nuits supplémentaires sont facturées | Le client occupe toujours la chambre |
| C11 | Moment de l'arrivée sur réservation | Du jour d'arrivée prévu à la veille du départ prévu. Les nuits comptent à partir de l'arrivée réelle | Une arrivée anticipée n'est pas garantie, car la chambre peut encore être occupée |
| C12 | Changements d'état manuels | OCCUPEE ne se règle jamais à la main : cet état résulte d'une arrivée ou d'un départ | Évite un état de chambre contradictoire avec les séjours |
| C13 | Modification d'une réservation | Le tarif d'origine est conservé, sauf si le client change de chambre | Application de RG6 : le nouveau tarif correspond à la nouvelle chambre |
| C14 | Protection de l'administrateur | Un administrateur ne peut ni désactiver son compte ni changer son propre rôle | Évite qu'un hôtel se retrouve sans administrateur |
| C15 | Client absent à l'arrivée | La réservation reste CONFIRMEE jusqu'à son annulation par la réception, avec un motif | Décision humaine : le client peut arriver en retard |
| C16 | Encaissement | Le réceptionniste ne peut pas encaisser, conformément à la matrice des droits. Il oriente le client vers la comptabilité | Séparation des fonctions |
