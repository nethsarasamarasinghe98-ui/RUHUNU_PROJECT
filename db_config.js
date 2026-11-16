// ============================================================================
// DATABASE CONFIGURATION MODULE (Node.js / Express / Vercel Serverless)
// System: RUHUNU PRODUCTS Billing Suite
// ============================================================================

const fs = require('fs');
const path = require('path');

// Auto-load .env file if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            const idx = line.indexOf('=');
            if (idx !== -1) {
                const k = line.slice(0, idx).trim();
                const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
                if (!process.env[k]) process.env[k] = v;
            }
        });
    } catch (e) {}
}

module.exports = {
    // Database Engine
    engine: process.env.DB_ENGINE || 'mysql',

    // MySQL / MariaDB Database Connection (Matches database.sql)
    mysql: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        database: process.env.DB_NAME || 'ruhunu_products_db',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        charset: process.env.DB_CHARSET || 'utf8mb4'
    },

    // Dedicated User alternative
    dedicatedUser: {
        user: 'billing_user',
        password: 'BillingPass@2026'
    },

    // Cloud / Vercel Postgres URL (Optional)
    postgresUrl: process.env.POSTGRES_URL || process.env.DATABASE_URL || '',

    // Default Application Login Credentials
    appAccounts: [
        { username: 'admin', password: 'password', role: 'admin' },
        { username: 'neths', password: 'password', role: 'admin' },
        { username: 'user', password: 'password', role: 'user' }
    ]
};
