import React, { useState, useEffect, useRef } from 'react';
import { Ticket, Employee, AdminNotification, STANDARD_CATEGORIES, ActiveUser } from '../types';
import { 
  Shield, Users, Search, Download, AlertCircle, PlusCircle, Trash2, Edit,
  Calendar, FileSpreadsheet, Lock, Sparkles, Filter, RefreshCw, 
  Bell, BellOff, Volume2, LayoutDashboard, ChevronLeft, ChevronRight, Upload, 
  Check, CheckCircle, AlertTriangle, Building, Briefcase, Phone, HelpCircle, LogOut,
  Cpu, Sliders, X
} from 'lucide-react';

interface AdminPanelProps {
  onLogout: () => void;
  onViewTicket: (ticket: Ticket) => void;
  refreshTrigger: boolean;
  user?: ActiveUser;
}

interface ToastMessage {
  id: string;
  type: 'new_ticket' | 'new_reply' | 'status_change';
  title: string;
  message: string;
  ticketId: string;
}

export default function AdminPanel({ onLogout, onViewTicket, refreshTrigger, user }: AdminPanelProps) {
  const isSuperAdmin = user?.fullName === "مدیریت صدای همکار دیلی مارکت" || !user?.employeeRole || user?.employeeRole === "مدیر کل" || user?.employeeRole === "مدیر سیستم";
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets' | 'employees' | 'change_password' | 'categories' | 'ai_config'>('dashboard');

  // Dynamic categories state
  const [categoriesList, setCategoriesList] = useState<{name: string, subcategories: string[]}[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newSubNames, setNewSubNames] = useState<{[key: string]: string}>({});

  // AI Config state
  const [aiModel, setAiModel] = useState('gemini-3.5-flash');
  const [aiSystemInstruction, setAiSystemInstruction] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [aiApiKey, setAiApiKey] = useState('');
  const [loadingAIConfig, setLoadingAIConfig] = useState(false);
  const [aiConfigSuccess, setAiConfigSuccess] = useState<string | null>(null);
  const [aiConfigError, setAiConfigError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  
  // Loaders
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // Background Audio & Toast Settings
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousNotificationsCountRef = useRef<number>(-1);

  // Jalali Date formatter helper using native Intl API
  const getJalaliDateString = (dateInput: string | Date): string => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '';
    try {
      const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const parts = formatter.formatToParts(date);
      const year = parts.find(p => p.type === 'year')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';
      return `${year}/${month}/${day}`;
    } catch (e) {
      return '';
    }
  };

  // Filters State
  const [filterId, setFilterId] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterConfidential, setFilterConfidential] = useState<'all' | 'confidential' | 'normal'>('all');
  const [filterAnonymous, setFilterAnonymous] = useState<'all' | 'anonymous' | 'personnel'>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Jalali Filters State
  const [filterJalaliFromYear, setFilterJalaliFromYear] = useState('');
  const [filterJalaliFromMonth, setFilterJalaliFromMonth] = useState('');
  const [filterJalaliFromDay, setFilterJalaliFromDay] = useState('');
  const [filterJalaliToYear, setFilterJalaliToYear] = useState('');
  const [filterJalaliToMonth, setFilterJalaliToMonth] = useState('');
  const [filterJalaliToDay, setFilterJalaliToDay] = useState('');

  const filterJalaliStartDate = (filterJalaliFromYear && filterJalaliFromMonth && filterJalaliFromDay)
    ? `${filterJalaliFromYear}/${filterJalaliFromMonth.padStart(2, '0')}/${filterJalaliFromDay.padStart(2, '0')}`
    : '';

  const filterJalaliEndDate = (filterJalaliToYear && filterJalaliToMonth && filterJalaliToDay)
    ? `${filterJalaliToYear}/${filterJalaliToMonth.padStart(2, '0')}/${filterJalaliToDay.padStart(2, '0')}`
    : '';

  // Add Employee Form State (Single)
  const [empName, setEmpName] = useState('');
  const [empPersonnelCode, setEmpPersonnelCode] = useState('');
  const [empNationalCode, setEmpNationalCode] = useState('');
  const [empBranch, setEmpBranch] = useState('');
  const [empRole, setEmpRole] = useState('پرسنل عادی'); // Default access level
  const [empJobTitle, setEmpJobTitle] = useState('');   // Job Title / سمت
  const [empPhone, setEmpPhone] = useState('');
  const [empDept, setEmpDept] = useState('');
  const [empSubmitting, setEmpSubmitting] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

  // Edit Employee Form State
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpNationalCode, setEditEmpNationalCode] = useState('');
  const [editEmpBranch, setEditEmpBranch] = useState('');
  const [editEmpRole, setEditEmpRole] = useState(''); // Access level ('پرسنل عادی' or 'کارشناس پاسخگو')
  const [editEmpJobTitle, setEditEmpJobTitle] = useState(''); // Job Title / سمت
  const [editEmpDept, setEditEmpDept] = useState('');
  const [editEmpPhone, setEditEmpPhone] = useState('');
  const [editEmpSubmitting, setEditEmpSubmitting] = useState(false);
  const [editEmpError, setEditEmpError] = useState<string | null>(null);

  const startEditingEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditEmpName(emp.fullName || '');
    setEditEmpNationalCode(emp.nationalCode || '');
    setEditEmpBranch(emp.storeBranch || '');
    setEditEmpRole(emp.role || 'پرسنل عادی');
    setEditEmpJobTitle(emp.jobTitle || '');
    setEditEmpDept(emp.department || '');
    setEditEmpPhone(emp.phone || '');
    setEditEmpError(null);
  };

  const handleEditEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    if (!editEmpName || !editEmpNationalCode) {
      setEditEmpError('پر کردن فیلدهای نام کامل و کد ملی الزامی است.');
      return;
    }
    setEditEmpSubmitting(true);
    setEditEmpError(null);

    try {
      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editEmpName.trim(),
          nationalCode: editEmpNationalCode.trim(),
          storeBranch: editEmpBranch.trim(),
          role: editEmpRole.trim(),
          jobTitle: editEmpJobTitle.trim(),
          department: editEmpDept.trim(),
          phone: editEmpPhone.trim(),
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingEmployee(null);
        fetchEmployees();
      } else {
        throw new Error(data.error || 'خطا در ثبت تغییرات پرسنل.');
      }
    } catch (err: any) {
      setEditEmpError(err.message || 'مشکل ارتباطی با سرور.');
    } finally {
      setEditEmpSubmitting(false);
    }
  };

  // CSV Import States
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ imported: number; skipped: number; codes: string[] } | null>(null);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Employees Server-side Search & Pagination states
  const [employeesSearch, setEmployeesSearch] = useState('');
  const [employeesPage, setEmployeesPage] = useState(1);
  const [employeesLimit, setEmployeesLimit] = useState(15);
  const [employeesTotal, setEmployeesTotal] = useState(0);

  // Play corporate alert chime using Web Audio API
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      // High-end dual corporate chime
      playBeep(880, audioCtx.currentTime, 0.15);
      playBeep(1109.73, audioCtx.currentTime + 0.08, 0.25);
    } catch (err) {
      console.warn("Audio Context blocked/unsupported:", err);
    }
  };

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoadingTickets(true);
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      if (res.ok) {
        setTickets(data);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      if (!silent) setLoadingTickets(false);
    }
  };

  const fetchEmployees = async (silent = false) => {
    if (!silent) setLoadingEmployees(true);
    try {
      const url = `/api/employees?search=${encodeURIComponent(employeesSearch)}&page=${employeesPage}&limit=${employeesLimit}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        if (data && Array.isArray(data.employees)) {
          setEmployees(data.employees);
          setEmployeesTotal(data.total);
        } else if (Array.isArray(data)) {
          setEmployees(data);
          setEmployeesTotal(data.length);
        }
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      if (!silent) setLoadingEmployees(false);
    }
  };

  const fetchNotifications = async (silent = false) => {
    if (!silent) setLoadingNotifications(true);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok) {
        setNotifications(data);
        
        // Handle background notification triggers & sounds
        const unreadList = data.filter((n: AdminNotification) => !n.read);
        const unreadCount = unreadList.length;

        if (previousNotificationsCountRef.current !== -1 && unreadCount > previousNotificationsCountRef.current) {
          // Play sound and add Toast for the newest notifications
          const newItems = unreadList.slice(0, unreadCount - previousNotificationsCountRef.current);
          newItems.forEach((item: AdminNotification) => {
            playNotificationSound();
            
            let titleText = 'به‌روزرسانی پرونده';
            if (item.type === 'new_ticket') titleText = 'گزارش جدید ثبت شد';
            if (item.type === 'new_reply') titleText = 'پاسخ جدید همکار';
            if (item.type === 'status_change') titleText = 'تغییر وضعیت پرونده';

            const newToast: ToastMessage = {
              id: `${item.id}-${Date.now()}`,
              type: item.type,
              title: titleText,
              message: item.message,
              ticketId: item.ticketId
            };
            setToasts(prev => [newToast, ...prev].slice(0, 5));
          });
        }
        previousNotificationsCountRef.current = unreadCount;
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      if (!silent) setLoadingNotifications(false);
    }
  };

  // Live polling every 8 seconds for new tickets, replies, or changes
  useEffect(() => {
    fetchTickets();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchTickets(true);
      fetchNotifications(true);
    }, 8000);

    return () => clearInterval(interval);
  }, [refreshTrigger]);

  // Fetch employees when search or pagination params change
  useEffect(() => {
    fetchEmployees();
  }, [employeesSearch, employeesPage, employeesLimit]);

  // Fetch dynamic categories and AI configurations
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategoriesList(data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchAIConfig = async () => {
    setLoadingAIConfig(true);
    try {
      const res = await fetch('/api/config/ai');
      if (res.ok) {
        const data = await res.json();
        setAiModel(data.model || 'gemini-3.5-flash');
        setAiSystemInstruction(data.systemInstruction || '');
        setAiEnabled(data.enabled !== undefined ? data.enabled : true);
        setAiTemperature(data.temperature !== undefined ? data.temperature : 0.7);
        setAiApiKey(data.apiKey || '');
      }
    } catch (err) {
      console.error("Error fetching AI config:", err);
    } finally {
      setLoadingAIConfig(false);
    }
  };

  const saveCategories = async (updatedList: typeof categoriesList) => {
    setLoadingCategories(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedList })
      });
      if (res.ok) {
        const data = await res.json();
        setCategoriesList(data.categories);
        showSystemToast("تغییرات دسته‌بندی‌ها با موفقیت ذخیره شد.", "success");
      } else {
        showSystemToast("خطا در ذخیره دسته‌بندی‌ها", "error");
      }
    } catch (err) {
      console.error("Error saving categories:", err);
      showSystemToast("خطا در برقراری ارتباط با سرور", "error");
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSaveAIConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAIConfig(true);
    setAiConfigSuccess(null);
    setAiConfigError(null);
    try {
      const res = await fetch('/api/config/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: aiModel,
          systemInstruction: aiSystemInstruction,
          enabled: aiEnabled,
          temperature: aiTemperature,
          apiKey: aiApiKey
        })
      });
      if (res.ok) {
        setAiConfigSuccess("تنظیمات موتور هوش مصنوعی با موفقیت بروزرسانی شد.");
        showSystemToast("تنظیمات هوش مصنوعی ذخیره شد.", "success");
      } else {
        setAiConfigError("خطا در بروزرسانی تنظیمات هوش مصنوعی.");
      }
    } catch (err) {
      console.error("Error saving AI config:", err);
      setAiConfigError("خطا در اتصال به سرور.");
    } finally {
      setLoadingAIConfig(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchAIConfig();
  }, []);

  // System toast trigger helper (already defined in code, we use it)
  const showSystemToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message: msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const markNotificationRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        previousNotificationsCountRef.current = Math.max(0, previousNotificationsCountRef.current - 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        previousNotificationsCountRef.current = 0;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add single employee manually
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError(null);

    if (!empName || !empPersonnelCode || !empNationalCode) {
      setEmpError('کد پرسنلی، کد ملی و نام کامل الزامی هستند.');
      return;
    }

    setEmpSubmitting(true);

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: empName.trim(),
          personnelCode: empPersonnelCode.trim(),
          nationalCode: empNationalCode.trim(),
          storeBranch: empBranch.trim() || 'دفترمرکزی تهران',
          role: empRole.trim() || 'پرسنل عادی',
          jobTitle: empJobTitle.trim(),
          phone: empPhone.trim(),
          department: empDept.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ثبت اطلاعات.');
      }

      setEmpName('');
      setEmpPersonnelCode('');
      setEmpNationalCode('');
      setEmpBranch('');
      setEmpRole('پرسنل عادی');
      setEmpJobTitle('');
      setEmpPhone('');
      setEmpDept('');
      fetchEmployees();
    } catch (err: any) {
      setEmpError(err.message || 'خطای اتصال به سرور.');
    } finally {
      setEmpSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('آیا از حذف این کارمند اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchEmployees();
      }
    } catch (err) {
      console.error("Error deleting employee:", err);
    }
  };

  // Parse CSV File Flawlessly (Tab-separated, space, semicolon, or comma)
  const handleCsvFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError(null);
    setCsvResult(null);
    setCsvPreview([]);
    
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setCsvError('فایل خالی است یا قابل خواندن نیست.');
          return;
        }

        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length === 0) {
          setCsvError('محتوایی در فایل یافت نشد.');
          return;
        }

        // Delimiter detection
        const firstLine = lines[0];
        let delimiter = ',';
        if (firstLine.includes('\t')) delimiter = '\t';
        else if (firstLine.includes(';')) delimiter = ';';

        // Parse headers and normalise keys
        const rawHeaders = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
        
        // Define Persian and standard CSV mapping keys
        const headerMap: Record<string, string> = {
          'personnel_code': 'personnelCode',
          'کد پرسنلی': 'personnelCode',
          'national_id': 'nationalCode',
          'کد ملی': 'nationalCode',
          'national_code': 'nationalCode',
          'full_name': 'fullName',
          'نام': 'fullName',
          'نام کامل': 'fullName',
          'نام و نام خانوادگی': 'fullName',
          'phone': 'phone',
          'تلفن': 'phone',
          'تلفن همراه': 'phone',
          'شماره تلفن': 'phone',
          'department': 'department',
          'واحد': 'department',
          'بخش': 'department',
          'job_title': 'jobTitle',
          'سمت': 'jobTitle',
          'سمت شغلی': 'jobTitle',
          'عنوان شغلی': 'jobTitle',
          'service_location_title': 'storeBranch',
          'شعبه': 'storeBranch',
          'محل خدمت': 'storeBranch',
          'عنوان محل خدمت': 'storeBranch',
          'employment_date': 'employmentDate',
          'تاریخ استخدام': 'employmentDate',
          'birth_date': 'birthDate',
          'تاریخ تولد': 'birthDate'
        };

        const parsedRows: any[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          let values: string[] = [];

          if (line.includes('"')) {
            // Split with double quote handling
            let currentVal = '';
            let inQuotes = false;
            for (let cIdx = 0; cIdx < line.length; cIdx++) {
              const char = line[cIdx];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === delimiter && !inQuotes) {
                values.push(currentVal.trim());
                currentVal = '';
              } else {
                currentVal += char;
              }
            }
            values.push(currentVal.trim());
          } else {
            values = line.split(delimiter).map(v => v.trim());
          }

          if (values.length < rawHeaders.length) continue;

          const rowObj: any = {};
          rawHeaders.forEach((header, index) => {
            const cleanHeader = header.toLowerCase().trim();
            const mappedKey = headerMap[cleanHeader] || headerMap[header.trim()];
            if (mappedKey) {
              rowObj[mappedKey] = values[index]?.replace(/^["']|["']$/g, '').trim();
            }
          });

          // Fallback parsing just in case column indices are fixed
          if (!rowObj.personnelCode && values[0]) rowObj.personnelCode = values[0];
          if (!rowObj.nationalCode && values[1]) rowObj.nationalCode = values[1];
          if (!rowObj.fullName && values[2]) rowObj.fullName = values[2];
          if (!rowObj.phone && values[3]) rowObj.phone = values[3];
          if (!rowObj.department && values[4]) rowObj.department = values[4];
          if (!rowObj.jobTitle && values[5]) rowObj.jobTitle = values[5];
          if (!rowObj.storeBranch && values[6]) rowObj.storeBranch = values[6];
          if (!rowObj.employmentDate && values[7]) rowObj.employmentDate = values[7];
          if (!rowObj.birthDate && values[8]) rowObj.birthDate = values[8];

          if (!rowObj.role) rowObj.role = "پرسنل عادی";

          if (rowObj.personnelCode && rowObj.fullName) {
            parsedRows.push(rowObj);
          }
        }

        if (parsedRows.length === 0) {
          setCsvError('ستون‌های کد پرسنلی یا نام کامل به درستی نقشه‌برداری نشدند یا اطلاعات معتبری وجود ندارد.');
        } else {
          setCsvPreview(parsedRows);
        }
      } catch (err) {
        setCsvError('بروز خطا در خواندن یا تحلیل فایل CSV.');
        console.error(err);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Submit parsed batch employees to server API
  const handleCommitImport = async () => {
    if (csvPreview.length === 0) return;
    setCsvImporting(true);
    setCsvError(null);
    setCsvResult(null);

    try {
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: csvPreview })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCsvResult({
          imported: data.importedCount,
          skipped: data.skippedCount,
          codes: data.skippedCodes
        });
        setCsvPreview([]);
        fetchEmployees();
      } else {
        throw new Error(data.error || 'خطا در ارسال فایل پرسنل به سرور.');
      }
    } catch (err: any) {
      setCsvError(err.message || 'مشکل ارتباطی با سرور.');
    } finally {
      setCsvImporting(false);
    }
  };

  // Advanced Filtering logic
  const filteredTickets = tickets.filter((t) => {
    if (filterId && !t.id.toLowerCase().includes(filterId.toLowerCase()) && !t.title.toLowerCase().includes(filterId.toLowerCase())) {
      return false;
    }
    if (filterCategory && t.category !== filterCategory) {
      return false;
    }
    if (filterStatus && t.status !== filterStatus) {
      return false;
    }
    if (filterConfidential === 'confidential' && !t.confidential) return false;
    if (filterConfidential === 'normal' && t.confidential) return false;
    if (filterAnonymous === 'anonymous' && !t.isAnonymous) return false;
    if (filterAnonymous === 'personnel' && t.isAnonymous) return false;

    // Use Shamsi/Jalali Date Filtering
    const ticketJalaliDate = getJalaliDateString(t.createdAt); // returns "1405/04/28" or similar
    if (filterJalaliStartDate && ticketJalaliDate < filterJalaliStartDate) return false;
    if (filterJalaliEndDate && ticketJalaliDate > filterJalaliEndDate) return false;

    return true;
  });

  // Export to Excel / CSV with UTF-8 BOM
  const exportToExcel = () => {
    if (filteredTickets.length === 0) {
      alert('گزارشی برای خروجی وجود ندارد.');
      return;
    }

    const headers = ['کد پیگیری', 'عنوان', 'دسته‌بندی موضوعی', 'زیرموضوع', 'شرح اصلی', 'وضعیت', 'محرمانه است؟', 'نام پرسنل', 'کد پرسنلی', 'شعبه کارمند', 'تاریخ ثبت'];
    const rows = filteredTickets.map(t => [
      t.id,
      t.title.replace(/"/g, '""'),
      t.category,
      t.subcategory || '',
      t.description.replace(/"/g, '""').replace(/\n/g, ' '),
      getStatusLabel(t.status),
      t.confidential ? 'بله' : 'خیر',
      t.isAnonymous ? 'ناشناس' : (t.employeeName || ''),
      t.isAnonymous ? '' : (t.personnelCode || ''),
      t.isAnonymous ? '' : (t.storeBranch || ''),
      new Date(t.createdAt).toLocaleDateString('fa-IR')
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      const formattedRow = row.map(val => `"${val}"`).join(',');
      csvContent += formattedRow + '\n';
    });

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dailyvoice-reports-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  function getStatusLabel(status: string) {
    switch (status) {
      case 'unread': return 'خوانده نشده';
      case 'read': return 'خوانده شده';
      case 'unanswered': return 'بی‌پاسخ (جدید)';
      case 'answered': return 'پاسخ داده شده';
      case 'in_progress': return 'در حال پیگیری';
      default: return status;
    }
  }

  // Statistical calculations
  const getAvgStats = () => {
    const uniqueDays = new Set(tickets.map(t => new Date(t.createdAt).toDateString())).size || 1;
    const avgDailyTickets = (tickets.length / uniqueDays).toFixed(1);

    const ticketsWithReplies = tickets.filter(t => t.messages.some(m => m.sender === 'admin'));
    let totalResponseTimeMs = 0;
    ticketsWithReplies.forEach(t => {
      const firstAdminReply = t.messages.find(m => m.sender === 'admin');
      if (firstAdminReply) {
        const diff = new Date(firstAdminReply.createdAt).getTime() - new Date(t.createdAt).getTime();
        if (diff > 0) totalResponseTimeMs += diff;
      }
    });
    const avgResponseTimeHours = ticketsWithReplies.length > 0 
      ? (totalResponseTimeMs / ticketsWithReplies.length / (1000 * 60 * 60)).toFixed(1) 
      : '0.0';

    return { avgDailyTickets, avgResponseTimeHours };
  };

  const avgStats = getAvgStats();

  const stats = {
    totalTickets: tickets.length,
    unreadTickets: tickets.filter(t => t.status === 'unread').length,
    unansweredTickets: tickets.filter(t => t.status === 'unanswered' || t.status === 'unread').length,
    inProgressTickets: tickets.filter(t => t.status === 'in_progress').length,
    confidentialTickets: tickets.filter(t => t.confidential).length,
    anonymousTickets: tickets.filter(t => t.isAnonymous).length,
    totalEmployees: employeesTotal,
    avgDailyTickets: avgStats.avgDailyTickets,
    avgResponseTimeHours: avgStats.avgResponseTimeHours,
  };

  // Category counts for dashboard
  const categoryStats = (categoriesList.length > 0 ? categoriesList : STANDARD_CATEGORIES).map(cat => {
    const count = tickets.filter(t => t.category === cat.name).length;
    const ratio = stats.totalTickets > 0 ? Math.round((count / stats.totalTickets) * 100) : 0;
    return { name: cat.name, count, ratio };
  }).sort((a, b) => b.count - a.count);

  // Department counts for dashboard
  const getDeptStats = () => {
    const depts: Record<string, number> = {};
    employees.forEach(emp => {
      const key = emp.department || 'نامشخص / شعب';
      depts[key] = (depts[key] || 0) + 1;
    });
    return Object.entries(depts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };

  // Branch counts for dashboard
  const getBranchStats = () => {
    const branches: Record<string, number> = {};
    employees.forEach(emp => {
      const key = emp.storeBranch || 'سایر شعب';
      branches[key] = (branches[key] || 0) + 1;
    });
    return Object.entries(branches).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="w-full flex flex-col md:flex-row gap-6 font-sans text-right min-h-[750px]" id="admin-panel-root">
      
      {/* FLOATING SHARP TOAST ALERTS IN THE UPPER LEFTHAND SIDE */}
      <div className="fixed top-20 left-4 z-[9999] space-y-2 w-96 pointer-events-none" id="admin-live-toasts">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className="pointer-events-auto bg-black text-white p-4 border border-red-600 shadow-xl animate-fade-in relative transition flex flex-col gap-1.5 rounded-none"
            style={{ direction: 'rtl' }}
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-red-500 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 animate-bounce" />
                {toast.title}
              </span>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-gray-400 hover:text-white text-xs font-bold font-mono"
              >
                ×
              </button>
            </div>
            <p className="text-xs font-bold text-gray-200">{toast.message}</p>
            <div className="flex justify-end gap-2 mt-1">
              <button 
                onClick={() => {
                  const targetTicket = tickets.find(t => t.id === toast.ticketId);
                  if (targetTicket) {
                    onViewTicket(targetTicket);
                  } else {
                    setActiveTab('tickets');
                  }
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase transition rounded-none"
              >
                مشاهده پرونده {toast.ticketId}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT NAVIGATION SIDEBAR (SQUARE CORNERS, CORPORATE BENTO DESIGN) */}
      <aside className={`shrink-0 bg-white border border-gray-200 flex flex-col rounded-none shadow-sm transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-full md:w-80'}`} id="admin-sidebar">
        {/* Profile Branding Header */}
        <div className={`p-4 border-b border-gray-200 bg-gray-50 flex ${sidebarCollapsed ? 'flex-col items-center justify-center' : 'items-center justify-between'} gap-2 rounded-none`} id="sidebar-header">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-600 text-white rounded-none">
              <Shield className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="text-right">
                <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">سازمان مرکزی بازرسی</h3>
                <h2 className="text-sm font-black text-gray-800">سامانه نظارتی دیلی‌وویس</h2>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 hover:bg-gray-200 text-gray-600 transition rounded-none"
            title={sidebarCollapsed ? "گسترش منوی مدیریت" : "جمع کردن منوی مدیریت"}
          >
            {sidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="px-5 py-2 flex items-center justify-between text-xs text-gray-400 font-sans bg-gray-50/50 border-b border-gray-100">
            <span>مدیر ارشد سیستم</span>
            <div className="flex items-center gap-1.5 bg-green-100 text-green-800 px-2 py-0.5 rounded-none font-bold text-[9px]">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
              پایش آنلاین فعال
            </div>
          </div>
        )}

        {/* Navigation Action Buttons - Rounded None */}
        <nav className="flex-1 p-3 space-y-1.5 flex flex-col justify-between" id="sidebar-navigation">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              title={sidebarCollapsed ? "داشبورد آماری و تحلیل" : undefined}
              className={`w-full py-3 ${sidebarCollapsed ? 'px-1 justify-center' : 'px-4 justify-between'} text-xs font-bold flex items-center transition rounded-none ${
                activeTab === 'dashboard' 
                  ? 'bg-black text-white border-r-4 border-red-600' 
                  : 'text-gray-600 hover:text-black hover:bg-gray-100 border-r-4 border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-red-600" />
                {!sidebarCollapsed && <span>داشبورد آماری و تحلیل</span>}
              </span>
              {!sidebarCollapsed && <ChevronLeft className="w-3.5 h-3.5 opacity-60" />}
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              title={sidebarCollapsed ? `مدیریت گزارش‌ها (${stats.totalTickets})` : undefined}
              className={`w-full py-3 ${sidebarCollapsed ? 'px-1 justify-center' : 'px-4 justify-between'} text-xs font-bold flex items-center transition rounded-none ${
                activeTab === 'tickets' 
                  ? 'bg-black text-white border-r-4 border-red-600' 
                  : 'text-gray-600 hover:text-black hover:bg-gray-100 border-r-4 border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-red-600" />
                {!sidebarCollapsed && <span>مدیریت گزارش‌ها و تیکت‌ها</span>}
              </span>
              {sidebarCollapsed ? (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full"></span>
              ) : (
                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 font-bold font-sans">
                  {stats.totalTickets}
                </span>
              )}
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('employees')}
                title={sidebarCollapsed ? `مدیریت پرسنل (${stats.totalEmployees})` : undefined}
                className={`w-full py-3 ${sidebarCollapsed ? 'px-1 justify-center' : 'px-4 justify-between'} text-xs font-bold flex items-center transition rounded-none ${
                  activeTab === 'employees' 
                    ? 'bg-black text-white border-r-4 border-red-600' 
                    : 'text-gray-600 hover:text-black hover:bg-gray-100 border-r-4 border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-red-600" />
                  {!sidebarCollapsed && <span>مدیریت و ایمپورت پرسنل</span>}
                </span>
                {!sidebarCollapsed && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 font-bold font-sans">
                    {stats.totalEmployees}
                  </span>
                )}
              </button>
            )}

            {isSuperAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('categories')}
                  title={sidebarCollapsed ? "مدیریت دسته‌بندی‌ها" : undefined}
                  className={`w-full py-3 ${sidebarCollapsed ? 'px-1 justify-center' : 'px-4 justify-between'} text-xs font-bold flex items-center transition rounded-none ${
                    activeTab === 'categories' 
                      ? 'bg-black text-white border-r-4 border-red-600' 
                      : 'text-gray-600 hover:text-black hover:bg-gray-100 border-r-4 border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4 text-red-600" />
                    {!sidebarCollapsed && <span>مدیریت دسته‌بندی‌ها</span>}
                  </span>
                  {!sidebarCollapsed && <ChevronLeft className="w-3.5 h-3.5 opacity-60" />}
                </button>

                <button
                  onClick={() => setActiveTab('ai_config')}
                  title={sidebarCollapsed ? "تنظیمات هوش مصنوعی" : undefined}
                  className={`w-full py-3 ${sidebarCollapsed ? 'px-1 justify-center' : 'px-4 justify-between'} text-xs font-bold flex items-center transition rounded-none ${
                    activeTab === 'ai_config' 
                      ? 'bg-black text-white border-r-4 border-red-600' 
                      : 'text-gray-600 hover:text-black hover:bg-gray-100 border-r-4 border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Cpu className="w-4 h-4 text-red-600" />
                    {!sidebarCollapsed && <span>تنظیمات هوش مصنوعی</span>}
                  </span>
                  {!sidebarCollapsed && <ChevronLeft className="w-3.5 h-3.5 opacity-60" />}
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('change_password')}
              title={sidebarCollapsed ? "تغییر کلمه عبور" : undefined}
              className={`w-full py-3 ${sidebarCollapsed ? 'px-1 justify-center' : 'px-4'} text-xs font-bold flex items-center transition rounded-none ${
                activeTab === 'change_password' 
                  ? 'bg-black text-white border-r-4 border-red-600' 
                  : 'text-gray-600 hover:text-black hover:bg-gray-100 border-r-4 border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-red-600" />
                {!sidebarCollapsed && <span>تغییر کلمه عبور</span>}
              </span>
            </button>
          </div>

          {/* Toggle Chime Audio Option & System logout */}
          <div className="pt-4 border-t border-gray-100 space-y-2">
            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              title={sidebarCollapsed ? `صدای هشدار سیستم: ${soundEnabled ? 'روشن' : 'خاموش'}` : undefined}
              className={`w-full py-2 ${sidebarCollapsed ? 'px-1 justify-center' : 'px-3 justify-between'} hover:bg-gray-50 text-[11px] font-semibold text-gray-500 flex items-center rounded-none border border-gray-100 transition`}
            >
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                {!sidebarCollapsed && <span>صدای هشدار سیستم</span>}
              </span>
              {!sidebarCollapsed && (
                <span className={`text-[10px] font-extrabold ${soundEnabled ? 'text-green-600' : 'text-red-500'}`}>
                  {soundEnabled ? 'روشن' : 'خاموش'}
                </span>
              )}
            </button>
            
            <button
              onClick={onLogout}
              title={sidebarCollapsed ? "خروج از سیستم" : undefined}
              className={`w-full py-2.5 ${sidebarCollapsed ? 'px-1 justify-center' : 'px-3'} bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition rounded-none flex items-center justify-center gap-1.5`}
            >
              <LogOut className="w-4 h-4" />
              {!sidebarCollapsed && <span>خروج از سیستم مدیریت</span>}
            </button>
          </div>
        </nav>
      </aside>

      {/* MAIN ADMIN WORKSPACE VIEW STAGE (SQUARE AND MINIMALIST CORPORATE SLATE GRID) */}
      <div className="flex-1 flex flex-col gap-6" id="admin-stage-workspace">
        
        {/* VIEW 1: ADVANCED CORPORATE STATISTICAL ANALYTICS DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in" id="dashboard-analytics-view">
            {/* Upper Stage Header */}
            <div className="bg-white border border-gray-200 p-5 flex items-center justify-between rounded-none shadow-sm">
              <div>
                <h2 className="text-base font-black text-gray-800">میز کار نظارت و پایش وضعیت دیلی مارکت</h2>
                <p className="text-xs text-gray-400 mt-1">خلاصه آماری، آمار تخلفات تفکیک شده و گزارش‌های جدید سازمان</p>
              </div>
              <button 
                onClick={() => {
                  fetchTickets();
                  fetchNotifications();
                  fetchEmployees();
                }}
                className="p-2 bg-gray-100 hover:bg-gray-200 transition text-gray-600 rounded-none border border-gray-200"
                title="بروزرسانی داده‌ها"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* HIGH CONTRACT PERFORMANCE COUNTER CARDS (NO RADIUS) */}
            <div className="grid grid-cols-2 lg:grid-cols-7 gap-4" id="dashboard-bento-counters">
              <div className="bg-white border border-gray-200 p-5 rounded-none text-right shadow-sm border-r-4 border-r-gray-800">
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">کل پرونده‌ها</span>
                <span className="text-2xl font-black font-sans text-gray-800 block mt-1">{stats.totalTickets}</span>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-none text-right shadow-sm border-r-4 border-r-red-600">
                <span className="text-[10px] text-red-600 block font-bold">خوانده نشده</span>
                <span className="text-2xl font-black font-sans text-red-600 block mt-1">{stats.unreadTickets}</span>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-none text-right shadow-sm border-r-4 border-r-amber-500">
                <span className="text-[10px] text-amber-600 block font-bold">بی‌پاسخ (جدید)</span>
                <span className="text-2xl font-black font-sans text-amber-600 block mt-1">{stats.unansweredTickets}</span>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-none text-right shadow-sm border-r-4 border-r-blue-500">
                <span className="text-[10px] text-blue-600 block font-bold">در حال پیگیری</span>
                <span className="text-2xl font-black font-sans text-blue-500 block mt-1">{stats.inProgressTickets}</span>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-none text-right shadow-sm border-r-4 border-r-amber-700">
                <span className="text-[10px] text-amber-800 block font-bold">گزارش ناشناس</span>
                <span className="text-2xl font-black font-sans text-amber-800 block mt-1">{stats.anonymousTickets}</span>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-none text-right shadow-sm border-r-4 border-r-purple-600">
                <span className="text-[10px] text-purple-600 block font-bold">تیکت روزانه (میانگین)</span>
                <span className="text-2xl font-black font-sans text-purple-600 block mt-1">{stats.avgDailyTickets}</span>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-none text-right shadow-sm border-r-4 border-r-emerald-600">
                <span className="text-[10px] text-emerald-600 block font-bold">زمان پاسخ (میانگین)</span>
                <span className="text-2xl font-black font-sans text-emerald-600 block mt-1">{stats.avgResponseTimeHours}h</span>
              </div>
            </div>

            {/* DETAILED INSIGHTS BENTO GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-charts-bento">
              {/* Category distribution */}
              <div className="lg:col-span-7 bg-white border border-gray-200 p-5 rounded-none shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-red-600" />
                    توزیع موضوعی تخلفات و گزارش‌ها
                  </h3>
                  <h4 className="text-sm font-black text-gray-800 mb-4 pb-2 border-b border-gray-100">درصد فراوانی دسته‌بندی موضوعات دریافتی</h4>
                  
                  {stats.totalTickets === 0 ? (
                    <p className="text-center py-10 text-xs text-gray-400">اطلاعاتی برای نمایش وجود ندارد.</p>
                  ) : (
                    <div className="space-y-4">
                      {categoryStats.map(item => (
                        <div key={item.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-gray-700">
                            <span>{item.name}</span>
                            <span>{item.count} مورد ({item.ratio}٪)</span>
                          </div>
                          {/* Sleek Square Gauge (No radius) */}
                          <div className="w-full bg-gray-100 h-2.5 rounded-none overflow-hidden">
                            <div 
                              className="bg-red-600 h-full rounded-none transition-all duration-500" 
                              style={{ width: `${item.ratio}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="pt-4 border-t border-gray-100 mt-4 text-[11px] text-gray-400 leading-relaxed">
                  * آمار بالا به کارشناسان صیانت نشان می‌دهد بیشترین دغدغه پرسنل بر چه محوری است تا اقدامات پیشگیرانه اتخاذ شود.
                </div>
              </div>

              {/* Rich Personnel Data Analytics: Department & Branches distribution */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* Department distribution */}
                <div className="bg-white border border-gray-200 p-5 rounded-none shadow-sm flex-1">
                  <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-red-600" />
                    تحلیل جامعه آماری پرسنل
                  </h3>
                  <h4 className="text-sm font-black text-gray-800 mb-4 pb-2 border-b border-gray-100">فراوانی پرسنل در دپارتمان‌های کلیدی</h4>

                  {employees.length === 0 ? (
                    <p className="text-center py-5 text-xs text-gray-400">دیتای پرسنل خالی است.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto">
                      {getDeptStats().map(item => (
                        <div key={item.name} className="flex items-center justify-between text-xs border-b border-gray-50 pb-1.5">
                          <span className="font-bold text-gray-700 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-black"></span>
                            {item.name}
                          </span>
                          <span className="font-sans font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-none">
                            {item.count} نفر
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Branches distribution */}
                <div className="bg-white border border-gray-200 p-5 rounded-none shadow-sm flex-1">
                  <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-red-600" />
                    ۵ محل خدمت پرجمعیت
                  </h3>
                  <h4 className="text-sm font-black text-gray-800 mb-4 pb-2 border-b border-gray-100">شعب و دفاتر فعال در سامانه</h4>

                  {employees.length === 0 ? (
                    <p className="text-center py-5 text-xs text-gray-400">دیتای پرسنل خالی است.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto">
                      {getBranchStats().map(item => (
                        <div key={item.name} className="flex items-center justify-between text-xs border-b border-gray-50 pb-1.5">
                          <span className="font-bold text-gray-700 truncate max-w-[200px]">{item.name}</span>
                          <span className="font-sans font-black text-red-600">{item.count} پرسنل</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* RECENT INCOMING TICKETS */}
            <div className="bg-white border border-gray-200 p-5 rounded-none shadow-sm">
              <h4 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
                آخرین گزارش‌های حاد دریافتی سازمان
              </h4>

              {tickets.length === 0 ? (
                <p className="text-center py-10 text-xs text-gray-400">هیچ پرونده‌ای یافت نشد.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {tickets.slice(0, 3).map(t => (
                    <div 
                      key={t.id}
                      onClick={() => onViewTicket(t)}
                      className="py-3 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition px-1"
                    >
                      <div className="text-right">
                        <span className="text-[10px] font-sans bg-gray-100 px-2 py-0.5 text-gray-500 font-extrabold">{t.id}</span>
                        <h5 className="text-xs font-black text-gray-800 mt-1">{t.title}</h5>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          <span>{t.category}</span> • <span>{new Date(t.createdAt).toLocaleDateString('fa-IR')}</span>
                        </div>
                      </div>
                      <span className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1">
                        بررسی پرونده
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 2: COMPREHENSIVE TICKETS LIST AND ADVANCED FILTERS */}
        {activeTab === 'tickets' && (
          <div className="space-y-6 animate-fade-in" id="tickets-view-grid">
            
            {/* TOP COMPACT FILTER BAR */}
            <div className="bg-white border border-gray-200 p-5 rounded-none shadow-sm" id="filters-rail">
              <h4 className="text-sm font-black text-gray-800 pb-3 border-b border-gray-100 flex items-center gap-1.5 mb-4">
                <Filter className="w-4 h-4 text-red-600" />
                فیلترهای پیشرفته و جستجوی پرونده‌ها
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                {/* Search */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">جستجوی عنوان یا کد پرونده</label>
                  <input
                    type="text"
                    placeholder="مثال: DV-1234 یا کلمات..."
                    value={filterId}
                    onChange={(e) => setFilterId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-none text-xs text-right font-semibold font-sans"
                    id="filter-search"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">دسته‌بندی اصلی موضوعی</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-none text-xs font-bold text-right text-gray-700"
                    id="filter-category"
                  >
                    <option value="">-- همه موضوعات --</option>
                    {(categoriesList.length > 0 ? categoriesList : STANDARD_CATEGORIES).map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">وضعیت پرونده</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-none text-xs font-bold text-right text-gray-700"
                    id="filter-status"
                  >
                    <option value="">-- همه وضعیت‌ها --</option>
                    <option value="unread">خوانده نشده</option>
                    <option value="read">خوانده شده</option>
                    <option value="in_progress">در حال پیگیری</option>
                    <option value="answered">پاسخ داده شده</option>
                    <option value="unanswered">بی‌پاسخ (جدید)</option>
                  </select>
                </div>

                {/* Confidentiality */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">سطح محرمانگی</label>
                  <select
                    value={filterConfidential}
                    onChange={(e: any) => setFilterConfidential(e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-none text-xs font-bold text-right text-gray-700"
                    id="filter-confidentiality"
                  >
                    <option value="all">همه تیکت‌ها</option>
                    <option value="confidential">فقط فوق محرمانه</option>
                    <option value="normal">عادی</option>
                  </select>
                </div>

                {/* Anonymity */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">هویت گزارش‌دهنده</label>
                  <select
                    value={filterAnonymous}
                    onChange={(e: any) => setFilterAnonymous(e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-none text-xs font-bold text-right text-gray-700"
                    id="filter-anonymity"
                  >
                    <option value="all">همه تیکت‌ها</option>
                    <option value="anonymous">پرسنل کاملا ناشناس</option>
                    <option value="personnel">پرسنل رسمی (هویت مشخص)</option>
                  </select>
                </div>
              </div>

              {/* SECOND ROW: Jalali Date picker range & clear button */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4 pt-4 border-t border-gray-100 items-end">
                <div className="lg:col-span-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* From Jalali Date */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-gray-600">از تاریخ ثبت (شمسی)</span>
                    <div className="flex gap-2">
                      <select
                        value={filterJalaliFromYear}
                        onChange={(e) => setFilterJalaliFromYear(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs font-sans text-gray-700"
                      >
                        <option value="">سال</option>
                        <option value="1403">1403</option>
                        <option value="1404">1404</option>
                        <option value="1405">1405</option>
                        <option value="1406">1406</option>
                      </select>
                      <select
                        value={filterJalaliFromMonth}
                        onChange={(e) => setFilterJalaliFromMonth(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs text-gray-700"
                      >
                        <option value="">ماه</option>
                        <option value="1">فروردین</option>
                        <option value="2">اردیبهشت</option>
                        <option value="3">خرداد</option>
                        <option value="4">تیر</option>
                        <option value="5">مرداد</option>
                        <option value="6">شهریور</option>
                        <option value="7">مهر</option>
                        <option value="8">آبان</option>
                        <option value="9">آذر</option>
                        <option value="10">دی</option>
                        <option value="11">بهمن</option>
                        <option value="12">اسفند</option>
                      </select>
                      <select
                        value={filterJalaliFromDay}
                        onChange={(e) => setFilterJalaliFromDay(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs font-sans text-gray-700"
                      >
                        <option value="">روز</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={String(d)}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* To Jalali Date */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-gray-600">تا تاریخ ثبت (شمسی)</span>
                    <div className="flex gap-2">
                      <select
                        value={filterJalaliToYear}
                        onChange={(e) => setFilterJalaliToYear(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs font-sans text-gray-700"
                      >
                        <option value="">سال</option>
                        <option value="1403">1403</option>
                        <option value="1404">1404</option>
                        <option value="1405">1405</option>
                        <option value="1406">1406</option>
                      </select>
                      <select
                        value={filterJalaliToMonth}
                        onChange={(e) => setFilterJalaliToMonth(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs text-gray-700"
                      >
                        <option value="">ماه</option>
                        <option value="1">فروردین</option>
                        <option value="2">اردیبهشت</option>
                        <option value="3">خرداد</option>
                        <option value="4">تیر</option>
                        <option value="5">مرداد</option>
                        <option value="6">شهریور</option>
                        <option value="7">مهر</option>
                        <option value="8">آبان</option>
                        <option value="9">آذر</option>
                        <option value="10">دی</option>
                        <option value="11">بهمن</option>
                        <option value="12">اسفند</option>
                      </select>
                      <select
                        value={filterJalaliToDay}
                        onChange={(e) => setFilterJalaliToDay(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs font-sans text-gray-700"
                      >
                        <option value="">روز</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={String(d)}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <button
                    onClick={() => {
                      setFilterId('');
                      setFilterCategory('');
                      setFilterStatus('');
                      setFilterConfidential('all');
                      setFilterAnonymous('all');
                      setFilterJalaliFromYear('');
                      setFilterJalaliFromMonth('');
                      setFilterJalaliFromDay('');
                      setFilterJalaliToYear('');
                      setFilterJalaliToMonth('');
                      setFilterJalaliToDay('');
                    }}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 text-xs font-bold transition rounded-none cursor-pointer"
                    id="btn-reset-filters"
                  >
                    حذف فیلترها
                  </button>
                </div>
              </div>
            </div>

            {/* FULL-WIDTH TICKETS LIST */}
            <div className="bg-white border border-gray-200 p-5 md:p-6 rounded-none shadow-sm flex flex-col justify-between" id="tickets-main-list-card">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
                  <h4 className="text-base font-black text-gray-800 flex items-center gap-1.5">
                    لیست پرونده‌های یافت شده
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 font-sans font-black">{filteredTickets.length} مورد</span>
                  </h4>

                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchTickets()}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs border border-gray-200 transition flex items-center gap-1 rounded-none"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      بروزرسانی تیکت‌ها
                    </button>
                    <button
                      onClick={exportToExcel}
                      className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white font-bold text-xs transition flex items-center gap-1 shadow-sm rounded-none"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      خروجی اکسل (CSV)
                    </button>
                  </div>
                </div>

                {loadingTickets ? (
                  <div className="text-center py-20 text-xs text-gray-400">در حال بارگیری پرونده‌ها...</div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-20 space-y-2">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="text-xs text-gray-500 font-black">هیچ تیکتی متناسب با فیلترهای بالا یافت نشد.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100" id="tickets-table-rows">
                    {filteredTickets.map((t) => {
                      const isUnread = t.status === 'unread';
                      return (
                        <div
                          key={t.id}
                          onClick={() => onViewTicket(t)}
                          className={`py-4 px-2 hover:bg-gray-50/50 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-none ${
                            isUnread ? 'bg-red-50/30 border-r-4 border-red-500' : ''
                          }`}
                          id={`ticket-row-admin-${t.id}`}
                        >
                          <div className="space-y-1.5 text-right flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-sans font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-none">{t.id}</span>
                              {t.confidential && (
                                <span className="text-[9px] bg-yellow-50 text-yellow-800 border border-yellow-200 px-1.5 py-0.5 font-bold flex items-center gap-0.5 rounded-none">
                                  <Lock className="w-2.5 h-2.5" />
                                  محرمانه
                                </span>
                              )}
                              {isUnread && (
                                <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 font-bold animate-pulse rounded-none">
                                  خوانده نشده
                                </span>
                              )}
                            </div>
                            <h5 className="text-xs font-black text-gray-800 leading-snug line-clamp-1">{t.title}</h5>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                              <span className="text-red-600 bg-red-50 px-2 py-0.5 font-bold rounded-none">{t.category}</span>
                              <span>•</span>
                              <span className="font-semibold">{t.isAnonymous ? 'پرسنل ناشناس' : `${t.employeeName} (${t.storeBranch})`}</span>
                              <span>•</span>
                              <span>{new Date(t.createdAt).toLocaleDateString('fa-IR')}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-[9px] text-gray-400 block font-bold">وضعیت پرونده</span>
                              <span className="text-xs font-black text-gray-800">{getStatusLabel(t.status)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 3: DEFINE & BULK CSV IMPORT EMPLOYEES */}
        {activeTab === 'employees' && (
          <div className="space-y-6 animate-fade-in" id="employees-view-container">
            
            {/* TOP SECTION: ACTIONS SIDE-BY-SIDE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="employees-tools-top">
              
              {/* BULK CSV IMPORT WIDGET */}
              <div className="bg-white border border-gray-200 p-5 space-y-4 rounded-none shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-black text-gray-800 pb-2 border-b border-gray-100 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-red-600" />
                    درون‌ریزی دسته‌ای پرسنل (CSV)
                  </h4>

                  <p className="text-xs text-gray-400 leading-relaxed mt-2">
                    می‌توانید برای تعریف سریع پرسنل دیلی مارکت، فایل اکسل خروجی خود را با پسوند <strong className="text-black font-sans">.csv</strong> آپلود کنید. کد پرسنلی منحصر به فرد است و همکاران تکراری نادیده گرفته می‌شوند.
                  </p>

                  {/* CSV Instructions Box */}
                  <div className="bg-gray-50 p-3 text-[10px] text-gray-500 font-sans leading-relaxed border border-gray-100 my-3">
                    <span className="font-bold text-gray-700 block mb-1">سرستون‌های مجاز سیستم (Persian & English):</span>
                    <code className="block break-all bg-gray-100 p-1 mt-1 text-red-600 text-[9px]">personnel_code, national_id, full_name, phone, department, job_title, service_location_title, employment_date, birth_date</code>
                  </div>

                  {/* File picker */}
                  <div className="border-2 border-dashed border-gray-200 p-4 text-center hover:bg-gray-50/50 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileSelected}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-xs font-bold text-gray-700 block">انتخاب فایل پرسنل CSV</span>
                    <span className="text-[10px] text-gray-400 block mt-1">یا فایل را به این بخش بکشید و رها کنید</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {csvError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs border-r-4 border-red-500 font-bold">
                      {csvError}
                    </div>
                  )}

                  {csvResult && (
                    <div className="p-3 bg-green-50 text-green-800 text-xs border-r-4 border-green-600 font-bold space-y-1">
                      <span className="block">عملیات با موفقیت انجام شد:</span>
                      <span className="block">• تعداد {csvResult.imported} همکار با موفقیت درون‌ریزی شدند.</span>
                      {csvResult.skipped > 0 && (
                        <span className="block text-amber-700">• تعداد {csvResult.skipped} همکار به دلیل تکراری بودن یا نواقص نادیده گرفته شدند.</span>
                      )}
                    </div>
                  )}

                  {/* Preview Parsed CSV data before uploading */}
                  {csvPreview.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-green-600">تعداد {csvPreview.length} رکورد آماده بارگذاری</span>
                        <button 
                          onClick={() => setCsvPreview([])}
                          className="text-red-500 hover:underline text-[10px]"
                        >
                          لغو بارگذاری
                        </button>
                      </div>

                      {/* Preview summary table */}
                      <div className="max-h-40 overflow-y-auto border border-gray-100 font-sans text-[10px]">
                        <table className="w-full text-right">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="p-1 border-b">کد پرسنلی</th>
                              <th className="p-1 border-b">نام و نشان</th>
                              <th className="p-1 border-b">شعبه / محل</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {csvPreview.slice(0, 10).map((row, idx) => (
                              <tr key={idx} className="bg-white">
                                <td className="p-1">{row.personnelCode}</td>
                                <td className="p-1 truncate max-w-[80px]">{row.fullName}</td>
                                <td className="p-1 truncate max-w-[80px]">{row.storeBranch || 'تهران'}</td>
                              </tr>
                            ))}
                            {csvPreview.length > 10 && (
                              <tr>
                                <td colSpan={3} className="p-1 text-center text-gray-400">... و {csvPreview.length - 10} همکار دیگر</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <button
                        onClick={handleCommitImport}
                        disabled={csvImporting}
                        className="w-full py-2 bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs transition rounded-none shadow-sm"
                      >
                        {csvImporting ? 'در حال ثبت اطلاعات...' : 'تایید و ثبت نهایی پرسنل در سیستم'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* MANUAL DEFINE SINGLE EMPLOYEE */}
              <div className="bg-white border border-gray-200 p-5 space-y-4 rounded-none shadow-sm" id="add-employee-card">
                <h4 className="text-sm font-black text-gray-800 pb-2 border-b border-gray-100 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-red-600" />
                  ثبت مشخصات کارمند منفرد جدید
                </h4>

                {empError && (
                  <div className="bg-red-50 border-r-4 border-red-500 p-3 text-xs text-red-700 rounded-none">
                    {empError}
                  </div>
                )}

                <form onSubmit={handleAddEmployee} className="space-y-3" id="add-employee-form">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">نام و نام خانوادگی کامل</label>
                    <input
                      type="text"
                      placeholder="مثال: مهرداد اکبری"
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs"
                      id="input-emp-name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">کد پرسنلی (یکتا)</label>
                      <input
                        type="text"
                        placeholder="160015"
                        value={empPersonnelCode}
                        onChange={(e) => setEmpPersonnelCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs font-sans text-center font-bold"
                        id="input-emp-code"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">کد ملی کارمند</label>
                      <input
                        type="text"
                        placeholder="11114479"
                        value={empNationalCode}
                        onChange={(e) => setEmpNationalCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs font-sans text-center font-bold"
                        id="input-emp-national"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">واحد سازمانی</label>
                      <input
                        type="text"
                        placeholder="مثال: واحد انفورماتیک"
                        value={empDept}
                        onChange={(e) => setEmpDept(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs"
                        id="input-emp-dept"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">تلفن همراه</label>
                      <input
                        type="text"
                        placeholder="9355730113"
                        value={empPhone}
                        onChange={(e) => setEmpPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs font-sans text-center"
                        id="input-emp-phone"
                      />
                    </div>
                  </div>

                   <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">محل خدمت (شعبه)</label>
                      <input
                        type="text"
                        placeholder="دفترمرکزی تهران"
                        value={empBranch}
                        onChange={(e) => setEmpBranch(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs"
                        id="input-emp-branch"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">سمت کارمند</label>
                      <input
                        type="text"
                        placeholder="مثال: مدیر انفورماتیک / مسئول چیدمان"
                        value={empJobTitle}
                        onChange={(e) => setEmpJobTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs"
                        id="input-emp-job-title"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">سطح دسترسی در سامانه</label>
                    <select
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs font-bold text-gray-700"
                      id="input-emp-role"
                    >
                      <option value="پرسنل عادی">پرسنل عادی (فاقد دسترسی مدیریت)</option>
                      <option value="کارشناس پاسخگو">کارشناس پاسخگو (ارتقا به سطح دسترسی مدیریت)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={empSubmitting}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs transition shadow-sm rounded-none"
                    id="btn-submit-employee"
                  >
                    {empSubmitting ? "در حال ثبت اطلاعات..." : "ثبت و تایید کارمند"}
                  </button>
                </form>
              </div>

            </div>

            {/* REGISTERED EMPLOYEES LIST VIEW (FULL WIDTH BOTTOM) */}
            <div className="bg-white border border-gray-200 p-5 md:p-6 rounded-none shadow-sm flex flex-col justify-between space-y-4" id="employees-list-card">
              <div>
                {/* Header with Search and Limit selectors */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-4 border-b border-gray-100 mb-4" id="employees-list-header">
                  <h4 className="text-sm font-black text-gray-800 flex items-center gap-1.5 shrink-0">
                    <Users className="w-4 h-4 text-red-600" />
                    لیست پرسنل فعال و مجاز در سامانه
                    <span className="text-xs bg-red-50 text-red-600 px-2.5 py-1 font-black rounded-none font-sans mr-2">
                      {employeesTotal} نفر کل بانک پرسنل
                    </span>
                  </h4>

                  <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-center flex-1 justify-end max-w-2xl">
                    <div className="relative w-full sm:max-w-xs">
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </span>
                      <input
                        type="text"
                        value={employeesSearch}
                        onChange={(e) => {
                          setEmployeesSearch(e.target.value);
                          setEmployeesPage(1); // Back to page 1 on search
                        }}
                        placeholder="جستجو در نام، کد ملی، پرسنلی و شعبه..."
                        className="w-full pl-3 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-none text-xs text-right font-sans focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 whitespace-nowrap">نمایش در صفحه:</span>
                      <select
                        value={employeesLimit}
                        onChange={(e) => {
                          setEmployeesLimit(Number(e.target.value));
                          setEmployeesPage(1);
                        }}
                        className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs font-sans focus:outline-none focus:border-red-500"
                      >
                        <option value={10}>۱۰ رکورد</option>
                        <option value={15}>۱۵ رکورد</option>
                        <option value={25}>۲۵ رکورد</option>
                        <option value={50}>۵۰ رکورد</option>
                        <option value={100}>۱۰۰ رکورد</option>
                      </select>
                    </div>
                  </div>
                </div>

                {loadingEmployees ? (
                  <div className="text-center py-20 text-xs text-gray-400">در حال دریافت لیست کارمندان...</div>
                ) : employees.length === 0 ? (
                  <p className="text-center py-20 text-xs text-gray-400">هیچ کارمندی با فیلتر یا نام مشخص شده یافت نشد.</p>
                ) : (
                  <div className="overflow-x-auto" id="employees-table">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 text-[11px]">
                          <th className="py-2.5 px-2">نام کامل</th>
                          <th className="py-2.5 px-2">کد پرسنلی</th>
                          <th className="py-2.5 px-2">کد ملی</th>
                          <th className="py-2.5 px-2">واحد / دپارتمان</th>
                          <th className="py-2.5 px-2">سمت شغلی</th>
                          <th className="py-2.5 px-2">سطح دسترسی</th>
                          <th className="py-2.5 px-2">محل خدمت</th>
                          <th className="py-2.5 px-2">تلفن همراه</th>
                          <th className="py-2.5 px-2 text-center">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-[11px]">
                        {employees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-gray-50/50" id={`emp-row-${emp.id}`}>
                            <td className="py-3 px-2 font-black text-gray-800">{emp.fullName}</td>
                            <td className="py-3 px-2 font-sans font-bold text-gray-600">{emp.personnelCode}</td>
                            <td className="py-3 px-2 font-sans text-gray-500">{emp.nationalCode}</td>
                            <td className="py-3 px-2 text-gray-600">{emp.department || 'دفترمرکزی'}</td>
                            <td className="py-3 px-2 text-gray-700 font-medium">{emp.jobTitle || 'پرسنل'}</td>
                            <td className="py-3 px-2">
                              {emp.role === 'کارشناس پاسخگو' ? (
                                <span className="bg-red-50 text-red-700 px-2 py-0.5 font-bold text-[10px] border border-red-100">کارشناس پاسخگو</span>
                              ) : (
                                <span className="text-gray-500 text-[10px]">پرسنل عادی</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-gray-600">{emp.storeBranch}</td>
                            <td className="py-3 px-2 font-sans text-gray-500">{emp.phone || 'ثبت‌نشده'}</td>
                             <td className="py-3 px-2 text-center flex items-center justify-center gap-1.5">
                               <button
                                 onClick={() => startEditingEmployee(emp)}
                                 className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
                                 title="ویرایش پرسنل"
                                 id={`btn-edit-emp-${emp.id}`}
                               >
                                 <Edit className="w-4 h-4" />
                               </button>
                               <button
                                 onClick={() => handleDeleteEmployee(emp.id)}
                                 className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 transition"
                                 title="حذف پرسنل"
                                 id={`btn-delete-emp-${emp.id}`}
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* PAGINATION PANEL */}
              {!loadingEmployees && employeesTotal > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  <div className="font-sans">
                    نمایش رکورد {Math.min(employeesTotal, (employeesPage - 1) * employeesLimit + 1)} تا {Math.min(employeesTotal, employeesPage * employeesLimit)} از کل {employeesTotal} پرسنل ثبت‌شده
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={employeesPage === 1}
                      onClick={() => setEmployeesPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition rounded-none"
                    >
                      قبلی
                    </button>
                    <span className="font-sans font-bold px-3 py-1 bg-gray-50 border border-gray-100 text-gray-700">
                      صفحه {employeesPage} از {Math.ceil(employeesTotal / employeesLimit) || 1}
                    </span>
                    <button
                      disabled={employeesPage >= Math.ceil(employeesTotal / employeesLimit)}
                      onClick={() => setEmployeesPage(p => p + 1)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition rounded-none"
                    >
                      بعدی
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 4: CHANGE PASSWORD PANEL */}
        {activeTab === 'change_password' && (
          <div className="bg-white border border-gray-200 p-5 md:p-6 rounded-none shadow-sm animate-fade-in space-y-6 max-w-sm mx-auto my-12" id="change-password-view">
            <div className="pb-4 border-b border-gray-100">
              <h4 className="text-base font-black text-gray-800 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-red-600" />
                تغییر کلمه عبور سیستم
              </h4>
              <p className="text-xs text-gray-400 mt-1">جهت حفظ امنیت حساب کاربری خود، کلمه عبور خود را تغییر دهید.</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setPasswordError(null);
              setPasswordSuccess(null);

              if (newPassword !== confirmPassword) {
                setPasswordError('کلمه عبور جدید و تکرار آن با هم مطابقت ندارند.');
                return;
              }

              if (newPassword.length < 4) {
                setPasswordError('کلمه عبور جدید باید حداقل ۴ کاراکتر باشد.');
                return;
              }

              try {
                const response = await fetch('/api/auth/change-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    role: user?.role === 'admin' && !user?.personnelCode ? 'admin' : 'employee',
                    personnelCode: user?.personnelCode,
                    currentPassword,
                    newPassword
                  })
                });

                const data = await response.json();
                if (!response.ok) {
                  throw new Error(data.message || 'کلمه عبور فعلی اشتباه است.');
                }

                setPasswordSuccess('کلمه عبور شما با موفقیت تغییر یافت.');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              } catch (err: any) {
                setPasswordError(err.message || 'خطایی در تغییر کلمه عبور رخ داد.');
              }
            }} className="space-y-4" id="form-change-password">
              
              {passwordError && (
                <div className="bg-red-50 border-r-4 border-red-500 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-bold leading-relaxed">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-emerald-50 border-r-4 border-emerald-500 p-3 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
                  <p className="text-xs text-emerald-700 font-bold leading-relaxed">{passwordSuccess}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">کلمه عبور فعلی</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="رمز عبور فعلی خود را وارد کنید"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 text-xs font-sans text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">کلمه عبور جدید</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="کلمه عبور جدید (حداقل ۴ کاراکتر)"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 text-xs font-sans text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">تکرار کلمه عبور جدید</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تکرار کلمه عبور جدید"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 text-xs font-sans text-right"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs transition rounded-none shadow-sm cursor-pointer"
                >
                  ثبت کلمه عبور جدید
                </button>
              </div>

            </form>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="bg-white border border-gray-200 p-5 md:p-6 rounded-none shadow-sm animate-fade-in space-y-6" id="categories-management-view">
            <div className="pb-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-black text-gray-800 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-red-600" />
                  مدیریت دسته‌بندی‌ها و زیردسته‌ها (توسط مدیر کل)
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  دسته‌بندی‌ها و زیردسته‌های موجود در سیستم را اضافه، حذف یا ویرایش کنید. این تغییرات فوراً در فرم ثبت گزارش پرسنل و داشبوردها اعمال می‌شود.
                </p>
              </div>
              <button
                onClick={() => saveCategories(categoriesList)}
                disabled={loadingCategories}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-none transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loadingCategories ? "در حال ذخیره..." : "ذخیره نهایی تمامی تغییرات"}
              </button>
            </div>

            {/* ADD NEW CATEGORY BLOCK */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-none space-y-3">
              <h5 className="text-xs font-bold text-gray-700">افزودن دسته‌بندی اصلی جدید</h5>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="عنوان دسته‌بندی اصلی (مثال: ایمنی و بهداشت)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 focus:outline-none focus:border-red-600 text-xs rounded-none text-right"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCatName.trim()) return;
                    if (categoriesList.some(c => c.name === newCatName.trim())) {
                      showSystemToast("این دسته‌بندی از قبل وجود دارد.", "error");
                      return;
                    }
                    const updated = [...categoriesList, { name: newCatName.trim(), subcategories: [] }];
                    setCategoriesList(updated);
                    setNewCatName('');
                    showSystemToast(`دسته‌بندی "${newCatName.trim()}" موقتاً اضافه شد. لطفاً دکمه ذخیره نهایی را بزنید.`, "info");
                  }}
                  className="px-4 py-2 bg-black text-white hover:bg-gray-800 text-xs font-bold rounded-none transition cursor-pointer"
                >
                  افزودن
                </button>
              </div>
            </div>

            {/* CATEGORIES LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoriesList.map((cat, catIdx) => (
                <div key={catIdx} className="border border-gray-200 bg-white p-4 space-y-4 rounded-none relative">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-1.5 flex-1 font-sans">
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => {
                          const updated = [...categoriesList];
                          updated[catIdx].name = e.target.value;
                          setCategoriesList(updated);
                        }}
                        className="font-bold text-xs text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-red-600 focus:outline-none py-0.5 px-1 flex-1 text-right"
                        title="برای ویرایش نام کلیک کنید"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`آیا از حذف دسته‌بندی "${cat.name}" و تمامی زیردسته‌های آن اطمینان دارید؟`)) {
                          const updated = categoriesList.filter((_, idx) => idx !== catIdx);
                          setCategoriesList(updated);
                          showSystemToast("دسته‌بندی حذف شد. برای ذخیره نهایی دکمه ذخیره بالا را بزنید.", "info");
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 transition p-1"
                      title="حذف دسته‌بندی اصلی"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* SUBCATEGORIES SECTION */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 block">زیردسته‌ها:</span>
                    {cat.subcategories.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic">هیچ زیردسته‌ای ثبت نشده است.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                        {cat.subcategories.map((sub, subIdx) => (
                          <div key={subIdx} className="bg-gray-50/70 hover:bg-gray-50 border border-gray-100 p-2 flex items-center justify-between text-xs text-gray-700 rounded-none font-sans">
                            <input
                              type="text"
                              value={sub}
                              onChange={(e) => {
                                const updated = [...categoriesList];
                                updated[catIdx].subcategories[subIdx] = e.target.value;
                                setCategoriesList(updated);
                              }}
                              className="bg-transparent border-b border-transparent hover:border-gray-200 focus:border-red-600 focus:outline-none flex-1 font-medium text-[11px] text-right"
                              title="برای ویرایش کلیک کنید"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...categoriesList];
                                updated[catIdx].subcategories = updated[catIdx].subcategories.filter((_, sIdx) => sIdx !== subIdx);
                                setCategoriesList(updated);
                                showSystemToast("زیردسته حذف شد. دکمه ذخیره نهایی را بزنید.", "info");
                              }}
                              className="text-gray-400 hover:text-red-600 transition p-0.5"
                              title="حذف زیردسته"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ADD SUBCATEGORY FORM */}
                    <div className="flex gap-1.5 pt-2">
                      <input
                        type="text"
                        placeholder="زیردسته جدید..."
                        value={newSubNames[catIdx] || ''}
                        onChange={(e) => setNewSubNames(prev => ({ ...prev, [catIdx]: e.target.value }))}
                        className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 focus:outline-none focus:border-red-600 text-[11px] rounded-none text-right"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = newSubNames[catIdx]?.trim();
                          if (!val) return;
                          if (cat.subcategories.includes(val)) {
                            showSystemToast("این زیردسته تکراری است.", "error");
                            return;
                          }
                          const updated = [...categoriesList];
                          updated[catIdx].subcategories.push(val);
                          setCategoriesList(updated);
                          setNewSubNames(prev => ({ ...prev, [catIdx]: '' }));
                          showSystemToast("زیردسته افزوده شد. برای ذخیره نهایی دکمه ذخیره بالا را بزنید.", "info");
                        }}
                        className="px-3 py-1.5 bg-gray-800 text-white hover:bg-black text-[11px] font-bold rounded-none transition cursor-pointer"
                      >
                        افزودن
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai_config' && (
          <div className="bg-white border border-gray-200 p-5 md:p-6 rounded-none shadow-sm animate-fade-in space-y-6 max-w-2xl mx-auto" id="ai-configuration-view">
            <div className="pb-4 border-b border-gray-100">
              <h4 className="text-base font-black text-gray-800 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-red-600" />
                پیکربندی هوش مصنوعی کمکی صیانت (Gemini API)
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                تنظیمات مربوط به پردازش، خلاصه سازی خودکار گزارش‌ها و تولید پاسخ پیشنهادی توسط هوش مصنوعی را ویرایش کنید.
              </p>
            </div>

            <form onSubmit={handleSaveAIConfig} className="space-y-5" id="form-ai-config">
              {aiConfigSuccess && (
                <div className="bg-emerald-50 border-r-4 border-emerald-500 p-3 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
                  <p className="text-xs text-emerald-700 font-bold leading-relaxed">{aiConfigSuccess}</p>
                </div>
              )}

              {aiConfigError && (
                <div className="bg-red-50 border-r-4 border-red-500 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-bold leading-relaxed">{aiConfigError}</p>
                </div>
              )}

              {/* Toggle switch */}
              <div className="flex items-center justify-between bg-gray-50 p-4 border border-gray-200 rounded-none">
                <div>
                  <label className="block text-xs font-bold text-gray-800">فعال بودن هوش مصنوعی کمکی</label>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">در صورت غیرفعال کردن، تحلیل خودکار گزارش‌ها انجام نخواهد شد.</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="w-5 h-5 text-red-600 border-gray-300 rounded-none focus:ring-0 cursor-pointer"
                />
              </div>

              {/* API Key configuration input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">کلید اختصاصی Gemini API Key (سکرت کی)</label>
                <input
                  type="password"
                  placeholder="کلید اختصاصی خود را وارد کنید (در صورت خالی بودن از کلید پیش‌فرض سرور استفاده می‌شود)"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 text-xs text-left font-mono"
                  id="input-ai-api-key"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">این فیلد به مدیر اجازه می‌دهد سکرت کی اختصاصی برای پردازش‌های هوش مصنوعی تعریف کند.</span>
              </div>

              {/* Model selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">مدل پردازش هوش مصنوعی (Model)</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 text-xs text-right font-sans"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (سریع‌ترین مدل پیشنهادی)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (پیشرفته‌ترین مدل تحلیلی)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (پایداری عمومی)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
              </div>

              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700">میزان خلاقیت و دما (Temperature)</label>
                  <span className="text-xs font-mono font-bold text-red-600">{aiTemperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={aiTemperature}
                  onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <span className="text-[9px] text-gray-400 mt-1 block">دمای کمتر پاسخ‌های منطقی‌تر و دقیق‌تر؛ دمای بالاتر پاسخ‌های صمیمانه‌تر و خلاقانه‌تر ایجاد می‌کند.</span>
              </div>

              {/* System Instructions / Prompting */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">دستورالعمل سیستم و رفتار هوش مصنوعی (System Instruction)</label>
                <textarea
                  rows={8}
                  value={aiSystemInstruction}
                  onChange={(e) => setAiSystemInstruction(e.target.value)}
                  placeholder="تعیین نقش و هویت هوش مصنوعی به صورت متن فارسی..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 text-xs leading-relaxed text-right font-medium"
                />
                <span className="text-[9px] text-gray-400 mt-1 block">نقش سیستم، لحن پاسخ‌دهی و دستورات امنیتی خود را برای پردازش گزارش‌ها در اینجا تعریف کنید.</span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loadingAIConfig}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs transition rounded-none shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loadingAIConfig ? "در حال ذخیره تغییرات..." : "ثبت و بروزرسانی تنظیمات هوش مصنوعی"}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {editingEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="edit-employee-modal">
          <div className="bg-white border border-gray-200 p-6 max-w-md w-full rounded-none shadow-xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-800 text-sm">ویرایش اطلاعات پرسنل</h3>
              <button 
                onClick={() => setEditingEmployee(null)}
                className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
              >
                بستن
              </button>
            </div>

            {editEmpError && (
              <div className="bg-red-50 border-r-4 border-red-500 p-2.5 text-xs text-red-700">
                {editEmpError}
              </div>
            )}

            <form onSubmit={handleEditEmployeeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">کد پرسنلی (غیرقابل ویرایش)</label>
                <input
                  type="text"
                  value={editingEmployee.personnelCode}
                  disabled
                  className="w-full px-2.5 py-1.5 bg-gray-100 border border-gray-200 rounded-none text-xs font-sans text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">نام و نام خانوادگی کامل</label>
                <input
                  type="text"
                  value={editEmpName}
                  onChange={(e) => setEditEmpName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs text-gray-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">کد ملی</label>
                  <input
                    type="text"
                    value={editEmpNationalCode}
                    onChange={(e) => setEditEmpNationalCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs font-sans text-gray-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">شماره همراه</label>
                  <input
                    type="text"
                    value={editEmpPhone}
                    onChange={(e) => setEditEmpPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs font-sans text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">دپارتمان / بخش</label>
                  <input
                    type="text"
                    value={editEmpDept}
                    onChange={(e) => setEditEmpDept(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">محل خدمت (شعبه)</label>
                  <input
                    type="text"
                    value={editEmpBranch}
                    onChange={(e) => setEditEmpBranch(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">سمت شغلی</label>
                <input
                  type="text"
                  placeholder="مثال: مدیر انفورماتیک / مسئول چیدمان"
                  value={editEmpJobTitle}
                  onChange={(e) => setEditEmpJobTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs text-gray-800"
                />
              </div>

              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-bold text-gray-600 mb-1.5">سطح دسترسی در سامانه</label>
                <select
                  value={editEmpRole}
                  onChange={(e) => setEditEmpRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs font-bold text-gray-700"
                >
                  <option value="پرسنل عادی">پرسنل عادی (فاقد دسترسی مدیریت)</option>
                  <option value="کارشناس پاسخگو">کارشناس پاسخگو (ارتقا به سطح دسترسی مدیریت)</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  * با ارتقا به <span className="text-red-600 font-bold">"کارشناس پاسخگو"</span>، این فرد مجاز به ورود به پنل مدیریت صدای همکار خواهد بود و می‌تواند گزارش‌ها را بررسی و پاسخ دهد.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={editEmpSubmitting}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-none transition cursor-pointer"
                >
                  {editEmpSubmitting ? "در حال ثبت..." : "ذخیره تغییرات"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-none transition cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
