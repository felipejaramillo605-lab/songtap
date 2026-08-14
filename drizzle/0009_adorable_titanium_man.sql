CREATE TABLE `venue_notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`emailNotifications` boolean NOT NULL DEFAULT true,
	`notificationEmail` varchar(320),
	`notificationPhone` varchar(64),
	`senderAccountEmail` varchar(320),
	`soundType` varchar(64) NOT NULL DEFAULT 'chime',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `venue_notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `venue_notification_settings_ownerId_unique` UNIQUE(`ownerId`)
);
