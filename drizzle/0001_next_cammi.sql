CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int,
	`userId` int,
	`userRole` varchar(32),
	`action` varchar(128) NOT NULL,
	`entity` varchar(64),
	`entityId` int,
	`details` text,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `menu_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`cost` decimal(10,2),
	`imageUrl` text,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `music_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`sessionId` int NOT NULL,
	`clientName` varchar(128) NOT NULL,
	`songTitle` varchar(255) NOT NULL,
	`artist` varchar(255),
	`spotifyUri` varchar(255),
	`status` enum('queued','playing','played','rejected') NOT NULL DEFAULT 'queued',
	`handledByUserId` int,
	`playedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `music_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`menuItemId` int NOT NULL,
	`menuItemName` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(10,2) NOT NULL,
	`unitCost` decimal(10,2),
	`subtotal` decimal(10,2) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`tableId` int NOT NULL,
	`sessionId` int NOT NULL,
	`clientName` varchar(128) NOT NULL,
	`status` enum('pending','preparing','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`totalAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`totalCost` decimal(10,2) NOT NULL DEFAULT '0',
	`handledByUserId` int,
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	`cancelReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qr_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableId` int NOT NULL,
	`venueId` int NOT NULL,
	`clientName` varchar(128) NOT NULL,
	`sessionToken` varchar(128) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	CONSTRAINT `qr_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `qr_sessions_sessionToken_unique` UNIQUE(`sessionToken`)
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`qrToken` varchar(128) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tables_id` PRIMARY KEY(`id`),
	CONSTRAINT `tables_qrToken_unique` UNIQUE(`qrToken`)
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`phone` varchar(64),
	`email` varchar(320),
	`logoUrl` text,
	`socialLinks` text,
	`musicMode` enum('auto','manual') NOT NULL DEFAULT 'manual',
	`isActive` boolean NOT NULL DEFAULT true,
	`privacyPolicyAccepted` boolean NOT NULL DEFAULT false,
	`privacyPolicyAcceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `venues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('owner','manager','staff','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `venueId` int;