CREATE TABLE `guide_content_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`altText` varchar(240) NOT NULL,
	`mimeType` varchar(64) NOT NULL,
	`uploadedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guide_content_media_id` PRIMARY KEY(`id`),
	CONSTRAINT `guide_content_media_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `guide_search_misses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`normalizedQuery` varchar(160) NOT NULL,
	`displayQuery` varchar(160) NOT NULL,
	`role` enum('owner','manager','staff') NOT NULL,
	`searchCount` int NOT NULL DEFAULT 1,
	`firstSearchedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSearchedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guide_search_misses_id` PRIMARY KEY(`id`),
	CONSTRAINT `guide_search_misses_query_role_unique` UNIQUE(`normalizedQuery`,`role`)
);
--> statement-breakpoint
CREATE INDEX `guide_content_media_uploaded_idx` ON `guide_content_media` (`uploadedByUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `guide_search_misses_popularity_idx` ON `guide_search_misses` (`searchCount`,`lastSearchedAt`);