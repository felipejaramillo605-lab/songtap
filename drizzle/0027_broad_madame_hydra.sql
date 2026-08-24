CREATE TABLE `help_article_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`articleKey` varchar(96) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `help_article_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `help_article_favorites_user_article_unique` UNIQUE(`userId`,`articleKey`)
);
--> statement-breakpoint
CREATE TABLE `help_article_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`articleKey` varchar(96) NOT NULL,
	`vote` enum('up','down') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `help_article_feedback_id` PRIMARY KEY(`id`),
	CONSTRAINT `help_article_feedback_user_article_unique` UNIQUE(`userId`,`articleKey`)
);
