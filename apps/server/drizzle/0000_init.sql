CREATE TABLE `game_sessions` (
	`id` char(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`board_key` varchar(64) NOT NULL,
	`setup` json NOT NULL,
	`question_ids` json NOT NULL,
	`started_at` datetime(3) NOT NULL,
	`finished_at` datetime(3),
	CONSTRAINT `game_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`token_hash` char(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	CONSTRAINT `refresh_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `refresh_tokens_hash_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`session_id` char(36) NOT NULL,
	`board_key` varchar(64) NOT NULL,
	`points` int NOT NULL,
	`duration_ms` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `scores_session_uq` UNIQUE(`session_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(40) NOT NULL,
	`email` varchar(254) NOT NULL,
	`password_hash` varchar(72),
	`google_sub` varchar(64),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`),
	CONSTRAINT `users_google_sub_uq` UNIQUE(`google_sub`)
);
--> statement-breakpoint
ALTER TABLE `game_sessions` ADD CONSTRAINT `game_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scores` ADD CONSTRAINT `scores_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scores` ADD CONSTRAINT `scores_session_id_game_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `game_sessions_user_idx` ON `game_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_user_idx` ON `refresh_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `scores_board_idx` ON `scores` (`board_key`,`points`,`duration_ms`);--> statement-breakpoint
CREATE INDEX `scores_user_idx` ON `scores` (`user_id`);