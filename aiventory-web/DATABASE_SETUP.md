# AIventory Database Setup

## Prerequisites
1. Install XAMPP or any MySQL server
2. Start MySQL service

## Database Setup Instructions

### 1. Create Database
```sql
CREATE DATABASE aiventory;
USE aiventory;
```

### 2. Create Tables

#### Admin Table
```sql
CREATE TABLE admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_name VARCHAR(100) NOT NULL,
    admin_username VARCHAR(50) UNIQUE NOT NULL,
    admin_password VARCHAR(255) NOT NULL,
    admin_email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Staff Table
```sql
CREATE TABLE staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    staff_name VARCHAR(100) NOT NULL,
    staff_username VARCHAR(50) UNIQUE NOT NULL,
    staff_password VARCHAR(255) NOT NULL,
    staff_email VARCHAR(100) UNIQUE NOT NULL,
    staff_role VARCHAR(20) DEFAULT 'Staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Supplier Table
```sql
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
```

> ℹ️ **Existing databases:** If your `supplier_contactnum` column is still an `INT`, run `fix_supplier_contactnum_column.sql` to convert it to `VARCHAR(30)` so you can store formatted phone numbers without losing leading zeros.

#### Product Table
```sql
CREATE TABLE product (
    Product_id INT AUTO_INCREMENT PRIMARY KEY,
    Product_name VARCHAR(100) NOT NULL,
    Product_sku VARCHAR(50) NOT NULL,
    Product_description TEXT,
    Product_price DECIMAL(10,2) NOT NULL,
    Product_stock INT DEFAULT 0,
    Product_status VARCHAR(20) DEFAULT 'Active',
    Product_category VARCHAR(50),
    reorder_level INT DEFAULT 10,
    supplier_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id) ON DELETE SET NULL
);
```

#### Orders from Supplier Table
```sql
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
```

#### Order Item Table
```sql
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
```

#### Invoices Table
```sql
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
```

#### Invoice Items Table
```sql
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
```

### 3. Insert Sample Data

#### Sample Admin User
```sql
INSERT INTO admin (admin_name, admin_username, admin_password, admin_email) 
VALUES ('Administrator', 'admin', '$2b$10$example_hashed_password', 'admin@aiventory.com');
```

#### Sample Staff User
```sql
INSERT INTO staff (staff_name, staff_username, staff_password, staff_email, staff_role) 
VALUES ('Staff User', 'staff', '$2b$10$example_hashed_password', 'staff@aiventory.com', 'Staff');
```

#### Sample Suppliers
```sql
INSERT INTO supplier (supplier_name, supplier_contactnum, supplier_email, supplier_address, supplier_rating) VALUES
('TechSupply Co.', '+1234567890', 'contact@techsupply.com', '123 Tech Street, Silicon Valley', 4.5),
('Office Essentials', '+0987654321', 'sales@officeessentials.com', '456 Business Ave, Downtown', 4.2),
('Global Electronics', '+1122334455', 'info@globalelectronics.com', '789 Electronics Blvd, Tech City', 4.8);
```

#### Sample Products
```sql
INSERT INTO product (Product_name, Product_sku, Product_price, Product_stock, Product_status, Product_category, reorder_level, supplier_id) VALUES
('Laptop Computer', 'LAP001', 899.99, 25, 'Active', 'Electronics', 5, 1),
('Office Chair', 'CHAIR001', 199.99, 15, 'Active', 'Furniture', 3, 2),
('Wireless Mouse', 'MOUSE001', 29.99, 50, 'Active', 'Electronics', 10, 3),
('Desk Lamp', 'LAMP001', 49.99, 20, 'Active', 'Furniture', 5, 2),
('Brake Pads', 'BRK-PAD-004', 250.00, 60, 'Active', 'Motorcycle Parts', 10, 3),
('Motorcycle Battery', 'BAT-YTX-001', 1850.00, 20, 'Active', 'Motorcycle Parts', 5, 1),
('LED Headlight Bulb', 'MC-ELC-004', 450.00, 40, 'Active', 'Motorcycle Parts', 8, 3),
('Engine Oil (10W-40)', 'OIL-10W40-002', 320.00, 100, 'Active', 'Lubricants', 15, 2),
('Drive Chain', 'CHN-520-003', 620.00, 35, 'Active', 'Motorcycle Parts', 5, 1);
```

#### Sample Invoices
```sql
INSERT INTO invoices (invoice_number, customer_name, customer_email, customer_phone, customer_address, invoice_date, due_date, status, subtotal, tax, total, notes)
VALUES
('INV-1001', 'Atlas Moto Supply', 'sales@atlasmoto.com', '+63 917 555 1234', '123 M.C. Briones St, Cebu City, Philippines', '2025-11-05', '2025-11-20', 'Pending', 32750, 1638, 34388, 'Thank you for your business! Please settle within 15 days.'),
('INV-0998', 'RideSafe Motors', 'support@ridesafe.ph', '+63 32 222 4488', 'Unit 204, Oakridge Business Park, Mandaue City', '2025-10-24', '2025-11-08', 'Paid', 20240, 1012, 21252, 'Paid via bank transfer on Nov 02, 2025.');

INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, product_id) VALUES
((SELECT invoice_id FROM invoices WHERE invoice_number = 'INV-1001'), 'Brake Pads (BRK-PAD-004)', 30, 250, (SELECT Product_id FROM product WHERE Product_sku = 'BRK-PAD-004')),
((SELECT invoice_id FROM invoices WHERE invoice_number = 'INV-1001'), 'Motorcycle Battery (BAT-YTX-001)', 10, 1850, (SELECT Product_id FROM product WHERE Product_sku = 'BAT-YTX-001')),
((SELECT invoice_id FROM invoices WHERE invoice_number = 'INV-1001'), 'LED Headlight Bulb', 15, 450, (SELECT Product_id FROM product WHERE Product_sku = 'MC-ELC-004')),
((SELECT invoice_id FROM invoices WHERE invoice_number = 'INV-0998'), 'Engine Oil (10W-40)', 40, 320, (SELECT Product_id FROM product WHERE Product_sku = 'OIL-10W40-002')),
((SELECT invoice_id FROM invoices WHERE invoice_number = 'INV-0998'), 'Drive Chain (CHN-520-003)', 12, 620, (SELECT Product_id FROM product WHERE Product_sku = 'CHN-520-003'));
```

### 4. Environment Configuration

Create a `.env` file in the `server` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=aiventory

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Server Port
PORT=5000
```

### 5. Test Login Credentials

For testing purposes, you can create simple credentials:

**Admin Login:**
- Username: admin
- Password: admin123

**Staff Login:**
- Username: staff
- Password: staff123

To create these, run:
```sql
-- Simple passwords for testing (in production, use hashed passwords)
UPDATE admin SET admin_password = 'admin123' WHERE admin_username = 'admin';
UPDATE staff SET staff_password = 'staff123' WHERE staff_username = 'staff';
```

## Running the Application

1. Start MySQL server (via XAMPP or standalone)
2. Create the database and tables using the SQL above
3. Navigate to the server directory: `cd server`
4. Install dependencies: `npm install`
5. Start the backend: `npm start`
6. In another terminal, navigate to the project root
7. Install frontend dependencies: `npm install`
8. Start the frontend: `npm run dev`

The application should now be accessible at `http://localhost:5173` (frontend) and the API at `http://localhost:5001` (backend).

