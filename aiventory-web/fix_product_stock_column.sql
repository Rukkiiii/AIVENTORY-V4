-- Fix Product_stock Column Issue
-- Run this script in phpMyAdmin or MySQL to add/fix the Product_stock column

USE aiventory;

-- Check if Product_stock column exists
-- If it doesn't exist, add it
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'aiventory' 
    AND TABLE_NAME = 'product' 
    AND COLUMN_NAME = 'Product_stock'
);

-- If column doesn't exist, add it
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE product ADD COLUMN Product_stock INT DEFAULT 0 AFTER Product_price',
    'SELECT "Product_stock column already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Alternative: If you have a 'stock' column instead, rename it
-- Uncomment the following if you need to rename 'stock' to 'Product_stock':
/*
SET @stock_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'aiventory' 
    AND TABLE_NAME = 'product' 
    AND COLUMN_NAME = 'stock'
);

SET @sql2 = IF(@stock_exists > 0 AND @col_exists = 0,
    'ALTER TABLE product CHANGE COLUMN stock Product_stock INT DEFAULT 0',
    'SELECT "No stock column found or Product_stock already exists" AS message'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
*/

-- Verify the column was added
DESCRIBE product;

-- Show sample data
SELECT Product_id, Product_name, Product_stock, reorder_level 
FROM product 
LIMIT 5;

