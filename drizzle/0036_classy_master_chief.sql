CREATE TABLE `inventory_purchase_order_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`quantityOrderedBase` decimal(14,4) NOT NULL,
	`quantityReceivedBase` decimal(14,4) NOT NULL DEFAULT '0',
	`sourceQuantity` decimal(14,4) NOT NULL,
	`sourceUnit` varchar(24) NOT NULL,
	`packBaseQuantity` decimal(14,4),
	`estimatedUnitCost` decimal(12,4),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_purchase_order_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`supplierId` int NOT NULL,
	`reference` varchar(128),
	`status` enum('draft','sent','partially_received','received','cancelled') NOT NULL DEFAULT 'draft',
	`expectedAt` timestamp,
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_purchase_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_wastes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`inventoryLotId` int NOT NULL,
	`quantityBase` decimal(14,4) NOT NULL,
	`unitCostBase` decimal(14,6) NOT NULL,
	`totalCost` decimal(14,4) NOT NULL,
	`reason` enum('expired') NOT NULL,
	`note` text,
	`performedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_wastes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `averageUnitCostBase` decimal(14,6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD `unitCostBase` decimal(14,6);--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD `totalCost` decimal(14,4);--> statement-breakpoint
ALTER TABLE `inventory_purchase_lines` ADD `purchaseOrderLineId` int;--> statement-breakpoint
ALTER TABLE `inventory_purchases` ADD `purchaseOrderId` int;--> statement-breakpoint
CREATE INDEX `inventory_purchase_order_lines_order_idx` ON `inventory_purchase_order_lines` (`purchaseOrderId`);--> statement-breakpoint
CREATE INDEX `inventory_purchase_order_lines_item_idx` ON `inventory_purchase_order_lines` (`inventoryItemId`);--> statement-breakpoint
CREATE INDEX `inventory_purchase_orders_venue_idx` ON `inventory_purchase_orders` (`venueId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `inventory_purchase_orders_supplier_idx` ON `inventory_purchase_orders` (`supplierId`);--> statement-breakpoint
CREATE INDEX `inventory_wastes_venue_idx` ON `inventory_wastes` (`venueId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `inventory_wastes_lot_idx` ON `inventory_wastes` (`inventoryLotId`);