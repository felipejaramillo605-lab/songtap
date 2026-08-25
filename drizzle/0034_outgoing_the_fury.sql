CREATE TABLE `inventory_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`status` enum('active','resolved') NOT NULL DEFAULT 'active',
	`triggeredStockBase` decimal(14,4) NOT NULL,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`sku` varchar(96),
	`dimension` enum('count','volume','mass') NOT NULL,
	`baseUnit` enum('unit','ml','g') NOT NULL,
	`currentStockBase` decimal(14,4) NOT NULL DEFAULT '0',
	`reorderPointBase` decimal(14,4) NOT NULL DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_items_venue_sku_uq` UNIQUE(`venueId`,`sku`)
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`movementType` enum('initial','restock','adjustment','order_delivery','order_reversal') NOT NULL,
	`quantityBase` decimal(14,4) NOT NULL,
	`stockAfterBase` decimal(14,4) NOT NULL,
	`sourceQuantity` decimal(14,4),
	`sourceUnit` varchar(24),
	`packBaseQuantity` decimal(14,4),
	`orderId` int,
	`performedByUserId` int,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_movements_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_movements_order_item_type_uq` UNIQUE(`orderId`,`inventoryItemId`,`movementType`)
);
--> statement-breakpoint
CREATE TABLE `inventory_recipe_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipeId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`quantityBase` decimal(14,4) NOT NULL,
	`displayQuantity` decimal(14,4) NOT NULL,
	`displayUnit` varchar(24) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_recipe_lines_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_recipe_lines_recipe_item_uq` UNIQUE(`recipeId`,`inventoryItemId`)
);
--> statement-breakpoint
CREATE TABLE `inventory_recipes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`menuItemId` int NOT NULL,
	`name` varchar(160),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_recipes_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_recipes_menu_item_uq` UNIQUE(`menuItemId`)
);
--> statement-breakpoint
CREATE INDEX `inventory_alerts_venue_status_idx` ON `inventory_alerts` (`venueId`,`status`);--> statement-breakpoint
CREATE INDEX `inventory_alerts_item_idx` ON `inventory_alerts` (`inventoryItemId`);--> statement-breakpoint
CREATE INDEX `inventory_items_venue_idx` ON `inventory_items` (`venueId`);--> statement-breakpoint
CREATE INDEX `inventory_movements_venue_idx` ON `inventory_movements` (`venueId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `inventory_movements_item_idx` ON `inventory_movements` (`inventoryItemId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `inventory_recipe_lines_recipe_idx` ON `inventory_recipe_lines` (`recipeId`);--> statement-breakpoint
CREATE INDEX `inventory_recipes_venue_idx` ON `inventory_recipes` (`venueId`);