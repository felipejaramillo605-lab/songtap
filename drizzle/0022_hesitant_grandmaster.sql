ALTER TABLE `user_notification_history` ADD `isArchived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user_notification_history` ADD `archivedAt` timestamp;