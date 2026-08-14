ALTER TABLE `menu_items` ADD `isAlcoholic` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `taxIncluded` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `ageConfirmed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `invoiceStatus` enum('pending','issued','not_applicable') DEFAULT 'not_applicable' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `invoiceNumber` varchar(64);