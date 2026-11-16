# 🌿 Ruhunu Billing System (රුහුණු බිල්පත් පද්ධතිය)

A next-generation, fully responsive, real-time billing and invoicing web application designed for retail, wholesale, and service businesses.

---

## ✨ Key Features

1. **📱 Automatic Device Resolution Adjustment**:
   - Ultra-responsive on desktop screens (1920x1080, 1440x900, 1366x768), tablets (iPad landscape & portrait), and mobile phones (iPhone, Android).
   - Off-canvas animated slide-in drawer on mobile devices with smooth backdrop blur.
   - Fluid grid systems, responsive data tables, and adaptive invoice preview.

2. **🟢 Single Database File with Real-Time Sync**:
   - Centralized in a single file: `data/ruhunubilling.db.json` containing database metadata, users, products, customers, invoices, templates, and audit history.
   - **Real-Time Synchronization**: Native Server-Sent Events (SSE) broadcast every change instantly across all open tabs, windows, and connected devices without page reloads.
   - Live visual status badge with pulsing green light: `🟢 Real-time DB Synced (Single DB: ruhunubilling.db.json)`.
   - Single-click database inspection and backup download.

3. **🎨 Emerald Green Theme, Dark & White (Light) Mode**:
   - Modern emerald green palette (`#059669` / `#10b981`), glassmorphism, soft card shadows, and smooth micro-animations.
   - One-click toggle between crisp White (Light) mode and deep Slate Dark mode.

4. **🌐 Bilingual Support: English & Sinhala (සිංහල)**:
   - Instant language toggle (English / සිංහල).
   - 100% complete translation of navigation menus, forms, tables, receipt terms, and system notifications.

5. **🔐 Multi-Role Account System (Admin & User)**:
   - **Admin Account**: Full access to all features including **Sales Report**, **Manage Template**, **Manage Users**, and **History (Audit Log)**.
   - **User Account (Cashier)**: Streamlined access to Dashboard, Create Invoice, Manage Invoices, Product Catalog, Customer Directory, and My Account.
   - **Default Credentials**:
     - **Admin**: `admin` / `admin123`
     - **User**: `user` / `user123`

6. **⏳ AFK & System Close Auto-Logout**:
   - **Inactivity (AFK) Detection**: Monitored via keyboard, mouse, scroll, and touch events. Pops up a 30-second countdown audio-visual warning modal before securely logging out.
   - **Window Close Detection**: `beforeunload` beacon logs session termination in the database audit log.
   - Manual **Logout** button in the sidebar and profile menu.

7. **📦 Product Management**:
   - Add, edit, and delete products with real-time stock tracking.
   - Fields: Name, Brand Name, Price in **RS**, Category, Stock Quantity, SKU, Description.
   - Currency strictly formatted as **RS** (e.g. `RS 48,500.00`).

8. **👥 Customer Management**:
   - Add, edit, and delete customer profiles.
   - Fields: Customer Name, Phone Number, Address, Email, Notes.
   - Quick-add customer modal directly accessible inside the invoice creation screen.

9. **🧾 Create Invoice & Brand Show/Hide Toggle**:
   - Auto-generated sequential invoice numbers (`INV-2026-0001`).
   - Line items with product search, quantity controls (+ / -), discounts, and unit prices.
   - **Brand Name Show / Hide Option**: Master toggle switch and per-line-item switches to show or hide the brand name (e.g. `[Samsung] Galaxy A15` vs `Galaxy A15`) on invoices and printed receipts.
   - Real-time Subtotal, Discount, Tax (%), and Grand Total calculation in **RS**.
   - Side-by-side **Live Printable Preview** updating dynamically as you type.
   - Supports **A4 Standard Invoices** and **80mm POS Thermal Receipts**.

10. **📊 Sales Report (Admin Only)**:
    - Filter by Today, This Week, This Month, This Year, or All Time.
    - Interactive SVG Daily Revenue Trend chart, payment method breakdown, and top-selling products table.
    - One-click **Export to CSV**.

11. **🎨 Invoice Template Customizer (Admin Only)**:
    - Choose template styles: Modern Emerald, Corporate Clean, Minimalist.
    - Customize Business Name (English & Sinhala), address, phone, email, registration / VAT number, and footer notes.
    - Live interactive template preview on the right side.

12. **🛡️ System Audit Log / History (Admin Only)**:
    - Real-time logging of user logins, invoice creation, product edits, customer changes, and settings updates.
    - Filter by category and search log text.

---

## 🚀 How to Run

### Method 1: Double-Click Startup
Double-click `start.bat` in the root folder. It will launch the server and open your browser at:
```
http://localhost:3000
```

### Method 2: Command Line
```bash
npm start
```
Then open [http://localhost:3000](http://localhost:3000) in any web browser.

---

## 📂 Project Structure

```
RUHUNU BILLING SYSTEM/
├── data/
│   └── ruhunubilling.db.json       <-- Single database file (users, products, customers, invoices, history)
├── public/
│   ├── css/
│   │   └── style.css               <-- Responsive design system (Emerald Green, Dark/Light, Print)
│   ├── js/
│   │   ├── icons.js                <-- Lucide SVG icon system
│   │   ├── i18n.js                 <-- English & Sinhala (සිංහල) dictionaries
│   │   ├── db-sync.js              <-- Server-Sent Events (SSE) real-time sync manager
│   │   ├── auth.js                 <-- Authentication, RBAC, AFK countdown & auto-logout
│   │   ├── products.js             <-- Product catalog management
│   │   ├── customers.js            <-- Customer directory management
│   │   ├── invoices.js             <-- Invoice creation, brand toggle, A4 & POS thermal print
│   │   ├── reports.js              <-- Sales report & SVG charts
│   │   ├── templates.js            <-- Invoice template customizer
│   │   ├── users.js                <-- Admin user accounts management
│   │   ├── history.js              <-- System audit history log
│   │   └── app.js                  <-- Master application orchestrator & notifications
│   └── index.html                  <-- Main responsive single-page application shell
├── db.js                           <-- Database atomic persistence & real-time broadcast engine
├── server.js                       <-- High-performance native HTTP & SSE real-time server
├── package.json
├── start.bat                       <-- One-click Windows launch script
└── README.md
```
