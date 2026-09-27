-- Business uniqueness lives only on the desktop, the source of truth.
-- D1 keeps plain indexes so the sync never rejects a desktop row.
CREATE UNIQUE INDEX `users_username_unique` ON `users` (lower("username"));
--> statement-breakpoint
CREATE UNIQUE INDEX `products_code_unique` ON `products` (lower("code"));
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_number_unique` ON `sales` (`number`);
