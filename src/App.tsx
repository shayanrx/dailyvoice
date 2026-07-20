import { useState, useEffect } from 'react';
import { Ticket, ActiveUser } from './types';
import EmployeeLoginModal from './components/EmployeeLoginModal';
import AdminLoginModal from './components/AdminLoginModal';
import AnonymousFormModal from './components/AnonymousFormModal';
import TrackReportModal from './components/TrackReportModal';
import AnonymousForm from './components/AnonymousForm';
import PersonnelPanel from './components/PersonnelPanel';
import AdminPanel from './components/AdminPanel';
import TicketDetail from './components/TicketDetail';
import { MessageSquare, Shield, HelpCircle, ShieldAlert, BookOpen, AlertCircle, PhoneCall, Fingerprint, Search, User, LogIn, Lock, CheckCircle, ChevronLeft } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<ActiveUser | null>(() => {
    try {
      const saved = localStorage.getItem('dailyvoice_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [mode, setMode] = useState<'login' | 'anonymous' | 'dashboard'>(() => {
    try {
      const savedUser = localStorage.getItem('dailyvoice_user');
      const savedMode = localStorage.getItem('dailyvoice_mode');
      if (savedUser) {
        return (savedMode as any) || 'dashboard';
      }
      return 'login';
    } catch {
      return 'login';
    }
  });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [adminRefreshTrigger, setAdminRefreshTrigger] = useState(false);

  // Modals state
  const [isEmployeeLoginOpen, setIsEmployeeLoginOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAnonymousModalOpen, setIsAnonymousModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);

  // Sync mode changes to localStorage
  const updateMode = (newMode: 'login' | 'anonymous' | 'dashboard') => {
    setMode(newMode);
    try {
      localStorage.setItem('dailyvoice_mode', newMode);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoginSuccess = (userData: ActiveUser) => {
    setUser(userData);
    try {
      localStorage.setItem('dailyvoice_user', JSON.stringify(userData));
      localStorage.setItem('dailyvoice_mode', 'dashboard');
    } catch (e) {
      console.error(e);
    }
    setMode('dashboard');
  };

  // If a ticket gets updated (e.g. status changes, message sent), we can refetch it
  const handleTicketUpdated = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/tickets/search?code=${selectedTicket.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedTicket(data.ticket);
        setAdminRefreshTrigger(prev => !prev);
      }
    } catch (err) {
      console.error("خطا در بروزرسانی تیکت فعال:", err);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setMode('login');
    setSelectedTicket(null);
    try {
      localStorage.removeItem('dailyvoice_user');
      localStorage.removeItem('dailyvoice_mode');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-right" dir="rtl" id="app-root">
      {/* MAIN LAYOUT */}
      <main className="flex-1 w-full max-w-none p-4 md:p-8" id="main-content-stage">
        {selectedTicket ? (
          /* DETAILED CONVERSATION VIEW (Active for anyone searching or dashboards) */
          <div className="animate-fade-in" id="stage-ticket-detail">
            <TicketDetail
              ticket={selectedTicket}
              isAdmin={user?.role === 'admin'}
              user={user}
              onBack={() => {
                setSelectedTicket(null);
                setAdminRefreshTrigger(prev => !prev);
              }}
              onTicketUpdated={handleTicketUpdated}
            />
          </div>
        ) : mode === 'login' && !user ? (
          /* STEP 1: PREMIUM, CLEAN PORTAL PAGE (MOBILE-APP INSPIRED, CRISP AND HIGHLY PROFESSIONAL) */
          <div className="py-4 md:py-10 max-w-lg mx-auto space-y-8 animate-fade-in text-center px-4" id="stage-login-clean">
            
            {/* Minimalist Portal Logo Emblem */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-red-600 flex items-center justify-center text-white shadow-md rounded-none">
                <Shield className="w-8 h-8" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-gray-800">
                سامانه صدای همکاران دیلی مارکت
              </h2>
              <p className="text-gray-500 text-xs leading-relaxed max-w-sm mx-auto">
                بستر رسمی و امن مستقل شرکت فروشگاه‌های زنجیره‌ای دیلی مارکت جهت ثبت گزارش‌ها، تخلفات و دغدغه‌های همکاران سراسر کشور با پیگیری مستقیم کارشناسان صیانت.
              </p>
            </div>

            {/* HIGH-CONTRAST PRIMARY ACTION AREA - MOBILE APP STYLE */}
            <div className="bg-white border border-gray-200 p-6 space-y-4 shadow-sm" id="portal-action-deck">
              
              {/* TWO LARGE ACTION BUTTONS (ANONYMOUS-FOCUSED) */}
              <div className="space-y-3" id="portal-primary-actions">
                {/* 1. ANONYMOUS SUBMIT - GLOWING/ROATING BORDER */}
                <button
                  onClick={() => {
                    setIsAnonymousModalOpen(true);
                  }}
                  className="glowing-button w-full p-5 bg-red-600 hover:bg-red-700 text-white transition text-right rounded-none flex items-center justify-between cursor-pointer group"
                  id="btn-portal-anonymous-submit"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/20 text-white rounded-none shrink-0 group-hover:scale-105 transition">
                      <Fingerprint className="w-6 h-6" />
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm md:text-base block">ثبت گزارش به صورت ناشناس</span>
                      <span className="text-[10px] text-red-100 font-bold block mt-0.5">بدون درج هیچ‌گونه مشخصات فردی</span>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-red-100 group-hover:translate-x-[-4px] transition" />
                </button>

                {/* 2. ANONYMOUS TRACK */}
                <button
                  onClick={() => {
                    setIsTrackModalOpen(true);
                  }}
                  className="w-full p-5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 transition text-right rounded-none flex items-center justify-between cursor-pointer group"
                  id="btn-portal-anonymous-track"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 text-gray-600 rounded-none shrink-0 group-hover:bg-red-600 group-hover:text-white transition">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm md:text-base block">پیگیری گزارش ناشناس</span>
                      <span className="text-[10px] text-gray-400 font-bold block mt-0.5">پیگیری با استفاده از کد رهگیری تیکت</span>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:translate-x-[-4px] transition" />
                </button>
              </div>

              {/* PERSONNEL SIGN IN / OFFICAL REPORT */}
              <div className="pt-2 border-t border-gray-100 text-center">
                <button
                  onClick={() => setIsEmployeeLoginOpen(true)}
                  className="w-full py-3 hover:bg-gray-50 text-red-600 font-bold transition rounded-none flex items-center justify-center gap-2 cursor-pointer text-xs md:text-sm"
                  id="btn-main-submit-report"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>ورود به سیستم و ثبت گزارش با کد پرسنلی</span>
                </button>
              </div>

            </div>

            {/* BENEFIT TRUST STATEMENTS */}
            <div className="grid grid-cols-3 gap-3" id="trust-statements">
              <div className="bg-white border border-gray-100 p-3 text-center">
                <span className="font-black text-[10px] text-gray-700 block">صیانت ۱۰۰٪</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">محرمانه بودن هویت</span>
              </div>
              <div className="bg-white border border-gray-100 p-3 text-center">
                <span className="font-black text-[10px] text-gray-700 block">پیگیری مستقیم</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">توسط کارشناسان صیانت</span>
              </div>
              <div className="bg-white border border-gray-100 p-3 text-center">
                <span className="font-black text-[10px] text-gray-700 block">پاسخگویی سریع</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">تضمین بررسی موثر</span>
              </div>
            </div>

            {/* SUBTLE PORTAL ADMIN SIGN IN */}
            <div className="pt-4 flex justify-center">
              <button
                onClick={() => setIsAdminLoginOpen(true)}
                className="text-[11px] font-bold text-gray-400 hover:text-red-600 transition flex items-center gap-1 cursor-pointer"
                id="btn-portal-admin-trigger"
              >
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                ورود کارشناسان پاسخگو و مدیران سیستم
              </button>
            </div>

          </div>
        ) : mode === 'anonymous' ? (
          /* ANONYMOUS CREATION & TRACKING */
          <div className="animate-fade-in" id="stage-anonymous">
            <AnonymousForm
              onBack={() => updateMode('login')}
              onViewTicket={(ticket) => setSelectedTicket(ticket)}
            />
          </div>
        ) : user?.role === 'admin' ? (
          /* ADMIN DASHBOARD PANELS */
          <div className="animate-fade-in" id="stage-admin">
            <AdminPanel
              onLogout={handleLogout}
              onViewTicket={(ticket) => setSelectedTicket(ticket)}
              refreshTrigger={adminRefreshTrigger}
              user={user}
            />
          </div>
        ) : user?.role === 'employee' ? (
          /* IDENTIFIED STAFF CARTEABLE */
          <div className="animate-fade-in" id="stage-personnel">
            <PersonnelPanel
              user={user as any}
              onLogout={handleLogout}
              onViewTicket={(ticket) => setSelectedTicket(ticket)}
            />
          </div>
        ) : null}
      </main>

      {/* ALL PORTAL MODALS */}
      <EmployeeLoginModal
        isOpen={isEmployeeLoginOpen}
        onClose={() => setIsEmployeeLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <AnonymousFormModal
        isOpen={isAnonymousModalOpen}
        onClose={() => setIsAnonymousModalOpen(false)}
        onViewTicket={(ticket) => setSelectedTicket(ticket)}
      />

      <TrackReportModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        onViewTicket={(ticket) => setSelectedTicket(ticket)}
      />
    </div>
  );
}
