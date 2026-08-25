CREATE TABLE `inventory_physical_count_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`physicalCountId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`systemStockBase` decimal(14,4) NOT NULL,
	`physicalStockBase` decimal(14,4),
	`varianceBase` decimal(14,4),
	`countedByUserId` int,
	`countedAt` timestamp,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_physical_count_lines_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_physical_count_line_uq` UNIQUE(`physicalCountId`,`inventoryItemId`)
);
--> statement-breakpoint
CREATE TABLE `inventory_physical_counts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`status` enum('draft','in_progress','ready_to_reconcile','reconciled','cancelled') NOT NULL DEFAULT 'draft',
	`notes` text,
	`createdByUserId` int NOT NULL,
	`startedAt` timestamp,
	`submittedAt` timestamp,
	`reconciledAt` timestamp,
	`reconciledByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_physical_counts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `inventory_physical_count_lines_count_idx` ON `inventory_physical_count_lines` (`physicalCountId`);--> statement-breakpoint
CREATE INDEX `inventory_physical_count_lines_item_idx` ON `inventory_physical_count_lines` (`inventoryItemId`);--> statement-breakpoint
CREATE INDEX `inventory_physical_counts_venue_status_idx` ON `inventory_physical_counts` (`venueId`,`status`,`createdAt`);