# Modélisation MERISE : MCD et MLD

La démarche suit trois niveaux : le **MCD** décrit les données indépendamment de toute technique, le **MLD** les traduit en relations, et le **MPD** est leur implémentation MySQL, écrite dans `prisma/schema.prisma`.

## 1. Modèle conceptuel de données (MCD)

### 1.1 Entités

| Entité | Identifiant | Propriétés |
|---|---|---|
| UTILISATEUR | id | nom, prenoms, email, motDePasse, telephone, actif, role, creeLe, derniereConnexion |
| CLIENT | id | nom, prenoms, sexe, dateNaissance, nationalite, typePiece, numeroPiece, telephone, email, adresse, creeLe |
| TYPE_CHAMBRE | id | libelle, description, capacite, tarifNuit |
| CHAMBRE | id | numero, etage, etat |
| RESERVATION | id | code, dateArriveePrevue, dateDepartPrevue, nbPersonnes, tarifNuitApplique, statut, motifAnnulation, creeLe |
| SEJOUR | id | dateArriveeEffective, dateDepartPrevue, dateDepartEffective, tarifNuitApplique, montantRembourse, statut |
| PAIEMENT | id | montant, mode, reference, datePaiement |
| JOURNAL_ACTIVITE | id | action, details, date |
| PARAMETRE | cle | valeur |

PARAMETRE est une entité isolée : elle stocke la configuration de l'hôtel et n'est liée à aucune autre.

### 1.2 Associations et cardinalités

Une cardinalité (min, max) indique combien de fois une occurrence de l'entité participe à l'association.

| Association | Entité A | Card. A | Card. B | Entité B | Lecture |
|---|---|---|---|---|---|
| APPARTENIR | CHAMBRE | 1,1 | 0,n | TYPE_CHAMBRE | Une chambre appartient à un seul type. Un type regroupe zéro ou plusieurs chambres. |
| EFFECTUER | RESERVATION | 1,1 | 0,n | CLIENT | Une réservation est effectuée par un seul client (RG2). |
| CONCERNER | RESERVATION | 1,1 | 0,n | CHAMBRE | Une réservation concerne une seule chambre (RG2). |
| SAISIR | RESERVATION | 1,1 | 0,n | UTILISATEUR | Une réservation est saisie par un seul utilisateur. |
| DONNER_LIEU | SEJOUR | 0,1 | 0,1 | RESERVATION | Un séjour provient d'au plus une réservation (RG7). Une réservation donne lieu à au plus un séjour. |
| SEJOURNER | SEJOUR | 1,1 | 0,n | CLIENT | Un séjour concerne un seul client. |
| HEBERGER | SEJOUR | 1,1 | 0,n | CHAMBRE | Un séjour se déroule dans une seule chambre. |
| ENREGISTRER_ARRIVEE | SEJOUR | 1,1 | 0,n | UTILISATEUR | L'arrivée est enregistrée par un seul utilisateur. |
| ENREGISTRER_DEPART | SEJOUR | 0,1 | 0,n | UTILISATEUR | Le départ n'existe pas encore pendant un séjour en cours. |
| REGLER | PAIEMENT | 1,1 | 0,n | SEJOUR | Un paiement règle un seul séjour. Un séjour peut avoir plusieurs paiements. |
| ENCAISSER | PAIEMENT | 1,1 | 0,n | UTILISATEUR | Un paiement est encaissé par un seul utilisateur. |
| TRACER | JOURNAL_ACTIVITE | 1,1 | 0,n | UTILISATEUR | Une entrée du journal a un seul auteur (RG13). |

### 1.3 Schéma du MCD

```
                                  TYPE_CHAMBRE
                                       | 0,n
                                  (APPARTENIR)
                                       | 1,1
                 +---- 0,n ---------CHAMBRE--------- 0,n ----+
                 |                                           |
            (CONCERNER)                                 (HEBERGER)
                 | 1,1                                       | 1,1
 CLIENT 0,n -(EFFECTUER)- 1,1 RESERVATION 0,1 -(DONNER_LIEU)- 0,1 SEJOUR 0,n -(REGLER)- 1,1 PAIEMENT
   | 0,n                          | 1,1                       | 1,1 | 1,1 | 0,1              | 1,1
   |                           (SAISIR)                       |     |     |              (ENCAISSER)
   |                              | 0,n                       |     |     |                  | 0,n
   |                         UTILISATEUR <--(ENREGISTRER_ARRIVEE)-+     |     |             UTILISATEUR
   |                              ^  0,n                            |     |
   |                              +-----(ENREGISTRER_DEPART)--------------+
   +---------------------(SEJOURNER)--------------------------------+

 UTILISATEUR 0,n -(TRACER)- 1,1 JOURNAL_ACTIVITE            PARAMETRE (entité isolée)
```

UTILISATEUR apparaît deux fois dans ce schéma pour limiter les croisements : il s'agit de la même entité.

## 2. Modèle logique de données (MLD)

### 2.1 Règles de passage du MCD au MLD

1. Chaque entité devient une relation, et son identifiant devient la clé primaire.
2. Une association de cardinalités (1,1) – (0,n) disparaît : l'identifiant du côté (0,n) devient une clé étrangère obligatoire du côté (1,1).
3. Une association (0,1) – (0,n) disparaît de la même façon, avec une clé étrangère facultative du côté (0,1). C'est le cas de `departParId`.
4. L'association (0,1) – (0,1) DONNER_LIEU est portée par SEJOUR, avec une clé étrangère facultative et unique, `reservationId`. La valeur vide correspond à un walk-in.

Le modèle ne comporte aucune association (0,n) – (0,n), donc aucune table d'association.

### 2.2 Relations

Notation : **clé primaire** en gras, `#` devant une clé étrangère, `?` après un attribut facultatif.

- utilisateur (**id**, nom, prenoms, email, motDePasse, telephone, actif, role, creeLe, derniereConnexion?)
- client (**id**, nom, prenoms, sexe, dateNaissance?, nationalite, typePiece, numeroPiece, telephone, email?, adresse?, creeLe)
- type_chambre (**id**, libelle, description?, capacite, tarifNuit)
- chambre (**id**, numero, etage, etat, #typeId)
- reservation (**id**, code, #clientId, #chambreId, dateArriveePrevue, dateDepartPrevue, nbPersonnes, tarifNuitApplique, statut, motifAnnulation?, creeLe, #creeParId)
- sejour (**id**, #reservationId?, #clientId, #chambreId, dateArriveeEffective, dateDepartPrevue, dateDepartEffective?, tarifNuitApplique, montantRembourse, statut, #arriveeParId, #departParId?)
- paiement (**id**, #sejourId, montant, mode, reference?, datePaiement, #enregistreParId)
- journal_activite (**id**, #utilisateurId, action, details?, date)
- parametre (**cle**, valeur)

### 2.3 Clés étrangères

| Table | Clé étrangère | Référence | Suppression |
|---|---|---|---|
| chambre | typeId | type_chambre(id) | Restreinte |
| reservation | clientId | client(id) | Restreinte |
| reservation | chambreId | chambre(id) | Restreinte |
| reservation | creeParId | utilisateur(id) | Restreinte |
| sejour | reservationId (unique, facultative) | reservation(id) | Restreinte |
| sejour | clientId | client(id) | Restreinte |
| sejour | chambreId | chambre(id) | Restreinte |
| sejour | arriveeParId | utilisateur(id) | Restreinte |
| sejour | departParId (facultative) | utilisateur(id) | Restreinte |
| paiement | sejourId | sejour(id) | Restreinte |
| paiement | enregistreParId | utilisateur(id) | Restreinte |
| journal_activite | utilisateurId | utilisateur(id) | Restreinte |

La suppression restreinte empêche d'effacer une donnée référencée par l'historique.

### 2.4 Redondances assumées

`sejour` contient `clientId` et `chambreId` alors qu'ils pourraient être déduits de la réservation. Ces colonnes sont nécessaires, car un séjour walk-in n'a pas de réservation.

`tarifNuitApplique` duplique volontairement le tarif du type de chambre : c'est une photographie du prix au moment de la vente (RG6).

## 3. Modèle physique de données (MPD)

Le MPD est défini dans `prisma/schema.prisma` et créé par les migrations du dossier `prisma/migrations/`.

| Choix physique | Détail |
|---|---|
| Moteur | InnoDB, pour les clés étrangères et les transactions |
| Encodage | utf8mb4, pour les noms accentués |
| Index de recherche | Client : nom, telephone, numeroPiece |
| Index de disponibilité | reservation (chambreId, statut, dateArriveePrevue, dateDepartPrevue) et sejour (chambreId, statut, dateArriveeEffective, dateDepartPrevue) |
| Index de rapports | paiement (datePaiement, mode), journal_activite (date) |
