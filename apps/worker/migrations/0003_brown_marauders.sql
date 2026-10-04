CREATE UNIQUE INDEX `devices_series_unique` ON `devices` (`series`);--> statement-breakpoint
CREATE INDEX `devices_token_idx` ON `devices` (`token_hash`);