import React, { useState } from 'react';
import { Shield, AlertCircle, X } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userData: any) => void;
}

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }: AdminLoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!username.trim() || !password) {
      setError('لطفا نام کاربری و کلمه عبور مدیریت را وارد کنید.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'admin',
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'خطا در ورود به پنل کارشناس.');
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" id="admin-login-modal">
      <div className="bg-white w-full max-w-md rounded-none shadow-xl border border-gray-200 overflow-hidden relative animate-fade-in" style={{ direction: 'rtl' }}>
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-6 text-white text-right relative">
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 text-white hover:text-gray-300 transition p-1 cursor-pointer"
            id="close-admin-modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-black">ورود کارشناسان پاسخگو</h3>
          </div>
          <p className="text-gray-400 text-xs mt-1.5 font-light">
            بخش امن ورود کارشناسان پاسخگو و صیانت از حقوق پرسنل دیلی مارکت در سراسر کشور
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
            <label className="block text-xs font-bold text-gray-700 mb-1.5">نام کاربری کارشناس</label>
            <input
              type="text"
              placeholder="مثال: admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 transition text-sm font-sans text-left"
              id="admin-username-input"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">کلمه عبور</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 transition text-sm font-sans text-left"
              id="admin-password-input"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-black text-white font-black rounded-none shadow-sm transition-all text-sm flex items-center justify-center cursor-pointer"
              id="btn-admin-modal-submit"
            >
              {loading ? "در حال ورود..." : "ورود امن کارشناس"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
