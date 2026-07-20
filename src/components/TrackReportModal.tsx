import React, { useState } from 'react';
import { X, Search, AlertCircle } from 'lucide-react';
import { Ticket } from '../types';

interface TrackReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewTicket: (ticket: Ticket) => void;
}

export default function TrackReportModal({ isOpen, onClose, onViewTicket }: TrackReportModalProps) {
  const [searchCode, setSearchCode] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);

    if (!searchCode.trim()) {
      setSearchError('لطفا کد رهگیری تیکت را وارد کنید.');
      return;
    }

    setSearchLoading(true);

    try {
      const response = await fetch(`/api/tickets/search?code=${searchCode.trim()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'کد رهگیری نامعتبر است یا تیکت یافت نشد.');
      }

      onViewTicket(data.ticket);
      onClose();
    } catch (err: any) {
      setSearchError(err.message || 'گزارشی با این کد رهگیری یافت نشد.');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" id="track-report-modal">
      <div 
        className="bg-white w-full max-w-md rounded-none shadow-2xl border border-gray-200 relative animate-fade-in flex flex-col p-6 text-right"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 className="text-sm font-black text-gray-800">پیگیری گزارش با کد رهگیری</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-red-600 transition cursor-pointer p-1"
            id="close-track-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="space-y-4" id="track-report-form">
          <p className="text-gray-500 text-xs leading-relaxed">
            اگر پیش از این گزارشی ثبت کرده‌اید، با وارد کردن کد رهگیری چهار رقمی (مانند <span className="font-sans font-bold">DV-1234</span>) می‌توانید پاسخ واحد صیانت را مشاهده و گفت‌وگو کنید.
          </p>

          {searchError && (
            <div className="bg-red-50 border-r-4 border-red-500 p-3 text-xs text-red-700 font-medium">
              {searchError}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-600">کد رهگیری تیکت</label>
            <input
              type="text"
              placeholder="مثال: DV-1234"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-red-600 transition text-center text-base font-bold font-sans tracking-widest text-gray-800 placeholder:tracking-normal placeholder:font-normal placeholder:text-xs"
              id="input-track-code"
              required
            />
          </div>

          <button
            type="submit"
            disabled={searchLoading}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-none shadow-sm transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            id="btn-track-submit"
          >
            <Search className="w-4 h-4" />
            {searchLoading ? "در حال پیگیری..." : "بررسی و پیگیری گزارش"}
          </button>
        </form>
      </div>
    </div>
  );
}
