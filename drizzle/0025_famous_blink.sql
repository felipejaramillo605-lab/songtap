ALTER TABLE `owner_scheduled_reports` DROP INDEX `owner_scheduled_reports_period_unique`;--> statement-breakpoint
ALTER TABLE `owner_scheduled_reports` ADD `generationSource` enum('scheduled','manual') DEFAULT 'scheduled' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner_scheduled_reports` ADD `reportKey` varchar(128);--> statement-breakpoint
UPDATE `owner_scheduled_reports` SET `reportKey` = CONCAT('legacy:', `id`) WHERE `reportKey` IS NULL;--> statement-breakpoint
ALTER TABLE `owner_scheduled_reports` MODIFY `reportKey` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `owner_scheduled_reports` ADD CONSTRAINT `owner_scheduled_reports_key_unique` UNIQUE(`scheduleId`,`reportKey`);
