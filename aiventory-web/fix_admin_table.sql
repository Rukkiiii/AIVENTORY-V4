-- Fix AIventory `admin` table missing/engine errors
-- Run this script inside phpMyAdmin > SQL tab or via mysql CLI

USE aiventory;

-- The table is registered in the data dictionary but the engine files are gone.
-- Disable FK checks, drop the orphaned table reference, then recreate it.
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS admin;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

CREATE TABLE admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_name VARCHAR(100) NOT NULL,
    admin_username VARCHAR(50) UNIQUE NOT NULL,
    admin_password VARCHAR(255) NOT NULL,
    admin_email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL DEFAULT NULL
);

-- Default super admin (password: admin123)
-- Hash = bcrypt $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT INTO admin (admin_name, admin_username, admin_password, admin_email)
VALUES (
    'Administrator',
    'admin',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin@aiventory.com'
);

