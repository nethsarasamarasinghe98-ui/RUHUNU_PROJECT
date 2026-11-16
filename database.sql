-- ============================================================================
-- RUHUNU PRODUCTS - BILLING & INVOICING SUITE
-- NORMAL SQL DATABASE FILE (MySQL 8.0+ / MariaDB 10.4+ / phpMyAdmin / cPanel)
-- Character Set: utf8mb4 / utf8mb4_unicode_ci
-- Version: 3.5.0
-- ============================================================================
--
-- ============================================================================
-- 1. DATABASE & SERVER CONNECTION CREDENTIALS
-- ============================================================================
-- Database Name:     ruhunu_products_db
-- Database Host:     localhost (or 127.0.0.1)
-- Database Port:     3306 (default MySQL port)
-- Default Root User: root
-- Default Root Pass: (empty / blank password on XAMPP/WAMP by default)
--
-- DEDICATED DATABASE USER (Ready to use if you want a password-protected user):
-- DB Username:       billing_user
-- DB Password:       BillingPass@2026
-- DB Host:           localhost
-- DB Permissions:    ALL PRIVILEGES on `ruhunu_products_db`.*
--
-- ============================================================================
-- 2. APPLICATION LOGIN ACCOUNTS (To sign into the billing software):
-- ============================================================================
-- 1. Admin Account:
--    Username:       admin
--    Password:       password
--    Role:           Administrator (Full control, manage templates & users)
--
-- 2. Personal Admin Account:
--    Username:       neths
--    Password:       password
--    Role:           Administrator (Full control)
--
-- 3. Staff / User Account:
--    Username:       user
--    Password:       password
--    Role:           Standard User (Invoice creation & customer management)
--
-- ============================================================================
-- 3. HOW TO CONNECT IN PHP (db_config.php):
-- ============================================================================
-- define('DB_HOST', 'localhost');
-- define('DB_NAME', 'ruhunu_products_db');
-- define('DB_USER', 'root');                // or 'billing_user'
-- define('DB_PASS', '');                    // or 'BillingPass@2026'
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CREATE DATABASE & SWITCH
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `ruhunu_products_db`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `ruhunu_products_db`;

-- ----------------------------------------------------------------------------
-- OPTIONAL: Create Dedicated MySQL User & Grant Full Privileges
-- (Uncomment lines below if you want to create the 'billing_user' account)
-- ----------------------------------------------------------------------------
-- CREATE USER IF NOT EXISTS 'billing_user'@'localhost' IDENTIFIED BY 'BillingPass@2026';
-- GRANT ALL PRIVILEGES ON `ruhunu_products_db`.* TO 'billing_user'@'localhost';
-- FLUSH PRIVILEGES;

-- ----------------------------------------------------------------------------
-- DROP OLD TABLES (Foreign-key safe cleanup)
-- ----------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `activity_history`;
DROP TABLE IF EXISTS `invoice_payments`;
DROP TABLE IF EXISTS `invoice_items`;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. TABLE STRUCTURE FOR TABLE `users`
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
    `id` VARCHAR(50) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. TABLE STRUCTURE FOR TABLE `settings` (Templates, Paid Seal, Footer Stamp)
-- ----------------------------------------------------------------------------
CREATE TABLE `settings` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(255) NOT NULL DEFAULT 'RUHUNU PRODUCTS',
    `sidebar_subtitle` VARCHAR(255) DEFAULT 'Billing Suite',
    `logo` LONGTEXT NULL,
    `logo_animated` TINYINT(1) NOT NULL DEFAULT 1,
    `address_line1` VARCHAR(255) DEFAULT 'Main Street, Matara',
    `address_line2` VARCHAR(255) DEFAULT 'Southern Province, Sri Lanka',
    `phone` VARCHAR(50) DEFAULT '',
    `mobile_number` VARCHAR(50) DEFAULT '+94 41 222 3333',
    `whatsapp_number` VARCHAR(50) DEFAULT '+94 71 234 5678',
    `email` VARCHAR(100) DEFAULT 'info@ruhunupurchases.com',
    `footer_note` TEXT DEFAULT NULL,
    `terms_info` TEXT DEFAULT NULL,
    `bank_name` VARCHAR(100) DEFAULT 'Bank of Ceylon (BOC)',
    `account_name` VARCHAR(100) DEFAULT 'Ruhunu Products',
    `account_number` VARCHAR(50) DEFAULT '0012345678',
    `branch_name` VARCHAR(100) DEFAULT 'Matara City Branch',
    `bank_details_position` ENUM('left', 'center', 'right') DEFAULT 'left',
    `theme` ENUM('light', 'dark') DEFAULT 'light',
    `header_color` VARCHAR(20) DEFAULT '#16a34a',
    `logo_size` INT DEFAULT 60,
    `watermark_image` LONGTEXT NULL,
    `watermark_size` INT DEFAULT 50,
    `watermark_opacity` INT DEFAULT 10,
    `logo_position` ENUM('left', 'right', 'top') DEFAULT 'left',
    `company_details_alignment` ENUM('left', 'center', 'right') DEFAULT 'left',
    `empty_rows_count` INT DEFAULT 4,
    `margin_top` INT DEFAULT 0,
    `margin_right` INT DEFAULT 20,
    `margin_bottom` INT DEFAULT 20,
    `margin_left` INT DEFAULT 20,
    `invoice_numbering_mode` ENUM('auto', 'manual') DEFAULT 'auto',
    `auto_start_number` INT DEFAULT 1,
    `notifications_enabled` TINYINT(1) DEFAULT 1,
    `seal_enabled` TINYINT(1) DEFAULT 1,
    `seal_image` VARCHAR(255) DEFAULT 'paid_stamp.png',
    `seal_position` VARCHAR(50) DEFAULT 'top-right',
    `seal_top` INT DEFAULT 16,
    `seal_left` INT DEFAULT 72,
    `seal_rotation` INT DEFAULT -15,
    `seal_size` INT DEFAULT 150,
    `seal_opacity` INT DEFAULT 88,
    `auto_fit_one_page` TINYINT(1) DEFAULT 1,
    `hide_bank_when_payments` TINYINT(1) DEFAULT 0,
    `bottom_stamp_text` VARCHAR(255) DEFAULT 'Generated by {companyName}',
    `footer_horizontal_align` VARCHAR(50) DEFAULT 'space-between',
    `footer_vertical_offset` INT DEFAULT 0,
    `footer_horizontal_offset` INT DEFAULT 0,
    `footer_show_divider` TINYINT(1) DEFAULT 1,
    `footer_show_invoice_number` TINYINT(1) DEFAULT 1,
    `footer_font_size` INT DEFAULT 11,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. TABLE STRUCTURE FOR TABLE `customers`
-- ----------------------------------------------------------------------------
CREATE TABLE `customers` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50) DEFAULT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `address_line1` VARCHAR(255) DEFAULT NULL,
    `address_line2` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_customers_name` (`name`),
    INDEX `idx_customers_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. TABLE STRUCTURE FOR TABLE `products` (Brand Support)
-- ----------------------------------------------------------------------------
CREATE TABLE `products` (
    `id` VARCHAR(50) NOT NULL,
    `code` VARCHAR(50) DEFAULT NULL,
    `name` VARCHAR(255) NOT NULL,
    `brand` VARCHAR(100) DEFAULT '',
    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_products_code` (`code`),
    INDEX `idx_products_brand` (`brand`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. TABLE STRUCTURE FOR TABLE `invoices`
-- ----------------------------------------------------------------------------
CREATE TABLE `invoices` (
    `id` VARCHAR(50) NOT NULL,
    `invoice_number` VARCHAR(50) NOT NULL,
    `customer_id` VARCHAR(50) DEFAULT NULL,
    `date` VARCHAR(50) NOT NULL,
    `shipping_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `hide_bank_details` TINYINT(1) NOT NULL DEFAULT 0,
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `tax_rate` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `amount_paid` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('Paid', 'Partial', 'Unpaid') NOT NULL DEFAULT 'Unpaid',
    `manual_invoice_number` VARCHAR(50) DEFAULT '',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_invoices_number` (`invoice_number`),
    CONSTRAINT `fk_invoices_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_invoices_customer_id` (`customer_id`),
    INDEX `idx_invoices_date` (`date`),
    INDEX `idx_invoices_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. TABLE STRUCTURE FOR TABLE `invoice_items`
-- ----------------------------------------------------------------------------
CREATE TABLE `invoice_items` (
    `id` INT AUTO_INCREMENT NOT NULL,
    `invoice_id` VARCHAR(50) NOT NULL,
    `product_id` VARCHAR(50) DEFAULT NULL,
    `description` TEXT NOT NULL,
    `brand` VARCHAR(100) DEFAULT '',
    `show_brand` TINYINT(1) NOT NULL DEFAULT 0,
    `qty` DECIMAL(12, 2) NOT NULL DEFAULT 1.00,
    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `line_total` DECIMAL(12, 2) AS (`qty` * `price`) STORED,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_invoice_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_invoice_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_invoice_items_invoice_id` (`invoice_id`),
    INDEX `idx_invoice_items_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. TABLE STRUCTURE FOR TABLE `invoice_payments` (Multiple Amount Paid)
-- ----------------------------------------------------------------------------
CREATE TABLE `invoice_payments` (
    `id` VARCHAR(50) NOT NULL,
    `invoice_id` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `date` VARCHAR(50) NOT NULL,
    `method` VARCHAR(50) DEFAULT 'Cash',
    `note` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_invoice_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_invoice_payments_invoice_id` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. TABLE STRUCTURE FOR TABLE `activity_history`
-- ----------------------------------------------------------------------------
CREATE TABLE `activity_history` (
    `id` VARCHAR(50) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `details` TEXT DEFAULT NULL,
    `user` VARCHAR(100) NOT NULL DEFAULT 'System',
    `date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_activity_history_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. TABLE STRUCTURE FOR TABLE `user_sessions` (User Login & Activity Tracker)
-- ----------------------------------------------------------------------------
CREATE TABLE `user_sessions` (
    `id` VARCHAR(50) NOT NULL,
    `user_id` VARCHAR(50) DEFAULT NULL,
    `username` VARCHAR(100) NOT NULL,
    `login_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `logout_time` TIMESTAMP NULL DEFAULT NULL,
    `duration_seconds` INT DEFAULT 0,
    `is_online` TINYINT(1) DEFAULT 1,
    `device` VARCHAR(100) DEFAULT 'Desktop',
    PRIMARY KEY (`id`),
    INDEX `idx_user_sessions_user_id` (`user_id`),
    INDEX `idx_user_sessions_login_time` (`login_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- INITIAL SEED DATA
-- ============================================================================

-- 1. Default Users & Passwords
INSERT INTO `users` (`id`, `username`, `password`, `role`) VALUES
('usr_admin_001', 'admin', 'password', 'admin'),
('usr_user_002', 'user', 'password', 'user'),
('usr_admin_003', 'neths', 'password', 'admin')
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`), `role` = VALUES(`role`);

-- 2. Company & Template Settings (Ruhunu Products)
INSERT INTO `settings` (
    `id`, `company_name`, `sidebar_subtitle`, `logo`, `logo_animated`,
    `address_line1`, `address_line2`, `phone`, `mobile_number`, `whatsapp_number`, `email`,
    `footer_note`, `terms_info`, `bank_name`, `account_name`, `account_number`, `branch_name`,
    `bank_details_position`, `theme`, `header_color`, `logo_size`, `watermark_image`, `watermark_size`,
    `watermark_opacity`, `logo_position`, `company_details_alignment`, `empty_rows_count`,
    `margin_top`, `margin_right`, `margin_bottom`, `margin_left`,
    `invoice_numbering_mode`, `auto_start_number`, `notifications_enabled`,
    `seal_enabled`, `seal_image`, `seal_position`, `seal_top`, `seal_left`, `seal_rotation`, `seal_size`, `seal_opacity`,
    `auto_fit_one_page`, `hide_bank_when_payments`,
    `bottom_stamp_text`, `footer_horizontal_align`, `footer_vertical_offset`, `footer_horizontal_offset`,
    `footer_show_divider`, `footer_show_invoice_number`, `footer_font_size`
) VALUES (
    1,
    'RUHUNU PRODUCTS',
    'Billing Suite',
    'ruhunu_logo.svg',
    1,
    'Main Street, Matara',
    'Southern Province, Sri Lanka',
    '',
    '+94 41 222 3333',
    '+94 71 234 5678',
    'info@ruhunupurchases.com',
    'Thank you for your business!',
    'Please make cheques payable to Ruhunu Products.',
    'Bank of Ceylon (BOC)',
    'Ruhunu Products',
    '0012345678',
    'Matara City Branch',
    'left',
    'light',
    '#16a34a',
    60,
    '',
    50,
    10,
    'left',
    'left',
    4,
    0,
    20,
    20,
    20,
    'auto',
    1,
    1,
    1,
    'paid_stamp.png',
    'top-right',
    16,
    72,
    -15,
    150,
    88,
    1,
    0,
    'Generated by {companyName}',
    'space-between',
    0,
    0,
    1,
    1,
    11
)
ON DUPLICATE KEY UPDATE `company_name` = VALUES(`company_name`);

-- 3. Products
INSERT INTO `products` (`id`, `code`, `name`, `brand`, `price`) VALUES
('prod_001', 'RP-CP100', 'Ruhunu Chilli Powder 100g', 'Ruhunu', 180.00),
('prod_002', 'RP-CR100', 'Ruhunu Curry Powder 100g', 'Ruhunu', 190.00),
('prod_003', 'RP-TP050', 'Ruhunu Turmeric Powder 50g', 'Ruhunu', 150.00),
('prod_004', 'RP-BP100', 'Ruhunu Black Pepper Powder 100g', 'Ruhunu', 320.00),
('prod_005', 'RP-RD500', 'Ruhunu Roasted Rice Flour 500g', 'Ruhunu', 220.00)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `brand` = VALUES(`brand`), `price` = VALUES(`price`);

-- 4. Customers
INSERT INTO `customers` (`id`, `name`, `phone`, `email`, `address_line1`, `address_line2`) VALUES
('cust_001', 'Perera Super Center', '+94 77 123 4567', 'pererastores@gmail.com', 'No. 45, Galle Road', 'Matara'),
('cust_002', 'Southern Grocery Mart', '+94 71 987 6543', 'southerngrocery@gmail.com', 'Station Road', 'Weligama'),
('cust_003', 'Ruhunu Traders', '+94 41 555 7890', 'ruhunu.traders@outlook.com', 'Kandy Road', 'Akuressa')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 5. Invoices
INSERT INTO `invoices` (
    `id`, `invoice_number`, `customer_id`, `date`, `shipping_fee`, `hide_bank_details`,
    `subtotal`, `tax_rate`, `total`, `amount_paid`, `balance`, `status`, `manual_invoice_number`
) VALUES (
    'inv_001', 'INV-2026-0001', 'cust_001', '2026-11-02', 150.00, 0,
    7000.00, 0.00, 7150.00, 7150.00, 0.00, 'Paid', ''
)
ON DUPLICATE KEY UPDATE `total` = VALUES(`total`), `amount_paid` = VALUES(`amount_paid`), `status` = VALUES(`status`);

-- 6. Invoice Line Items
DELETE FROM `invoice_items` WHERE `invoice_id` = 'inv_001';
INSERT INTO `invoice_items` (`invoice_id`, `product_id`, `description`, `brand`, `show_brand`, `qty`, `price`) VALUES
('inv_001', 'prod_001', 'Ruhunu Chilli Powder 100g', 'Ruhunu', 0, 20.00, 180.00),
('inv_001', 'prod_002', 'Ruhunu Curry Powder 100g', 'Ruhunu', 0, 10.00, 190.00),
('inv_001', 'prod_004', 'Ruhunu Black Pepper Powder 100g', 'Ruhunu', 0, 5.00, 320.00);

-- 7. Invoice Payment Record
INSERT INTO `invoice_payments` (`id`, `invoice_id`, `amount`, `date`, `method`, `note`) VALUES
('init_inv_001', 'inv_001', 7150.00, '2026-11-02', 'Cash', 'Initial Payment')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);

-- 8. Activity History
INSERT INTO `activity_history` (`id`, `action`, `details`, `user`, `date`) VALUES
('act_001', 'System Init', 'System database initialized successfully', 'System', '2026-11-02 01:00:00'),
('act_002', 'Create Invoice', 'Created new invoice: INV-2026-0001', 'admin', '2026-11-02 01:30:00')
ON DUPLICATE KEY UPDATE `details` = VALUES(`details`);
