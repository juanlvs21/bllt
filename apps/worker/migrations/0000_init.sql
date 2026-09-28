CREATE TABLE `cloud_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_attempts_key_idx` ON `login_attempts` (`key`,`at`);--> statement-breakpoint
CREATE TABLE `rate_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`bs_per_usd` integer NOT NULL,
	`source` text NOT NULL,
	`value_date` text,
	`fetched_at` text NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `rate_candidates_fetched_idx` ON `rate_candidates` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`document` text,
	`phone` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customers_document_idx` ON `customers` (`document`);--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`date` text PRIMARY KEY NOT NULL,
	`bs_per_usd` integer NOT NULL,
	`source` text NOT NULL,
	`confirmed_by` text NOT NULL,
	`confirmed_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`cost_cents` integer NOT NULL,
	`price_cents` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `products_code_idx` ON `products` (`code`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_code` text NOT NULL,
	`product_name` text NOT NULL,
	`qty` integer NOT NULL,
	`price_cents` integer NOT NULL,
	`cost_cents` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sale_items_sale_idx` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`customer_id` text,
	`user_id` text NOT NULL,
	`rate` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`voided_at` text,
	`voided_by` text
);
--> statement-breakpoint
CREATE INDEX `sales_number_idx` ON `sales` (`number`);--> statement-breakpoint
CREATE INDEX `sales_created_at_idx` ON `sales` (`created_at`);--> statement-breakpoint
CREATE INDEX `sales_customer_idx` ON `sales` (`customer_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`iterations` integer NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `users_username_idx` ON `users` (lower("username"));