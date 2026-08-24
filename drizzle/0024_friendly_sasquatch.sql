CREATE TABLE `owner_report_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`frequency` enum('weekly') NOT NULL DEFAULT 'weekly',
	`weekday` int NOT NULL DEFAULT 1,
	`hour` int NOT NULL DEFAULT 8,
	`minute` int NOT NULL DEFAULT 0,
	`timezone` varchar(64) NOT NULL DEFAULT 'America/Bogota',
	`cronExpression` varchar(64) NOT NULL DEFAULT '0 0 13 * * 1',
	`scheduleCronTaskUid` varchar(128),
	`isEnabled` boolean NOT NULL DEFAULT false,
	`lastGeneratedAt` timestamp,
	`nextExecutionAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `owner_report_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `owner_report_schedules_owner_unique` UNIQUE(`ownerId`),
	CONSTRAINT `owner_report_schedules_task_uid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE TABLE `owner_scheduled_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`ownerId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`summaryJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `owner_scheduled_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `owner_scheduled_reports_period_unique` UNIQUE(`scheduleId`,`periodStart`,`periodEnd`)
);
