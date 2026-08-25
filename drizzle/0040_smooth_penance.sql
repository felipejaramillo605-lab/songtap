CREATE TABLE `guide_contents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentType` enum('tutorial','help') NOT NULL,
	`slug` varchar(96) NOT NULL,
	`title` varchar(180) NOT NULL,
	`summary` text NOT NULL,
	`body` text NOT NULL,
	`roles` varchar(64) NOT NULL,
	`category` varchar(96) NOT NULL,
	`modulePath` varchar(255),
	`durationMinutes` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdByUserId` int NOT NULL,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guide_contents_id` PRIMARY KEY(`id`),
	CONSTRAINT `guide_contents_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `guide_contents_type_active_idx` ON `guide_contents` (`contentType`,`isActive`);