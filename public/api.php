<?php
/**
 * DailyVoice (صدای پرسنل) - PHP REST API Server (SQLite3 Version)
 * این فایل به عنوان بک‌اند کامل پروژه در هاست‌های اشتراکی سی‌پنل (cPanel) یا هر هاست PHP کار می‌کند.
 * تمام درخواست‌های /api/* با استفاده از فایل .htaccess به این فایل بازنویسی (Rewrite) می‌شوند.
 * دیتابیس به صورت خودکار در مسیر data/db.sqlite ایجاد و با بالاترین کارایی مدیریت می‌شود.
 */

// ۱. تنظیم هدرهای CORS برای ارتباط بدون مشکل مرورگر
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Personnel-Code");
header("Content-Type: application/json; charset=UTF-8");

// مدیریت درخواست‌های مقدماتی مرورگر (Preflight Options Request)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ۲. تنظیمات مسیرها و فایل دیتابیس SQLite
$dbDir = __DIR__ . '/data';
$dbFile = $dbDir . '/db.sqlite';

// ایجاد پوشه دیتابیس با دسترسی‌های مناسب در صورت عدم وجود
if (!file_exists($dbDir)) {
    mkdir($dbDir, 0755, true);
}

// ۳. داده‌های اولیه (Seed Data) در صورت خام بودن سیستم
$initialEmployees = [
    [
        "id" => "emp-1",
        "personnelCode" => "12345",
        "nationalCode" => "0012345678",
        "fullName" => "علی رضایی",
        "storeBranch" => "شعبه صادقیه - دیلی مارکت",
        "role" => "صندوق‌دار",
        "createdAt" => date('c')
    ],
    [
        "id" => "emp-2",
        "personnelCode" => "54321",
        "nationalCode" => "0087654321",
        "fullName" => "سارا احمدی",
        "storeBranch" => "شعبه پاسداران - دیلی مارکت",
        "role" => "مسئول چیدمان",
        "createdAt" => date('c')
    ],
    [
        "id" => "emp-3",
        "personnelCode" => "99999",
        "nationalCode" => "1111111111",
        "fullName" => "محمود کریمی",
        "storeBranch" => "شعبه نیاوران - دیلی مارکت",
        "role" => "سرپرست فروشگاه",
        "createdAt" => date('c')
    ]
];

$initialTickets = [
    [
        "id" => "DV-7832",
        "title" => "رفتار نامناسب سرپرست شیفت",
        "category" => "آزار کلامی و روانی",
        "subcategory" => "فشار روانی و ایجاد محیط کار سمی",
        "description" => "متاسفانه سرپرست شیفت عصر در شعبه صادقیه با لحن بسیار تند و تحقیرآمیز با پرسنل رفتار می‌کند و تهدید به جریمه‌های بی‌مورد می‌کند.",
        "status" => "unread",
        "confidential" => true,
        "isAnonymous" => false,
        "personnelCode" => "12345",
        "employeeName" => "علی رضایی",
        "storeBranch" => "شعبه صادقیه - دیلی مارکت",
        "createdAt" => date('c', time() - 3 * 24 * 3600),
        "updatedAt" => date('c', time() - 3 * 24 * 3600),
        "messages" => [
            [
                "id" => "m-1",
                "sender" => "user",
                "senderName" => "علی رضایی",
                "text" => "متاسفانه سرپرست شیفت عصر در شعبه صادقیه با لحن بسیار تند و تحقیرآمیز با پرسنل رفتار می‌کند و تهدید به جریمه‌های بی‌مورد می‌کند.",
                "createdAt" => date('c', time() - 3 * 24 * 3600)
            ]
        ],
        "internalNotes" => [
            [
                "id" => "n-1",
                "author" => "سیستم",
                "text" => "تیکت ثبت شده توسط کارمند رسمی. فیلد محرمانه فعال است.",
                "createdAt" => date('c', time() - 3 * 24 * 3600)
            ]
        ],
        "aiSummary" => "گزارش رفتار نامناسب و تحقیرآمیز سرپرست شیفت عصر در شعبه صادقیه و تهدید پرسنل به جریمه‌های غیرقانونی.",
        "aiSuggestedReply" => "جناب آقای رضایی با سلام، گزارش شما با حفظ کامل محرمانگی ثبت شد. موضوع رفتار سرپرست شیفت عصر شعبه صادقیه توسط مدیریت بازرسی دیلی مارکت پیگیری خواهد شد و اقدامات لازم جهت اصلاح رفتار یا تغییر شیفت صورت می‌پذیرد. از شجاعت شما در مطرح کردن این موضوع سپاسگزاریم."
    ]
];

// ۴. دریافت یا ایجاد اتصال به دیتابیس SQLite
function getDB($dbFile, $initialEmployees, $initialTickets) {
    $db = new SQLite3($dbFile);
    $db->busyTimeout(5000); // جلوگیری از قفل شدن همزمان دیتابیس در هاست
    
    // ایجاد جدول پرسنل
    $db->exec("CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        personnelCode TEXT UNIQUE,
        nationalCode TEXT,
        fullName TEXT,
        storeBranch TEXT,
        role TEXT,
        phone TEXT,
        department TEXT,
        employmentDate TEXT,
        birthDate TEXT,
        createdAt TEXT
    )");
    
    // ایجاد جدول تیکت‌ها
    $db->exec("CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        title TEXT,
        category TEXT,
        subcategory TEXT,
        description TEXT,
        status TEXT,
        confidential INTEGER,
        isAnonymous INTEGER,
        personnelCode TEXT,
        employeeName TEXT,
        storeBranch TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        messages TEXT,
        internalNotes TEXT,
        aiSummary TEXT,
        aiSuggestedReply TEXT
    )");
    
    // ایجاد جدول نوتیفیکیشن‌ها
    $db->exec("CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT,
        ticketId TEXT,
        ticketTitle TEXT,
        message TEXT,
        isRead INTEGER,
        createdAt TEXT
    )");
    
    // ایندکس‌گذاری برای سرعت بسیار بالا روی حجم بالای داده‌ها (مانند ۷۰۰۰ کارمند)
    $db->exec("CREATE INDEX IF NOT EXISTS idx_emp_code ON employees (personnelCode)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_emp_national ON employees (nationalCode)");
    
    // بررسی و ثبت داده‌های پیش‌فرض پرسنل
    $count = $db->querySingle("SELECT COUNT(*) FROM employees");
    if ($count == 0) {
        $db->exec("BEGIN TRANSACTION");
        foreach ($initialEmployees as $emp) {
            $stmt = $db->prepare("INSERT INTO employees (id, personnelCode, nationalCode, fullName, storeBranch, role, createdAt) VALUES (:id, :pcode, :ncode, :fname, :branch, :role, :created)");
            $stmt->bindValue(':id', $emp['id'], SQLITE3_TEXT);
            $stmt->bindValue(':pcode', $emp['personnelCode'], SQLITE3_TEXT);
            $stmt->bindValue(':ncode', $emp['nationalCode'], SQLITE3_TEXT);
            $stmt->bindValue(':fname', $emp['fullName'], SQLITE3_TEXT);
            $stmt->bindValue(':branch', $emp['storeBranch'], SQLITE3_TEXT);
            $stmt->bindValue(':role', $emp['role'], SQLITE3_TEXT);
            $stmt->bindValue(':created', $emp['createdAt'], SQLITE3_TEXT);
            $stmt->execute();
        }
        $db->exec("COMMIT");
    }
    
    // بررسی و ثبت داده‌های پیش‌فرض تیکت‌ها
    $ticketCount = $db->querySingle("SELECT COUNT(*) FROM tickets");
    if ($ticketCount == 0) {
        $db->exec("BEGIN TRANSACTION");
        foreach ($initialTickets as $t) {
            $stmt = $db->prepare("INSERT INTO tickets (id, title, category, subcategory, description, status, confidential, isAnonymous, personnelCode, employeeName, storeBranch, createdAt, updatedAt, messages, internalNotes, aiSummary, aiSuggestedReply) VALUES (:id, :title, :category, :subcat, :desc, :status, :conf, :anon, :pcode, :ename, :branch, :created, :updated, :messages, :notes, :aisum, :aireply)");
            $stmt->bindValue(':id', $t['id'], SQLITE3_TEXT);
            $stmt->bindValue(':title', $t['title'], SQLITE3_TEXT);
            $stmt->bindValue(':category', $t['category'], SQLITE3_TEXT);
            $stmt->bindValue(':subcat', $t['subcategory'], SQLITE3_TEXT);
            $stmt->bindValue(':desc', $t['description'], SQLITE3_TEXT);
            $stmt->bindValue(':status', $t['status'], SQLITE3_TEXT);
            $stmt->bindValue(':conf', $t['confidential'] ? 1 : 0, SQLITE3_INTEGER);
            $stmt->bindValue(':anon', $t['isAnonymous'] ? 1 : 0, SQLITE3_INTEGER);
            $stmt->bindValue(':pcode', isset($t['personnelCode']) ? $t['personnelCode'] : null, SQLITE3_TEXT);
            $stmt->bindValue(':ename', isset($t['employeeName']) ? $t['employeeName'] : null, SQLITE3_TEXT);
            $stmt->bindValue(':branch', isset($t['storeBranch']) ? $t['storeBranch'] : null, SQLITE3_TEXT);
            $stmt->bindValue(':created', $t['createdAt'], SQLITE3_TEXT);
            $stmt->bindValue(':updated', $t['updatedAt'], SQLITE3_TEXT);
            $stmt->bindValue(':messages', json_encode($t['messages'], JSON_UNESCAPED_UNICODE), SQLITE3_TEXT);
            $stmt->bindValue(':notes', json_encode($t['internalNotes'], JSON_UNESCAPED_UNICODE), SQLITE3_TEXT);
            $stmt->bindValue(':aisum', isset($t['aiSummary']) ? $t['aiSummary'] : null, SQLITE3_TEXT);
            $stmt->bindValue(':aireply', isset($t['aiSuggestedReply']) ? $t['aiSuggestedReply'] : null, SQLITE3_TEXT);
            $stmt->execute();
        }
        $db->exec("COMMIT");
    }
    
    return $db;
}

$db = getDB($dbFile, $initialEmployees, $initialTickets);

// ثبت نوتیفیکیشن جدید در سیستم
function pushNotification($db, $type, $ticketId, $ticketTitle, $message) {
    $notifId = "notif-" . round(microtime(true) * 1000) . "-" . rand(100, 999);
    $stmt = $db->prepare("INSERT INTO notifications (id, type, ticketId, ticketTitle, message, isRead, createdAt) VALUES (:id, :type, :tid, :ttitle, :msg, 0, :created)");
    $stmt->bindValue(':id', $notifId, SQLITE3_TEXT);
    $stmt->bindValue(':type', $type, SQLITE3_TEXT);
    $stmt->bindValue(':tid', $ticketId, SQLITE3_TEXT);
    $stmt->bindValue(':ttitle', $ticketTitle, SQLITE3_TEXT);
    $stmt->bindValue(':msg', $message, SQLITE3_TEXT);
    $stmt->bindValue(':created', date('c'), SQLITE3_TEXT);
    $stmt->execute();
}

// تولید کد رهگیری پرونده
function generateTrackingCode($db) {
    $isUnique = false;
    $code = "";
    while (!$isUnique) {
        $num = rand(1000, 9999);
        $code = "DV-" . $num;
        
        $stmt = $db->prepare("SELECT COUNT(*) FROM tickets WHERE id = :id");
        $stmt->bindValue(':id', $code, SQLITE3_TEXT);
        $res = $stmt->execute();
        $count = $res->fetchArray(SQLITE3_NUM)[0];
        if ($count == 0) {
            $isUnique = true;
        }
    }
    return $code;
}

// ۵. تجزیه و تحلیل مسیر (Routing) و متد درخواست
$route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';
$method = $_SERVER['REQUEST_METHOD'];

// دریافت اطلاعات ارسالی کلاینت (JSON Body)
$input = [];
if ($method === 'POST' || $method === 'PUT') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];
}

// --- مسیرهای API (Routing Switch) ---

// ورود پرسنل و ادمین
if ($route === 'auth/login' && $method === 'POST') {
    $role = isset($input['role']) ? $input['role'] : '';
    
    if ($role === 'admin') {
        $username = isset($input['username']) ? $input['username'] : '';
        $password = isset($input['password']) ? $input['password'] : '';
        
        if ($username === 'admin' && $password === 'admin123') {
            echo json_encode([
                "success" => true,
                "user" => ["role" => "admin", "fullName" => "مدیر ارشد بازرسی دیلی مارکت"]
            ]);
            exit();
        }
        
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "نام کاربری یا کلمه عبور مدیریت اشتباه است."]);
        exit();
    }
    
    if ($role === 'employee') {
        $personnelCode = isset($input['personnelCode']) ? trim($input['personnelCode']) : '';
        $nationalCode = isset($input['nationalCode']) ? trim($input['nationalCode']) : '';
        
        $stmt = $db->prepare("SELECT * FROM employees WHERE personnelCode = :pcode AND nationalCode = :ncode");
        $stmt->bindValue(':pcode', $personnelCode, SQLITE3_TEXT);
        $stmt->bindValue(':ncode', $nationalCode, SQLITE3_TEXT);
        $res = $stmt->execute();
        $employee = $res->fetchArray(SQLITE3_ASSOC);
        
        if ($employee) {
            echo json_encode([
                "success" => true,
                "user" => [
                    "role" => "employee",
                    "fullName" => $employee['fullName'],
                    "personnelCode" => $employee['personnelCode'],
                    "storeBranch" => $employee['storeBranch'],
                    "employeeRole" => isset($employee['role']) ? $employee['role'] : 'پرسنل'
                ]
            ]);
            exit();
        }
        
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "پرسنلی با این مشخصات یافت نشد. کد پرسنلی یا کد ملی اشتباه است."]);
        exit();
    }
    
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "درخواست نامعتبر است."]);
    exit();
}

// دریافت لیست کارکنان با پشتیبانی از سرچ و صفحه‌بندی برای تعداد بالا (مثال: ۷۰۰۰ رکورد)
elseif ($route === 'employees' && $method === 'GET') {
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 0; // مقدار 0 یعنی همه‌اش برگشت داده شود
    
    if ($page < 1) $page = 1;
    
    $whereClause = "";
    if ($search !== "") {
        $whereClause = " WHERE personnelCode LIKE :search OR fullName LIKE :search OR nationalCode LIKE :search OR storeBranch LIKE :search OR role LIKE :search";
    }
    
    // شمارش کل پرسنل طبق فیلتر جستجو
    $countQuery = "SELECT COUNT(*) FROM employees" . $whereClause;
    $stmtCount = $db->prepare($countQuery);
    if ($search !== "") {
        $stmtCount->bindValue(':search', '%' . $search . '%', SQLITE3_TEXT);
    }
    $totalCount = $stmtCount->execute()->fetchArray(SQLITE3_NUM)[0];
    
    // گرفتن لیست صفحه
    $selectQuery = "SELECT * FROM employees" . $whereClause . " ORDER BY personnelCode ASC";
    if ($limit > 0) {
        $offset = ($page - 1) * $limit;
        $selectQuery .= " LIMIT {$limit} OFFSET {$offset}";
    }
    
    $stmtSelect = $db->prepare($selectQuery);
    if ($search !== "") {
        $stmtSelect->bindValue(':search', '%' . $search . '%', SQLITE3_TEXT);
    }
    $res = $stmtSelect->execute();
    
    $list = [];
    while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
        $list[] = $row;
    }
    
    // جهت حفظ سازگاری کامل با فرانت‌اند قبلی و جدید
    if ($limit > 0) {
        echo json_encode([
            "employees" => $list,
            "total" => $totalCount,
            "page" => $page,
            "limit" => $limit
        ]);
    } else {
        echo json_encode($list);
    }
    exit();
}

// تعریف پرسنل جدید (ادمین)
elseif ($route === 'employees' && $method === 'POST') {
    $personnelCode = isset($input['personnelCode']) ? trim($input['personnelCode']) : '';
    $nationalCode = isset($input['nationalCode']) ? trim($input['nationalCode']) : '';
    $fullName = isset($input['fullName']) ? trim($input['fullName']) : '';
    $storeBranch = isset($input['storeBranch']) ? trim($input['storeBranch']) : '';
    $role = isset($input['role']) ? trim($input['role']) : '';
    $phone = isset($input['phone']) ? trim($input['phone']) : '';
    $department = isset($input['department']) ? trim($input['department']) : '';

    if (!$personnelCode || !$nationalCode || !$fullName) {
        http_response_code(400);
        echo json_encode(["error" => "کد پرسنلی، کد ملی و نام کامل الزامی هستند."]);
        exit();
    }

    // بررسی تکراری نبودن
    $checkStmt = $db->prepare("SELECT COUNT(*) FROM employees WHERE personnelCode = :pcode");
    $checkStmt->bindValue(':pcode', $personnelCode, SQLITE3_TEXT);
    $exists = $checkStmt->execute()->fetchArray(SQLITE3_NUM)[0];
    if ($exists > 0) {
        http_response_code(400);
        echo json_encode(["error" => "کد پرسنلی تکراری است."]);
        exit();
    }

    $empId = "emp-" . round(microtime(true) * 1000);
    $newEmployee = [
        "id" => $empId,
        "personnelCode" => $personnelCode,
        "nationalCode" => $nationalCode,
        "fullName" => $fullName,
        "storeBranch" => $storeBranch ?: "کلیه شعب دیلی مارکت",
        "role" => $role ?: "پرسنل فروشگاه",
        "phone" => $phone,
        "department" => $department,
        "createdAt" => date('c')
    ];

    $stmt = $db->prepare("INSERT INTO employees (id, personnelCode, nationalCode, fullName, storeBranch, role, phone, department, createdAt) VALUES (:id, :pcode, :ncode, :fname, :branch, :role, :phone, :dept, :created)");
    $stmt->bindValue(':id', $newEmployee['id'], SQLITE3_TEXT);
    $stmt->bindValue(':pcode', $newEmployee['personnelCode'], SQLITE3_TEXT);
    $stmt->bindValue(':ncode', $newEmployee['nationalCode'], SQLITE3_TEXT);
    $stmt->bindValue(':fname', $newEmployee['fullName'], SQLITE3_TEXT);
    $stmt->bindValue(':branch', $newEmployee['storeBranch'], SQLITE3_TEXT);
    $stmt->bindValue(':role', $newEmployee['role'], SQLITE3_TEXT);
    $stmt->bindValue(':phone', $newEmployee['phone'], SQLITE3_TEXT);
    $stmt->bindValue(':dept', $newEmployee['department'], SQLITE3_TEXT);
    $stmt->bindValue(':created', $newEmployee['createdAt'], SQLITE3_TEXT);
    $stmt->execute();

    http_response_code(201);
    echo json_encode($newEmployee);
    exit();
}

// حذف کارمند (ادمین)
elseif (preg_match('/^employees\/([^\/]+)$/', $route, $matches) && $method === 'DELETE') {
    $empId = $matches[1];
    
    $checkStmt = $db->prepare("SELECT COUNT(*) FROM employees WHERE id = :id");
    $checkStmt->bindValue(':id', $empId, SQLITE3_TEXT);
    $exists = $checkStmt->execute()->fetchArray(SQLITE3_NUM)[0];

    if ($exists == 0) {
        http_response_code(404);
        echo json_encode(["error" => "پرسنل یافت نشد."]);
        exit();
    }

    $delStmt = $db->prepare("DELETE FROM employees WHERE id = :id");
    $delStmt->bindValue(':id', $empId, SQLITE3_TEXT);
    $delStmt->execute();

    echo json_encode(["success" => true, "message" => "پرسنل با موفقیت حذف شد."]);
    exit();
}

// ثبت گزارش ناشناس (Anonymous Ticket)
elseif ($route === 'tickets/anonymous' && $method === 'POST') {
    $title = isset($input['title']) ? trim($input['title']) : '';
    $category = isset($input['category']) ? trim($input['category']) : '';
    $subcategory = isset($input['subcategory']) ? trim($input['subcategory']) : '';
    $description = isset($input['description']) ? trim($input['description']) : '';
    $confidential = isset($input['confidential']) ? (bool)$input['confidential'] : true;
    $voiceData = isset($input['voiceData']) ? $input['voiceData'] : [];

    if (!$title || !$category || !$description) {
        http_response_code(400);
        echo json_encode(["error" => "عنوان، دسته‌بندی و شرح گزارش الزامی هستند."]);
        exit();
    }

    $ticketId = generateTrackingCode($db);
    
    $messages = [
        [
            "id" => "m-" . round(microtime(true) * 1000),
            "sender" => "user",
            "senderName" => "پرسنل ناشناس",
            "text" => $description,
            "createdAt" => date('c'),
            "voiceData" => $voiceData
        ]
    ];
    $internalNotes = [
        [
            "id" => "n-" . round(microtime(true) * 1000),
            "author" => "سیستم",
            "text" => "گزارش به صورت کاملا ناشناس ثبت شد.",
            "createdAt" => date('c')
        ]
    ];

    $newTicket = [
        "id" => $ticketId,
        "title" => $title,
        "category" => $category,
        "subcategory" => $subcategory,
        "description" => $description,
        "status" => "unread",
        "confidential" => $confidential ? 1 : 0,
        "isAnonymous" => 1,
        "createdAt" => date('c'),
        "updatedAt" => date('c'),
        "messages" => json_encode($messages, JSON_UNESCAPED_UNICODE),
        "internalNotes" => json_encode($internalNotes, JSON_UNESCAPED_UNICODE),
        "aiSummary" => "",
        "aiSuggestedReply" => ""
    ];

    $stmt = $db->prepare("INSERT INTO tickets (id, title, category, subcategory, description, status, confidential, isAnonymous, createdAt, updatedAt, messages, internalNotes, aiSummary, aiSuggestedReply) VALUES (:id, :title, :category, :subcat, :desc, :status, :conf, :anon, :created, :updated, :messages, :notes, :aisum, :aireply)");
    $stmt->bindValue(':id', $newTicket['id'], SQLITE3_TEXT);
    $stmt->bindValue(':title', $newTicket['title'], SQLITE3_TEXT);
    $stmt->bindValue(':category', $newTicket['category'], SQLITE3_TEXT);
    $stmt->bindValue(':subcat', $newTicket['subcategory'], SQLITE3_TEXT);
    $stmt->bindValue(':desc', $newTicket['description'], SQLITE3_TEXT);
    $stmt->bindValue(':status', $newTicket['status'], SQLITE3_TEXT);
    $stmt->bindValue(':conf', $newTicket['confidential'], SQLITE3_INTEGER);
    $stmt->bindValue(':anon', $newTicket['isAnonymous'], SQLITE3_INTEGER);
    $stmt->bindValue(':created', $newTicket['createdAt'], SQLITE3_TEXT);
    $stmt->bindValue(':updated', $newTicket['updatedAt'], SQLITE3_TEXT);
    $stmt->bindValue(':messages', $newTicket['messages'], SQLITE3_TEXT);
    $stmt->bindValue(':notes', $newTicket['internalNotes'], SQLITE3_TEXT);
    $stmt->bindValue(':aisum', $newTicket['aiSummary'], SQLITE3_TEXT);
    $stmt->bindValue(':aireply', $newTicket['aiSuggestedReply'], SQLITE3_TEXT);
    $stmt->execute();

    pushNotification($db, 'new_ticket', $ticketId, $title, "یک گزارش جدید ناشناس با موضوع \"{$category}\" ثبت گردید.");

    // برگرداندن ساختار سازگار با فرانت‌اند
    $returnTicket = $newTicket;
    $returnTicket['confidential'] = $confidential;
    $returnTicket['isAnonymous'] = true;
    $returnTicket['messages'] = $messages;
    $returnTicket['internalNotes'] = $internalNotes;

    http_response_code(201);
    echo json_encode(["success" => true, "id" => $ticketId, "ticket" => $returnTicket]);
    exit();
}

// ثبت گزارش رسمی پرسنلی (Official Personnel Ticket)
elseif ($route === 'tickets/personnel' && $method === 'POST') {
    $title = isset($input['title']) ? trim($input['title']) : '';
    $category = isset($input['category']) ? trim($input['category']) : '';
    $subcategory = isset($input['subcategory']) ? trim($input['subcategory']) : '';
    $description = isset($input['description']) ? trim($input['description']) : '';
    $confidential = isset($input['confidential']) ? (bool)$input['confidential'] : true;
    $personnelCode = isset($input['personnelCode']) ? trim($input['personnelCode']) : '';
    $employeeName = isset($input['employeeName']) ? trim($input['employeeName']) : 'پرسنل دیلی مارکت';
    $storeBranch = isset($input['storeBranch']) ? trim($input['storeBranch']) : 'شعبه نامشخص';
    $voiceData = isset($input['voiceData']) ? $input['voiceData'] : [];

    if (!$title || !$category || !$description || !$personnelCode) {
        http_response_code(400);
        echo json_encode(["error" => "عنوان، دسته‌بندی، شرح گزارش و کد پرسنلی الزامی هستند."]);
        exit();
    }

    $ticketId = generateTrackingCode($db);
    
    $messages = [
        [
            "id" => "m-" . round(microtime(true) * 1000),
            "sender" => "user",
            "senderName" => $employeeName,
            "text" => $description,
            "createdAt" => date('c'),
            "voiceData" => $voiceData
        ]
    ];
    $internalNotes = [
        [
            "id" => "n-" . round(microtime(true) * 1000),
            "author" => "سیستم",
            "text" => "گزارش توسط پرسنل رسمی با کد پرسنلی {$personnelCode} ثبت شد.",
            "createdAt" => date('c')
        ]
    ];

    $newTicket = [
        "id" => $ticketId,
        "title" => $title,
        "category" => $category,
        "subcategory" => $subcategory,
        "description" => $description,
        "status" => "unread",
        "confidential" => $confidential ? 1 : 0,
        "isAnonymous" => 0,
        "personnelCode" => $personnelCode,
        "employeeName" => $employeeName,
        "storeBranch" => $storeBranch,
        "createdAt" => date('c'),
        "updatedAt" => date('c'),
        "messages" => json_encode($messages, JSON_UNESCAPED_UNICODE),
        "internalNotes" => json_encode($internalNotes, JSON_UNESCAPED_UNICODE),
        "aiSummary" => "",
        "aiSuggestedReply" => ""
    ];

    $stmt = $db->prepare("INSERT INTO tickets (id, title, category, subcategory, description, status, confidential, isAnonymous, personnelCode, employeeName, storeBranch, createdAt, updatedAt, messages, internalNotes, aiSummary, aiSuggestedReply) VALUES (:id, :title, :category, :subcat, :desc, :status, :conf, :anon, :pcode, :ename, :branch, :created, :updated, :messages, :notes, :aisum, :aireply)");
    $stmt->bindValue(':id', $newTicket['id'], SQLITE3_TEXT);
    $stmt->bindValue(':title', $newTicket['title'], SQLITE3_TEXT);
    $stmt->bindValue(':category', $newTicket['category'], SQLITE3_TEXT);
    $stmt->bindValue(':subcat', $newTicket['subcategory'], SQLITE3_TEXT);
    $stmt->bindValue(':desc', $newTicket['description'], SQLITE3_TEXT);
    $stmt->bindValue(':status', $newTicket['status'], SQLITE3_TEXT);
    $stmt->bindValue(':conf', $newTicket['confidential'], SQLITE3_INTEGER);
    $stmt->bindValue(':anon', $newTicket['isAnonymous'], SQLITE3_INTEGER);
    $stmt->bindValue(':pcode', $newTicket['personnelCode'], SQLITE3_TEXT);
    $stmt->bindValue(':ename', $newTicket['employeeName'], SQLITE3_TEXT);
    $stmt->bindValue(':branch', $newTicket['storeBranch'], SQLITE3_TEXT);
    $stmt->bindValue(':created', $newTicket['createdAt'], SQLITE3_TEXT);
    $stmt->bindValue(':updated', $newTicket['updatedAt'], SQLITE3_TEXT);
    $stmt->bindValue(':messages', $newTicket['messages'], SQLITE3_TEXT);
    $stmt->bindValue(':notes', $newTicket['internalNotes'], SQLITE3_TEXT);
    $stmt->bindValue(':aisum', $newTicket['aiSummary'], SQLITE3_TEXT);
    $stmt->bindValue(':aireply', $newTicket['aiSuggestedReply'], SQLITE3_TEXT);
    $stmt->execute();

    pushNotification($db, 'new_ticket', $ticketId, $title, "یک گزارش رسمی جدید توسط {$employeeName} ({$storeBranch}) ثبت گردید.");

    // برگرداندن ساختار سازگار با فرانت‌اند
    $returnTicket = $newTicket;
    $returnTicket['confidential'] = $confidential;
    $returnTicket['isAnonymous'] = false;
    $returnTicket['messages'] = $messages;
    $returnTicket['internalNotes'] = $internalNotes;

    http_response_code(201);
    echo json_encode(["success" => true, "id" => $ticketId, "ticket" => $returnTicket]);
    exit();
}

// دریافت نوتیفیکیشن‌ها (ادمین)
elseif ($route === 'notifications' && $method === 'GET') {
    $res = $db->query("SELECT * FROM notifications ORDER BY createdAt DESC LIMIT 100");
    $list = [];
    while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
        $row['read'] = ($row['isRead'] == 1);
        unset($row['isRead']);
        $list[] = $row;
    }
    echo json_encode($list);
    exit();
}

// خواندن یک اعلان (ادمین)
elseif (preg_match('/^notifications\/([^\/]+)\/read$/', $route, $matches) && $method === 'POST') {
    $notifId = $matches[1];
    
    $stmt = $db->prepare("UPDATE notifications SET isRead = 1 WHERE id = :id");
    $stmt->bindValue(':id', $notifId, SQLITE3_TEXT);
    $stmt->execute();
    
    echo json_encode(["success" => true]);
    exit();
}

// خواندن کل اعلان‌ها (ادمین)
elseif ($route === 'notifications/read-all' && $method === 'POST') {
    $db->exec("UPDATE notifications SET isRead = 1");
    echo json_encode(["success" => true]);
    exit();
}

// درون‌ریزی اکسل/لیست اکسل پرسنل به دیتابیس (ادمین) - سرعت بی‌نظیر با استفاده از تراکنش SQLite
elseif ($route === 'employees/import' && $method === 'POST') {
    $employeesInput = isset($input['employees']) ? $input['employees'] : [];
    if (!is_array($employeesInput)) {
        http_response_code(400);
        echo json_encode(["error" => "لیست پرسنل ارسال شده معتبر نیست."]);
        exit();
    }

    $importedCount = 0;
    $skippedCount = 0;
    $skippedCodes = [];

    // شروع تراکنش برای افزایش فوق‌العاده سرعت (مناسب برای ۷۰۰۰+ کارمند)
    $db->exec("BEGIN TRANSACTION");
    
    $prepCheck = $db->prepare("SELECT COUNT(*) FROM employees WHERE personnelCode = :pcode");
    $prepInsert = $db->prepare("INSERT INTO employees (id, personnelCode, nationalCode, fullName, storeBranch, role, phone, department, employmentDate, birthDate, createdAt) VALUES (:id, :pcode, :ncode, :fname, :branch, :role, :phone, :dept, :empdate, :birth, :created)");

    foreach ($employeesInput as $emp) {
        $code = isset($emp['personnelCode']) ? trim($emp['personnelCode']) : '';
        $nat = isset($emp['nationalCode']) ? trim($emp['nationalCode']) : '';
        $name = isset($emp['fullName']) ? trim($emp['fullName']) : '';

        if (!$code || !$nat || !$name) {
            $skippedCount++;
            continue;
        }

        $prepCheck->bindValue(':pcode', $code, SQLITE3_TEXT);
        $checkRes = $prepCheck->execute();
        $isDuplicate = $checkRes->fetchArray(SQLITE3_NUM)[0] > 0;
        $checkRes->finalize(); // آزادسازی منابع

        if ($isDuplicate) {
            $skippedCount++;
            $skippedCodes[] = $code;
            continue;
        }

        $newEmpId = "emp-" . round(microtime(true) * 1000) . "-" . rand(100, 999);
        $storeBranch = isset($emp['storeBranch']) ? trim($emp['storeBranch']) : "دفترمرکزی تهران";
        $role = isset($emp['role']) ? trim($emp['role']) : "پرسنل";
        $phone = isset($emp['phone']) ? trim($emp['phone']) : "";
        $department = isset($emp['department']) ? trim($emp['department']) : "";
        $employmentDate = isset($emp['employmentDate']) ? trim($emp['employmentDate']) : "";
        $birthDate = isset($emp['birthDate']) ? trim($emp['birthDate']) : "";
        $createdAt = date('c');

        $prepInsert->bindValue(':id', $newEmpId, SQLITE3_TEXT);
        $prepInsert->bindValue(':pcode', $code, SQLITE3_TEXT);
        $prepInsert->bindValue(':ncode', $nat, SQLITE3_TEXT);
        $prepInsert->bindValue(':fname', $name, SQLITE3_TEXT);
        $prepInsert->bindValue(':branch', $storeBranch, SQLITE3_TEXT);
        $prepInsert->bindValue(':role', $role, SQLITE3_TEXT);
        $prepInsert->bindValue(':phone', $phone, SQLITE3_TEXT);
        $prepInsert->bindValue(':dept', $department, SQLITE3_TEXT);
        $prepInsert->bindValue(':empdate', $employmentDate, SQLITE3_TEXT);
        $prepInsert->bindValue(':birth', $birthDate, SQLITE3_TEXT);
        $prepInsert->bindValue(':created', $createdAt, SQLITE3_TEXT);
        $prepInsert->execute();

        $importedCount++;
    }

    $db->exec("COMMIT");

    echo json_encode([
        "success" => true,
        "importedCount" => $importedCount,
        "skippedCount" => $skippedCount,
        "skippedCodes" => $skippedCodes
    ]);
    exit();
}

// جستجو و پیگیری تیکت‌ها با کد رهگیری یا کد پرسنلی
elseif ($route === 'tickets/search' && $method === 'GET') {
    $code = isset($_GET['code']) ? trim($_GET['code']) : '';
    $personnelCode = isset($_GET['personnelCode']) ? trim($_GET['personnelCode']) : '';

    if ($code) {
        $searchCode = strtoupper($code);
        $stmt = $db->prepare("SELECT * FROM tickets WHERE UPPER(id) = :id");
        $stmt->bindValue(':id', $searchCode, SQLITE3_TEXT);
        $res = $stmt->execute();
        $ticket = $res->fetchArray(SQLITE3_ASSOC);
        
        if ($ticket) {
            $ticket['confidential'] = ($ticket['confidential'] == 1);
            $ticket['isAnonymous'] = ($ticket['isAnonymous'] == 1);
            $ticket['messages'] = json_decode($ticket['messages'], true) ?? [];
            $ticket['internalNotes'] = json_decode($ticket['internalNotes'], true) ?? [];
            echo json_encode(["success" => true, "ticket" => $ticket]);
            exit();
        }
        
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "گزارشی با این کد رهگیری یافت نشد."]);
        exit();
    }

    if ($personnelCode) {
        $stmt = $db->prepare("SELECT * FROM tickets WHERE personnelCode = :pcode");
        $stmt->bindValue(':pcode', $personnelCode, SQLITE3_TEXT);
        $res = $stmt->execute();
        
        $filtered = [];
        while ($ticket = $res->fetchArray(SQLITE3_ASSOC)) {
            $ticket['confidential'] = ($ticket['confidential'] == 1);
            $ticket['isAnonymous'] = ($ticket['isAnonymous'] == 1);
            $ticket['messages'] = json_decode($ticket['messages'], true) ?? [];
            $ticket['internalNotes'] = json_decode($ticket['internalNotes'], true) ?? [];
            $filtered[] = $ticket;
        }
        
        echo json_encode(["success" => true, "tickets" => $filtered]);
        exit();
    }

    http_response_code(400);
    echo json_encode(["error" => "کد رهگیری یا کد پرسنلی الزامی است."]);
    exit();
}

// دریافت لیست کامل تیکت‌ها (ادمین)
elseif ($route === 'tickets' && $method === 'GET') {
    $res = $db->query("SELECT * FROM tickets ORDER BY createdAt DESC");
    $list = [];
    while ($ticket = $res->fetchArray(SQLITE3_ASSOC)) {
        $ticket['confidential'] = ($ticket['confidential'] == 1);
        $ticket['isAnonymous'] = ($ticket['isAnonymous'] == 1);
        $ticket['messages'] = json_decode($ticket['messages'], true) ?? [];
        $ticket['internalNotes'] = json_decode($ticket['internalNotes'], true) ?? [];
        $list[] = $ticket;
    }
    echo json_encode($list);
    exit();
}

// ارسال پیام در گفتگو تیکت (کاربر یا ادمین)
elseif (preg_match('/^tickets\/([^\/]+)\/messages$/', $route, $matches) && $method === 'POST') {
    $ticketId = $matches[1];
    $sender = isset($input['sender']) ? $input['sender'] : '';
    $senderName = isset($input['senderName']) ? $input['senderName'] : '';
    $text = isset($input['text']) ? $input['text'] : '';
    $voiceData = isset($input['voiceData']) ? $input['voiceData'] : [];

    if (!$text && empty($voiceData)) {
        http_response_code(400);
        echo json_encode(["error" => "متن پیام یا فایل صوتی الزامی است."]);
        exit();
    }

    // گرفتن تیکت
    $stmt = $db->prepare("SELECT * FROM tickets WHERE id = :id");
    $stmt->bindValue(':id', $ticketId, SQLITE3_TEXT);
    $res = $stmt->execute();
    $ticket = $res->fetchArray(SQLITE3_ASSOC);

    if (!$ticket) {
        http_response_code(404);
        echo json_encode(["error" => "تیکت یافت نشد."]);
        exit();
    }

    $messages = json_decode($ticket['messages'], true) ?? [];
    
    $newMessage = [
        "id" => "m-" . round(microtime(true) * 1000),
        "sender" => ($sender === 'admin') ? 'admin' : 'user',
        "senderName" => $senderName ?: (($sender === 'admin') ? 'مدیر سیستم' : 'پرسنل'),
        "text" => $text,
        "createdAt" => date('c'),
        "voiceData" => $voiceData
    ];

    $messages[] = $newMessage;
    $updatedMessagesJson = json_encode($messages, JSON_UNESCAPED_UNICODE);

    $updatedStatus = $ticket['status'];
    if ($sender === 'admin') {
        $updatedStatus = 'answered';
    } else {
        $updatedStatus = 'unanswered';
        pushNotification($db, 'new_reply', $ticketId, $ticket['title'], "پاسخ جدید همکار به پرونده {$ticketId}: " . mb_substr($text, 0, 50) . (mb_strlen($text) > 50 ? '...' : ''));
    }

    $updateStmt = $db->prepare("UPDATE tickets SET messages = :messages, status = :status, updatedAt = :updated WHERE id = :id");
    $updateStmt->bindValue(':messages', $updatedMessagesJson, SQLITE3_TEXT);
    $updateStmt->bindValue(':status', $updatedStatus, SQLITE3_TEXT);
    $updateStmt->bindValue(':updated', date('c'), SQLITE3_TEXT);
    $updateStmt->bindValue(':id', $ticketId, SQLITE3_TEXT);
    $updateStmt->execute();

    http_response_code(201);
    echo json_encode($newMessage);
    exit();
}

// ثبت یادداشت داخلی (ادمین)
elseif (preg_match('/^tickets\/([^\/]+)\/internal-notes$/', $route, $matches) && $method === 'POST') {
    $ticketId = $matches[1];
    $author = isset($input['author']) ? $input['author'] : 'مدیریت';
    $text = isset($input['text']) ? $input['text'] : '';

    if (!$text) {
        http_response_code(400);
        echo json_encode(["error" => "متن یادداشت الزامی است."]);
        exit();
    }

    $stmt = $db->prepare("SELECT * FROM tickets WHERE id = :id");
    $stmt->bindValue(':id', $ticketId, SQLITE3_TEXT);
    $res = $stmt->execute();
    $ticket = $res->fetchArray(SQLITE3_ASSOC);

    if (!$ticket) {
        http_response_code(404);
        echo json_encode(["error" => "تیکت یافت نشد."]);
        exit();
    }

    $notes = json_decode($ticket['internalNotes'], true) ?? [];

    $newNote = [
        "id" => "n-" . round(microtime(true) * 1000),
        "author" => $author,
        "text" => $text,
        "createdAt" => date('c')
    ];

    $notes[] = $newNote;
    $updatedNotesJson = json_encode($notes, JSON_UNESCAPED_UNICODE);

    $updateStmt = $db->prepare("UPDATE tickets SET internalNotes = :notes WHERE id = :id");
    $updateStmt->bindValue(':notes', $updatedNotesJson, SQLITE3_TEXT);
    $updateStmt->bindValue(':id', $ticketId, SQLITE3_TEXT);
    $updateStmt->execute();

    http_response_code(201);
    echo json_encode($newNote);
    exit();
}

// تغییر وضعیت تیکت (ادمین)
elseif (preg_match('/^tickets\/([^\/]+)\/status$/', $route, $matches) && $method === 'POST') {
    $ticketId = $matches[1];
    $status = isset($input['status']) ? $input['status'] : '';

    $validStatuses = ["unread", "read", "unanswered", "answered", "in_progress"];
    if (!in_array($status, $validStatuses)) {
        http_response_code(400);
        echo json_encode(["error" => "وضعیت ارسال شده نامعتبر است."]);
        exit();
    }

    $stmt = $db->prepare("SELECT * FROM tickets WHERE id = :id");
    $stmt->bindValue(':id', $ticketId, SQLITE3_TEXT);
    $res = $stmt->execute();
    $ticket = $res->fetchArray(SQLITE3_ASSOC);

    if (!$ticket) {
        http_response_code(404);
        echo json_encode(["error" => "تیکت یافت نشد."]);
        exit();
    }

    $updateStmt = $db->prepare("UPDATE tickets SET status = :status, updatedAt = :updated WHERE id = :id");
    $updateStmt->bindValue(':status', $status, SQLITE3_TEXT);
    $updateStmt->bindValue(':updated', date('c'), SQLITE3_TEXT);
    $updateStmt->bindValue(':id', $ticketId, SQLITE3_TEXT);
    $updateStmt->execute();

    $statusLabels = [
        "unread" => "خوانده نشده",
        "read" => "خوانده شده",
        "unanswered" => "بی‌پاسخ (جدید)",
        "answered" => "پاسخ داده شده",
        "in_progress" => "در حال پیگیری"
    ];
    $label = isset($statusLabels[$status]) ? $statusLabels[$status] : $status;
    pushNotification($db, 'status_change', $ticketId, $ticket['title'], "وضعیت پرونده {$ticketId} به \"{$label}\" تغییر یافت.");

    echo json_encode(["success" => true, "status" => $status]);
    exit();
}

// آنالیز و پیشنهاد پاسخ هوشمند با هوش مصنوعی (Gemini API)
elseif (preg_match('/^tickets\/([^\/]+)\/ai-analyze$/', $route, $matches) && $method === 'POST') {
    $ticketId = $matches[1];
    
    $stmt = $db->prepare("SELECT * FROM tickets WHERE id = :id");
    $stmt->bindValue(':id', $ticketId, SQLITE3_TEXT);
    $res = $stmt->execute();
    $ticket = $res->fetchArray(SQLITE3_ASSOC);

    if (!$ticket) {
        http_response_code(404);
        echo json_encode(["error" => "تیکت یافت نشد."]);
        exit();
    }

    // تلاش برای خواندن کلید API هوش مصنوعی از محیط سیستم یا فایل .env
    $apiKey = getenv('GEMINI_API_KEY');
    
    if (!$apiKey && file_exists(__DIR__ . '/../.env')) {
        $envContent = file_get_contents(__DIR__ . '/../.env');
        if (preg_match('/GEMINI_API_KEY\s*=\s*(.*)/', $envContent, $envMatches)) {
            $apiKey = trim($envMatches[1], " '\"\r\n");
        }
    }
    if (!$apiKey && file_exists(__DIR__ . '/.env')) {
        $envContent = file_get_contents(__DIR__ . '/.env');
        if (preg_match('/GEMINI_API_KEY\s*=\s*(.*)/', $envContent, $envMatches)) {
            $apiKey = trim($envMatches[1], " '\"\r\n");
        }
    }

    // در صورتی که کلید هوش مصنوعی ست نشده باشد، از پاسخ هوشمند پیش‌فرض استفاده می‌کنیم
    if (!$apiKey) {
        $summary = "بررسی گزارش مربوط به موضوع " . $ticket['category'] . " (" . $ticket['subcategory'] . "). کاربر به صورت " . ($ticket['isAnonymous'] == 1 ? "ناشناس" : "رسمی با مشخصات") . " شکایت خود را مطرح کرده است.";
        $suggestedReply = "همکار گرامی سلام.\nپیام شما در رابطه با موضوع \"" . $ticket['subcategory'] . "\" با کمال احترام و امنیت دریافت شد. ما در بخش مدیریت بازرسی و منابع انسانی فروشگاه‌های زنجیره‌ای دیلی مارکت، متعهد به تامین محیط کار امن و اخلاقی برای تک‌تک پرسنل هستیم.\nموضوع گزارش شما به صورت کاملا محرمانه مورد بررسی قرار خواهد گرفت و اقدامات مقتضی در کوتاه‌ترین زمان انجام خواهد شد.\nبا تشکر از اعتماد شما به صدای پرسنل (DailyVoice)";

        $updateStmt = $db->prepare("UPDATE tickets SET aiSummary = :summary, aiSuggestedReply = :reply WHERE id = :id");
        $updateStmt->bindValue(':summary', $summary, SQLITE3_TEXT);
        $updateStmt->bindValue(':reply', $suggestedReply, SQLITE3_TEXT);
        $updateStmt->bindValue(':id', $ticketId, SQLITE3_TEXT);
        $updateStmt->execute();

        echo json_encode(["aiSummary" => $summary, "aiSuggestedReply" => $suggestedReply]);
        exit();
    }

    $messages = json_decode($ticket['messages'], true) ?? [];
    $messagesHistory = "";
    foreach ($messages as $m) {
        $roleLabel = ($m['sender'] === 'admin') ? 'مدیر' : 'کاربر';
        $messagesHistory .= "{$m['senderName']} ({$roleLabel}): {$m['text']}\n";
    }

    $prompt = "تو یک دستیار هوش مصنوعی فوق‌العاده امن، حرفه‌ای و دلسوز برای بخش منابع انسانی و بازرسی فروشگاه‌های زنجیره‌ای \"دیلی مارکت\" (Daily Market) هستی.\n";
    $prompt .= "نام سامانه ما \"DailyVoice\" (صدای پرسنل) است.\n";
    $prompt .= "یک گزارش تخلف/آزار با مشخصات زیر به دست ما رسیده است:\n";
    $prompt .= "عنوان: " . $ticket['title'] . "\n";
    $prompt .= "دسته‌بندی اصلی: " . $ticket['category'] . "\n";
    $prompt .= "زیر دسته‌بندی: " . $ticket['subcategory'] . "\n";
    $prompt .= "آیا محرمانه است؟ " . ($ticket['confidential'] == 1 ? "بله" : "خیر") . "\n";
    $prompt .= "آیا فرستنده ناشناس است؟ " . ($ticket['isAnonymous'] == 1 ? "بله" : "خیر") . "\n\n";
    $prompt .= "متن و مکالمات صورت گرفته:\n{$messagesHistory}\n\n";
    $prompt .= "وظیفه تو این است که یک تحلیل کوتاه ارائه دهی و خروجی را دقیقاً در فرمت JSON زیر (و نه هیچ متن اضافه دیگری) ارسال کنی:\n";
    $prompt .= "{\n  \"summary\": \"یک خلاصه بسیار دقیق، حرفه‌ای و خلاصه در یک یا حداکثر دو جمله به زبان فارسی برای مدیر سیستم.\",\n  \"suggestedReply\": \"یک متن پاسخ فوق‌العاده مودبانه، همدلانه، رسمی و اطمینان‌بخش به زبان فارسی متناسب با گزارش بالا که مدیر بتواند به کاربر ارسال کند. تأکید کن که امنیت کاربر و محرمانگی حفظ خواهد شد.\"\n}\n";
    $prompt .= "دقت کن که خروجی حتماً یک JSON معتبر باشد و هیچ کاراکتر اضافی خارج از بلاک JSON نداشته باشد.";

    $payload = [
        "contents" => [
            [
                "parts" => [
                    ["text" => $prompt]
                ]
            ]
        ],
        "generationConfig" => [
            "responseMimeType" => "application/json"
        ]
    ];

    $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $apiKey;

    // ارسال درخواست CURL به گوگل جیمینای
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $resData = json_decode($response, true);
        $textResult = isset($resData['candidates'][0]['content']['parts'][0]['text']) ? $resData['candidates'][0]['content']['parts'][0]['text'] : '{}';
        $parsed = json_decode(trim($textResult), true);

        $summary = isset($parsed['summary']) ? $parsed['summary'] : "تحلیل خلاصه در دسترس نیست.";
        $suggestedReply = isset($parsed['suggestedReply']) ? $parsed['suggestedReply'] : "پاسخ پیشنهادی در دسترس نیست.";

        $updateStmt = $db->prepare("UPDATE tickets SET aiSummary = :summary, aiSuggestedReply = :reply WHERE id = :id");
        $updateStmt->bindValue(':summary', $summary, SQLITE3_TEXT);
        $updateStmt->bindValue(':reply', $suggestedReply, SQLITE3_TEXT);
        $updateStmt->bindValue(':id', $ticketId, SQLITE3_TEXT);
        $updateStmt->execute();

        echo json_encode(["aiSummary" => $summary, "aiSuggestedReply" => $suggestedReply]);
        exit();
    } else {
        // بازگشت به حالت بدون کلید در صورت خطا یا انقضای ریکوئست هوش مصنوعی
        $summary = "بررسی گزارش مربوط به موضوع " . $ticket['category'] . ". خطا در برقراری ارتباط با سرویس هوش مصنوعی (کد خطا: {$httpCode}).";
        $suggestedReply = "همکار گرامی سلام.\nگزارش شما با موفقیت دریافت گردید. در حال حاضر به دلیل اختلال ارتباطی، بررسی هوشمند غیرفعال است اما مدیران بازرسی دیلی مارکت به صورت مستقیم در حال بررسی گزارش شما هستند و اقدامات لازم در اسرع وقت انجام خواهد شد.";

        $updateStmt = $db->prepare("UPDATE tickets SET aiSummary = :summary, aiSuggestedReply = :reply WHERE id = :id");
        $updateStmt->bindValue(':summary', $summary, SQLITE3_TEXT);
        $updateStmt->bindValue(':reply', $suggestedReply, SQLITE3_TEXT);
        $updateStmt->bindValue(':id', $ticketId, SQLITE3_TEXT);
        $updateStmt->execute();

        echo json_encode(["aiSummary" => $summary, "aiSuggestedReply" => $suggestedReply]);
        exit();
    }
}

// هندل کردن خطای مسیر اشتباه (404)
http_response_code(404);
echo json_encode(["error" => "مسیر مورد نظر یافت نشد. [Route: {$route}, Method: {$method}]"]);
exit();
