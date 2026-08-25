ALTER TABLE `song_queue` ADD `karaokeUrl` varchar(2048);--> statement-breakpoint
ALTER TABLE `song_queue` ADD `karaokeProviderName` varchar(128);--> statement-breakpoint
ALTER TABLE `song_queue` ADD `karaokeSavedByUserId` int;--> statement-breakpoint
ALTER TABLE `song_queue` ADD `karaokeSavedAt` timestamp;--> statement-breakpoint
ALTER TABLE `venues` ADD `karaokeProviders` text;