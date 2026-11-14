ALTER TABLE `budget` ADD `incomes` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
-- the single salary becomes the first income; 0017 drops its columns
UPDATE `budget` SET `incomes` = json_array(json_object('name', 'Salary', 'amountCents', `salary_cents`, 'currency', `salary_currency`)) WHERE `salary_cents` IS NOT NULL;
