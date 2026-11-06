CREATE TABLE `merchant_essentials` (
	`merchant` text PRIMARY KEY NOT NULL,
	`essential` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `essential` integer;