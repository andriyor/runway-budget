ALTER TABLE `goals` ADD `bought_at` integer;--> statement-breakpoint
ALTER TABLE `goals` ADD `bought_transaction_id` integer REFERENCES transactions(id);