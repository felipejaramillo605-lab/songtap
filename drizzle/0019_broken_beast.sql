CREATE TABLE `access_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`venueId` int,
	`requesterRole` varchar(32) NOT NULL,
	`targetPath` varchar(128) NOT NULL,
	`moduleName` varchar(128) NOT NULL,
	`status` enum('pending','reviewed','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `access_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_requests_user_target_status_uq` UNIQUE(`userId`,`targetPath`,`status`)
);
