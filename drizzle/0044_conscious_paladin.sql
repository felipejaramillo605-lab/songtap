CREATE TABLE `auth_ip_login_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ipHash` varchar(64) NOT NULL,
	`windowStartedAt` timestamp NOT NULL,
	`failedAttempts` int NOT NULL DEFAULT 0,
	`blockedUntil` timestamp,
	`lastAttemptAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `auth_ip_login_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_ip_login_limits_ip_hash_uq` UNIQUE(`ipHash`)
);
--> statement-breakpoint
CREATE INDEX `auth_ip_login_limits_blocked_until_idx` ON `auth_ip_login_limits` (`blockedUntil`);