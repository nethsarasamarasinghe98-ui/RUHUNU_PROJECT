<?php
// ============================================================
// Live Web Hosting REST API for RUHUNU PRODUCTS Billing Suite
// Multi-Engine: SQLite (Zero-Config Default) | MySQL | JSON Fallback
// Works automatically on any shared hosting / cPanel / Apache / Nginx / PHP
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/db_config.php';
$pdo = getDbConnection();
$engine = getDbEngine();

// Determine requested route
$route = $_GET['route'] ?? '';
if (empty($route)) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (preg_match('#(?:/api/|api\.php/)(.+)#', $uri, $matches)) {
        $route = $matches[1];
    } elseif (preg_match('#/api$#', $uri)) {
        $route = 'data';
    }
}
$route = trim($route, '/');
$method = $_SERVER['REQUEST_METHOD'];

function getJsonInput() {
    $raw = file_get_contents('php://input');
    return !empty($raw) ? json_decode($raw, true) : [];
}

// Helper: Backup to database.json as human-readable backup
function syncToJson($data) {
    $jsonPath = __DIR__ . '/database.json';
    try {
        @file_put_contents($jsonPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    } catch (Exception $e) {}
}

// Helper: Read from database.json
function readFromJson() {
    $jsonPath = __DIR__ . '/database.json';
    if (file_exists($jsonPath)) {
        $raw = file_get_contents($jsonPath);
        $data = json_decode($raw, true);
        if (is_array($data)) return $data;
    }
    return [
        'users' => [
            ['id' => 'usr_admin_001', 'username' => 'admin', 'password' => 'password', 'role' => 'admin'],
            ['id' => 'usr_user_002', 'username' => 'user', 'password' => 'password', 'role' => 'user']
        ],
        'settings' => ['companyName' => 'RUHUNU PRODUCTS'],
        'products' => [],
        'customers' => [],
        'invoices' => [],
        'history' => [],
        'userSessions' => []
    ];
}

try {
    // ----------------------------------------------------
    // GET /api/status
    // ----------------------------------------------------
    if ($route === 'status' && $method === 'GET') {
        echo json_encode([
            'status' => 'ok',
            'engine' => $engine,
            'database' => $engine === 'sqlite' ? 'SQLite (database.sqlite)' : ($engine === 'mysql' ? 'MySQL Live' : 'JSON File Storage'),
            'time' => date('c')
        ]);
        exit;
    }

    // ----------------------------------------------------
    // GET /api/data (Full Data Load)
    // ----------------------------------------------------
    if (($route === 'data' || empty($route)) && $method === 'GET') {
        if ($engine === 'json' || !$pdo) {
            $jsonData = readFromJson();
            echo json_encode($jsonData);
            exit;
        }

        // 1. Users
        $users = $pdo->query("SELECT id, username, password, role FROM users ORDER BY id ASC")->fetchAll();
        if (empty($users)) {
            $pdo->exec("INSERT INTO users (id, username, password, role) VALUES ('usr_admin_001', 'admin', 'password', 'admin'), ('usr_user_002', 'user', 'password', 'user')");
            $users = $pdo->query("SELECT id, username, password, role FROM users ORDER BY id ASC")->fetchAll();
        }

        // 2. Settings
        $sRow = $pdo->query("SELECT * FROM settings WHERE id = 1")->fetch() ?: [];
        $settings = [
            'companyName' => $sRow['company_name'] ?? 'RUHUNU PRODUCTS',
            'sidebarSubtitle' => $sRow['sidebar_subtitle'] ?? 'Billing Suite',
            'logo' => $sRow['logo'] ?? 'ruhunu_logo.svg',
            'logoAnimated' => isset($sRow['logo_animated']) ? (bool)$sRow['logo_animated'] : true,
            'address' => '',
            'addressLine1' => $sRow['address_line1'] ?? '',
            'addressLine2' => $sRow['address_line2'] ?? '',
            'phone' => $sRow['phone'] ?? '',
            'mobileNumber' => $sRow['mobile_number'] ?? '',
            'whatsappNumber' => $sRow['whatsapp_number'] ?? '',
            'email' => $sRow['email'] ?? '',
            'footerNote' => $sRow['footer_note'] ?? 'Thank you for your business!',
            'termsInfo' => $sRow['terms_info'] ?? 'Please make cheques payable to Ruhunu Products.',
            'bankDetails' => [
                'bankName' => $sRow['bank_name'] ?? '',
                'accountName' => $sRow['account_name'] ?? '',
                'accountNumber' => $sRow['account_number'] ?? '',
                'branchName' => $sRow['branch_name'] ?? '',
                'position' => $sRow['bank_details_position'] ?? 'left',
            ],
            'theme' => $sRow['theme'] ?? 'light',
            'headerColor' => $sRow['header_color'] ?? '#16a34a',
            'logoSize' => isset($sRow['logo_size']) ? (int)$sRow['logo_size'] : 60,
            'watermarkImage' => $sRow['watermark_image'] ?? '',
            'watermarkSize' => isset($sRow['watermark_size']) ? (int)$sRow['watermark_size'] : 50,
            'watermarkOpacity' => isset($sRow['watermark_opacity']) ? (int)$sRow['watermark_opacity'] : 10,
            'logoPosition' => $sRow['logo_position'] ?? 'left',
            'companyDetailsAlignment' => $sRow['company_details_alignment'] ?? 'left',
            'emptyRowsCount' => isset($sRow['empty_rows_count']) ? (int)$sRow['empty_rows_count'] : 4,
            'margins' => [
                'top' => isset($sRow['margin_top']) ? (int)$sRow['margin_top'] : 0,
                'right' => isset($sRow['margin_right']) ? (int)$sRow['margin_right'] : 20,
                'bottom' => isset($sRow['margin_bottom']) ? (int)$sRow['margin_bottom'] : 20,
                'left' => isset($sRow['margin_left']) ? (int)$sRow['margin_left'] : 20,
            ],
            'invoiceNumberingMode' => $sRow['invoice_numbering_mode'] ?? 'auto',
            'autoStartNumber' => isset($sRow['auto_start_number']) ? (int)$sRow['auto_start_number'] : 1,
            'notificationsEnabled' => isset($sRow['notifications_enabled']) ? (bool)$sRow['notifications_enabled'] : true,
            'sealEnabled' => isset($sRow['seal_enabled']) ? (bool)$sRow['seal_enabled'] : true,
            'sealImage' => $sRow['seal_image'] ?? 'paid_stamp.png',
            'sealPosition' => $sRow['seal_position'] ?? 'top-right',
            'sealTop' => isset($sRow['seal_top']) ? (int)$sRow['seal_top'] : 16,
            'sealLeft' => isset($sRow['seal_left']) ? (int)$sRow['seal_left'] : 72,
            'sealRotation' => isset($sRow['seal_rotation']) ? (int)$sRow['seal_rotation'] : -15,
            'sealSize' => isset($sRow['seal_size']) ? (int)$sRow['seal_size'] : 150,
            'sealOpacity' => isset($sRow['seal_opacity']) ? (int)$sRow['seal_opacity'] : 88,
            'autoFitOnePage' => isset($sRow['auto_fit_one_page']) ? (bool)$sRow['auto_fit_one_page'] : true,
            'hideBankWhenPayments' => isset($sRow['hide_bank_when_payments']) ? (bool)$sRow['hide_bank_when_payments'] : false,
            'bottomStampText' => $sRow['bottom_stamp_text'] ?? 'Generated by {companyName}',
            'footerHorizontalAlign' => $sRow['footer_horizontal_align'] ?? 'space-between',
            'footerVerticalOffset' => isset($sRow['footer_vertical_offset']) ? (int)$sRow['footer_vertical_offset'] : 0,
            'footerHorizontalOffset' => isset($sRow['footer_horizontal_offset']) ? (int)$sRow['footer_horizontal_offset'] : 0,
            'footerShowDivider' => isset($sRow['footer_show_divider']) ? (bool)$sRow['footer_show_divider'] : true,
            'footerShowInvoiceNumber' => isset($sRow['footer_show_invoice_number']) ? (bool)$sRow['footer_show_invoice_number'] : true,
            'footerFontSize' => isset($sRow['footer_font_size']) ? (int)$sRow['footer_font_size'] : 11,
        ];

        // 3. Products
        $pRows = $pdo->query("SELECT id, code, name, price, COALESCE(brand, '') as brand FROM products ORDER BY name ASC")->fetchAll();
        $products = array_map(function($p) {
            return [
                'id' => $p['id'],
                'code' => $p['code'] ?? '',
                'name' => $p['name'],
                'brand' => $p['brand'] ?? '',
                'price' => (float)$p['price']
            ];
        }, $pRows);

        // 4. Customers
        $cRows = $pdo->query("SELECT id, name, phone, email, address_line1 as addressLine1, address_line2 as addressLine2 FROM customers ORDER BY name ASC")->fetchAll();
        $customers = array_map(function($c) {
            return [
                'id' => $c['id'],
                'name' => $c['name'],
                'phone' => $c['phone'] ?? '',
                'email' => $c['email'] ?? '',
                'addressLine1' => $c['addressLine1'] ?? '',
                'addressLine2' => $c['addressLine2'] ?? '',
            ];
        }, $cRows);

        // 5. Invoices with items & multiple payment records
        $iRows = $pdo->query("SELECT * FROM invoices ORDER BY date DESC")->fetchAll();
        $itemStmt = $pdo->prepare("SELECT product_id as productId, description, COALESCE(brand, '') as brand, COALESCE(show_brand, 0) as showBrand, qty, price FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC");
        
        $hasPaymentsTable = true;
        try {
            $paymentStmt = $pdo->prepare("SELECT id, amount, date, method, note FROM invoice_payments WHERE invoice_id = ? ORDER BY date ASC, id ASC");
        } catch (Exception $e) {
            $hasPaymentsTable = false;
        }

        $invoices = [];
        foreach ($iRows as $inv) {
            $itemStmt->execute([$inv['id']]);
            $rawItems = $itemStmt->fetchAll();
            $items = array_map(function($it) {
                return [
                    'productId' => $it['productId'] ?: '',
                    'description' => $it['description'] ?: '',
                    'brand' => $it['brand'] ?: '',
                    'showBrand' => (bool)$it['showBrand'],
                    'qty' => (float)$it['qty'],
                    'price' => (float)$it['price'],
                ];
            }, $rawItems);

            $payments = [];
            if ($hasPaymentsTable) {
                try {
                    $paymentStmt->execute([$inv['id']]);
                    $rawPayments = $paymentStmt->fetchAll();
                    $payments = array_map(function($p) {
                        return [
                            'id' => $p['id'],
                            'amount' => (float)$p['amount'],
                            'date' => $p['date'],
                            'method' => $p['method'] ?: 'Cash',
                            'note' => $p['note'] ?: ''
                        ];
                    }, $rawPayments);
                } catch (Exception $e) {}
            }
            if (empty($payments) && (float)$inv['amount_paid'] > 0) {
                $payments = [[
                    'id' => 'p_init_' . substr(md5($inv['id']), 0, 8),
                    'amount' => (float)$inv['amount_paid'],
                    'date' => $inv['date'],
                    'method' => 'Cash',
                    'note' => 'Initial payment'
                ]];
            }

            $invoices[] = [
                'id' => $inv['id'],
                'invoiceNumber' => $inv['invoice_number'],
                'customerId' => $inv['customer_id'] ?: '',
                'date' => $inv['date'],
                'shippingFee' => (float)$inv['shipping_fee'],
                'hideBankDetails' => (bool)$inv['hide_bank_details'],
                'subtotal' => (float)$inv['subtotal'],
                'taxRate' => (float)$inv['tax_rate'],
                'total' => (float)$inv['total'],
                'amountPaid' => (float)$inv['amount_paid'],
                'balance' => (float)$inv['balance'],
                'status' => $inv['status'] ?: 'Unpaid',
                'manualInvoiceNumber' => $inv['manual_invoice_number'] ?: '',
                'items' => $items,
                'payments' => $payments,
            ];
        }

        // 6. History
        $history = $pdo->query("SELECT id, action, details, user, date FROM activity_history ORDER BY date DESC LIMIT 200")->fetchAll();

        // 7. User Sessions
        $userSessions = [];
        try {
            $userSessions = $pdo->query("SELECT id, user_id as userId, username, login_time as loginTime, logout_time as logoutTime, duration_seconds as durationSeconds, is_online as isOnline, device FROM user_sessions ORDER BY login_time DESC LIMIT 100")->fetchAll();
        } catch (Exception $e) {}

        $fullPayload = [
            'users' => $users,
            'settings' => $settings,
            'products' => $products,
            'customers' => $customers,
            'invoices' => $invoices,
            'history' => $history,
            'userSessions' => $userSessions
        ];

        syncToJson($fullPayload);
        echo json_encode($fullPayload);
        exit;
    }

    // ----------------------------------------------------
    // POST /api/sync (Full Real-Time Synchronization)
    // ----------------------------------------------------
    if ($route === 'sync' && $method === 'POST') {
        $body = getJsonInput();
        if (empty($body)) {
            echo json_encode(['success' => false, 'error' => 'No JSON payload provided']);
            exit;
        }

        if ($engine === 'json' || !$pdo) {
            syncToJson($body);
            echo json_encode(['success' => true, 'engine' => 'json', 'message' => 'Synced to database.json backup successfully']);
            exit;
        }

        $isSqlite = ($engine === 'sqlite');

        // 1. Settings
        if (!empty($body['settings'])) {
            $s = $body['settings'];
            $b = $s['bankDetails'] ?? [];
            $m = $s['margins'] ?? [];

            if ($isSqlite) {
                $stmt = $pdo->prepare("
                    INSERT INTO settings (
                        id, company_name, sidebar_subtitle, logo, address_line1, address_line2, phone, mobile_number,
                        whatsapp_number, email, footer_note, terms_info, bank_name, account_name,
                        account_number, branch_name, bank_details_position, theme, header_color,
                        logo_size, watermark_image, watermark_size, watermark_opacity, logo_position,
                        company_details_alignment, empty_rows_count, margin_top, margin_right,
                        margin_bottom, margin_left, invoice_numbering_mode, auto_start_number,
                        notifications_enabled, logo_animated, seal_enabled, seal_image,
                        seal_position, seal_top, seal_left, seal_rotation, seal_size, seal_opacity,
                        auto_fit_one_page, hide_bank_when_payments,
                        bottom_stamp_text, footer_horizontal_align, footer_vertical_offset, footer_horizontal_offset,
                        footer_show_divider, footer_show_invoice_number, footer_font_size, updated_at
                    ) VALUES (
                        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
                    )
                    ON CONFLICT(id) DO UPDATE SET
                        company_name = excluded.company_name,
                        sidebar_subtitle = excluded.sidebar_subtitle,
                        logo = excluded.logo,
                        address_line1 = excluded.address_line1,
                        address_line2 = excluded.address_line2,
                        phone = excluded.phone,
                        mobile_number = excluded.mobile_number,
                        whatsapp_number = excluded.whatsapp_number,
                        email = excluded.email,
                        footer_note = excluded.footer_note,
                        terms_info = excluded.terms_info,
                        bank_name = excluded.bank_name,
                        account_name = excluded.account_name,
                        account_number = excluded.account_number,
                        branch_name = excluded.branch_name,
                        bank_details_position = excluded.bank_details_position,
                        theme = excluded.theme,
                        header_color = excluded.header_color,
                        logo_size = excluded.logo_size,
                        watermark_image = excluded.watermark_image,
                        watermark_size = excluded.watermark_size,
                        watermark_opacity = excluded.watermark_opacity,
                        logo_position = excluded.logo_position,
                        company_details_alignment = excluded.company_details_alignment,
                        empty_rows_count = excluded.empty_rows_count,
                        margin_top = excluded.margin_top,
                        margin_right = excluded.margin_right,
                        margin_bottom = excluded.margin_bottom,
                        margin_left = excluded.margin_left,
                        invoice_numbering_mode = excluded.invoice_numbering_mode,
                        auto_start_number = excluded.auto_start_number,
                        notifications_enabled = excluded.notifications_enabled,
                        logo_animated = excluded.logo_animated,
                        seal_enabled = excluded.seal_enabled,
                        seal_image = excluded.seal_image,
                        seal_position = excluded.seal_position,
                        seal_top = excluded.seal_top,
                        seal_left = excluded.seal_left,
                        seal_rotation = excluded.seal_rotation,
                        seal_size = excluded.seal_size,
                        seal_opacity = excluded.seal_opacity,
                        auto_fit_one_page = excluded.auto_fit_one_page,
                        hide_bank_when_payments = excluded.hide_bank_when_payments,
                        bottom_stamp_text = excluded.bottom_stamp_text,
                        footer_horizontal_align = excluded.footer_horizontal_align,
                        footer_vertical_offset = excluded.footer_vertical_offset,
                        footer_horizontal_offset = excluded.footer_horizontal_offset,
                        footer_show_divider = excluded.footer_show_divider,
                        footer_show_invoice_number = excluded.footer_show_invoice_number,
                        footer_font_size = excluded.footer_font_size,
                        updated_at = CURRENT_TIMESTAMP
                ");
            } else {
                $stmt = $pdo->prepare("
                    REPLACE INTO settings (
                        id, company_name, sidebar_subtitle, logo, address_line1, address_line2, phone, mobile_number,
                        whatsapp_number, email, footer_note, terms_info, bank_name, account_name,
                        account_number, branch_name, bank_details_position, theme, header_color,
                        logo_size, watermark_image, watermark_size, watermark_opacity, logo_position,
                        company_details_alignment, empty_rows_count, margin_top, margin_right,
                        margin_bottom, margin_left, invoice_numbering_mode, auto_start_number,
                        notifications_enabled, logo_animated, seal_enabled, seal_image,
                        seal_position, seal_top, seal_left, seal_rotation, seal_size, seal_opacity,
                        auto_fit_one_page, hide_bank_when_payments,
                        bottom_stamp_text, footer_horizontal_align, footer_vertical_offset, footer_horizontal_offset,
                        footer_show_divider, footer_show_invoice_number, footer_font_size
                    ) VALUES (
                        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )
                ");
            }

            $stmt->execute([
                $s['companyName'] ?? 'RUHUNU PRODUCTS',
                $s['sidebarSubtitle'] ?? 'Billing Suite',
                $s['logo'] ?? '',
                $s['addressLine1'] ?? '',
                $s['addressLine2'] ?? '',
                $s['phone'] ?? '',
                $s['mobileNumber'] ?? '',
                $s['whatsappNumber'] ?? '',
                $s['email'] ?? '',
                $s['footerNote'] ?? '',
                $s['termsInfo'] ?? '',
                $b['bankName'] ?? '',
                $b['accountName'] ?? '',
                $b['accountNumber'] ?? '',
                $b['branchName'] ?? '',
                $b['position'] ?? 'left',
                $s['theme'] ?? 'light',
                $s['headerColor'] ?? '#16a34a',
                (int)($s['logoSize'] ?? 60),
                $s['watermarkImage'] ?? '',
                (int)($s['watermarkSize'] ?? 50),
                (int)($s['watermarkOpacity'] ?? 10),
                $s['logoPosition'] ?? 'left',
                $s['companyDetailsAlignment'] ?? 'left',
                (int)($s['emptyRowsCount'] ?? 4),
                (int)($m['top'] ?? 0),
                (int)($m['right'] ?? 20),
                (int)($m['bottom'] ?? 20),
                (int)($m['left'] ?? 20),
                $s['invoiceNumberingMode'] ?? 'auto',
                (int)($s['autoStartNumber'] ?? 1),
                !empty($s['notificationsEnabled']) ? 1 : 0,
                !empty($s['logoAnimated']) ? 1 : 0,
                !empty($s['sealEnabled']) ? 1 : 0,
                $s['sealImage'] ?? 'paid_stamp.png',
                $s['sealPosition'] ?? 'top-right',
                isset($s['sealTop']) ? (int)$s['sealTop'] : 16,
                isset($s['sealLeft']) ? (int)$s['sealLeft'] : 72,
                isset($s['sealRotation']) ? (int)$s['sealRotation'] : -15,
                isset($s['sealSize']) ? (int)$s['sealSize'] : 150,
                isset($s['sealOpacity']) ? (int)$s['sealOpacity'] : 88,
                !empty($s['autoFitOnePage']) ? 1 : 0,
                !empty($s['hideBankWhenPayments']) ? 1 : 0,
                $s['bottomStampText'] ?? 'Generated by {companyName}',
                $s['footerHorizontalAlign'] ?? 'space-between',
                isset($s['footerVerticalOffset']) ? (int)$s['footerVerticalOffset'] : 0,
                isset($s['footerHorizontalOffset']) ? (int)$s['footerHorizontalOffset'] : 0,
                isset($s['footerShowDivider']) && !$s['footerShowDivider'] ? 0 : 1,
                isset($s['footerShowInvoiceNumber']) && !$s['footerShowInvoiceNumber'] ? 0 : 1,
                isset($s['footerFontSize']) ? (int)$s['footerFontSize'] : 11
            ]);
        }

        // 2. Customers
        if (isset($body['customers']) && is_array($body['customers'])) {
            $cStmt = $isSqlite
                ? $pdo->prepare("INSERT INTO customers (id, name, phone, email, address_line1, address_line2) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, email=excluded.email, address_line1=excluded.address_line1, address_line2=excluded.address_line2")
                : $pdo->prepare("REPLACE INTO customers (id, name, phone, email, address_line1, address_line2) VALUES (?, ?, ?, ?, ?, ?)");
            foreach ($body['customers'] as $c) {
                if (!empty($c['id'])) {
                    $cStmt->execute([
                        $c['id'], $c['name'] ?? '', $c['phone'] ?? '', $c['email'] ?? '',
                        $c['addressLine1'] ?? '', $c['addressLine2'] ?? ''
                    ]);
                }
            }
        }

        // 3. Products
        if (isset($body['products']) && is_array($body['products'])) {
            $pStmt = $isSqlite
                ? $pdo->prepare("INSERT INTO products (id, code, name, brand, price) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET code=excluded.code, name=excluded.name, brand=excluded.brand, price=excluded.price")
                : $pdo->prepare("REPLACE INTO products (id, code, name, brand, price) VALUES (?, ?, ?, ?, ?)");
            foreach ($body['products'] as $p) {
                if (!empty($p['id'])) {
                    $pStmt->execute([
                        $p['id'], $p['code'] ?? '', $p['name'] ?? '', $p['brand'] ?? '', (float)($p['price'] ?? 0)
                    ]);
                }
            }
        }

        // 4. Invoices & Items & Multiple Payments
        if (isset($body['invoices']) && is_array($body['invoices'])) {
            $invStmt = $isSqlite
                ? $pdo->prepare("INSERT INTO invoices (id, invoice_number, customer_id, date, shipping_fee, hide_bank_details, subtotal, tax_rate, total, amount_paid, balance, status, manual_invoice_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET invoice_number=excluded.invoice_number, customer_id=excluded.customer_id, date=excluded.date, shipping_fee=excluded.shipping_fee, hide_bank_details=excluded.hide_bank_details, subtotal=excluded.subtotal, tax_rate=excluded.tax_rate, total=excluded.total, amount_paid=excluded.amount_paid, balance=excluded.balance, status=excluded.status, manual_invoice_number=excluded.manual_invoice_number")
                : $pdo->prepare("REPLACE INTO invoices (id, invoice_number, customer_id, date, shipping_fee, hide_bank_details, subtotal, tax_rate, total, amount_paid, balance, status, manual_invoice_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            $delItemsStmt = $pdo->prepare("DELETE FROM invoice_items WHERE invoice_id = ?");
            $insItemStmt = $pdo->prepare("INSERT INTO invoice_items (invoice_id, product_id, description, brand, show_brand, qty, price) VALUES (?, ?, ?, ?, ?, ?, ?)");

            $delPaymentsStmt = $pdo->prepare("DELETE FROM invoice_payments WHERE invoice_id = ?");
            $insPaymentStmt = $pdo->prepare("INSERT INTO invoice_payments (id, invoice_id, amount, date, method, note) VALUES (?, ?, ?, ?, ?, ?)");

            foreach ($body['invoices'] as $inv) {
                if (empty($inv['id'])) continue;
                $custId = !empty($inv['customerId']) ? $inv['customerId'] : null;

                $totalPaid = (float)($inv['amountPaid'] ?? 0);
                if (!empty($inv['payments']) && is_array($inv['payments'])) {
                    $totalPaid = array_reduce($inv['payments'], function($sum, $p) {
                        return $sum + (float)($p['amount'] ?? 0);
                    }, 0.0);
                }
                $balance = (float)($inv['total'] ?? 0) - $totalPaid;
                $status = $inv['status'] ?? 'Unpaid';
                if ($balance <= 0 && (float)($inv['total'] ?? 0) > 0) {
                    $status = 'Paid';
                } elseif ($totalPaid > 0 && $balance > 0) {
                    $status = 'Partial';
                }

                $invStmt->execute([
                    $inv['id'], $inv['invoiceNumber'], $custId, $inv['date'],
                    (float)($inv['shippingFee'] ?? 0), !empty($inv['hideBankDetails']) ? 1 : 0,
                    (float)($inv['subtotal'] ?? 0), (float)($inv['taxRate'] ?? 0),
                    (float)($inv['total'] ?? 0), $totalPaid,
                    $balance, $status,
                    $inv['manualInvoiceNumber'] ?? ''
                ]);

                // Replace items
                $delItemsStmt->execute([$inv['id']]);
                if (!empty($inv['items']) && is_array($inv['items'])) {
                    foreach ($inv['items'] as $it) {
                        if (!empty($it['productId']) || !empty($it['description'])) {
                            $insItemStmt->execute([
                                $inv['id'], $it['productId'] ?: null, $it['description'] ?? '',
                                $it['brand'] ?? '', !empty($it['showBrand']) ? 1 : 0,
                                (float)($it['qty'] ?? 1), (float)($it['price'] ?? 0)
                            ]);
                        }
                    }
                }

                // Replace multiple payments
                $delPaymentsStmt->execute([$inv['id']]);
                if (!empty($inv['payments']) && is_array($inv['payments'])) {
                    foreach ($inv['payments'] as $p) {
                        $pAmt = (float)($p['amount'] ?? 0);
                        if ($pAmt > 0 || !empty($p['note'])) {
                            $pId = !empty($p['id']) ? $p['id'] : ('p_' . substr(md5(uniqid()), 0, 9));
                            $insPaymentStmt->execute([
                                $pId, $inv['id'], $pAmt, $p['date'] ?? $inv['date'],
                                $p['method'] ?? 'Cash', $p['note'] ?? ''
                            ]);
                        }
                    }
                }
            }
        }

        // 5. Users
        if (isset($body['users']) && is_array($body['users'])) {
            $uStmt = $isSqlite
                ? $pdo->prepare("INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET username=excluded.username, password=excluded.password, role=excluded.role")
                : $pdo->prepare("REPLACE INTO users (id, username, password, role) VALUES (?, ?, ?, ?)");
            foreach ($body['users'] as $u) {
                if (!empty($u['id'])) {
                    $uStmt->execute([$u['id'], $u['username'], $u['password'], $u['role'] ?? 'user']);
                }
            }
        }

        // 6. User Sessions
        if (isset($body['userSessions']) && is_array($body['userSessions'])) {
            $sStmt = $isSqlite
                ? $pdo->prepare("INSERT INTO user_sessions (id, user_id, username, login_time, logout_time, duration_seconds, is_online, device) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET logout_time=excluded.logout_time, duration_seconds=excluded.duration_seconds, is_online=excluded.is_online")
                : $pdo->prepare("REPLACE INTO user_sessions (id, user_id, username, login_time, logout_time, duration_seconds, is_online, device) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($body['userSessions'] as $sess) {
                if (!empty($sess['id'])) {
                    $sStmt->execute([
                        $sess['id'], $sess['userId'] ?? null, $sess['username'] ?? 'User',
                        $sess['loginTime'] ?? date('Y-m-d H:i:s'), $sess['logoutTime'] ?? null,
                        (int)($sess['durationSeconds'] ?? 0), !empty($sess['isOnline']) ? 1 : 0,
                        $sess['device'] ?? 'Desktop'
                    ]);
                }
            }
        }

        // Sync backup to database.json
        syncToJson($body);

        echo json_encode([
            'success' => true,
            'engine' => $engine,
            'message' => 'Data synced and saved permanently to ' . ($engine === 'sqlite' ? 'SQLite' : 'MySQL') . ' & database.json'
        ]);
        exit;
    }

    // Granular Endpoints
    if (strpos($route, 'customers') === 0 && $method === 'DELETE') {
        $parts = explode('/', $route);
        $id = end($parts);
        if ($pdo) {
            $stmt = $pdo->prepare("DELETE FROM customers WHERE id = ?");
            $stmt->execute([$id]);
        }
        echo json_encode(['success' => true, 'id' => $id]);
        exit;
    }

    if (strpos($route, 'products') === 0 && $method === 'DELETE') {
        $parts = explode('/', $route);
        $id = end($parts);
        if ($pdo) {
            $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$id]);
        }
        echo json_encode(['success' => true, 'id' => $id]);
        exit;
    }

    if (strpos($route, 'invoices') === 0 && $method === 'DELETE') {
        $parts = explode('/', $route);
        $id = end($parts);
        if ($pdo) {
            try { $pdo->prepare("DELETE FROM invoice_payments WHERE invoice_id = ?")->execute([$id]); } catch (Exception $e) {}
            try { $pdo->prepare("DELETE FROM invoice_items WHERE invoice_id = ?")->execute([$id]); } catch (Exception $e) {}
            $pdo->prepare("DELETE FROM invoices WHERE id = ?")->execute([$id]);
        }
        echo json_encode(['success' => true, 'id' => $id]);
        exit;
    }

    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found: ' . $route]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'engine' => $engine,
        'hint' => 'Database operation error. Check database permissions.'
    ]);
}
