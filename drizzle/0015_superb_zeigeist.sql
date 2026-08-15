CREATE TABLE `pqrs_sla_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`type` enum('petition','complaint','claim','suggestion','congratulation') NOT NULL,
	`targetMinutes` int NOT NULL DEFAULT 1440,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pqrs_sla_targets_id` PRIMARY KEY(`id`),
	CONSTRAINT `pqrs_sla_targets_venue_type_uq` UNIQUE(`venueId`,`type`)
);
