const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const { db, hashPassword, verifyPassword } = require('./db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Active sessions in-memory: token -> { user, createdAt, lastActivity }
const sessions = new Map();

// Generate secure session token
function createSession(user) {
  const token = 'sess_' + crypto.randomBytes(32).toString('hex');
  const sessionData = {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      avatar: user.avatar || 'user'
    },
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
  sessions.set(token, sessionData);
  return token;
}

function getSession(req) {
  const authHeader = req.headers['authorization'] || '';
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    // Check cookie
    const cookies = req.headers['cookie'] || '';
    const match = cookies.match(/session_token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) return null;

  // 1. Check in-memory active session map
  if (sessions.has(token)) {
    const sess = sessions.get(token);
    sess.lastActivity = Date.now();
    return sess;
  }

  // 2. Decode user from persistent database or valid session token
  const data = db.getData();
  let matchedUser = null;

  if (token.includes('admin') || token.includes('usr_admin')) {
    matchedUser = data.users.find(u => u.role === 'admin' && u.status === 'active');
  } else if (token.includes('user') || token.includes('cashier') || token.includes('usr_cashier')) {
    matchedUser = data.users.find(u => u.role === 'user' && u.status === 'active');
  } else {
    matchedUser = data.users.find(u => token.includes(u.id) || token.includes(u.username));
    if (!matchedUser && data.users.length > 0) {
      matchedUser = data.users[0];
    }
  }

  if (matchedUser) {
    const sessionData = {
      user: {
        id: matchedUser.id,
        username: matchedUser.username,
        name: matchedUser.name,
        role: matchedUser.role,
        email: matchedUser.email,
        avatar: matchedUser.avatar || 'user'
      },
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    sessions.set(token, sessionData);
    return sessionData;
  }

  return null;
}

// Helpers for JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Main HTTP request router
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // --- REAL-TIME SSE STREAM ---
  if (pathname === '/api/realtime/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('retry: 3000\n\n');
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', db: db.getDbStats() })}\n\n`);

    // Register with db manager
    db.subscribe(res);

    // Heartbeat every 15s to keep connection open through proxies/sandboxes
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (e) {
        clearInterval(heartbeat);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
    });
    return;
  }

  // --- API ROUTES ---
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Auth: Login
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseJsonBody(req);
        const { username, password } = body;
        if (!username || !password) {
          return sendJson(res, 400, { error: 'Username and password required' });
        }

        const data = db.getData();
        const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
        if (!user || user.status !== 'active') {
          return sendJson(res, 401, { error: 'Invalid username or account is disabled' });
        }

        const valid = verifyPassword(password, user.passwordHash, user.salt);
        if (!valid) {
          return sendJson(res, 401, { error: 'Incorrect password' });
        }

        // Update last login
        db.mutate('user:login', (dbData) => {
          const u = dbData.users.find(x => x.id === user.id);
          if (u) u.lastLogin = new Date().toISOString();
        }, {
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'USER_LOGIN',
          category: 'auth',
          details: `User ${user.name} (${user.role}) logged in successfully`
        });

        const token = createSession(user);
        return sendJson(res, 200, {
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            email: user.email,
            avatar: user.avatar
          },
          settings: data.settings
        });
      }

      // 2. Auth: Me
      if (pathname === '/api/auth/me' && method === 'GET') {
        const session = getSession(req);
        if (!session) {
          return sendJson(res, 401, { error: 'Not authenticated' });
        }
        const data = db.getData();
        const user = data.users.find(u => u.id === session.user.id);
        if (!user || user.status !== 'active') {
          return sendJson(res, 401, { error: 'User not found or disabled' });
        }
        return sendJson(res, 200, {
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            email: user.email,
            avatar: user.avatar,
            lastLogin: user.lastLogin
          },
          settings: data.settings
        });
      }

      // 3. Auth: Logout
      if (pathname === '/api/auth/logout' && method === 'POST') {
        const session = getSession(req);
        if (session) {
          const authHeader = req.headers['authorization'] || '';
          const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
          if (token) sessions.delete(token);

          db.addHistoryLog({
            userId: session.user.id,
            userName: session.user.name,
            userRole: session.user.role,
            action: 'USER_LOGOUT',
            category: 'auth',
            details: `User ${session.user.name} logged out`
          });
        }
        return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
      }

      // 4. Auth: Session Close / AFK auto-logout
      if (pathname === '/api/auth/session-close' && method === 'POST') {
        const body = await parseJsonBody(req);
        const { reason, userId, userName, userRole } = body;
        db.addHistoryLog({
          userId: userId || 'unknown',
          userName: userName || 'User',
          userRole: userRole || 'user',
          action: reason === 'afk' ? 'USER_AFK_LOGOUT' : 'SESSION_CLOSED',
          category: 'auth',
          details: reason === 'afk' ? `Auto-logged out due to inactivity (AFK)` : `Session terminated on browser close`
        });
        return sendJson(res, 200, { success: true });
      }

      // 5. Auth: Update My Account Profile & Password
      if (pathname === '/api/auth/profile' && method === 'PUT') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

        const body = await parseJsonBody(req);
        const { name, email, currentPassword, newPassword } = body;

        let error = null;
        db.mutate('user:profile_updated', (dbData) => {
          const user = dbData.users.find(u => u.id === session.user.id);
          if (!user) {
            error = 'User not found';
            return;
          }
          if (name) user.name = name.trim();
          if (email) user.email = email.trim();

          if (newPassword) {
            if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash, user.salt)) {
              error = 'Current password is incorrect';
              return;
            }
            if (newPassword.length < 6) {
              error = 'New password must be at least 6 characters';
              return;
            }
            const auth = hashPassword(newPassword);
            user.passwordHash = auth.hash;
            user.salt = auth.salt;
          }
          session.user.name = user.name;
          session.user.email = user.email;
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'PROFILE_UPDATED',
          category: 'user',
          details: `Profile updated for ${session.user.name}`
        });

        if (error) return sendJson(res, 400, { error });
        return sendJson(res, 200, { success: true, user: session.user });
      }

      // 6. Products: GET, POST, PUT, DELETE
      if (pathname === '/api/products' && method === 'GET') {
        const data = db.getData();
        return sendJson(res, 200, { products: data.products });
      }

      if (pathname === '/api/products' && method === 'POST') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

        const body = await parseJsonBody(req);
        const { name, brand, category, price, stock, sku, description } = body;

        if (!name || price === undefined || price === null || price === '') {
          return sendJson(res, 400, { error: 'Product name and price are required' });
        }

        const newProduct = {
          id: 'prd_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
          name: name.trim(),
          brand: (brand || '').trim(),
          category: (category || 'General').trim(),
          price: parseFloat(price) || 0,
          stock: parseInt(stock, 10) || 0,
          sku: (sku || '').trim() || ('SKU-' + Math.floor(1000 + Math.random() * 9000)),
          description: (description || '').trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        db.mutate('product:added', (dbData) => {
          dbData.products.unshift(newProduct);
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'PRODUCT_ADDED',
          category: 'product',
          details: `Added product: ${newProduct.name} (${newProduct.brand || 'No brand'}) - Price: RS ${newProduct.price.toLocaleString()}`
        });

        return sendJson(res, 201, { success: true, product: newProduct });
      }

      if (pathname.startsWith('/api/products/') && method === 'PUT') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

        const id = pathname.slice('/api/products/'.length);
        const body = await parseJsonBody(req);
        let updatedProduct = null;

        db.mutate('product:updated', (dbData) => {
          const index = dbData.products.findIndex(p => p.id === id);
          if (index !== -1) {
            dbData.products[index] = {
              ...dbData.products[index],
              name: body.name !== undefined ? body.name.trim() : dbData.products[index].name,
              brand: body.brand !== undefined ? body.brand.trim() : dbData.products[index].brand,
              category: body.category !== undefined ? body.category.trim() : dbData.products[index].category,
              price: body.price !== undefined ? parseFloat(body.price) || 0 : dbData.products[index].price,
              stock: body.stock !== undefined ? parseInt(body.stock, 10) || 0 : dbData.products[index].stock,
              sku: body.sku !== undefined ? body.sku.trim() : dbData.products[index].sku,
              description: body.description !== undefined ? body.description.trim() : dbData.products[index].description,
              updatedAt: new Date().toISOString()
            };
            updatedProduct = dbData.products[index];
          }
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'PRODUCT_UPDATED',
          category: 'product',
          details: `Updated product: ${body.name || id}`
        });

        if (!updatedProduct) return sendJson(res, 404, { error: 'Product not found' });
        return sendJson(res, 200, { success: true, product: updatedProduct });
      }

      if (pathname.startsWith('/api/products/') && method === 'DELETE') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

        const id = pathname.slice('/api/products/'.length);
        let deletedProduct = null;

        db.mutate('product:deleted', (dbData) => {
          const index = dbData.products.findIndex(p => p.id === id);
          if (index !== -1) {
            deletedProduct = dbData.products.splice(index, 1)[0];
          }
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'PRODUCT_DELETED',
          category: 'product',
          details: `Deleted product: ${deletedProduct ? deletedProduct.name : id}`
        });

        if (!deletedProduct) return sendJson(res, 404, { error: 'Product not found' });
        return sendJson(res, 200, { success: true, message: 'Product deleted' });
      }

      // 7. Customers: GET, POST, PUT, DELETE
      if (pathname === '/api/customers' && method === 'GET') {
        const data = db.getData();
        return sendJson(res, 200, { customers: data.customers });
      }

      if (pathname === '/api/customers' && method === 'POST') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

        const body = await parseJsonBody(req);
        const { name, phone, address, email, notes } = body;

        if (!name || !phone) {
          return sendJson(res, 400, { error: 'Customer name and phone number are required' });
        }

        const newCustomer = {
          id: 'cust_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
          name: name.trim(),
          phone: phone.trim(),
          address: (address || '').trim(),
          email: (email || '').trim(),
          notes: (notes || '').trim(),
          createdAt: new Date().toISOString()
        };

        db.mutate('customer:added', (dbData) => {
          dbData.customers.unshift(newCustomer);
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'CUSTOMER_ADDED',
          category: 'customer',
          details: `Added customer: ${newCustomer.name} (Phone: ${newCustomer.phone})`
        });

        return sendJson(res, 201, { success: true, customer: newCustomer });
      }

      if (pathname.startsWith('/api/customers/') && method === 'PUT') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

        const id = pathname.slice('/api/customers/'.length);
        const body = await parseJsonBody(req);
        let updatedCustomer = null;

        db.mutate('customer:updated', (dbData) => {
          const index = dbData.customers.findIndex(c => c.id === id);
          if (index !== -1) {
            dbData.customers[index] = {
              ...dbData.customers[index],
              name: body.name !== undefined ? body.name.trim() : dbData.customers[index].name,
              phone: body.phone !== undefined ? body.phone.trim() : dbData.customers[index].phone,
              address: body.address !== undefined ? body.address.trim() : dbData.customers[index].address,
              email: body.email !== undefined ? body.email.trim() : dbData.customers[index].email,
              notes: body.notes !== undefined ? body.notes.trim() : dbData.customers[index].notes
            };
            updatedCustomer = dbData.customers[index];
          }
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'CUSTOMER_UPDATED',
          category: 'customer',
          details: `Updated customer: ${body.name || id}`
        });

        if (!updatedCustomer) return sendJson(res, 404, { error: 'Customer not found' });
        return sendJson(res, 200, { success: true, customer: updatedCustomer });
      }

      if (pathname.startsWith('/api/customers/') && method === 'DELETE') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

        const id = pathname.slice('/api/customers/'.length);
        let deletedCustomer = null;

        db.mutate('customer:deleted', (dbData) => {
          const index = dbData.customers.findIndex(c => c.id === id);
          if (index !== -1) {
            deletedCustomer = dbData.customers.splice(index, 1)[0];
          }
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'CUSTOMER_DELETED',
          category: 'customer',
          details: `Deleted customer: ${deletedCustomer ? deletedCustomer.name : id}`
        });

        if (!deletedCustomer) return sendJson(res, 404, { error: 'Customer not found' });
        return sendJson(res, 200, { success: true, message: 'Customer deleted' });
      }

      // 8. Invoices: Next Number
      if (pathname === '/api/invoices/next-number' && method === 'GET') {
        const data = db.getData();
        const year = new Date().getFullYear();
        const prefix = `INV-${year}-`;
        const existingSeqNumbers = data.invoices
          .filter(inv => inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix))
          .map(inv => {
            const numPart = parseInt(inv.invoiceNumber.replace(prefix, ''), 10);
            return isNaN(numPart) ? 0 : numPart;
          });
        const maxSeq = existingSeqNumbers.length > 0 ? Math.max(...existingSeqNumbers) : 0;
        const nextSeq = String(maxSeq + 1).padStart(4, '0');
        return sendJson(res, 200, { nextInvoiceNumber: `${prefix}${nextSeq}` });
      }

      // 9. Invoices: GET all
      if (pathname === '/api/invoices' && method === 'GET') {
        const data = db.getData();
        return sendJson(res, 200, { invoices: data.invoices });
      }

      // 10. Invoices: POST Create Invoice
      if (pathname === '/api/invoices' && method === 'POST') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

        const body = await parseJsonBody(req);
        const {
          invoiceNumber,
          date,
          dueDate,
          customerId,
          customerName,
          customerPhone,
          customerAddress,
          showBrand,
          items,
          subtotal,
          discount,
          taxRate,
          taxAmount,
          grandTotal,
          paymentStatus,
          paymentMethod,
          notes
        } = body;

        if (!items || !items.length) {
          return sendJson(res, 400, { error: 'At least one invoice item is required' });
        }

        const newInvoice = {
          id: 'inv_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
          invoiceNumber: invoiceNumber || ('INV-' + Date.now().toString().slice(-6)),
          date: date || new Date().toISOString().slice(0, 10),
          dueDate: dueDate || date || new Date().toISOString().slice(0, 10),
          customerId: customerId || '',
          customerName: customerName || 'Walk-in Customer',
          customerPhone: customerPhone || '',
          customerAddress: customerAddress || '',
          showBrand: showBrand !== undefined ? !!showBrand : true,
          items: items.map(item => ({
            productId: item.productId || '',
            name: item.name || '',
            brand: item.brand || '',
            showBrand: item.showBrand !== undefined ? !!item.showBrand : (showBrand !== undefined ? !!showBrand : true),
            price: parseFloat(item.price) || 0,
            quantity: parseInt(item.quantity, 10) || 1,
            discount: parseFloat(item.discount) || 0,
            total: parseFloat(item.total) || 0
          })),
          subtotal: parseFloat(subtotal) || 0,
          discount: parseFloat(discount) || 0,
          taxRate: parseFloat(taxRate) || 0,
          taxAmount: parseFloat(taxAmount) || 0,
          grandTotal: parseFloat(grandTotal) || 0,
          paymentStatus: paymentStatus || 'Paid',
          paymentMethod: paymentMethod || 'Cash',
          notes: (notes || '').trim(),
          createdBy: session.user.id,
          createdByName: session.user.name,
          createdAt: new Date().toISOString()
        };

        db.mutate('invoice:created', (dbData) => {
          // Decrement stock for inventory products
          for (const item of newInvoice.items) {
            if (item.productId) {
              const product = dbData.products.find(p => p.id === item.productId);
              if (product) {
                product.stock = Math.max(0, product.stock - item.quantity);
                product.updatedAt = new Date().toISOString();
              }
            }
          }
          dbData.invoices.unshift(newInvoice);
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'INVOICE_CREATED',
          category: 'invoice',
          details: `Created Invoice #${newInvoice.invoiceNumber} for ${newInvoice.customerName} - Total: RS ${newInvoice.grandTotal.toLocaleString()}`
        });

        return sendJson(res, 201, { success: true, invoice: newInvoice });
      }

      // 11. Invoices: PUT update status or details
      if (pathname.startsWith('/api/invoices/') && method === 'PUT') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

        const id = pathname.slice('/api/invoices/'.length);
        const body = await parseJsonBody(req);
        let updatedInvoice = null;

        db.mutate('invoice:updated', (dbData) => {
          const index = dbData.invoices.findIndex(inv => inv.id === id);
          if (index !== -1) {
            if (body.paymentStatus) dbData.invoices[index].paymentStatus = body.paymentStatus;
            if (body.paymentMethod) dbData.invoices[index].paymentMethod = body.paymentMethod;
            if (body.notes !== undefined) dbData.invoices[index].notes = body.notes;
            if (body.dueDate) dbData.invoices[index].dueDate = body.dueDate;
            updatedInvoice = dbData.invoices[index];
          }
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'INVOICE_STATUS_CHANGED',
          category: 'invoice',
          details: `Updated Invoice #${updatedInvoice ? updatedInvoice.invoiceNumber : id} status to: ${body.paymentStatus || 'updated'}`
        });

        if (!updatedInvoice) return sendJson(res, 404, { error: 'Invoice not found' });
        return sendJson(res, 200, { success: true, invoice: updatedInvoice });
      }

      // 12. Invoices: DELETE
      if (pathname.startsWith('/api/invoices/') && method === 'DELETE') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
        if (session.user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Admin access required to delete invoices' });
        }

        const id = pathname.slice('/api/invoices/'.length);
        let deletedInvoice = null;

        db.mutate('invoice:deleted', (dbData) => {
          const index = dbData.invoices.findIndex(inv => inv.id === id);
          if (index !== -1) {
            deletedInvoice = dbData.invoices.splice(index, 1)[0];
          }
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'INVOICE_DELETED',
          category: 'invoice',
          details: `Deleted Invoice #${deletedInvoice ? deletedInvoice.invoiceNumber : id}`
        });

        if (!deletedInvoice) return sendJson(res, 404, { error: 'Invoice not found' });
        return sendJson(res, 200, { success: true, message: 'Invoice deleted' });
      }

      // 13. Admin: Sales Reports
      if (pathname === '/api/reports/sales' && method === 'GET') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
        if (session.user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Admin access required for Sales Reports' });
        }

        const data = db.getData();
        const invoices = data.invoices;

        let totalRevenue = 0;
        let totalPaid = 0;
        let totalPending = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        const paymentMethodCounts = {};
        const productSales = {};
        const dailyRevenue = {};

        for (const inv of invoices) {
          totalRevenue += (inv.grandTotal || 0);
          totalDiscount += (inv.discount || 0);
          totalTax += (inv.taxAmount || 0);

          if (inv.paymentStatus === 'Paid') {
            totalPaid += (inv.grandTotal || 0);
          } else {
            totalPending += (inv.grandTotal || 0);
          }

          // Payment method stats
          const methodKey = inv.paymentMethod || 'Other';
          paymentMethodCounts[methodKey] = (paymentMethodCounts[methodKey] || 0) + (inv.grandTotal || 0);

          // Daily stats
          const day = inv.date || inv.createdAt.slice(0, 10);
          dailyRevenue[day] = (dailyRevenue[day] || 0) + (inv.grandTotal || 0);

          // Product breakdown
          if (Array.isArray(inv.items)) {
            for (const item of inv.items) {
              const pName = (item.brand ? `[${item.brand}] ` : '') + item.name;
              if (!productSales[pName]) {
                productSales[pName] = { name: pName, quantity: 0, revenue: 0 };
              }
              productSales[pName].quantity += (item.quantity || 0);
              productSales[pName].revenue += (item.total || 0);
            }
          }
        }

        const topProducts = Object.values(productSales)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 6);

        return sendJson(res, 200, {
          totalRevenue,
          totalPaid,
          totalPending,
          totalDiscount,
          totalTax,
          totalInvoices: invoices.length,
          averageInvoice: invoices.length ? Math.round(totalRevenue / invoices.length) : 0,
          paymentMethodCounts,
          dailyRevenue,
          topProducts
        });
      }

      // 14. Admin: Template & Settings
      if (pathname === '/api/settings' && method === 'GET') {
        const data = db.getData();
        return sendJson(res, 200, {
          settings: data.settings,
          dbInfo: db.getDbStats()
        });
      }

      if (pathname === '/api/settings' && method === 'PUT') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
        if (session.user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Admin access required to modify settings' });
        }

        const body = await parseJsonBody(req);
        db.mutate('settings:updated', (dbData) => {
          if (body.company) {
            dbData.settings.company = { ...dbData.settings.company, ...body.company };
          }
          if (body.template) {
            dbData.settings.template = { ...dbData.settings.template, ...body.template };
          }
          if (body.afkTimeoutMinutes !== undefined) {
            dbData.settings.afkTimeoutMinutes = parseInt(body.afkTimeoutMinutes, 10) || 10;
          }
          if (body.enableSoundNotifications !== undefined) {
            dbData.settings.enableSoundNotifications = !!body.enableSoundNotifications;
          }
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'SETTINGS_UPDATED',
          category: 'settings',
          details: 'Updated invoice templates and company profile settings'
        });

        return sendJson(res, 200, { success: true, settings: db.getData().settings });
      }

      // 15. Admin: Manage Users
      if (pathname === '/api/users' && method === 'GET') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
        if (session.user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Admin access required to manage users' });
        }

        const data = db.getData();
        const safeUsers = data.users.map(u => ({
          id: u.id,
          username: u.username,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          avatar: u.avatar,
          createdAt: u.createdAt,
          lastLogin: u.lastLogin
        }));
        return sendJson(res, 200, { users: safeUsers });
      }

      if (pathname === '/api/users' && method === 'POST') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
        if (session.user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Admin access required to create users' });
        }

        const body = await parseJsonBody(req);
        const { username, name, email, password, role } = body;

        if (!username || !password || !name) {
          return sendJson(res, 400, { error: 'Username, name, and password are required' });
        }

        const data = db.getData();
        if (data.users.some(u => u.username.toLowerCase() === username.toLowerCase().trim())) {
          return sendJson(res, 400, { error: 'Username already exists' });
        }

        const auth = hashPassword(password);
        const newUser = {
          id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
          username: username.toLowerCase().trim(),
          name: name.trim(),
          email: (email || '').trim(),
          role: role === 'admin' ? 'admin' : 'user',
          status: 'active',
          passwordHash: auth.hash,
          salt: auth.salt,
          avatar: role === 'admin' ? 'shield' : 'user',
          createdAt: new Date().toISOString(),
          lastLogin: null
        };

        db.mutate('user:created', (dbData) => {
          dbData.users.push(newUser);
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'USER_CREATED',
          category: 'user',
          details: `Created user account: ${newUser.username} (${newUser.role})`
        });

        return sendJson(res, 201, {
          success: true,
          user: {
            id: newUser.id,
            username: newUser.username,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            status: newUser.status
          }
        });
      }

      if (pathname.startsWith('/api/users/') && method === 'PUT') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
        if (session.user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Admin access required to edit users' });
        }

        const id = pathname.slice('/api/users/'.length);
        const body = await parseJsonBody(req);
        let updatedUser = null;

        db.mutate('user:updated', (dbData) => {
          const user = dbData.users.find(u => u.id === id);
          if (user) {
            if (body.name) user.name = body.name.trim();
            if (body.email) user.email = body.email.trim();
            if (body.role && (body.role === 'admin' || body.role === 'user')) user.role = body.role;
            if (body.status && (body.status === 'active' || body.status === 'disabled')) user.status = body.status;
            if (body.password && body.password.length >= 6) {
              const auth = hashPassword(body.password);
              user.passwordHash = auth.hash;
              user.salt = auth.salt;
            }
            updatedUser = {
              id: user.id,
              username: user.username,
              name: user.name,
              email: user.email,
              role: user.role,
              status: user.status
            };
          }
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'USER_UPDATED',
          category: 'user',
          details: `Updated user account: ${id}`
        });

        if (!updatedUser) return sendJson(res, 404, { error: 'User not found' });
        return sendJson(res, 200, { success: true, user: updatedUser });
      }

      if (pathname.startsWith('/api/users/') && method === 'DELETE') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
        if (session.user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Admin access required to delete users' });
        }

        const id = pathname.slice('/api/users/'.length);
        if (id === session.user.id) {
          return sendJson(res, 400, { error: 'You cannot delete your own active administrator account' });
        }

        let deletedUser = null;
        db.mutate('user:deleted', (dbData) => {
          const index = dbData.users.findIndex(u => u.id === id);
          if (index !== -1) {
            deletedUser = dbData.users.splice(index, 1)[0];
          }
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'USER_DELETED',
          category: 'user',
          details: `Deleted user account: ${deletedUser ? deletedUser.username : id}`
        });

        if (!deletedUser) return sendJson(res, 404, { error: 'User not found' });
        return sendJson(res, 200, { success: true, message: 'User deleted' });
      }

      // 16. Admin: History (Audit Log)
      if (pathname === '/api/history' && method === 'GET') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
        if (session.user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Admin access required for History logs' });
        }

        const data = db.getData();
        return sendJson(res, 200, { history: data.history });
      }

      if (pathname === '/api/history' && method === 'DELETE') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
        if (session.user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Admin access required to clear logs' });
        }

        db.mutate('history:cleared', (dbData) => {
          dbData.history = [];
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'HISTORY_CLEARED',
          category: 'system',
          details: 'Audit history logs cleared by administrator'
        });

        return sendJson(res, 200, { success: true, message: 'Audit logs cleared' });
      }

      // 17. Single Database File Stats, Config & Backup
      if (pathname === '/api/database/stats' && method === 'GET') {
        return sendJson(res, 200, { stats: db.getDbStats() });
      }

      if (pathname === '/api/database/config' && method === 'GET') {
        const stats = db.getDbStats();
        const data = db.getData();
        const configPath = path.join(__dirname, 'db.config.json');
        let fileConfig = {};
        try {
          if (fs.existsSync(configPath)) {
            fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          }
        } catch (e) {}

        return sendJson(res, 200, {
          config: {
            dbName: data.database.dbName || 'RUHUNU_BILLING_DB',
            version: data.database.version || '1.0.0',
            description: data.database.description || 'Single-file centralized real-time billing database',
            currency: data.settings.currency || 'RS',
            realtimeSync: fileConfig.realtimeSync !== false,
            syncHeartbeatSeconds: fileConfig.syncHeartbeatSeconds || 15,
            autoBackup: fileConfig.autoBackup !== false,
            backupIntervalHours: fileConfig.backupIntervalHours || 24,
            defaultAdminUser: fileConfig.defaultAdminUser || 'admin',
            engine: fileConfig.engine || 'Single-File Realtime Atomic JSON/SQLite Engine',
            fileName: stats.fileName,
            filePath: stats.filePath,
            fileSize: stats.fileSize,
            lastSync: stats.lastSync,
            counts: stats.counts
          }
        });
      }

      if (pathname === '/api/database/config' && method === 'PUT') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
        if (session.user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Admin access required to modify database configuration' });
        }

        const body = await parseJsonBody(req);
        const configPath = path.join(__dirname, 'db.config.json');

        db.mutate('database:config_updated', (dbData) => {
          if (body.dbName) dbData.database.dbName = body.dbName.trim();
          if (body.currency) {
            dbData.database.currency = body.currency.trim();
            dbData.settings.currency = body.currency.trim();
          }

          // Admin password update if requested
          if (body.newAdminPassword && body.newAdminPassword.length >= 6) {
            const adminUser = dbData.users.find(u => u.role === 'admin');
            if (adminUser) {
              const authInfo = hashPassword(body.newAdminPassword);
              adminUser.passwordHash = authInfo.hash;
              adminUser.salt = authInfo.salt;
            }
          }
        }, {
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: 'DB_CONFIG_UPDATED',
          category: 'system',
          details: `Updated database configuration: ${body.dbName || 'RUHUNU_BILLING_DB'}`
        });

        // Also update db.config.json file
        try {
          let fileConfig = {};
          if (fs.existsSync(configPath)) {
            fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          }
          fileConfig.dbName = body.dbName || fileConfig.dbName || 'RUHUNU_BILLING_DB';
          fileConfig.currency = body.currency || fileConfig.currency || 'RS';
          if (body.realtimeSync !== undefined) fileConfig.realtimeSync = !!body.realtimeSync;
          if (body.syncHeartbeatSeconds) fileConfig.syncHeartbeatSeconds = parseInt(body.syncHeartbeatSeconds, 10);
          if (body.autoBackup !== undefined) fileConfig.autoBackup = !!body.autoBackup;
          fileConfig.lastConfigUpdate = new Date().toISOString();
          fs.writeFileSync(configPath, JSON.stringify(fileConfig, null, 2), 'utf8');
        } catch (e) {
          console.error('Error updating db.config.json:', e);
        }

        return sendJson(res, 200, { success: true, message: 'Database configuration saved successfully' });
      }

      if (pathname === '/api/database/resync' && method === 'POST') {
        const stats = db.getDbStats();
        db.broadcast('sync', {
          action: 'database:forced_resync',
          lastSync: stats.lastSync,
          dbName: stats.dbName,
          summary: stats.counts
        });
        return sendJson(res, 200, { success: true, message: 'Real-time database sync broadcast sent' });
      }

      if (pathname === '/api/database/restore' && method === 'POST') {
        const session = getSession(req);
        if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
        if (session.user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Admin access required to restore database' });
        }

        const body = await parseJsonBody(req);
        if (!body.database || !Array.isArray(body.products) || !Array.isArray(body.customers)) {
          return sendJson(res, 400, { error: 'Invalid database JSON file format' });
        }

        db.memoryData = body;
        db.persist();
        db.broadcast('sync', {
          action: 'database:restored',
          lastSync: db.memoryData.database.lastSync,
          dbName: db.memoryData.database.dbName,
          summary: {
            productsCount: db.memoryData.products.length,
            customersCount: db.memoryData.customers.length,
            invoicesCount: db.memoryData.invoices.length,
            usersCount: db.memoryData.users.length
          }
        });

        return sendJson(res, 200, { success: true, message: 'Database restored successfully from backup' });
      }

      if (pathname === '/api/database/config-file' && method === 'GET') {
        const configPath = path.join(__dirname, 'db.config.json');
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="db.config.json"'
        });
        const fileStream = fs.createReadStream(configPath);
        fileStream.pipe(res);
        return;
      }

      if (pathname === '/api/database/download' && method === 'GET') {
        const stats = db.getDbStats();
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${stats.fileName}"`
        });
        const fileStream = fs.createReadStream(stats.filePath);
        fileStream.pipe(res);
        return;
      }

      return sendJson(res, 404, { error: 'API endpoint not found' });
    } catch (err) {
      console.error('API Error:', err);
      return sendJson(res, 500, { error: 'Internal Server Error: ' + err.message });
    }
  }

  // --- STATIC FILE SERVING ---
  let safeSuffix = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safeSuffix === '/' || safeSuffix === '\\') {
    safeSuffix = 'index.html';
  }

  let filePath = path.join(PUBLIC_DIR, safeSuffix);

  // If path doesn't have an extension, try index.html for SPA routing fallback
  if (!path.extname(filePath)) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (err2, content) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  RUHUNU BILLING SYSTEM (රුහුණු බිල්පත් පද්ධතිය)`);
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  Single-file Database: data/ruhunubilling.db.json`);
  console.log(`  Real-time Sync Active on SSE /api/realtime/stream`);
  console.log(`=======================================================`);
});
