ALTER TABLE `goals` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- existing goals keep the order they were added in
UPDATE `goals` SET `position` = `id`;
