CREATE TABLE `user_favorite_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`moduleKey` varchar(96) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_favorite_modules_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_favorite_modules_user_module_uq` UNIQUE(`userId`,`moduleKey`)
);
