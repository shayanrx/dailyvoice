import React, { useState } from 'react';
import { User, AlertCircle, X } from 'lucide-react';

interface EmployeeLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userData: any) => void;
}

export default function EmployeeLoginModal({ isOpen, onClose, onLoginSuccess }: EmployeeLoginModalProps) {
  const [personnelCode, setPersonnelCode] = useState('');
  const [nationalCode, setNationalCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!personnelCode.trim() || !nationalCode.trim()) {
      setError('لطفا کد پرسنلی و کد ملی خود را وارد کنید.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'employee',
          personnelCode: personnelCode.trim(),
          nationalCode: nationalCode.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'خطا در ورود به سیستم.');
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" id="employee-login-modal">
      <div className="bg-white w-full max-w-md rounded-none shadow-xl border border-gray-200 overflow-hidden relative animate-fade-in" style={{ direction: 'rtl' }}>
        
        {/* Header */}
        <div className="bg-red-600 px-6 py-6 text-white text-right relative">
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 text-white hover:text-red-200 transition p-1 cursor-pointer"
            id="close-employee-modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-white" />
            <h3 className="text-lg font-black">ثبت گزارش رسمی (ورود پرسنل)</h3>
          </div>
          <p className="text-red-100 text-xs mt-1.5 font-light">
            با ورود با حساب کاربری، گزارش شما به عنوان پرسنل رسمی با حفظ بالاترین محرمانگی توسط کارشناسان صیانت دیلی مارکت پیگیری می‌شود.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-right">
          {error && (
            <div className="bg-red-50 border-r-4 border-red-500 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-bold leading-relaxed">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">کد پرسنلی</label>
            <input
              type="text"
              placeholder="مثال: 12345"
              value={personnelCode}
              onChange={(e) => setPersonnelCode(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 transition text-sm font-sans text-right"
              id="employee-personnel-input"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">کد ملی</label>
            <input
              type="password"
              placeholder="کد ملی ۱۰ رقمی"
              value={nationalCode}
              onChange={(e) => setNationalCode(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 transition text-sm font-sans text-right"
              id="employee-national-input"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-none shadow-sm transition-all text-sm flex items-center justify-center cursor-pointer"
              id="btn-employee-modal-submit"
            >
              {loading ? "در حال تایید هویت..." : "ورود پرسنل به پنل شخصی"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
