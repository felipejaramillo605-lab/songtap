CREATE TABLE `inventory_control_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`dualApprovalEnabled` boolean NOT NULL DEFAULT false,
	`dualApprovalThresholdCost` decimal(14,4) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_control_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_control_settings_venue_uq` UNIQUE(`venueId`)
);
--> statement-breakpoint
CREATE TABLE `inventory_count_template_families` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`family` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_count_template_families_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_count_template_family_uq` UNIQUE(`templateId`,`family`)
);
--> statement-breakpoint
CREATE TABLE `inventory_count_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_count_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_count_templates_venue_name_uq` UNIQUE(`venueId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `inventory_physical_count_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`physicalCountId` int NOT NULL,
	`status` enum('approved','rejected') NOT NULL,
	`approverUserId` int NOT NULL,
	`totalVarianceCost` decimal(14,4) NOT NULL,
	`thresholdCost` decimal(14,4) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_physical_count_approvals_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_physical_count_approval_uq` UNIQUE(`physicalCountId`)
);
--> statement-breakpoint
ALTER TABLE `inventory_physical_counts` MODIFY COLUMN `status` enum('draft','in_progress','pending_approval','ready_to_reconcile','reconciled','rejected','cancelled') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `family` varchar(100);--> statement-breakpoint
ALTER TABLE `inventory_physical_count_lines` ADD `unitCostBaseSnapshot` decimal(14,6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_physical_count_lines` ADD `varianceCost` decimal(14,4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_physical_counts` ADD `templateId` int;--> statement-breakpoint
ALTER TABLE `inventory_physical_counts` ADD `submittedByUserId` int;--> statement-breakpoint
ALTER TABLE `inventory_physical_counts` ADD `totalVarianceCost` decimal(14,4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_physical_counts` ADD `approvalRequired` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_physical_counts` ADD `approvalThresholdCost` decimal(14,4);--> statement-breakpoint
ALTER TABLE `inventory_physical_counts` ADD `approvalDecisionAt` timestamp;--> statement-breakpoint
ALTER TABLE `inventory_physical_counts` ADD `approvalDecisionByUserId` int;--> statement-breakpoint
CREATE INDEX `inventory_count_template_families_template_idx` ON `inventory_count_template_families` (`templateId`);--> statement-breakpoint
CREATE INDEX `inventory_physical_count_approvals_venue_idx` ON `inventory_physical_count_approvals` (`venueId`,`createdAt`);