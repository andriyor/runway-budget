CREATE TABLE `category_budgets` (
	`category` text PRIMARY KEY NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text NOT NULL
);
