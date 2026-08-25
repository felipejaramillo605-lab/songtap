CREATE TABLE `inventory_automation_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`expiryAlertDays` int NOT NULL DEFAULT 7,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_automation_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_lots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`purchaseLineId` int,
	`lotCode` varchar(128),
	`initialQuantityBase` decimal(14,4) NOT NULL,
	`remainingQuantityBase` decimal(14,4) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`lastAlertState` enum('none','expiring','expired') NOT NULL DEFAULT 'none',
	`lastAlertedAt` timestamp,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_lots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_purchase_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`quantityBase` decimal(14,4) NOT NULL,
	`sourceQuantity` decimal(14,4) NOT NULL,
	`sourceUnit` varchar(24) NOT NULL,
	`packBaseQuantity` decimal(14,4),
	`unitCost` decimal(12,4),
	`lotCode` varchar(128),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_purchase_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`supplierId` int,
	`reference` varchar(128),
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`totalCost` decimal(12,2) NOT NULL DEFAULT '0',
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`contactName` varchar(160),
	`email` varchar(320),
	`phone` varchar(64),
	`address` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `isPerishable` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `expiryAlertDays` int DEFAULT 7 NOT NULL;--> statement-breakpoint
CREATE INDEX `inventory_automation_task_idx` ON `inventory_automation_settings` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `inventory_lots_venue_expiry_idx` ON `inventory_lots` (`venueId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `inventory_lots_item_expiry_idx` ON `inventory_lots` (`inventoryItemId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `inventory_purchase_lines_purchase_idx` ON `inventory_purchase_lines` (`purchaseId`);--> statement-breakpoint
CREATE INDEX `inventory_purchase_lines_item_idx` ON `inventory_purchase_lines` (`inventoryItemId`);--> statement-breakpoint
CREATE INDEX `inventory_purchases_venue_idx` ON `inventory_purchases` (`venueId`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `inventory_purchases_supplier_idx` ON `inventory_purchases` (`supplierId`);--> statement-breakpoint
CREATE INDEX `inventory_suppliers_venue_idx` ON `inventory_suppliers` (`venueId`,`name`);