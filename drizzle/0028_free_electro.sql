ALTER TABLE `user_onboarding_progress` ADD `autoShownAt` timestamp;
--> statement-breakpoint
INSERT INTO `user_onboarding_progress` (`userId`, `role`, `autoShownAt`)
SELECT `id`, `role`, NOW()
FROM `users`
WHERE `role` IN ('owner', 'manager', 'staff')
ON DUPLICATE KEY UPDATE `autoShownAt` = COALESCE(`autoShownAt`, NOW());
