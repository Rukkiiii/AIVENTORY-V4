-- Fix `inventory`, `invoices`, and `invoice_items` tables (handles #1932 errors)
-- Run in phpMyAdmin (SQL tab) while `aiventory` DB is selected.

USE aiventory;

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS inventory;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

CREATE TABLE inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    stock_quantity INT NOT NULL,
    threshold INT NOT NULL,
    status ENUM('normal','low stock','out of stock') DEFAULT 'normal',
    product_id INT NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id)
        REFERENCES product(Product_id) ON DELETE CASCADE
);

CREATE TABLE invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(150),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    invoice_date DATE NOT NULL,
    due_date DATE,
    status ENUM('Pending','Paid','Overdue') DEFAULT 'Pending',
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    product_id INT NULL,
    CONSTRAINT fk_items_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    CONSTRAINT fk_items_product FOREIGN KEY (product_id)
        REFERENCES product(Product_id) ON DELETE SET NULL
);

-- Optional seed data (uncomment if you want sample invoices back)
/*
INSERT INTO invoices (invoice_number, customer_name, customer_email, customer_phone, customer_address, invoice_date, due_date, status, subtotal, tax, total, notes)
VALUES
('INV-1001', 'Atlas Moto Supply', 'sales@atlasmoto.com', '+63 917 555 1234', '123 M.C. Briones St, Cebu City, Philippines', '2025-11-05', '2025-11-20', 'Pending', 32750, 1638, 34388, 'Thank you for your business! Please settle within 15 days.'),
('INV-0998', 'RideSafe Motors', 'support@ridesafe.ph', '+63 32 222 4488', 'Unit 204, Oakridge Business Park, Mandaue City', '2025-10-24', '2025-11-08', 'Paid', 20240, 1012, 21252, 'Paid via bank transfer on Nov 02, 2025.');

INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, product_id) VALUES
((SELECT invoice_id FROM invoices WHERE invoice_number = 'INV-1001'), 'Brake Pads (BRK-PAD-004)', 30, 250, (SELECT Product_id FROM product WHERE Product_sku = 'BRK-PAD-004')),
((SELECT invoice_id FROM invoices WHERE invoice_number = 'INV-1001'), 'Motorcycle Battery (BAT-YTX-001)', 10, 1850, (SELECT Product_id FROM product WHERE Product_sku = 'BAT-YTX-001')),
((SELECT invoice_id FROM invoices WHERE invoice_number = 'INV-1001'), 'LED Headlight Bulb', 15, 450, (SELECT Product_id FROM product WHERE Product_name = 'LED Headlight Bulb')),
((SELECT invoice_id FROM invoices WHERE invoice_number = 'INV-0998'), 'Engine Oil (10W-40)', 40, 320, (SELECT Product_id FROM product WHERE Product_name = 'Engine Oil (10W-40)')),
((SELECT invoice_id FROM invoices WHERE invoice_number = 'INV-0998'), 'Drive Chain (CHN-520-003)', 12, 620, (SELECT Product_id FROM product WHERE Product_sku = 'CHN-520-003'));
*/

