CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`value_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`discount` integer DEFAULT 20 NOT NULL,
	`sellable` integer DEFAULT true NOT NULL
);
