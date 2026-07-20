import React from 'react';
import { X } from 'lucide-react';
import AnonymousForm from './AnonymousForm';
import { Ticket } from '../types';

interface AnonymousFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewTicket: (ticket: Ticket) => void;
}

export default function AnonymousFormModal({ isOpen, onClose, onViewTicket }: AnonymousFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-0 md:p-4 overflow-y-auto" id="anonymous-form-modal">
      {/* Mobile-responsive: Full screen on mobile, elegant card on desktop */}
      <div 
        className="bg-white w-full max-w-2xl min-h-screen md:min-h-0 md:max-h-[90vh] overflow-y-auto rounded-none shadow-2xl border-0 md:border md:border-gray-200 relative animate-fade-in flex flex-col"
        style={{ direction: 'rtl' }}
      >
        {/* Form Container */}
        <div className="flex-1 p-2 md:p-6">
          <AnonymousForm 
            onBack={onClose}
            onViewTicket={(ticket) => {
              onViewTicket(ticket);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
