CREATE TABLE `planned_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`months` integer,
	`active` integer DEFAULT false NOT NULL
);
