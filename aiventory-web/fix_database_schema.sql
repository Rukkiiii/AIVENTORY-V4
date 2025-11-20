-- Fix AIventory Database Schema
-- Add missing columns to product table

USE aiventory;

-- First, let's see what columns currently exist
DESCRIBE product;

-- Add Product_sku column (position it after Product_name)
ALTER TABLE product ADD COLUMN Product_sku VARCHAR(50) AFTER Product_name;

-- Add Product_status column (position it at the end for safety)
ALTER TABLE product ADD COLUMN Product_status VARCHAR(20) DEFAULT 'Active';

-- Add Product_threshold column for reorder level
ALTER TABLE product ADD COLUMN Product_threshold INT DEFAULT 20;

-- Update existing records with default values
UPDATE product SET Product_sku = CONCAT('SKU-', Product_id) WHERE Product_sku IS NULL;
UPDATE product SET Product_status = 'Active' WHERE Product_status IS NULL;
UPDATE product SET Product_threshold = 20 WHERE Product_threshold IS NULL;

-- Make Product_sku NOT NULL after setting default values
ALTER TABLE product MODIFY COLUMN Product_sku VARCHAR(50) NOT NULL;

-- Show the updated table structure
DESCRIBE product;
