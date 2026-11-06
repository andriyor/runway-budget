CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`external_id` text NOT NULL,
	`time` integer NOT NULL,
	`description` text NOT NULL,
	`mcc` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_external_id_unique` ON `transactions` (`external_id`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `mono_account_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_mono_account_id_unique` ON `accounts` (`mono_account_id`);