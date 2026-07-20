import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON payload limit to handle base64 voice records (typically small, but let's allow up to 15MB)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// DB file path
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Ensure db exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initial seed data
const initialEmployees = [
  {
    id: "emp-1",
    personnelCode: "12345",
    nationalCode: "0012345678",
    fullName: "علی رضایی",
    storeBranch: "شعبه صادقیه - دیلی مارکت",
    role: "پرسنل عادی",
    jobTitle: "صندوق‌دار",
    createdAt: new Date().toISOString()
  },
  {
    id: "emp-2",
    personnelCode: "54321",
    nationalCode: "0087654321",
    fullName: "سارا احمدی",
    storeBranch: "شعبه پاسداران - دیلی مارکت",
    role: "پرسنل عادی",
    jobTitle: "مسئول چیدمان",
    createdAt: new Date().toISOString()
  },
  {
    id: "emp-3",
    personnelCode: "99999",
    nationalCode: "1111111111",
    fullName: "محمود کریمی",
    storeBranch: "شعبه نیاوران - دیلی مارکت",
    role: "پرسنل عادی",
    jobTitle: "سرپرست فروشگاه",
    createdAt: new Date().toISOString()
  }
];

const initialTickets = [
  {
    id: "DV-7832",
    title: "رفتار نامناسب سرپرست شیفت",
    category: "آزار کلامی و روانی",
    subcategory: "فشار روانی و ایجاد محیط کار سمی",
    description: "متاسفانه سرپرست شیفت عصر در شعبه صادقیه با لحن بسیار تند و تحقیرآمیز با پرسنل رفتار می‌کند و تهدید به جریمه‌های بی‌مورد می‌کند.",
    status: "unread",
    confidential: true,
    isAnonymous: false,
    personnelCode: "12345",
    employeeName: "علی رضایی",
    storeBranch: "شعبه صادقیه - دیلی مارکت",
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    messages: [
      {
        id: "m-1",
        sender: "user",
        senderName: "علی رضایی",
        text: "متاسفانه سرپرست شیفت عصر در شعبه صادقیه با لحن بسیار تند و تحقیرآمیز با پرسنل رفتار می‌کند و تهدید به جریمه‌های بی‌مورد می‌کند.",
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      }
    ],
    internalNotes: [
      {
        id: "n-1",
        author: "سیستم",
        text: "تیکت ثبت شده توسط کارمند رسمی. فیلد محرمانه فعال است.",
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      }
    ],
    aiSummary: "گزارش رفتار نامناسب و تحقیرآمیز سرپرست شیفت عصر در شعبه صادقیه و تهدید پرسنل به جریمه‌های غیرقانونی.",
    aiSuggestedReply: "جناب آقای رضایی با سلام، گزارش شما با حفظ کامل محرمانگی ثبت شد. موضوع رفتار سرپرست شیفت عصر شعبه صادقیه توسط مدیریت بازرسی دیلی مارکت پیگیری خواهد شد و اقدامات لازم جهت اصلاح رفتار یا تغییر شیفت صورت می‌پذیرد. از شجاعت شما در مطرح کردن این موضوع سپاسگزاریم."
  },
  {
    id: "DV-4129",
    title: "نزدیکی بیش از حد و ایجاد مزاحمت فیزیکی",
    category: "آزار فیزیکی",
    subcategory: "نزدیکی بیش از حد فیزیکی",
    description: "گزارش به صورت کاملا ناشناس ارسال می‌شود. یکی از پرسنل چیدمان آقای ... در انباری شعبه همواره سعی می‌کند به من نزدیک شود و تماس بدنی ناخواسته ایجاد کند. لطفا سریعا دوربین‌ها را چک کنید یا ایشان را منتقل کنید. من امنیت جانی و روانی ندارم.",
    status: "in_progress",
    confidential: true,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    messages: [
      {
        id: "m-2",
        sender: "user",
        senderName: "پرسنل ناشناس",
        text: "یکی از پرسنل چیدمان آقای ... در انباری شعبه همواره سعی می‌کند به من نزدیک شود و تماس بدنی ناخواسته ایجاد کند. لطفا سریعا دوربین‌ها را چک کنید یا ایشان را منتقل کنید. من امنیت جانی و روانی ندارم.",
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: "m-3",
        sender: "admin",
        senderName: "مدیر بازرسی",
        text: "همکار گرامی سلام. موضوع شما بسیار حیاتی و حساس است. طبق قوانین سخت‌گیرانه دیلی مارکت، امنیت شما اولویت اول ماست. بخش بازرسی نامحسوس فردا صبح برای بررسی دوربین‌ها اقدام خواهد کرد. آیا می‌توانید زمان‌های دقیق‌تر حضور ایشان یا بخش‌هایی از انبار که این اتفاق افتاده را برای ما بنویسید؟ هیچ اطلاعاتی از شما فاش نخواهد شد.",
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      }
    ],
    internalNotes: [
      {
        id: "n-2",
        author: "مدیر بازرسی",
        text: "موضوع فوق‌العاده حساس است. دوربین‌های انبار شعبه پاسداران برای هفته گذشته باید بازبینی شود. با سرپرست فروشگاه هماهنگ شود بدون فاش کردن موضوع.",
        createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
      }
    ],
    aiSummary: "گزارش بسیار جدی مزاحمت فیزیکی و تلاش برای تماس بدنی ناخواسته توسط یکی از همکاران چیدمان در انبار شعبه پاسداران.",
    aiSuggestedReply: "همکار محترم، پیام شما دریافت شد و بررسی دوربین‌های شعبه در دستور کار فوری واحد بازرسی قرار گرفت. مطمئن باشید هویت شما ۱۰۰٪ محفوظ می‌ماند. برای تسریع در روند برخورد قانونی، هرگونه جزئیات بیشتر از ساعت یا روزهای رخ دادن حادثه را در همینجا برای ما ارسال فرمایید."
  }
];

const initialCategories = [
  {
    name: 'آزار فیزیکی',
    subcategories: [
      'نزدیکی بیش از حد فیزیکی',
      'تماس بدنی ناخواسته',
      'رفتارهای تهدیدآمیز فیزیکی',
      'سایر موارد آزار فیزیکی'
    ]
  },
  {
    name: 'آزار کلامی و روانی',
    subcategories: [
      'شوخی‌های نامناسب یا جنسی',
      'توهین، تحقیر یا تمسخر کلامی',
      'تهدید به اخراج، جریمه یا تنزل رتبه بی‌مورد',
      'فشار روانی و ایجاد محیط کار سمی'
    ]
  },
  {
    name: 'آزار سایبری و دیجیتال',
    subcategories: [
      'ارسال پیام، عکس یا محتوای نامناسب در شبکه‌های اجتماعی',
      'درخواست‌های مکرر شخصی و مزاحمت دیجیتال خارج از ساعت کاری',
      'شایعه‌پراکنی آنلاین یا اشتراک اطلاعات خصوصی'
    ]
  },
  {
    name: 'تبعیض و قلدری سازمانی',
    subcategories: [
      'تبعیض جنسیتی، قومی یا مذهبی',
      'جلوگیری از ارتقاء یا تضییع حقوق مصوب',
      'بایکوت سازمانی یا قلدری گروهی (Mobbing)'
    ]
  },
  {
    name: 'تخلفات مالی و سوء استفاده',
    subcategories: [
      'سوء استفاده از قدرت و جایگاه شغلی برای منافع شخصی',
      'پیشنهاد رشوه، تبانی یا اختلاس',
      'درخواست فعالیت‌های غیرقانونی یا خارج از آیین‌نامه دیلی مارکت'
    ]
  },
  {
    name: 'مشکلات عملیاتی و رفاهی',
    subcategories: [
      'عدم رعایت دستورالعمل‌های ایمنی و بهداشتی فروشگاه',
      'تجهیزات فرسوده یا شرایط کار ناایمن در شعبه',
      'مشکلات شدید رفاهی پرسنل (ساعت کار، مرخصی، بیمه)'
    ]
  }
];

const defaultAIConfig = {
  model: 'gemini-3.5-flash',
  systemInstruction: 'تو یک دستیار هوش مصنوعی فوق‌العاده امن، حرفه‌ای و دلسوز برای بخش منابع انسانی و بازرسی فروشگاه‌های زنجیره‌ای "دیلی مارکت" (Daily Market) هستی.\nنام سامانه ما "DailyVoice" (صدای پرسنل) است.',
  enabled: true,
  temperature: 0.7,
  apiKey: ''
};

function readDB() {
  let defaultData = { 
    employees: initialEmployees, 
    tickets: initialTickets, 
    notifications: [],
    categories: initialCategories,
    aiConfig: defaultAIConfig
  };
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf8");
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.employees) parsed.employees = initialEmployees;
    if (!parsed.tickets) parsed.tickets = initialTickets;
    if (!parsed.notifications) parsed.notifications = [];
    if (!parsed.categories) parsed.categories = initialCategories;
    if (!parsed.aiConfig) parsed.aiConfig = defaultAIConfig;
    return parsed;
  } catch (err) {
    console.error("Error reading database file, resetting:", err);
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf8");
    return defaultData;
  }
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

// Push notification helper
function pushNotification(type: 'new_ticket' | 'new_reply' | 'status_change', ticketId: string, ticketTitle: string, message: string) {
  const db = readDB();
  const notification = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    ticketId,
    ticketTitle,
    message,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.unshift(notification); // Newest first
  // Keep last 100 notifications to prevent file bloat
  if (db.notifications.length > 100) {
    db.notifications = db.notifications.slice(0, 100);
  }
  writeDB(db);
  return notification;
}

// Generate random tracking code: DV-XXXX
function generateTrackingCode(): string {
  const db = readDB();
  let code = "";
  let isUnique = false;
  while (!isUnique) {
    const num = Math.floor(1000 + Math.random() * 9000); // 1000 to 9999
    code = `DV-${num}`;
    isUnique = !db.tickets.some((t: any) => t.id === code);
  }
  return code;
}

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini client:", err);
  }
} else {
  console.warn("GEMINI_API_KEY is not defined in environment.");
}

// --- API Endpoints ---

// Auth Login API
app.post("/api/auth/login", (req, res) => {
  const { role, username, password, personnelCode, nationalCode } = req.body;

  const db = readDB();

  if (role === "admin") {
    const savedPassword = db.adminSettings?.adminPassword || "admin123";
    if (username === "admin" && password === savedPassword) {
      return res.json({
        success: true,
        user: { role: "admin", fullName: "مدیریت صدای همکار دیلی مارکت" }
      });
    }
    return res.status(401).json({ success: false, message: "نام کاربری یا کلمه عبور مدیریت اشتباه است." });
  }

  if (role === "employee") {
    const employee = db.employees.find(
      (e: any) => e.personnelCode === personnelCode
    );
    if (employee) {
      const savedPassword = employee.password || employee.nationalCode;
      if (nationalCode === savedPassword) {
        // If the employee has been promoted to responding expert (کارشناس پاسخگو), grant them admin panel access
        const isExpert = employee.role === "کارشناس پاسخگو" || employee.role === "کارشناس";
        return res.json({
          success: true,
          user: {
            role: isExpert ? "admin" : "employee",
            fullName: employee.fullName,
            personnelCode: employee.personnelCode,
            storeBranch: employee.storeBranch,
            employeeRole: employee.jobTitle || employee.role || "پرسنل"
          }
        });
      }
    }
    return res.status(401).json({ success: false, message: "پرسنلی با این مشخصات یافت نشد. کد پرسنلی یا رمز عبور اشتباه است." });
  }

  return res.status(400).json({ success: false, message: "درخواست نامعتبر است." });
});

// Auth Change Password API
app.post("/api/auth/change-password", (req, res) => {
  const { role, currentPassword, newPassword, personnelCode } = req.body;

  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, message: "کلمه عبور جدید باید حداقل ۴ کاراکتر باشد." });
  }

  const db = readDB();

  if (role === "admin") {
    const savedPassword = db.adminSettings?.adminPassword || "admin123";
    if (currentPassword !== savedPassword) {
      return res.status(400).json({ success: false, message: "کلمه عبور فعلی مدیریت اشتباه است." });
    }
    if (!db.adminSettings) {
      db.adminSettings = {};
    }
    db.adminSettings.adminPassword = newPassword.trim();
    writeDB(db);
    return res.json({ success: true, message: "کلمه عبور مدیریت با موفقیت تغییر یافت." });
  }

  if (role === "employee") {
    if (!personnelCode) {
      return res.status(400).json({ success: false, message: "کد پرسنلی ارسال نشده است." });
    }
    const employee = db.employees.find((e: any) => e.personnelCode === personnelCode);
    if (!employee) {
      return res.status(404).json({ success: false, message: "پرسنل یافت نشد." });
    }

    const savedPassword = employee.password || employee.nationalCode;
    if (currentPassword !== savedPassword) {
      return res.status(400).json({ success: false, message: "کلمه عبور فعلی اشتباه است." });
    }

    employee.password = newPassword.trim();
    writeDB(db);
    return res.json({ success: true, message: "کلمه عبور شما با موفقیت تغییر یافت." });
  }

  return res.status(400).json({ success: false, message: "نقش نامعتبر است." });
});

// Employees Endpoints (Admin panel)
app.get("/api/employees", (req, res) => {
  const db = readDB();
  const search = (req.query.search || "").toString().trim().toLowerCase();
  const page = parseInt((req.query.page || "1").toString(), 10);
  const limit = parseInt((req.query.limit || "15").toString(), 10);

  let list = db.employees || [];
  if (search) {
    list = list.filter((e: any) => 
      e.fullName.toLowerCase().includes(search) ||
      e.personnelCode.toLowerCase().includes(search) ||
      (e.nationalCode && e.nationalCode.toLowerCase().includes(search)) ||
      (e.storeBranch && e.storeBranch.toLowerCase().includes(search)) ||
      (e.role && e.role.toLowerCase().includes(search)) ||
      (e.jobTitle && e.jobTitle.toLowerCase().includes(search)) ||
      (e.department && e.department.toLowerCase().includes(search))
    );
  }

  const total = list.length;
  const start = (page - 1) * limit;
  const paginated = list.slice(start, start + limit);

  res.json({
    success: true,
    employees: paginated,
    total
  });
});

app.post("/api/employees", (req, res) => {
  const { personnelCode, nationalCode, fullName, storeBranch, role, department, phone, jobTitle, employmentDate, birthDate } = req.body;

  if (!personnelCode || !nationalCode || !fullName) {
    return res.status(400).json({ error: "کد پرسنلی، کد ملی و نام کامل الزامی هستند." });
  }

  const db = readDB();
  
  // Check duplicate
  if (db.employees.some((e: any) => e.personnelCode === personnelCode)) {
    return res.status(400).json({ error: "کد پرسنلی تکراری است." });
  }

  const newEmployee = {
    id: `emp-${Date.now()}`,
    personnelCode,
    nationalCode,
    fullName,
    storeBranch: storeBranch || "کلیه شعب دیلی مارکت",
    role: role || "پرسنل عادی", // Defaults to standard employee access
    jobTitle: jobTitle || "",
    department: department || "شعب فروشگاهی",
    phone: phone || "",
    employmentDate: employmentDate || "",
    birthDate: birthDate || "",
    createdAt: new Date().toISOString()
  };

  db.employees.push(newEmployee);
  writeDB(db);

  res.status(201).json(newEmployee);
});

// Edit Employee details (all except personnelCode) & promote role
app.put("/api/employees/:id", (req, res) => {
  const { id } = req.params;
  const { fullName, nationalCode, storeBranch, role, department, phone, jobTitle, employmentDate, birthDate } = req.body;

  const db = readDB();
  const employee = db.employees.find((e: any) => e.id === id);

  if (!employee) {
    return res.status(404).json({ error: "پرسنل مورد نظر یافت نشد." });
  }

  if (fullName !== undefined) employee.fullName = fullName;
  if (nationalCode !== undefined) employee.nationalCode = nationalCode;
  if (storeBranch !== undefined) employee.storeBranch = storeBranch;
  if (role !== undefined) employee.role = role;
  if (jobTitle !== undefined) employee.jobTitle = jobTitle;
  if (department !== undefined) employee.department = department;
  if (phone !== undefined) employee.phone = phone;
  if (employmentDate !== undefined) employee.employmentDate = employmentDate;
  if (birthDate !== undefined) employee.birthDate = birthDate;

  writeDB(db);
  res.json({ success: true, employee });
});

app.delete("/api/employees/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  const index = db.employees.findIndex((e: any) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "پرسنل یافت نشد." });
  }

  db.employees.splice(index, 1);
  writeDB(db);

  res.json({ success: true, message: "پرسنل با موفقیت حذف شد." });
});

// Submit Ticket (Anonymous)
app.post("/api/tickets/anonymous", (req, res) => {
  const { title, category, subcategory, description, confidential, voiceData } = req.body;

  if (!title || !category || !description) {
    return res.status(400).json({ error: "عنوان، دسته‌بندی و شرح گزارش الزامی هستند." });
  }

  const db = readDB();
  const ticketId = generateTrackingCode();

  const newTicket = {
    id: ticketId,
    title,
    category,
    subcategory: subcategory || "",
    description,
    status: "unread",
    confidential: !!confidential,
    isAnonymous: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `m-${Date.now()}`,
        sender: "user",
        senderName: "پرسنل ناشناس",
        text: description,
        createdAt: new Date().toISOString(),
        voiceData: voiceData || []
      }
    ],
    internalNotes: [
      {
        id: `n-${Date.now()}`,
        author: "سیستم",
        text: "گزارش به صورت کاملا ناشناس ثبت شد.",
        createdAt: new Date().toISOString()
      }
    ]
  };

  db.tickets.push(newTicket);
  writeDB(db);
  pushNotification('new_ticket', ticketId, title, `یک گزارش جدید ناشناس با موضوع "${category}" ثبت گردید.`);

  res.status(201).json({ success: true, id: ticketId, ticket: newTicket });
});

// Submit Ticket (Personnel)
app.post("/api/tickets/personnel", (req, res) => {
  const { title, category, subcategory, description, confidential, personnelCode, employeeName, storeBranch, voiceData } = req.body;

  if (!title || !category || !description || !personnelCode) {
    return res.status(400).json({ error: "عنوان، دسته‌بندی، شرح گزارش و کد پرسنلی الزامی هستند." });
  }

  const db = readDB();
  const ticketId = generateTrackingCode();

  const newTicket = {
    id: ticketId,
    title,
    category,
    subcategory: subcategory || "",
    description,
    status: "unread",
    confidential: !!confidential,
    isAnonymous: false,
    personnelCode,
    employeeName: employeeName || "پرسنل دیلی مارکت",
    storeBranch: storeBranch || "شعبه نامشخص",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `m-${Date.now()}`,
        sender: "user",
        senderName: employeeName || "پرسنل دیلی مارکت",
        text: description,
        createdAt: new Date().toISOString(),
        voiceData: voiceData || []
      }
    ],
    internalNotes: [
      {
        id: `n-${Date.now()}`,
        author: "سیستم",
        text: `گزارش توسط پرسنل رسمی با کد پرسنلی ${personnelCode} ثبت شد.`,
        createdAt: new Date().toISOString()
      }
    ]
  };

  db.tickets.push(newTicket);
  writeDB(db);
  pushNotification('new_ticket', ticketId, title, `یک گزارش رسمی جدید توسط ${employeeName || 'پرسنل'} (${storeBranch || 'شعبه نامشخص'}) ثبت گردید.`);

  res.status(201).json({ success: true, id: ticketId, ticket: newTicket });
});

// --- Notifications APIs ---
app.get("/api/notifications", (req, res) => {
  const db = readDB();
  res.json(db.notifications || []);
});

app.post("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.notifications.findIndex((n: any) => n.id === id);
  if (index !== -1) {
    db.notifications[index].read = true;
    writeDB(db);
    return res.json({ success: true });
  }
  res.status(404).json({ error: "اعلان یافت نشد." });
});

app.post("/api/notifications/read-all", (req, res) => {
  const db = readDB();
  db.notifications.forEach((n: any) => n.read = true);
  writeDB(db);
  res.json({ success: true });
});

// --- Bulk Import Employees API ---
app.post("/api/employees/import", (req, res) => {
  const { employees } = req.body;
  if (!Array.isArray(employees)) {
    return res.status(400).json({ error: "لیست پرسنل ارسال شده معتبر نیست." });
  }

  const db = readDB();
  let importedCount = 0;
  let skippedCount = 0;
  const skippedCodes: string[] = [];

  for (const emp of employees) {
    const code = emp.personnelCode?.trim();
    const nat = emp.nationalCode?.trim();
    const name = emp.fullName?.trim();

    if (!code || !nat || !name) {
      skippedCount++;
      continue;
    }

    // Check if duplicate personnelCode exists in DB
    const isDuplicate = db.employees.some((e: any) => e.personnelCode === code);
    if (isDuplicate) {
      skippedCount++;
      skippedCodes.push(code);
      continue;
    }

    // Insert new employee
    const newEmp = {
      id: `emp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      personnelCode: code,
      nationalCode: nat,
      fullName: name,
      storeBranch: emp.storeBranch?.trim() || "دفترمرکزی تهران",
      role: emp.role?.trim() || "پرسنل عادی",
      jobTitle: emp.jobTitle?.trim() || "",
      phone: emp.phone?.trim() || "",
      department: emp.department?.trim() || "",
      employmentDate: emp.employmentDate?.trim() || "",
      birthDate: emp.birthDate?.trim() || "",
      createdAt: new Date().toISOString()
    };

    db.employees.push(newEmp);
    importedCount++;
  }

  if (importedCount > 0) {
    writeDB(db);
  }

  res.json({
    success: true,
    importedCount,
    skippedCount,
    skippedCodes
  });
});

// Search Ticket by tracking code or personnelCode
app.get("/api/tickets/search", (req, res) => {
  const { code, personnelCode } = req.query;

  const db = readDB();

  if (code) {
    const ticket = db.tickets.find((t: any) => t.id === code.toString().toUpperCase().trim());
    if (ticket) {
      // Mark read if opened by user (wait, only admins read/unread status works usually, but let's keep it as is or handle it)
      return res.json({ success: true, ticket });
    }
    return res.status(404).json({ success: false, message: "گزارشی با این کد رهگیری یافت نشد." });
  }

  if (personnelCode) {
    const tickets = db.tickets.filter((t: any) => t.personnelCode === personnelCode.toString());
    return res.json({ success: true, tickets });
  }

  return res.status(400).json({ error: "کد رهگیری یا کد پرسنلی الزامی است." });
});

// Get All Tickets (Admin Only)
app.get("/api/tickets", (req, res) => {
  const db = readDB();
  res.json(db.tickets || []);
});

// Post a Message to Ticket (Admin or User)
app.post("/api/tickets/:id/messages", (req, res) => {
  const { id } = req.params;
  const { sender, senderName, text, voiceData } = req.body;

  if (!text && (!voiceData || voiceData.length === 0)) {
    return res.status(400).json({ error: "متن پیام یا فایل صوتی الزامی است." });
  }

  const db = readDB();
  const ticket = db.tickets.find((t: any) => t.id === id);

  if (!ticket) {
    return res.status(404).json({ error: "تیکت یافت نشد." });
  }

  const newMessage = {
    id: `m-${Date.now()}`,
    sender: sender === "admin" ? "admin" : "user",
    senderName: senderName || (sender === "admin" ? "مدیر سیستم" : "پرسنل"),
    text: text || "",
    createdAt: new Date().toISOString(),
    voiceData: voiceData || []
  };

  ticket.messages.push(newMessage);
  ticket.updatedAt = new Date().toISOString();

  // Automatic status change logic:
  // If admin responds, status becomes 'answered'
  // If user responds, status becomes 'unanswered' (needs attention)
  if (sender === "admin") {
    ticket.status = "answered";
  } else {
    ticket.status = "unanswered";
    pushNotification('new_reply', id, ticket.title, `پاسخ جدید همکار به پرونده ${id}: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`);
  }

  writeDB(db);
  res.status(201).json(newMessage);
});

// Add Internal Note (Admin Only)
app.post("/api/tickets/:id/internal-notes", (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "متن یادداشت الزامی است." });
  }

  const db = readDB();
  const ticket = db.tickets.find((t: any) => t.id === id);

  if (!ticket) {
    return res.status(404).json({ error: "تیکت یافت نشد." });
  }

  const newNote = {
    id: `n-${Date.now()}`,
    author: author || "مدیریت",
    text,
    createdAt: new Date().toISOString()
  };

  ticket.internalNotes = ticket.internalNotes || [];
  ticket.internalNotes.push(newNote);

  writeDB(db);
  res.status(201).json(newNote);
});

// Update Ticket Status (Admin Only)
app.post("/api/tickets/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["unread", "read", "unanswered", "answered", "in_progress"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "وضعیت ارسال شده نامعتبر است." });
  }

  const db = readDB();
  const ticket = db.tickets.find((t: any) => t.id === id);

  if (!ticket) {
    return res.status(404).json({ error: "تیکت یافت نشد." });
  }

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();

  const statusLabels: Record<string, string> = {
    unread: "خوانده نشده",
    read: "خوانده شده",
    unanswered: "بی‌پاسخ (جدید)",
    answered: "پاسخ داده شده",
    in_progress: "در حال پیگیری"
  };
  const label = statusLabels[status] || status;
  pushNotification('status_change', id, ticket.title, `وضعیت پرونده ${id} به "${label}" تغییر یافت.`);

  writeDB(db);
  res.json({ success: true, status: ticket.status });
});

// Gemini AI Analysis Endpoint (Admin Helper)
app.post("/api/tickets/:id/ai-analyze", async (req, res) => {
  const { id } = req.params;

  const db = readDB();
  const ticket = db.tickets.find((t: any) => t.id === id);

  if (!ticket) {
    return res.status(404).json({ error: "تیکت یافت نشد." });
  }

  const aiConfig = db.aiConfig || defaultAIConfig;
  if (!aiConfig.enabled) {
    return res.status(400).json({ error: "سیستم هوش مصنوعی در تنظیمات غیرفعال شده است." });
  }

  let activeAi = ai;
  const customKey = aiConfig.apiKey;
  if (customKey) {
    try {
      activeAi = new GoogleGenAI({
        apiKey: customKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (err) {
      console.error("Failed to initialize Gemini with custom key:", err);
    }
  }

  // If no Gemini API Client is loaded, return helpful fallback content
  if (!activeAi) {
    console.warn("Gemini AI API key not found. Providing rule-based simulated response.");
    
    // Simulate smart rule-based outcomes to still provide amazing UX even if key is missing
    const summary = `بررسی گزارش مربوط به موضوع ${ticket.category} (${ticket.subcategory}). کاربر به صورت ${ticket.isAnonymous ? "ناشناس" : "رسمی با مشخصات"} شکایت خود را مطرح کرده است.`;
    const suggestedReply = `همکار گرامی سلام.\nپیام شما در رابطه با موضوع "${ticket.subcategory}" با کمال احترام و امنیت دریافت شد. ما در بخش مدیریت بازرسی و منابع انسانی فروشگاه‌های زنجیره‌ای دیلی مارکت، متعهد به تامین محیط کار امن و اخلاقی برای تک‌تک پرسنل هستیم.\nموضوع گزارش شما به صورت کاملا محرمانه مورد بررسی قرار خواهد گرفت و اقدامات مقتضی در کوتاه‌ترین زمان انجام خواهد شد.\nبا تشکر از اعتماد شما به صدای پرسنل (DailyVoice)`;

    ticket.aiSummary = summary;
    ticket.aiSuggestedReply = suggestedReply;
    writeDB(db);

    return res.json({ aiSummary: summary, aiSuggestedReply: suggestedReply });
  }

  try {
    const messagesHistory = ticket.messages
      .map((m: any) => `${m.senderName} (${m.sender === "admin" ? "مدیر" : "کاربر"}): ${m.text}`)
      .join("\n");

    const prompt = `
دستورالعمل سیستم:
${aiConfig.systemInstruction}

یک گزارش تخلف/آزار با مشخصات زیر به دست ما رسیده است:
عنوان: ${ticket.title}
دسته‌بندی اصلی: ${ticket.category}
زیر دسته‌بندی: ${ticket.subcategory}
آیا محرمانه است؟ ${ticket.confidential ? "بله" : "خیر"}
آیا فرستنده ناشناس است؟ ${ticket.isAnonymous ? "بله" : "خیر"}

متن و مکالمات صورت گرفته:
${messagesHistory}

وظیفه تو این است که یک تحلیل کوتاه ارائه دهی و خروجی را دقیقاً در فرمت JSON زیر (و نه هیچ متن اضافه دیگری) ارسال کنی:
{
  "summary": "یک خلاصه بسیار دقیق، حرفه‌ای و خلاصه در یک یا حداکثر دو جمله به زبان فارسی برای مدیر سیستم.",
  "suggestedReply": "یک متن پاسخ فوق‌العاده مودبانه، همدلانه، رسمی و اطمینان‌بخش به زبان فارسی متناسب با گزارش بالا که مدیر بتواند به کاربر ارسال کند. تأکید کن که امنیت کاربر و محرمانگی حفظ خواهد شد."
}
دقت کن که خروجی حتماً یک JSON معتبر باشد و هیچ کاراکتر اضافی خارج از بلاک JSON نداشته باشد.
`;

    const response = await activeAi.models.generateContent({
      model: aiConfig.model || "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "یک خلاصه بسیار دقیق، حرفه‌ای و خلاصه در یک یا حداکثر دو جمله به زبان فارسی برای مدیر سیستم."
            },
            suggestedReply: {
              type: Type.STRING,
              description: "یک متن پاسخ فوق‌العاده مودبانه، همدلانه، رسمی و اطمینان‌بخش به زبان فارسی متناسب با گزارش بالا که مدیر بتواند به کاربر ارسال کند. تأکید کن که امنیت کاربر و محرمانگی حفظ خواهد شد."
            }
          },
          required: ["summary", "suggestedReply"]
        },
        temperature: aiConfig.temperature !== undefined ? Number(aiConfig.temperature) : 0.7
      }
    });

    const resultText = response.text || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(resultText.trim());
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON, attempting regex extraction:", parseErr);
      const summaryMatch = resultText.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const suggestedMatch = resultText.match(/"suggestedReply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      parsed = {
        summary: summaryMatch ? summaryMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : undefined,
        suggestedReply: suggestedMatch ? suggestedMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : undefined
      };
    }

    ticket.aiSummary = parsed.summary || "تحلیل خلاصه در دسترس نیست.";
    ticket.aiSuggestedReply = parsed.suggestedReply || "پاسخ پیشنهادی در دسترس نیست.";
    writeDB(db);

    res.json({
      aiSummary: ticket.aiSummary,
      aiSuggestedReply: ticket.aiSuggestedReply
    });

  } catch (err: any) {
    console.error("Gemini AI API Error:", err);
    res.status(500).json({ error: "خطا در برقراری ارتباط با هوش مصنوعی", details: err.message });
  }
});

// GET Categories
app.get("/api/categories", (req, res) => {
  const db = readDB();
  res.json(db.categories || initialCategories);
});

// PUT Categories
app.put("/api/categories", (req, res) => {
  const { categories } = req.body;
  if (!Array.isArray(categories)) {
    return res.status(400).json({ error: "دسته‌بندی‌های ارسال شده نامعتبر است." });
  }
  const db = readDB();
  db.categories = categories;
  writeDB(db);
  res.json({ success: true, categories });
});

// GET AI Config
app.get("/api/config/ai", (req, res) => {
  const db = readDB();
  res.json(db.aiConfig || defaultAIConfig);
});

// POST AI Config
app.post("/api/config/ai", (req, res) => {
  const { model, systemInstruction, enabled, temperature, apiKey } = req.body;
  const db = readDB();
  db.aiConfig = {
    model: model || "gemini-3.5-flash",
    systemInstruction: systemInstruction || defaultAIConfig.systemInstruction,
    enabled: enabled !== undefined ? !!enabled : true,
    temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
    apiKey: apiKey !== undefined ? apiKey.trim() : (db.aiConfig?.apiKey || "")
  };
  writeDB(db);
  res.json({ success: true, aiConfig: db.aiConfig });
});

// --- Handle Vite Server & Production ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DailyVoice Server running at http://localhost:${PORT}`);
  });
}

startServer();
