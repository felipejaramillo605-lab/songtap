CREATE TABLE `order_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`previousStatus` enum('pending','preparing','delivered','cancelled'),
	`newStatus` enum('pending','preparing','delivered','cancelled') NOT NULL,
	`changedByUserId` int NOT NULL,
	`changedByUserName` varchar(255),
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
