-- flat categories became subcategories; move stored choices to the closest new leaf
UPDATE `merchant_categories` SET `category` = 'supermarket' WHERE `category` = 'groceries';--> statement-breakpoint
UPDATE `merchant_categories` SET `category` = 'restaurants' WHERE `category` = 'cafe';--> statement-breakpoint
UPDATE `merchant_categories` SET `category` = 'public_transport' WHERE `category` = 'transport';--> statement-breakpoint
UPDATE `merchant_categories` SET `category` = 'tickets' WHERE `category` = 'travel';--> statement-breakpoint
UPDATE `merchant_categories` SET `category` = 'digital_subscriptions' WHERE `category` = 'subscriptions';--> statement-breakpoint
UPDATE `merchant_categories` SET `category` = 'pharmacy' WHERE `category` = 'health';--> statement-breakpoint
UPDATE `merchant_categories` SET `category` = 'rent' WHERE `category` = 'housing';--> statement-breakpoint
UPDATE `merchant_categories` SET `category` = 'renovation' WHERE `category` = 'home';--> statement-breakpoint
UPDATE `merchant_categories` SET `category` = 'utility_bills' WHERE `category` = 'utilities';--> statement-breakpoint
UPDATE `merchant_categories` SET `category` = 'events_concerts' WHERE `category` = 'entertainment';--> statement-breakpoint
UPDATE `merchant_categories` SET `category` = 'marketplaces' WHERE `category` = 'shopping';--> statement-breakpoint
UPDATE `merchant_categories` SET `category` = 'army_funds' WHERE `category` = 'charity';--> statement-breakpoint
UPDATE `merchant_categories` SET `category` = 'other_expenses' WHERE `category` = 'other';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'supermarket' WHERE `category` = 'groceries';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'restaurants' WHERE `category` = 'cafe';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'public_transport' WHERE `category` = 'transport';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'tickets' WHERE `category` = 'travel';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'digital_subscriptions' WHERE `category` = 'subscriptions';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'pharmacy' WHERE `category` = 'health';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'rent' WHERE `category` = 'housing';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'renovation' WHERE `category` = 'home';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'utility_bills' WHERE `category` = 'utilities';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'events_concerts' WHERE `category` = 'entertainment';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'marketplaces' WHERE `category` = 'shopping';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'army_funds' WHERE `category` = 'charity';--> statement-breakpoint
UPDATE `transactions` SET `category` = 'other_expenses' WHERE `category` = 'other';
