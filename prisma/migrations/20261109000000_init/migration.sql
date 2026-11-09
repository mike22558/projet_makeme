-- ENGINE=InnoDB est imposé sur chaque table : certains serveurs (WAMP par exemple)
-- utilisent MyISAM par défaut, un moteur sans clés étrangères ni transactions.

-- CreateTable
CREATE TABLE `utilisateur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(100) NOT NULL,
    `prenoms` VARCHAR(150) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `motDePasse` VARCHAR(255) NOT NULL,
    `telephone` VARCHAR(20) NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `role` ENUM('ADMIN', 'RECEPTIONNISTE', 'COMPTABLE', 'RESPONSABLE') NOT NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `derniereConnexion` DATETIME(3) NULL,

    UNIQUE INDEX `utilisateur_email_key`(`email`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journal_activite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `utilisateurId` INTEGER NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `details` JSON NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `journal_activite_utilisateurId_idx`(`utilisateurId`),
    INDEX `journal_activite_date_idx`(`date`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parametre` (
    `cle` VARCHAR(100) NOT NULL,
    `valeur` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`cle`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(100) NOT NULL,
    `prenoms` VARCHAR(150) NOT NULL,
    `sexe` ENUM('MASCULIN', 'FEMININ') NOT NULL,
    `dateNaissance` DATE NULL,
    `nationalite` VARCHAR(80) NOT NULL,
    `typePiece` ENUM('CNI', 'PASSEPORT', 'PERMIS', 'AUTRE') NOT NULL,
    `numeroPiece` VARCHAR(50) NOT NULL,
    `telephone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(191) NULL,
    `adresse` VARCHAR(255) NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_nom_idx`(`nom`),
    INDEX `client_telephone_idx`(`telephone`),
    INDEX `client_numeroPiece_idx`(`numeroPiece`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `type_chambre` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `libelle` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `capacite` INTEGER NOT NULL,
    `tarifNuit` INTEGER NOT NULL,

    UNIQUE INDEX `type_chambre_libelle_key`(`libelle`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chambre` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(10) NOT NULL,
    `etage` INTEGER NOT NULL,
    `etat` ENUM('DISPONIBLE', 'OCCUPEE', 'NETTOYAGE', 'HORS_SERVICE') NOT NULL DEFAULT 'DISPONIBLE',
    `typeId` INTEGER NOT NULL,

    UNIQUE INDEX `chambre_numero_key`(`numero`),
    INDEX `chambre_typeId_idx`(`typeId`),
    INDEX `chambre_etat_idx`(`etat`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `clientId` INTEGER NOT NULL,
    `chambreId` INTEGER NOT NULL,
    `dateArriveePrevue` DATE NOT NULL,
    `dateDepartPrevue` DATE NOT NULL,
    `nbPersonnes` INTEGER NOT NULL,
    `tarifNuitApplique` INTEGER NOT NULL,
    `statut` ENUM('CONFIRMEE', 'ANNULEE', 'HONOREE') NOT NULL DEFAULT 'CONFIRMEE',
    `motifAnnulation` VARCHAR(255) NULL,
    `creeLe` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creeParId` INTEGER NOT NULL,

    UNIQUE INDEX `reservation_code_key`(`code`),
    INDEX `reservation_clientId_idx`(`clientId`),
    INDEX `reservation_creeParId_idx`(`creeParId`),
    INDEX `reservation_chambreId_statut_dateArriveePrevue_dateDepartPre_idx`(`chambreId`, `statut`, `dateArriveePrevue`, `dateDepartPrevue`),
    INDEX `reservation_statut_dateArriveePrevue_idx`(`statut`, `dateArriveePrevue`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sejour` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reservationId` INTEGER NULL,
    `clientId` INTEGER NOT NULL,
    `chambreId` INTEGER NOT NULL,
    `dateArriveeEffective` DATETIME(3) NOT NULL,
    `dateDepartPrevue` DATE NOT NULL,
    `dateDepartEffective` DATETIME(3) NULL,
    `tarifNuitApplique` INTEGER NOT NULL,
    `statut` ENUM('EN_COURS', 'TERMINE') NOT NULL DEFAULT 'EN_COURS',
    `arriveeParId` INTEGER NOT NULL,
    `departParId` INTEGER NULL,

    UNIQUE INDEX `sejour_reservationId_key`(`reservationId`),
    INDEX `sejour_clientId_idx`(`clientId`),
    INDEX `sejour_arriveeParId_idx`(`arriveeParId`),
    INDEX `sejour_departParId_idx`(`departParId`),
    INDEX `sejour_chambreId_statut_dateArriveeEffective_dateDepartPrevu_idx`(`chambreId`, `statut`, `dateArriveeEffective`, `dateDepartPrevue`),
    INDEX `sejour_statut_idx`(`statut`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `paiement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sejourId` INTEGER NOT NULL,
    `montant` INTEGER NOT NULL,
    `mode` ENUM('ESPECES', 'MOBILE_MONEY', 'CARTE', 'VIREMENT') NOT NULL,
    `reference` VARCHAR(100) NULL,
    `datePaiement` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `enregistreParId` INTEGER NOT NULL,

    INDEX `paiement_sejourId_idx`(`sejourId`),
    INDEX `paiement_enregistreParId_idx`(`enregistreParId`),
    INDEX `paiement_datePaiement_idx`(`datePaiement`),
    INDEX `paiement_mode_idx`(`mode`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `journal_activite` ADD CONSTRAINT `journal_activite_utilisateurId_fkey` FOREIGN KEY (`utilisateurId`) REFERENCES `utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chambre` ADD CONSTRAINT `chambre_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `type_chambre`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation` ADD CONSTRAINT `reservation_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation` ADD CONSTRAINT `reservation_chambreId_fkey` FOREIGN KEY (`chambreId`) REFERENCES `chambre`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation` ADD CONSTRAINT `reservation_creeParId_fkey` FOREIGN KEY (`creeParId`) REFERENCES `utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sejour` ADD CONSTRAINT `sejour_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `reservation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sejour` ADD CONSTRAINT `sejour_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sejour` ADD CONSTRAINT `sejour_chambreId_fkey` FOREIGN KEY (`chambreId`) REFERENCES `chambre`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sejour` ADD CONSTRAINT `sejour_arriveeParId_fkey` FOREIGN KEY (`arriveeParId`) REFERENCES `utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sejour` ADD CONSTRAINT `sejour_departParId_fkey` FOREIGN KEY (`departParId`) REFERENCES `utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paiement` ADD CONSTRAINT `paiement_sejourId_fkey` FOREIGN KEY (`sejourId`) REFERENCES `sejour`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paiement` ADD CONSTRAINT `paiement_enregistreParId_fkey` FOREIGN KEY (`enregistreParId`) REFERENCES `utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
