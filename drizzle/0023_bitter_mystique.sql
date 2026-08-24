CREATE TABLE `test_mode_incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`venueId` int NOT NULL,
	`previewRole` enum('manager','staff') NOT NULL,
	`route` varchar(255) NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`status` enum('open','resolved') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `test_mode_incidents_id` PRIMARY KEY(`id`)
);
