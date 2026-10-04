CREATE TABLE `changes` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`device_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `changes_device_idx` ON `changes` (`device_id`,`seq`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`series` text NOT NULL,
	`token_hash` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text
);
--> statement-breakpoint
CREATE TABLE `business_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by_device` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`ref_id` text,
	`device_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `stock_movements_product_idx` ON `stock_movements` (`product_id`);--> statement-breakpoint
ALTER TABLE `customers` ADD `updated_by_device` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exchange_rates` ADD `updated_by_device` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `updated_by_device` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sales` ADD `series` text DEFAULT 'A' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `updated_by_device` text DEFAULT '' NOT NULL;