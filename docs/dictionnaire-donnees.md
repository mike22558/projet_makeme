# Dictionnaire des données

Ce dictionnaire recense les données manipulées par l'application de gestion hôtelière. Il sert de base au modèle conceptuel (voir [mcd-mld.md](mcd-mld.md)).

**Conventions**

- Les montants sont des entiers exprimés en FCFA, sans décimales.
- **Date** désigne un jour (AAAA-MM-JJ). **Date-heure** désigne un instant précis.
- Abréviations : **PK** clé primaire, **FK** clé étrangère, **U** valeur unique, **O** obligatoire, **F** facultatif, **AI** auto-incrément.

## 1. Domaines de valeurs

| Domaine | Valeurs autorisées | Signification |
|---|---|---|
| Role | ADMIN, RECEPTIONNISTE, COMPTABLE, RESPONSABLE | Rôle d'un utilisateur |
| Sexe | MASCULIN, FEMININ | Sexe d'un client |
| TypePiece | CNI, PASSEPORT, PERMIS, AUTRE | Pièce d'identité du client |
| EtatChambre | DISPONIBLE, OCCUPEE, NETTOYAGE, HORS_SERVICE | État courant d'une chambre |
| StatutReservation | CONFIRMEE, ANNULEE, HONOREE | Cycle de vie d'une réservation |
| StatutSejour | EN_COURS, TERMINE | Cycle de vie d'un séjour |
| ModePaiement | ESPECES, MOBILE_MONEY, CARTE, VIREMENT | Moyen de règlement |

## 2. Utilisateur

| Code | Désignation | Type | Taille | Contraintes |
|---|---|---|---|---|
| id | Identifiant de l'utilisateur | Entier | | PK, AI |
| nom | Nom de famille | Texte | 100 | O |
| prenoms | Prénoms | Texte | 150 | O |
| email | Adresse de connexion | Texte | 191 | O, U |
| motDePasse | Empreinte bcrypt du mot de passe | Texte | 255 | O |
| telephone | Numéro de téléphone | Texte | 20 | O |
| actif | Compte autorisé à se connecter | Booléen | | O, vrai par défaut |
| role | Rôle de l'utilisateur | Role | | O |
| creeLe | Date de création du compte | Date-heure | | O |
| derniereConnexion | Dernière connexion réussie | Date-heure | | F |

## 3. Client

| Code | Désignation | Type | Taille | Contraintes |
|---|---|---|---|---|
| id | Identifiant du client | Entier | | PK, AI |
| nom | Nom de famille | Texte | 100 | O, indexé |
| prenoms | Prénoms | Texte | 150 | O |
| sexe | Sexe | Sexe | | O |
| dateNaissance | Date de naissance | Date | | F |
| nationalite | Nationalité | Texte | 80 | O |
| typePiece | Type de pièce d'identité | TypePiece | | O |
| numeroPiece | Numéro de la pièce | Texte | 50 | O, indexé |
| telephone | Numéro de téléphone | Texte | 20 | O, indexé |
| email | Adresse électronique | Texte | 191 | F |
| adresse | Adresse postale | Texte | 255 | F |
| creeLe | Date d'enregistrement | Date-heure | | O |

## 4. TypeChambre

| Code | Désignation | Type | Taille | Contraintes |
|---|---|---|---|---|
| id | Identifiant du type | Entier | | PK, AI |
| libelle | Nom du type (Standard, Suite…) | Texte | 50 | O, U |
| description | Description du type | Texte | 255 | F |
| capacite | Nombre maximal de personnes | Entier | | O, supérieur à 0 |
| tarifNuit | Tarif actuel d'une nuit (FCFA) | Entier | | O, supérieur à 0 |

## 5. Chambre

| Code | Désignation | Type | Taille | Contraintes |
|---|---|---|---|---|
| id | Identifiant de la chambre | Entier | | PK, AI |
| numero | Numéro affiché sur la porte | Texte | 10 | O, U |
| etage | Étage | Entier | | O |
| etat | État courant | EtatChambre | | O, DISPONIBLE par défaut |
| typeId | Type de la chambre | Entier | | O, FK → TypeChambre |

## 6. Reservation

| Code | Désignation | Type | Taille | Contraintes |
|---|---|---|---|---|
| id | Identifiant de la réservation | Entier | | PK, AI |
| code | Code lisible (RES-2026-0001) | Texte | 20 | O, U |
| clientId | Client concerné | Entier | | O, FK → Client |
| chambreId | Chambre réservée | Entier | | O, FK → Chambre |
| dateArriveePrevue | Arrivée prévue | Date | | O, non passée à la création |
| dateDepartPrevue | Départ prévu | Date | | O, après l'arrivée |
| nbPersonnes | Nombre de personnes | Entier | | O, de 1 à la capacité du type |
| tarifNuitApplique | Tarif copié à la création (FCFA) | Entier | | O |
| statut | Statut | StatutReservation | | O, CONFIRMEE par défaut |
| motifAnnulation | Motif d'annulation | Texte | 255 | Obligatoire si ANNULEE |
| creeLe | Date de saisie | Date-heure | | O |
| creeParId | Utilisateur auteur de la saisie | Entier | | O, FK → Utilisateur |

## 7. Sejour

| Code | Désignation | Type | Taille | Contraintes |
|---|---|---|---|---|
| id | Identifiant du séjour | Entier | | PK, AI |
| reservationId | Réservation d'origine (vide si walk-in) | Entier | | F, U, FK → Reservation |
| clientId | Client hébergé | Entier | | O, FK → Client |
| chambreId | Chambre occupée | Entier | | O, FK → Chambre |
| dateArriveeEffective | Arrivée réelle | Date-heure | | O |
| dateDepartPrevue | Départ prévu | Date | | O |
| dateDepartEffective | Départ réel | Date-heure | | Obligatoire si TERMINE |
| tarifNuitApplique | Tarif copié à l'arrivée (FCFA) | Entier | | O |
| montantRembourse | Trop-perçu rendu au client (FCFA) | Entier | | O, 0 par défaut |
| statut | Statut | StatutSejour | | O, EN_COURS par défaut |
| arriveeParId | Utilisateur ayant enregistré l'arrivée | Entier | | O, FK → Utilisateur |
| departParId | Utilisateur ayant enregistré le départ | Entier | | F, FK → Utilisateur |

## 8. Paiement

| Code | Désignation | Type | Taille | Contraintes |
|---|---|---|---|---|
| id | Identifiant du paiement | Entier | | PK, AI |
| sejourId | Séjour réglé | Entier | | O, FK → Sejour |
| montant | Montant versé (FCFA) | Entier | | O, supérieur à 0 et au plus égal au reste |
| mode | Mode de paiement | ModePaiement | | O, indexé |
| reference | Référence de transaction | Texte | 100 | F |
| datePaiement | Date du paiement | Date-heure | | O, indexé |
| enregistreParId | Utilisateur ayant encaissé | Entier | | O, FK → Utilisateur |

## 9. Parametre

| Code | Désignation | Type | Taille | Contraintes |
|---|---|---|---|---|
| cle | Nom du paramètre | Texte | 100 | PK |
| valeur | Valeur du paramètre | Texte | 255 | O |

Clés utilisées : `nom_hotel`, `adresse`, `telephone`, `heure_liberation`.

## 10. JournalActivite

| Code | Désignation | Type | Taille | Contraintes |
|---|---|---|---|---|
| id | Identifiant de l'entrée | Entier | | PK, AI |
| utilisateurId | Auteur de l'action | Entier | | O, FK → Utilisateur |
| action | Type d'action (PAIEMENT, ARRIVEE…) | Texte | 50 | O |
| details | Informations complémentaires | JSON | | F |
| date | Date de l'action | Date-heure | | O, indexé |

## 11. Données calculées (non stockées)

Ces valeurs sont recalculées à chaque besoin. Ne pas les stocker évite toute incohérence avec les paiements.

| Donnée | Règle de calcul | Règle de gestion |
|---|---|---|
| Nombre de nuits | Différence en jours entre arrivée et départ, minimum 1 | RG9 |
| Montant total | Nombre de nuits × tarifNuitApplique | RG9 |
| Montant payé | Somme des paiements du séjour | RG10 |
| Reste à payer | Montant total − (montant payé − montant rendu), minimum 0 | RG10 |
| Trop-perçu | (Montant payé − montant rendu) − montant total, minimum 0 | C4 |
| Recettes nettes | Paiements de la période − trop-perçus rendus sur la période | Rapports |
| Taux d'occupation | Chambres occupées ÷ chambres en service | Tableau de bord |
