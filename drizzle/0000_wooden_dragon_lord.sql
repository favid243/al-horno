CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`request_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orders_owner_created` ON `orders` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_owner_request` ON `orders` (`owner_id`,`request_key`);--> statement-breakpoint
CREATE TABLE `catalog` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`payload` text NOT NULL
);
