import React, { useState, useEffect, useRef } from 'react';
import { Ticket, STANDARD_CATEGORIES } from '../types';
import AudioRecorder from './AudioRecorder';
import { User, ClipboardList, PlusCircle, LogOut, ArrowLeft, RefreshCw, Eye, Tag, AlertTriangle, Lock, X, AlertCircle, CheckCircle, Send, Trash2 } from 'lucide-react';

interface PersonnelPanelProps {
  user: { fullName: string; personnelCode: string; storeBranch: string; employeeRole: string };
  onLogout: () => void;
  onViewTicket: (ticket: Ticket) => void;
}

export default function PersonnelPanel({ user, onLogout, onViewTicket }: PersonnelPanelProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<'list' | 'create'>('list');

  // New ticket state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [confidential, setConfidential] = useState(true);
  const [voiceData, setVoiceData] = useState<string[]>([]);
  const [textSegments, setTextSegments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [dynamicCategories, setDynamicCategories] = useState<typeof STANDARD_CATEGORIES>(STANDARD_CATEGORIES);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDynamicCategories(data);
        }
      })
      .catch(err => console.error("Error fetching dynamic categories:", err));
  }, []);

  // Password change states
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 250)}px`;
    }
  }, [description]);

  const selectedCategoryObj = dynamicCategories.find(c => c.name === category);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/search?personnelCode=${user.personnelCode}`);
      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("خطا در بارگیری تیکت‌ها:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user.personnelCode]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const allTextParts = [...textSegments];
    if (description.trim()) {
      allTextParts.push(description.trim());
    }
    const combinedDesc = allTextParts.join('\n\n');

    if (!title || !category || !combinedDesc) {
      setError('پر کردن فیلدهای عنوان، دسته‌بندی و ارائه شرح گزارش الزامی است.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/tickets/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          subcategory,
          description: combinedDesc,
          confidential,
          personnelCode: user.personnelCode,
          employeeName: user.fullName,
          storeBranch: user.storeBranch,
          voiceData
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'خطا در ثبت گزارش.');
      }

      // Success
      setView('list');
      fetchTickets();
      // Reset form
      setTitle('');
      setCategory('');
      setSubcategory('');
      setDescription('');
      setTextSegments([]);
      setConfidential(true);
      setVoiceData([]);
    } catch (err: any) {
      setError(err.message || 'متاسفانه خطایی در ارتباط با سرور رخ داد.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unread':
        return <span className="px-2 py-1 text-[11px] font-bold rounded-none bg-red-100 text-red-700">خوانده نشده</span>;
      case 'read':
        return <span className="px-2 py-1 text-[11px] font-bold rounded-none bg-gray-100 text-gray-700">خوانده شده</span>;
      case 'unanswered':
        return <span className="px-2 py-1 text-[11px] font-bold rounded-none bg-orange-100 text-orange-700">بی‌پاسخ (جدید)</span>;
      case 'answered':
        return <span className="px-2 py-1 text-[11px] font-bold rounded-none bg-green-100 text-green-700">پاسخ داده شده</span>;
      case 'in_progress':
        return <span className="px-2 py-1 text-[11px] font-bold rounded-none bg-blue-100 text-blue-700">در حال پیگیری</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" id="personnel-panel-wrapper">
      {/* Upper Dashboard User Profile Header */}
      <div className="bg-white rounded-none shadow-sm border border-gray-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4" id="personnel-user-header">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-none bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg" id="avatar">
            {user.fullName[0]}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              {user.fullName}
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-none font-medium">{user.employeeRole}</span>
            </h3>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              کد پرسنلی: {user.personnelCode} | شعبه: {user.storeBranch}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto" id="personnel-action-buttons">
          {view === 'list' ? (
            <button
              onClick={() => setView('create')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-none transition text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              id="btn-new-report"
            >
              <PlusCircle className="w-4 h-4" />
              ثبت گزارش جدید
            </button>
          ) : (
            <button
              onClick={() => setView('list')}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-none transition text-xs flex items-center gap-1.5 cursor-pointer"
              id="btn-view-list"
            >
              <ArrowLeft className="w-4 h-4" />
              بازگشت به لیست
            </button>
          )}

          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-none transition cursor-pointer"
            title="تغییر کلمه عبور"
            id="btn-change-password-personnel"
          >
            <Lock className="w-5 h-5" />
          </button>

          <button
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-none transition cursor-pointer"
            title="خروج از حساب"
            id="btn-logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* VIEW: LIST TICKETS */}
      {view === 'list' && (
        <div className="bg-white rounded-none shadow-sm border border-gray-200 p-5 md:p-6" id="personnel-tickets-list">
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-base font-bold text-gray-800 flex items-center gap-1.5">
              <ClipboardList className="w-5 h-5 text-red-500" />
              کارتابل گزارش‌های من
            </h4>
            <button
              onClick={fetchTickets}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-none hover:bg-gray-100 transition cursor-pointer"
              title="بارگیری مجدد"
              id="btn-refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-gray-400">در حال بارگیری گزارش‌ها...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 space-y-3 border-2 border-dashed border-gray-100 rounded-none">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-500 font-medium">هیچ گزارشی تاکنون با مشخصات پرسنلی شما ثبت نشده است.</p>
              <button
                onClick={() => setView('create')}
                className="text-xs text-red-600 hover:underline font-bold cursor-pointer"
                id="btn-create-first"
              >
                ثبت اولین گزارش اکنون
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100" id="tickets-table">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="py-4 flex items-center justify-between hover:bg-gray-50/50 px-2 rounded-none transition cursor-pointer"
                  onClick={() => onViewTicket(ticket)}
                  id={`ticket-row-${ticket.id}`}
                >
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-none font-sans font-medium">{ticket.id}</span>
                    <h5 className="text-sm font-bold text-gray-800 leading-snug">{ticket.title}</h5>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{ticket.category}</span>
                      <span>•</span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString('fa-IR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {ticket.confidential && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-none">
                        محرمانه
                      </span>
                    )}
                    {getStatusBadge(ticket.status)}
                    <button
                      className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-none transition cursor-pointer"
                      title="مشاهده تیکت"
                      id={`btn-view-${ticket.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: CREATE REPORT */}
      {view === 'create' && (
        <div className="bg-white rounded-none shadow-sm border border-gray-200 p-5 md:p-6" id="personnel-create-ticket">
          <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-4">
            <h4 className="text-base font-bold text-gray-800">فرم ثبت گزارش جدید سازمانی</h4>
            <p className="text-xs text-red-600 font-sans">هویت شما برای تیم صیانت و پاسخگویی صدای همکار احراز شده است.</p>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-5" id="personnel-create-form">
            {error && (
              <div className="bg-red-50 border-r-4 border-red-500 p-3.5 rounded-none text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">عنوان گزارش</label>
              <input
                type="text"
                placeholder="مثال: آزار کلامی توسط یکی از همکاران صنف یا سوء استفاده مالی"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 transition text-sm"
                id="input-personnel-title"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">دسته‌بندی موضوعی</label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSubcategory('');
                  }}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 transition text-sm"
                  id="select-personnel-category"
                  required
                >
                  <option value="">-- انتخاب موضوع گزارش --</option>
                  {dynamicCategories.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">زیر موضوع</label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  disabled={!category}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  id="select-personnel-subcategory"
                >
                  <option value="">-- انتخاب زیر موضوع --</option>
                  {selectedCategoryObj?.subcategories.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">شرح واقعه</label>
              
              {/* Text segments listing */}
              {textSegments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {textSegments.map((text, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 border border-gray-200 flex items-start justify-between gap-3 animate-fade-in text-right">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-gray-400 block mb-1">بخش متنی گزارش شماره {idx + 1}</span>
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTextSegments(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-none transition flex items-center gap-1 text-[11px] font-bold cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative flex items-end border border-gray-200 bg-gray-50 p-1">
                <textarea
                  ref={textareaRef}
                  rows={3}
                  placeholder="شرح کامل به همراه ذکر نام فرد یا افراد خاطی، تاریخ وقوع و جزییات برای اقدام سریع تیم پاسخگویی."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex-1 px-3 py-2 bg-transparent border-0 focus:outline-none focus:ring-0 transition text-sm resize-none overflow-y-auto max-h-[180px] leading-relaxed text-gray-800"
                  id="textarea-personnel-description"
                />

                {description.trim().length > 0 && (
                  <div className="flex items-center p-1 self-center shrink-0 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => {
                        setTextSegments(prev => [...prev, description.trim()]);
                        setDescription('');
                        if (textareaRef.current) {
                          textareaRef.current.style.height = 'auto';
                        }
                      }}
                      className="w-10 h-10 rounded-none bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition shadow-sm cursor-pointer shrink-0"
                      title="ارسال و افزودن متن"
                    >
                      <Send className="w-4.5 h-4.5 -rotate-90 translate-x-[1px]" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Voice Recording */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">ضبط و ضمیمه کردن ویس</label>
              <AudioRecorder
                onAudioRecorded={(base64) => setVoiceData(prev => [...prev, base64])}
                onAudioDeleted={() => setVoiceData([])}
              />
            </div>

            {/* Confidential setting */}
            <div className="flex items-center gap-3 bg-red-50/40 border border-red-100 p-4 rounded-none">
              <input
                type="checkbox"
                id="personnel-toggle-confidential"
                checked={confidential}
                onChange={(e) => setConfidential(e.target.checked)}
                className="w-4.5 h-4.5 text-red-600 border-gray-300 rounded-none focus:ring-0 cursor-pointer"
              />
              <div className="flex-1">
                <label htmlFor="personnel-toggle-confidential" className="block text-xs font-bold text-gray-800 cursor-pointer">
                  با برچسب محرمانه ارسال شود.
                </label>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                  در این حالت، نام شما و این گزارش تنها توسط تیم صیانت و پاسخگویی دیلی مارکت رویت شده و از دسترس سایر افراد و مدیران شعب خارج می‌گردد.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-none shadow-sm transition text-sm flex items-center justify-center gap-2 cursor-pointer"
              id="btn-submit-personnel-report"
            >
              {submitting ? "در حال ارسال..." : "ارسال گزارش"}
            </button>
          </form>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" id="personnel-password-modal">
          <div className="bg-white w-full max-w-md rounded-none shadow-xl border border-gray-200 overflow-hidden relative animate-fade-in" style={{ direction: 'rtl' }}>
            
            {/* Header */}
            <div className="bg-red-600 px-6 py-6 text-white text-right relative">
              <button 
                onClick={() => {
                  setIsChangePasswordOpen(false);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="absolute top-4 left-4 text-white hover:text-red-200 transition p-1 cursor-pointer"
                id="close-password-modal"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-white" />
                <h3 className="text-lg font-black">تغییر کلمه عبور پرسنل</h3>
              </div>
              <p className="text-red-100 text-xs mt-1.5 font-light">
                کلمه عبور جدید شما جایگزین کد ملی جهت ورودهای بعدی خواهد شد.
              </p>
            </div>

            {/* Form Body */}
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
                    role: 'employee',
                    personnelCode: user.personnelCode,
                    currentPassword,
                    newPassword
                  })
                });

                const data = await response.json();
                if (!response.ok) {
                  throw new Error(data.message || 'کلمه عبور فعلی اشتباه است.');
                }

                setPasswordSuccess('کلمه عبور شما با موفقیت تغییر یافت. از این پس برای ورود از رمز عبور جدید استفاده کنید.');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              } catch (err: any) {
                setPasswordError(err.message || 'خطایی رخ داد.');
              }
            }} className="p-6 space-y-4 text-right">
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
                <label className="block text-xs font-bold text-gray-700 mb-1.5">کلمه عبور فعلی (کد ملی یا رمز قبلی)</label>
                <input
                  type="password"
                  placeholder="کلمه عبور فعلی خود را وارد کنید"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 transition text-sm font-sans text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">کلمه عبور جدید</label>
                <input
                  type="password"
                  placeholder="کلمه عبور جدید (حداقل ۴ کاراکتر)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 transition text-sm font-sans text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">تکرار کلمه عبور جدید</label>
                <input
                  type="password"
                  placeholder="تکرار کلمه عبور جدید"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 transition text-sm font-sans text-right"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-none shadow-sm transition-all text-sm flex items-center justify-center cursor-pointer"
                >
                  ثبت کلمه عبور جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
