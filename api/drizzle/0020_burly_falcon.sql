ALTER TABLE `goals` ADD `wish` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `goals` ADD `added_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- goals from before this column count as added now
UPDATE `goals` SET `added_at` = strftime('%s', 'now');
