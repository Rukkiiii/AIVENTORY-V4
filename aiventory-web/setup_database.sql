-- AIventory Database Setup Script
-- This script creates the database and tables with proper structure

CREATE DATABASE IF NOT EXISTS aiventory;
USE aiventory;

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS order_item;
DROP TABLE IF EXISTS orders_from_supplier;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS supplier;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS staff;

-- Admin Table
CREATE TABLE admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_name VARCHAR(100) NOT NULL,
    admin_username VARCHAR(50) UNIQUE NOT NULL,
    admin_password VARCHAR(255) NOT NULL,
    admin_email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff Table
CREATE TABLE staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    staff_name VARCHAR(100) NOT NULL,
    staff_username VARCHAR(50) UNIQUE NOT NULL,
    staff_password VARCHAR(255) NOT NULL,
    staff_email VARCHAR(100) UNIQUE NOT NULL,
    staff_role VARCHAR(20) DEFAULT 'Staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supplier Table
CREATE TABLE supplier (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    supplier_contactnum VARCHAR(30),
    supplier_email VARCHAR(100),
    supplier_address TEXT,
    supplier_rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Product Table
CREATE TABLE product (
    Product_id INT AUTO_INCREMENT PRIMARY KEY,
    Product_name VARCHAR(100) NOT NULL,
    Product_description TEXT,
    Product_sku VARCHAR(50),
    Product_price DECIMAL(10,2) NOT NULL,
    Product_stock INT DEFAULT 0,
    Product_category VARCHAR(50),
    reorder_level INT DEFAULT 10,
    supplier_id INT,
    Product_status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id) ON DELETE SET NULL
);

-- Orders from Supplier Table
CREATE TABLE orders_from_supplier (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    order_date DATE NOT NULL,
    order_status ENUM('Pending', 'Completed', 'Cancelled') DEFAULT 'Pending',
    total_amount DECIMAL(10,2) NOT NULL,
    supplier_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id) ON DELETE CASCADE
);

-- Order Item Table
CREATE TABLE order_item (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    received_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders_from_supplier(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(Product_id) ON DELETE CASCADE
);

-- Invoice Table
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

-- Invoice Items Table
CREATE TABLE invoice_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    product_id INT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(Product_id) ON DELETE SET NULL
);

-- Insert sample data
-- Sample Admin User (password: admin123)
INSERT INTO admin (admin_name, admin_username, admin_password, admin_email) 
VALUES ('Administrator', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@aiventory.com');

-- Sample Staff User (password: staff123)
INSERT INTO staff (staff_name, staff_username, staff_password, staff_email, staff_role) 
VALUES ('Staff User', 'staff', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff@aiventory.com', 'Staff');

-- Sample Suppliers
INSERT INTO supplier (supplier_name, supplier_contactnum, supplier_email, supplier_address, supplier_rating) VALUES
('TechSupply Co.', '+1234567890', 'contact@techsupply.com', '123 Tech Street, Silicon Valley', 4.5),
('Office Essentials', '+0987654321', 'sales@officeessentials.com', '456 Business Ave, Downtown', 4.2),
('Global Electronics', '+1122334455', 'info@globalelectronics.com', '789 Electronics Blvd, Tech City', 4.8);

-- Sample Products
INSERT INTO product (Product_name, Product_sku, Product_price, Product_stock, Product_category, reorder_level, supplier_id, Product_status) VALUES
('Laptop Computer', 'LAP001', 899.99, 25, 'Electronics', 5, 1, 'Active'),
('Office Chair', 'CHAIR001', 199.99, 15, 'Furniture', 3, 2, 'Active'),
('Wireless Mouse', 'MOUSE001', 29.99, 50, 'Electronics', 10, 3, 'Active'),
('Desk Lamp', 'LAMP001', 49.99, 20, 'Furniture', 5, 2, 'Active'),
('Brake Pads', 'BRK-PAD-004', 250.00, 60, 'Motorcycle Parts', 10, 3, 'Active'),
('Motorcycle Battery', 'BAT-YTX-001', 1850.00, 20, 'Motorcycle Parts', 5, 1, 'Active'),
('LED Headlight Bulb', 'MC-ELC-004', 450.00, 40, 'Motorcycle Parts', 8, 3, 'Active'),
('Engine Oil (10W-40)', 'OIL-10W40-002', 320.00, 100, 'Lubricants', 15, 2, 'Active'),
('Drive Chain', 'CHN-520-003', 620.00, 35, 'Motorcycle Parts', 5, 1, 'Active');

-- Sample Invoices
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

-- Show created tables
SHOW TABLES;

-- Show sample accounts
SELECT 'admin' as type, admin_username, admin_email FROM admin
UNION ALL
SELECT 'staff' as type, staff_username, staff_email FROM staff;
