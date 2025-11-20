-- QUICK FIX: Add Product_stock Column
-- Copy and paste this into phpMyAdmin SQL tab

USE aiventory;

-- Add Product_stock column if it doesn't exist
ALTER TABLE product 
ADD COLUMN Product_stock INT DEFAULT 0 
AFTER Product_price;

-- Verify it was added
DESCRIBE product;

