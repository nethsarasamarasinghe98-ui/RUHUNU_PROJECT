<?php
// ============================================================
// Multi-Engine Database Configuration for Live Web Hosting
// System: RUHUNU PRODUCTS Billing Suite
// Auto-detects: SQLite (Default Zero-Config) | MySQL | JSON Fallback
// ============================================================

define('DB_SQLITE_PATH', __DIR__ . '/database.sqlite');
define('DB_JSON_PATH',   __DIR__ . '/database.json');
define('DB_SCHEMA_PATH', __DIR__ . '/schema_sqlite.sql');

// ============================================================
// MySQL Database Configuration (Matches database.sql)
// ============================================================
// To use MySQL / MariaDB (via phpMyAdmin / cPanel / XAMPP):
// Set DB_NAME to 'ruhunu_products_db'.
// If DB_NAME is left empty (''), the system automatically uses SQLite (database.sqlite) with zero setup!
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: '');          // Set to 'ruhunu_products_db' to activate MySQL
define('DB_USER', getenv('DB_USER') ?: 'root');      // 'root' or 'billing_user'
define('DB_PASS', getenv('DB_PASS') ?: '');          // '' (blank) or 'BillingPass@2026'
define('DB_CHARSET', 'utf8mb4');

function getDbEngine() {
    static $engine = null;
    if ($engine !== null) return $engine;

    // 1. If MySQL is configured with a non-empty DB_NAME, attempt MySQL connection
    if (!empty(DB_NAME)) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $testPdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 2
            ]);
            $engine = 'mysql';
            return $engine;
        } catch (Exception $e) {
            error_log('[DB WARNING] MySQL connection failed, falling back to SQLite: ' . $e->getMessage());
        }
    }

    // 2. Default & Recommended: Built-in SQLite (Zero configuration needed on live web hosting)
    if (extension_loaded('pdo_sqlite') || (class_exists('PDO') && in_array('sqlite', PDO::getAvailableDrivers()))) {
        $engine = 'sqlite';
        return $engine;
    }

    // 3. Fallback: Flat JSON file storage (works on 100% of hosts even if PDO drivers are disabled)
    $engine = 'json';
    return $engine;
}

function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $engine = getDbEngine();

    if ($engine === 'mysql') {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            return $pdo;
        } catch (Exception $e) {
            error_log('[DB WARNING] MySQL connection error, switching to SQLite: ' . $e->getMessage());
            $engine = 'sqlite';
        }
    }

    if ($engine === 'sqlite') {
        try {
            $dbFile = DB_SQLITE_PATH;
            $exists = file_exists($dbFile);
            $pdo = new PDO('sqlite:' . $dbFile, null, null, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $pdo->exec("PRAGMA foreign_keys = ON;");
            
            if (!$exists) {
                if (file_exists(DB_SCHEMA_PATH)) {
                    $schema = file_get_contents(DB_SCHEMA_PATH);
                    $pdo->exec($schema);
                } else {
                    $pdo->exec("
                        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
                        CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, company_name TEXT NOT NULL DEFAULT 'RUHUNU PRODUCTS', sidebar_subtitle TEXT DEFAULT 'Billing Suite', logo TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
                        CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, address_line1 TEXT, address_line2 TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
                        CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, code TEXT, name TEXT NOT NULL, brand TEXT DEFAULT '', price REAL NOT NULL DEFAULT 0.0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
                        CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, invoice_number TEXT NOT NULL UNIQUE, customer_id TEXT, date TEXT NOT NULL, shipping_fee REAL NOT NULL DEFAULT 0.0, hide_bank_details INTEGER NOT NULL DEFAULT 0, subtotal REAL NOT NULL DEFAULT 0.0, tax_rate REAL NOT NULL DEFAULT 0.0, total REAL NOT NULL DEFAULT 0.0, amount_paid REAL NOT NULL DEFAULT 0.0, balance REAL NOT NULL DEFAULT 0.0, status TEXT NOT NULL DEFAULT 'Unpaid', manual_invoice_number TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
                        CREATE TABLE IF NOT EXISTS invoice_items (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id TEXT NOT NULL, product_id TEXT, description TEXT NOT NULL, brand TEXT DEFAULT '', show_brand INTEGER NOT NULL DEFAULT 0, qty REAL NOT NULL DEFAULT 1.0, price REAL NOT NULL DEFAULT 0.0);
                        CREATE TABLE IF NOT EXISTS invoice_payments (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, amount REAL NOT NULL DEFAULT 0.0, date TEXT NOT NULL, method TEXT DEFAULT 'Cash', note TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
                        CREATE TABLE IF NOT EXISTS activity_history (id TEXT PRIMARY KEY, action TEXT NOT NULL, details TEXT, user TEXT NOT NULL DEFAULT 'System', date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
                        CREATE TABLE IF NOT EXISTS user_sessions (id TEXT PRIMARY KEY, user_id TEXT, username TEXT NOT NULL, login_time DATETIME DEFAULT CURRENT_TIMESTAMP, logout_time DATETIME, duration_seconds INTEGER DEFAULT 0, is_online INTEGER DEFAULT 1, device TEXT DEFAULT 'Desktop');
                    ");
                }
            }

            // Auto-migrate all required columns and tables if missing
            $migrations = [
                "ALTER TABLE settings ADD COLUMN notifications_enabled INTEGER DEFAULT 1",
                "ALTER TABLE settings ADD COLUMN logo_animated INTEGER DEFAULT 1",
                "ALTER TABLE settings ADD COLUMN sidebar_subtitle TEXT DEFAULT 'Billing Suite'",
                "ALTER TABLE settings ADD COLUMN seal_enabled INTEGER DEFAULT 1",
                "ALTER TABLE settings ADD COLUMN seal_image TEXT DEFAULT 'paid_stamp.png'",
                "ALTER TABLE settings ADD COLUMN seal_position TEXT DEFAULT 'top-right'",
                "ALTER TABLE settings ADD COLUMN seal_top INTEGER DEFAULT 16",
                "ALTER TABLE settings ADD COLUMN seal_left INTEGER DEFAULT 72",
                "ALTER TABLE settings ADD COLUMN seal_rotation INTEGER DEFAULT -15",
                "ALTER TABLE settings ADD COLUMN seal_size INTEGER DEFAULT 150",
                "ALTER TABLE settings ADD COLUMN seal_opacity INTEGER DEFAULT 88",
                "ALTER TABLE settings ADD COLUMN auto_fit_one_page INTEGER DEFAULT 1",
                "ALTER TABLE settings ADD COLUMN hide_bank_when_payments INTEGER DEFAULT 0",
                "ALTER TABLE settings ADD COLUMN bottom_stamp_text TEXT DEFAULT 'Generated by {companyName}'",
                "ALTER TABLE settings ADD COLUMN footer_horizontal_align TEXT DEFAULT 'space-between'",
                "ALTER TABLE settings ADD COLUMN footer_vertical_offset INTEGER DEFAULT 0",
                "ALTER TABLE settings ADD COLUMN footer_horizontal_offset INTEGER DEFAULT 0",
                "ALTER TABLE settings ADD COLUMN footer_show_divider INTEGER DEFAULT 1",
                "ALTER TABLE settings ADD COLUMN footer_show_invoice_number INTEGER DEFAULT 1",
                "ALTER TABLE settings ADD COLUMN footer_font_size INTEGER DEFAULT 11",
                "ALTER TABLE products ADD COLUMN brand TEXT DEFAULT ''",
                "ALTER TABLE invoice_items ADD COLUMN brand TEXT DEFAULT ''",
                "ALTER TABLE invoice_items ADD COLUMN show_brand INTEGER DEFAULT 0",
                "CREATE TABLE IF NOT EXISTS invoice_payments (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, amount REAL NOT NULL DEFAULT 0.0, date TEXT NOT NULL, method TEXT DEFAULT 'Cash', note TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE)",
                "CREATE TABLE IF NOT EXISTS user_sessions (id TEXT PRIMARY KEY, user_id TEXT, username TEXT NOT NULL, login_time DATETIME DEFAULT CURRENT_TIMESTAMP, logout_time DATETIME, duration_seconds INTEGER DEFAULT 0, is_online INTEGER DEFAULT 1, device TEXT DEFAULT 'Desktop')"
            ];
            foreach ($migrations as $sql) {
                try { $pdo->exec($sql); } catch (Exception $e) {}
            }
            return $pdo;
        } catch (Exception $e) {
            error_log('[DB WARNING] SQLite connection error, falling back to JSON: ' . $e->getMessage());
        }
    }

    // Engine is JSON (api.php will handle read/write directly via database.json)
    return null;
}
