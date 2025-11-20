-- Fix Product_status Column Issue
-- Run this in phpMyAdmin to add the missing Product_status column

USE aiventory;

-- Add Product_status column if it doesn't exist
ALTER TABLE product 
ADD COLUMN Product_status ENUM('Active', 'Inactive') DEFAULT 'Active' 
AFTER Product_stock;

-- Update existing records to have Active status
UPDATE product SET Product_status = 'Active' WHERE Product_status IS NULL;

-- Verify the column was added
DESCRIBE product;

