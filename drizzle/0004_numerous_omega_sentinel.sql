CREATE TABLE `applause_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`songId` int NOT NULL,
	`votingTableId` int NOT NULL,
	`votingTableName` varchar(255),
	`performingTableId` int,
	`performingTableName` varchar(255),
	`rating` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `applause_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `song_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`venueId` int NOT NULL,
	`spotifyTrackId` varchar(255),
	`songName` varchar(255) NOT NULL,
	`artist` varchar(255) NOT NULL,
	`duration` int,
	`isCurrentlyPlaying` boolean NOT NULL DEFAULT false,
	`position` int NOT NULL,
	`addedByTableId` int,
	`addedByTableName` varchar(255),
	`playedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `song_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venue_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`managerId` int NOT NULL,
	`venueName` varchar(255) NOT NULL,
	`venueAddress` text,
	`venuePhone` varchar(64),
	`venueEmail` varchar(320),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`rejectionReason` text,
	`approvedAt` timestamp,
	`approvedByOwnerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `venue_requests_id` PRIMARY KEY(`id`)
);
