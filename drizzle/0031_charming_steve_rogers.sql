ALTER TABLE `song_queue` ADD `karaokeLinkStatus` enum('unverified','working','needs_review') DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE `song_queue` ADD `karaokeLinkStatusUpdatedByUserId` int;--> statement-breakpoint
ALTER TABLE `song_queue` ADD `karaokeLinkStatusUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `song_queue` ADD `playedByUserId` int;--> statement-breakpoint
ALTER TABLE `song_queue` ADD `playedByUserName` varchar(255);