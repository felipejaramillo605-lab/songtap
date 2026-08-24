CREATE TABLE `user_notification_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL DEFAULT 'system',
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`relatedAccessRequestId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_notification_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `access_requests` ADD `reviewedByOwnerId` int;--> statement-breakpoint
ALTER TABLE `access_requests` ADD `decisionReason` text;--> statement-breakpoint
ALTER TABLE `access_requests` ADD `reviewedAt` timestamp;