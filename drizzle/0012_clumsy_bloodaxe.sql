CREATE TABLE `staff_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`assignedToUserId` int NOT NULL,
	`assignedByUserId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`completionComment` text,
	`evidenceImageUrl` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_activities_id` PRIMARY KEY(`id`)
);
