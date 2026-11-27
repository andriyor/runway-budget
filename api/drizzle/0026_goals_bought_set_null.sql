-- 0025 added bought_transaction_id, but SQLite's ADD COLUMN dropped its ON DELETE SET NULL, so deleting a
-- wish's purchase would fail the foreign key; rebuild goals with it. Nothing references goals.
CREATE TABLE `__new_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`target_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`wish` integer DEFAULT false NOT NULL,
	`planned_for` text,
	`category` text,
	`match_after` integer,
	`bought_at` integer,
	`bought_transaction_id` integer REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null,
	`added_at` integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_goals` (`id`, `name`, `target_cents`, `currency`, `position`, `wish`, `planned_for`, `category`, `match_after`, `bought_at`, `bought_transaction_id`, `added_at`)
SELECT `id`, `name`, `target_cents`, `currency`, `position`, `wish`, `planned_for`, `category`, `match_after`, `bought_at`, `bought_transaction_id`, `added_at` FROM `goals`;--> statement-breakpoint
DROP TABLE `goals`;--> statement-breakpoint
ALTER TABLE `__new_goals` RENAME TO `goals`;
