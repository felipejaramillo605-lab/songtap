CREATE TABLE `pqrs_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`tableId` int NOT NULL,
	`sessionId` int NOT NULL,
	`clientName` varchar(128) NOT NULL,
	`type` enum('petition','complaint','claim','suggestion','congratulation') NOT NULL,
	`subject` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`status` enum('open','in_review','resolved','closed') NOT NULL DEFAULT 'open',
	`response` text,
	`respondedByUserId` int,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pqrs_tickets_id` PRIMARY KEY(`id`)
);
