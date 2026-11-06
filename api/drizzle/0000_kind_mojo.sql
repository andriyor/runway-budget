CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`balance_cents` integer NOT NULL,
	`updated_at` integer NOT NULL
);
