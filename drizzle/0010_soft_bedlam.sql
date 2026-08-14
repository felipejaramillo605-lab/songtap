CREATE TABLE `owner_notification_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`type` varchar(64) NOT NULL DEFAULT 'venue_request',
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`relatedRequestId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `owner_notification_history_id` PRIMARY KEY(`id`)
);
