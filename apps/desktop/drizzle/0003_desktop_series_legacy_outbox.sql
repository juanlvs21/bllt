-- Invoice numbers are unique per series ("A-000123"), not globally. Existing sales got series 'A'
-- in 0002, so they keep their numbers. Product codes stop being unique: two PCs can create the
-- same code offline and the sync renames one of them (see apply.service.ts).
DROP INDEX IF EXISTS `sales_number_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_series_number_unique` ON `sales` (`series`, `number`);
--> statement-breakpoint
DROP INDEX IF EXISTS `products_code_unique`;
--> statement-breakpoint
-- Everything queued before this version used the old payload shape, and the cloud was never
-- reachable (or is rebuilt from the tables on connect). The rows are kept, out of the way, until
-- the first full upload is confirmed; the data itself lives in the tables.
DROP INDEX IF EXISTS `outbox_pending_idx`;
--> statement-breakpoint
ALTER TABLE `outbox` RENAME TO `outbox_legacy`;
--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text
);
--> statement-breakpoint
CREATE INDEX `outbox_pending_idx` ON `outbox` (`sent_at`,`created_at`);
