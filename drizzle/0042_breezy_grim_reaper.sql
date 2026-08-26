CREATE TABLE `guide_search_resolutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`normalizedQuery` varchar(160) NOT NULL,
	`displayQuery` varchar(160) NOT NULL,
	`role` enum('owner','manager','staff') NOT NULL,
	`guideContentId` int NOT NULL,
	`resolutionCount` int NOT NULL DEFAULT 1,
	`firstResolvedAt` timestamp NOT NULL DEFAULT (now()),
	`lastResolvedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guide_search_resolutions_id` PRIMARY KEY(`id`),
	CONSTRAINT `guide_search_resolutions_query_role_content_unique` UNIQUE(`normalizedQuery`,`role`,`guideContentId`)
);
--> statement-breakpoint
CREATE INDEX `guide_search_resolutions_content_popularity_idx` ON `guide_search_resolutions` (`guideContentId`,`resolutionCount`,`lastResolvedAt`);