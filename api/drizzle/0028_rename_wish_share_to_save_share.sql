-- the setting changed from a share of the surplus for wishes to a share of income saved before them
ALTER TABLE `budget` RENAME COLUMN `wish_share` TO `save_share`;
