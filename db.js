const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data', 'ruhunubilling.db.json');
const TMP_PATH = path.join(__dirname, 'data', 'ruhunubilling.db.json.tmp');

// Hash password with salt
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return verify === hash;
}

// Initial seed data
function getInitialData() {
  const now = new Date().toISOString();
  const adminAuth = hashPassword('admin123');
  const userAuth = hashPassword('user123');

  return {
    database: {
      dbName: 'RUHUNU_BILLING_DB',
      version: '1.0.0',
      description: 'Single-file centralized real-time billing database',
      currency: 'RS',
      createdAt: now,
      lastSync: now
    },
    settings: {
      currency: 'RS',
      defaultLanguage: 'en', // 'en' or 'si'
      defaultTheme: 'light', // 'light' or 'dark'
      afkTimeoutMinutes: 10,
      enableSoundNotifications: true,
      company: {
        name: 'Ruhunu Traders & Distributors',
        nameSinhala: 'රුහුණු වෙළඳ සහ බෙදාහැරීමේ මධ්‍යස්ථානය',
        address: 'No. 142, Anagarika Dharmapala Mawatha, Matara, Sri Lanka',
        addressSinhala: 'නො. 142, අනගාරික ධර්මපාල මාවත, මාතර',
        phone: '+94 41 222 3456 / 077 123 4567',
        email: 'billing@ruhunutraders.lk',
        regNo: 'BR-MT/2026/8941',
        vatNo: 'VAT-102938475-7000',
        footerNote: 'Thank you for your valuable business! Please come again.',
        footerNoteSinhala: 'අප ආයතනය තෝරාගැනීම පිළිබඳව ඔබට ස්තූතියි! නැවත එන්න.'
      },
      template: {
        activeStyle: 'modern-emerald', // modern-emerald | corporate-clean | minimal | thermal-receipt
        primaryColor: '#059669', // Emerald Green
        showBrandDefault: true,
        showTaxNumber: true,
        showPaymentMethod: true,
        showQrCode: true,
        paperSize: 'a4' // a4 | thermal80
      }
    },
    users: [
      {
        id: 'usr_admin_01',
        username: 'admin',
        name: 'Chief Administrator',
        email: 'admin@ruhunubilling.lk',
        role: 'admin',
        status: 'active',
        passwordHash: adminAuth.hash,
        salt: adminAuth.salt,
        avatar: 'shield',
        createdAt: now,
        lastLogin: now
      },
      {
        id: 'usr_cashier_01',
        username: 'user',
        name: 'Sales Cashier (User)',
        email: 'cashier@ruhunubilling.lk',
        role: 'user',
        status: 'active',
        passwordHash: userAuth.hash,
        salt: userAuth.salt,
        avatar: 'user',
        createdAt: now,
        lastLogin: now
      }
    ],
    products: [
      {
        id: 'prd_01',
        name: 'Samsung Galaxy A15 128GB',
        brand: 'Samsung',
        category: 'Electronics',
        price: 48500,
        stock: 18,
        sku: 'SAM-A15-BLK',
        description: 'Super AMOLED display, 50MP camera, 5000mAh battery',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_02',
        name: 'Singer Rice Cooker 2.2L Deluxe',
        brand: 'Singer',
        category: 'Appliances',
        price: 12450,
        stock: 24,
        sku: 'SNG-RC-22D',
        description: 'Non-stick bowl with automatic keep-warm mode',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_03',
        name: 'Atlas CR Book 120 Pages Ruled',
        brand: 'Atlas',
        category: 'Stationery',
        price: 380,
        stock: 250,
        sku: 'ATL-CR-120',
        description: 'High quality 70gsm smooth white paper',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_04',
        name: 'Dilmah Premium Ceylon Tea 400g',
        brand: 'Dilmah',
        category: 'Beverages',
        price: 1850,
        stock: 85,
        sku: 'DLM-TEA-400',
        description: '100% Pure Ceylon BOPF Black Tea',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_05',
        name: 'DSI Super Grip Comfort Slippers',
        brand: 'DSI',
        category: 'Footwear',
        price: 1450,
        stock: 60,
        sku: 'DSI-SLP-42',
        description: 'Durable vulcanized rubber anti-slip sole',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_06',
        name: 'Anchor Full Cream Milk Powder 400g',
        brand: 'Anchor',
        category: 'Groceries',
        price: 1140,
        stock: 120,
        sku: 'ANC-MP-400',
        description: 'Fortified with Vitamins A & D for daily nutrition',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_07',
        name: 'LG Smart Inverter 260L Refrigerator',
        brand: 'LG',
        category: 'Appliances',
        price: 198000,
        stock: 6,
        sku: 'LG-REF-260',
        description: 'Multi-airflow energy efficient linear compressor',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_08',
        name: 'Munchee Super Cream Cracker 490g',
        brand: 'Munchee',
        category: 'Groceries',
        price: 490,
        stock: 160,
        sku: 'MUN-SCC-490',
        description: 'Crisp and flaky golden Sri Lankan crackers',
        createdAt: now,
        updatedAt: now
      }
    ],
    customers: [
      {
        id: 'cust_01',
        name: 'Kasun Perera',
        phone: '077 123 4567',
        address: 'No. 45, Galle Road, Nupe, Matara',
        email: 'kasun.perera@gmail.com',
        notes: 'VIP regular customer',
        createdAt: now
      },
      {
        id: 'cust_02',
        name: 'Kumari Fernando',
        phone: '071 889 9221',
        address: '12/A, Beach Road, Tangalle',
        email: 'kumari.f@outlook.com',
        notes: 'Wholesale buyer',
        createdAt: now
      },
      {
        id: 'cust_03',
        name: 'Nimal Silva',
        phone: '076 554 4332',
        address: 'Beliatta Road, Dikwella',
        email: 'nimal.silva@yahoo.com',
        notes: 'Prompt cash payments',
        createdAt: now
      },
      {
        id: 'cust_04',
        name: 'Sunil Jayawardena',
        phone: '070 223 3445',
        address: 'No. 88, Light House Street, Fort, Galle',
        email: 'sunil.j@gmail.com',
        notes: 'Hardware contractor',
        createdAt: now
      }
    ],
    invoices: [
      {
        id: 'inv_01',
        invoiceNumber: 'INV-2026-0001',
        date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
        customerId: 'cust_01',
        customerName: 'Kasun Perera',
        customerPhone: '077 123 4567',
        customerAddress: 'No. 45, Galle Road, Nupe, Matara',
        showBrand: true,
        items: [
          {
            productId: 'prd_01',
            name: 'Samsung Galaxy A15 128GB',
            brand: 'Samsung',
            showBrand: true,
            price: 48500,
            quantity: 1,
            discount: 1000,
            total: 47500
          },
          {
            productId: 'prd_03',
            name: 'Atlas CR Book 120 Pages Ruled',
            brand: 'Atlas',
            showBrand: true,
            price: 380,
            quantity: 5,
            discount: 0,
            total: 1900
          }
        ],
        subtotal: 50400,
        discount: 1000,
        taxRate: 2.5,
        taxAmount: 1235,
        grandTotal: 50635,
        paymentStatus: 'Paid', // Paid | Unpaid | Partially Paid
        paymentMethod: 'Card', // Cash | Card | Bank Transfer
        notes: 'Thank you for purchasing with us. Warranty card issued.',
        createdBy: 'usr_admin_01',
        createdByName: 'Chief Administrator',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'inv_02',
        invoiceNumber: 'INV-2026-0002',
        date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
        customerId: 'cust_02',
        customerName: 'Kumari Fernando',
        customerPhone: '071 889 9221',
        customerAddress: '12/A, Beach Road, Tangalle',
        showBrand: true,
        items: [
          {
            productId: 'prd_02',
            name: 'Singer Rice Cooker 2.2L Deluxe',
            brand: 'Singer',
            showBrand: true,
            price: 12450,
            quantity: 2,
            discount: 500,
            total: 24400
          },
          {
            productId: 'prd_04',
            name: 'Dilmah Premium Ceylon Tea 400g',
            brand: 'Dilmah',
            showBrand: true,
            price: 1850,
            quantity: 4,
            discount: 0,
            total: 7400
          }
        ],
        subtotal: 32300,
        discount: 500,
        taxRate: 0,
        taxAmount: 0,
        grandTotal: 31800,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        notes: 'Delivered to Tangalle store.',
        createdBy: 'usr_cashier_01',
        createdByName: 'Sales Cashier (User)',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'inv_03',
        invoiceNumber: 'INV-2026-0003',
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
        customerId: 'cust_03',
        customerName: 'Nimal Silva',
        customerPhone: '076 554 4332',
        customerAddress: 'Beliatta Road, Dikwella',
        showBrand: false,
        items: [
          {
            productId: 'prd_06',
            name: 'Anchor Full Cream Milk Powder 400g',
            brand: 'Anchor',
            showBrand: false,
            price: 1140,
            quantity: 10,
            discount: 400,
            total: 11000
          },
          {
            productId: 'prd_08',
            name: 'Munchee Super Cream Cracker 490g',
            brand: 'Munchee',
            showBrand: false,
            price: 490,
            quantity: 15,
            discount: 0,
            total: 7350
          }
        ],
        subtotal: 18750,
        discount: 400,
        taxRate: 0,
        taxAmount: 0,
        grandTotal: 18350,
        paymentStatus: 'Unpaid',
        paymentMethod: 'Bank Transfer',
        notes: 'Credit term: 7 days.',
        createdBy: 'usr_admin_01',
        createdByName: 'Chief Administrator',
        createdAt: new Date().toISOString()
      }
    ],
    history: [
      {
        id: 'hist_01',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        userId: 'usr_admin_01',
        userName: 'Chief Administrator',
        userRole: 'admin',
        action: 'INVOICE_CREATED',
        category: 'invoice',
        details: 'Created Invoice #INV-2026-0001 for Kasun Perera (RS 50,635.00)'
      },
      {
        id: 'hist_02',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        userId: 'usr_cashier_01',
        userName: 'Sales Cashier (User)',
        userRole: 'user',
        action: 'INVOICE_CREATED',
        category: 'invoice',
        details: 'Created Invoice #INV-2026-0002 for Kumari Fernando (RS 31,800.00)'
      },
      {
        id: 'hist_03',
        timestamp: new Date().toISOString(),
        userId: 'usr_admin_01',
        userName: 'Chief Administrator',
        userRole: 'admin',
        action: 'DATABASE_INITIALIZED',
        category: 'system',
        details: 'Ruhunu Billing System Database initialized and synced.'
      }
    ]
  };
}

class DatabaseManager {
  constructor() {
    this.memoryData = null;
    this.listeners = new Set();
    this.init();
  }

  init() {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.memoryData = JSON.parse(raw);
      } else {
        this.memoryData = getInitialData();
        this.persist();
      }
    } catch (err) {
      console.error('Error initializing database, recreating initial data:', err);
      this.memoryData = getInitialData();
      this.persist();
    }
  }

  // Subscribe SSE clients to real-time events
  subscribe(res) {
    this.listeners.add(res);
    res.on('close', () => {
      this.listeners.delete(res);
    });
  }

  // Broadcast real-time change to all connected clients
  broadcast(event, payload) {
    const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.listeners) {
      try {
        client.write(dataString);
      } catch (err) {
        this.listeners.delete(client);
      }
    }
  }

  // Atomic write to the single database file
  persist() {
    this.memoryData.database.lastSync = new Date().toISOString();
    const jsonString = JSON.stringify(this.memoryData, null, 2);
    // Write to temporary file first, then atomically rename
    fs.writeFileSync(TMP_PATH, jsonString, 'utf8');
    fs.renameSync(TMP_PATH, DB_PATH);
  }

  // Safe wrapper for mutative operations
  mutate(actionName, fn, auditInfo = null) {
    const result = fn(this.memoryData);
    this.persist();

    if (auditInfo) {
      this.addHistoryLog(auditInfo);
    }

    // Broadcast synchronization message with latest state metadata
    this.broadcast('sync', {
      action: actionName,
      lastSync: this.memoryData.database.lastSync,
      dbName: this.memoryData.database.dbName,
      summary: {
        productsCount: this.memoryData.products.length,
        customersCount: this.memoryData.customers.length,
        invoicesCount: this.memoryData.invoices.length,
        usersCount: this.memoryData.users.length
      }
    });

    return result;
  }

  addHistoryLog({ userId, userName, userRole, action, category, details }) {
    const log = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      userId: userId || 'system',
      userName: userName || 'System',
      userRole: userRole || 'system',
      action: action || 'ACTION',
      category: category || 'general',
      details: details || ''
    };
    this.memoryData.history.unshift(log);
    // Keep last 500 audit logs to keep single file lean and snappy
    if (this.memoryData.history.length > 500) {
      this.memoryData.history = this.memoryData.history.slice(0, 500);
    }
    this.persist();
    this.broadcast('audit_log', log);
  }

  getDbStats() {
    let sizeBytes = 0;
    try {
      const stats = fs.statSync(DB_PATH);
      sizeBytes = stats.size;
    } catch (e) {}

    return {
      fileName: 'ruhunubilling.db.json',
      filePath: DB_PATH,
      fileSize: (sizeBytes / 1024).toFixed(2) + ' KB',
      sizeBytes,
      dbName: this.memoryData.database.dbName,
      version: this.memoryData.database.version,
      lastSync: this.memoryData.database.lastSync,
      counts: {
        users: this.memoryData.users.length,
        products: this.memoryData.products.length,
        customers: this.memoryData.customers.length,
        invoices: this.memoryData.invoices.length,
        historyLogs: this.memoryData.history.length
      }
    };
  }

  getData() {
    return this.memoryData;
  }
}

const db = new DatabaseManager();

module.exports = {
  db,
  hashPassword,
  verifyPassword
};
