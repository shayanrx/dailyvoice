import React, { useState, useRef, useEffect } from 'react';
import { Ticket, Message, InternalNote, ActiveUser } from '../types';
import { ArrowLeft, Send, Sparkles, User, ShieldAlert, Lock, Play, Pause, FileText, CheckCircle, RefreshCw, AlertCircle, Mic, Trash2, X, Check } from 'lucide-react';

interface TicketDetailProps {
  ticket: Ticket;
  isAdmin: boolean;
  user?: ActiveUser;
  onBack: () => void;
  onTicketUpdated: () => void;
}

export default function TicketDetail({ ticket, isAdmin, user, onBack, onTicketUpdated }: TicketDetailProps) {
  const [inputText, setInputText] = useState('');
  const [voiceData, setVoiceData] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Integrated Voice Recorder States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveforms, setWaveforms] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Admin-only states
  const [internalNoteText, setInternalNoteText] = useState('');
  const [internalNoteSubmitting, setInternalNoteSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-resize textarea height as content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  // Waveform visualization animation for active recording
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setWaveforms(prev => {
          const next = [...prev, Math.floor(Math.random() * 20) + 4];
          if (next.length > 25) next.shift();
          return next;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setVoiceData(prev => [...prev, base64data]);
        };

        // release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      setRecordingTime(0);
      setWaveforms([]);
      mediaRecorder.start();
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("میکروفون در دسترس نیست:", err);
      alert("خطا در دسترسی به میکروفون. لطفا دسترسی به میکروفون را تایید کنید.");
    }
  };

  const stopRecording = (shouldSave = true) => {
    if (mediaRecorderRef.current && isRecording) {
      if (!shouldSave) {
        mediaRecorderRef.current.onstop = () => {};
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticket.messages, ticket.internalNotes]);

  // If ticket is marked unread when opened by admin, let's mark it as 'read' automatically!
  useEffect(() => {
    if (isAdmin && ticket.status === 'unread') {
      updateStatus('read');
    }
  }, [ticket.id, isAdmin]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSendMessage(fakeEvent);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && voiceData.length === 0) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: isAdmin ? 'admin' : 'user',
          senderName: isAdmin ? (user?.fullName || 'کارشناس پاسخگو') : (ticket.isAnonymous ? 'پرسنل ناشناس' : ticket.employeeName),
          text: inputText.trim(),
          voiceData
        })
      });

      if (res.ok) {
        setInputText('');
        setVoiceData([]);
        onTicketUpdated();
      }
    } catch (err) {
      console.error("خطا در ارسال پیام:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteText.trim()) return;

    setInternalNoteSubmitting(true);

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/internal-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'مدیر بازرسی',
          text: internalNoteText.trim()
        })
      });

      if (res.ok) {
        setInternalNoteText('');
        onTicketUpdated();
      }
    } catch (err) {
      console.error("خطا در ثبت یادداشت داخلی:", err);
    } finally {
      setInternalNoteSubmitting(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        onTicketUpdated();
      }
    } catch (err) {
      console.error("خطا در ویرایش وضعیت:", err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const runAiAnalysis = async () => {
    setAiAnalyzing(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/ai-analyze`, {
        method: 'POST'
      });
      if (res.ok) {
        onTicketUpdated();
      }
    } catch (err) {
      console.error("خطا در تحلیل هوش مصنوعی:", err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handlePlayVoice = (base64Audio: string, msgId: string) => {
    if (playingMsgId === msgId) {
      audioRef.current?.pause();
      setPlayingMsgId(null);
      return;
    }

    setPlayingMsgId(msgId);
    setActiveAudioUrl(base64Audio);

    // Give a short timeout to let the state update before play
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch(err => {
          console.error("Error playing audio:", err);
          setPlayingMsgId(null);
        });
      }
    }, 50);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unread':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-none bg-red-100 text-red-700 border border-red-200">خوانده نشده</span>;
      case 'read':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-none bg-gray-100 text-gray-700 border border-gray-200">خوانده شده</span>;
      case 'unanswered':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-none bg-orange-100 text-orange-700 border border-orange-200">بی‌پاسخ (جدید)</span>;
      case 'answered':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-none bg-green-100 text-green-700 border border-green-200">پاسخ داده شده</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-none bg-blue-100 text-blue-700 border border-blue-200">در حال پیگیری</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 text-right" id="ticket-detail-view-container">
      {/* LEFT: MAIN MESSAGE CONVERSATION COLUMN */}
      <div className="lg:col-span-2 bg-white rounded-none shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[750px]" id="messages-column">
        {/* Header of Ticket */}
        <div className="bg-gray-50 border-b border-gray-100 p-4 flex items-center justify-between shrink-0" id="ticket-header-actions">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-gray-200 text-gray-500 hover:text-gray-800 rounded-none transition cursor-pointer"
              id="btn-back-to-list"
            >
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-sans text-gray-500 bg-gray-200 px-2 py-0.5 rounded-none">{ticket.id}</span>
                {ticket.confidential && (
                  <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-none font-bold flex items-center gap-0.5 border border-yellow-200">
                    <Lock className="w-3 h-3" />
                    فوق محرمانه
                  </span>
                )}
              </div>
              <h3 className="text-sm font-black text-gray-800 mt-1 line-clamp-1">{ticket.title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge(ticket.status)}
          </div>
        </div>

        {/* Messaging Box Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50" id="chat-scroller">
          {ticket.messages.map((m) => {
            const isMe = isAdmin ? m.sender === 'admin' : m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${isMe ? 'mr-auto items-end' : 'ml-auto items-start'}`}
                id={`msg-${m.id}`}
              >
                {/* Sender Name */}
                <span className="text-[10px] text-gray-400 font-semibold mb-1 px-1">
                  {(!isAdmin && m.sender === 'admin') ? 'کارشناس پاسخگو' : m.senderName} • {new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                </span>

                {/* Message Bubble - Square corners */}
                <div className={`p-3.5 rounded-none text-xs leading-relaxed ${
                  isMe
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                }`}>
                  {m.text && <p className="whitespace-pre-line text-right">{m.text}</p>}

                  {/* Voice recording attachments */}
                  {m.voiceData && m.voiceData.length > 0 && (
                    <div className="space-y-2 mt-2" id="voice-attachments">
                      {m.voiceData.map((voice, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2.5 p-2 rounded-none border ${
                            isMe ? 'bg-red-700/50 border-red-500 text-white' : 'bg-gray-50 border-gray-100 text-gray-800'
                          }`}
                        >
                          <button
                            onClick={() => handlePlayVoice(voice, `${m.id}-${idx}`)}
                            className={`w-9 h-9 rounded-none flex items-center justify-center transition-all cursor-pointer ${
                              isMe ? 'bg-white text-red-600 hover:bg-gray-100' : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {playingMsgId === `${m.id}-${idx}` ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current translate-x-[1px]" />
                            )}
                          </button>
                          <div className="text-right">
                            <span className="text-[10px] block opacity-70">فایل صوتی گزارش شماره {idx + 1}</span>
                            <div className="flex items-center gap-1">
                              {/* Waves representation */}
                              <div className="flex items-end gap-[1.5px] h-3.5 mt-0.5">
                                {Array.from({ length: 15 }).map((_, waveIdx) => {
                                  const h = Math.abs(Math.sin((idx + waveIdx) * 0.4)) * 6 + 4;
                                  return (
                                    <div
                                      key={waveIdx}
                                      className={`w-[2px] rounded-none ${isMe ? 'bg-white' : 'bg-red-500'}`}
                                      style={{ height: `${h}px` }}
                                    />
                                  );
                                })}
                              </div>
                              <span className="text-[9px] font-mono opacity-80 mr-1">شنیدن ویس</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Area Footer */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0" id="chat-input-area">
          <form onSubmit={handleSendMessage} className="space-y-3" id="message-reply-form">
            
            {/* Recorded Audio Ready Message */}
            {voiceData.length > 0 && (
              <div className="bg-red-50 p-2.5 rounded-none border border-red-100 text-xs text-red-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-red-600 animate-pulse" />
                  <span className="font-semibold">گزارش صوتی آماده ارسال ({voiceData.length} فایل ضبط شده)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setVoiceData([])}
                  className="text-red-600 hover:text-red-800 font-extrabold text-[10px] transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف ویس
                </button>
              </div>
            )}

            {/* Unified WhatsApp-style Chat Input Bar */}
            <div className={`flex items-end border transition-all p-1 ${isRecording ? 'border-red-300 bg-red-50/20' : 'border-gray-200 bg-gray-50'}`}>
              
              {isRecording ? (
                /* ACTIVE VOICE RECORDING & EQUALIZER VIEW (REPLACES THE TEXTAREA) */
                <div className="flex-1 flex items-center justify-between gap-3 px-3 py-2 h-[48px] transition-all">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                    </span>
                    <span className="text-xs font-mono font-bold text-red-700 whitespace-nowrap">
                      {formatRecordingTime(recordingTime)}
                    </span>
                  </div>

                  {/* Equalizer Waveforms */}
                  <div className="flex-1 flex items-end gap-[2.5px] h-6 px-4 overflow-hidden justify-center" id="recording-waves">
                    {waveforms.map((h, i) => (
                      <div
                        key={i}
                        className="bg-red-600 rounded-none w-[3px]"
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Cancel Button (X) */}
                    <button
                      type="button"
                      onClick={() => stopRecording(false)}
                      className="p-1.5 hover:bg-red-100 text-red-600 rounded-none transition flex items-center justify-center cursor-pointer"
                      title="لغو ضبط"
                      id="btn-cancel-recording"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>

                    {/* Done / Save Button (Check) */}
                    <button
                      type="button"
                      onClick={() => stopRecording(true)}
                      className="p-1.5 hover:bg-green-100 text-green-700 rounded-none transition flex items-center justify-center cursor-pointer"
                      title="ثبت ویس"
                      id="btn-done-recording"
                    >
                      <Check className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* STANDARD TYPING INPUT (WITH ACTION BUTTON ON THE RIGHT FOR RTL) */
                <>
                  {/* MIC BUTTON ALWAYS AT THE START (RTL Right side) */}
                  <div className="flex items-center p-1 self-center shrink-0">
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-10 h-10 rounded-none bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition shadow-sm cursor-pointer shrink-0"
                      title="ضبط گزارش صوتی"
                      id="btn-record-mic"
                    >
                      <Mic className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder="پاسخ خود را بنویسید..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-3 py-2.5 bg-transparent border-0 focus:outline-none focus:ring-0 transition text-xs resize-none overflow-hidden leading-relaxed min-h-[40px] text-gray-800"
                    id="input-reply-message"
                  />

                  {/* SEND BUTTON AT THE END (RTL Left side) - APPEARS DYNAMICALLY WHEN TYPING */}
                  {(inputText.trim().length > 0 || voiceData.length > 0) && (
                    <div className="flex items-center p-1 self-center shrink-0 animate-fade-in">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-10 h-10 rounded-none bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition shadow-sm cursor-pointer shrink-0"
                        title="ارسال پیام"
                        id="btn-send-message"
                      >
                        <Send className="w-4.5 h-4.5 -rotate-90 translate-x-[1px]" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </form>
        </div>

        {/* Hidden Audio Player for playback */}
        {activeAudioUrl && (
          <audio
            ref={audioRef}
            src={activeAudioUrl}
            onEnded={() => setPlayingMsgId(null)}
            onPause={() => setPlayingMsgId(null)}
            className="hidden"
          />
        )}
      </div>

      {/* RIGHT: TICKET DETAILS, METADATA & ADMIN UTILITIES */}
      <div className="space-y-6" id="details-column">
        {/* Segment 1: Basic Information */}
        <div className="bg-white rounded-none shadow-sm border border-gray-200 p-5 space-y-4" id="ticket-info-card">
          <h4 className="text-sm font-black text-gray-800 pb-2 border-b border-gray-100">جزئیات گزارش</h4>
          
          <div className="space-y-3 text-xs text-gray-600" id="info-fields">
            <div className="flex justify-between">
              <span className="text-gray-400">تاریخ ثبت:</span>
              <span className="font-semibold">{new Date(ticket.createdAt).toLocaleDateString('fa-IR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">آخرین بروزرسانی:</span>
              <span className="font-semibold">{new Date(ticket.updatedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">دسته‌بندی موضوعی:</span>
              <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-none">{ticket.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">زیر موضوع:</span>
              <span className="font-semibold text-gray-700">{ticket.subcategory || 'تعریف نشده'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">نوع گزارش‌دهنده:</span>
              <span className={`font-semibold px-2 py-0.5 rounded-none ${ticket.isAnonymous ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                {ticket.isAnonymous ? 'کاملا ناشناس' : 'پرسنل رسمی'}
              </span>
            </div>

            {!ticket.isAnonymous && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-[11px] bg-blue-50/30 p-2.5 rounded-none border border-blue-100/50">
                <span className="text-xs font-bold text-blue-800 block mb-1">اطلاعات کارمند:</span>
                <div className="flex justify-between text-blue-900">
                  <span>نام کارمند:</span>
                  <span className="font-bold">{ticket.employeeName}</span>
                </div>
                <div className="flex justify-between text-blue-900">
                  <span>کد پرسنلی:</span>
                  <span className="font-sans font-semibold">{ticket.personnelCode}</span>
                </div>
                <div className="flex justify-between text-blue-900">
                  <span>شعبه فروشگاه:</span>
                  <span className="font-bold">{ticket.storeBranch}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Segment 2: Admin-Only actions (Internal notes & Status change & AI Helper) */}
        {isAdmin && (
          <div className="bg-white rounded-none shadow-sm border border-gray-200 p-5 space-y-4" id="admin-actions-card">
            <h4 className="text-sm font-black text-gray-800 pb-2 border-b border-gray-100">ابزارهای مدیریتی بازرس</h4>

            {/* Change Status */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">تغییر وضعیت تیکت</label>
              <select
                value={ticket.status}
                onChange={(e) => updateStatus(e.target.value)}
                disabled={statusUpdating}
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-none text-xs font-semibold focus:outline-none focus:border-red-600"
                id="select-ticket-status"
              >
                <option value="unread">خوانده نشده</option>
                <option value="read">خوانده شده</option>
                <option value="in_progress">در حال پیگیری</option>
                <option value="answered">پاسخ داده شده</option>
                <option value="unanswered">نیاز به پاسخ (بی‌پاسخ)</option>
              </select>
            </div>

            {/* Gemini AI smart helper */}
            <div className="bg-gradient-to-br from-red-50 to-amber-50 border border-red-100/50 p-4 rounded-none space-y-3 relative overflow-hidden" id="ai-helper">
              <div className="absolute -bottom-8 -left-8 text-red-500/5 rotate-12 shrink-0">
                <Sparkles className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-1.5 text-red-700">
                <Sparkles className="w-4 h-4 fill-current text-red-500" />
                <span className="text-xs font-bold">دستیار هوشمند هوش مصنوعی (Gemini)</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                با فشرده دکمه زیر، هوش مصنوعی کل این پرونده تیکت را بررسی کرده، خلاصه می‌کند و پاسخ پیشنهادی آماده می‌سازد.
              </p>

              {aiAnalyzing ? (
                <div className="text-[11px] text-gray-500 text-center flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                  در حال تحلیل تیکت با مدل Gemini...
                </div>
              ) : (
                <button
                  type="button"
                  onClick={runAiAnalysis}
                  className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-none transition shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                  id="btn-trigger-ai"
                >
                  <RefreshCw className="w-3 h-3" />
                  تحلیل و نوشتن پاسخ پیشنهادی با AI
                </button>
              )}

              {ticket.aiSummary && (
                <div className="space-y-2.5 pt-2 border-t border-gray-100/60" id="ai-response-data">
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-gray-400 block mb-0.5">خلاصه گزارش هوشمند:</span>
                    <p className="text-[10.5px] text-gray-700 leading-relaxed bg-white/70 p-2 rounded-none border border-red-50/50">{ticket.aiSummary}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-gray-400 block mb-0.5">پاسخ پیشنهادی آماده ارسال:</span>
                    <p className="text-[10.5px] text-gray-700 leading-relaxed bg-white/70 p-2 rounded-none border border-red-50/50 whitespace-pre-line">{ticket.aiSuggestedReply}</p>
                    <button
                      type="button"
                      onClick={() => setInputText(ticket.aiSuggestedReply || '')}
                      className="text-[10px] font-bold text-red-600 hover:underline mt-1.5 block cursor-pointer"
                      id="btn-use-ai-reply"
                    >
                      استفاده از این پاسخ در فیلد جواب
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Internal Notes */}
            <div className="border-t border-gray-100 pt-4 space-y-3" id="internal-notes">
              <label className="block text-xs font-semibold text-gray-600 flex items-center gap-1">
                <FileText className="w-4 h-4 text-gray-400" />
                یادداشت‌های داخلی سیستم (مخفی از کارمند)
              </label>

              {/* Existing internal notes */}
              {ticket.internalNotes && ticket.internalNotes.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto" id="notes-scroller">
                  {ticket.internalNotes.map((note) => (
                    <div key={note.id} className="bg-gray-50 border border-gray-100 p-2.5 rounded-none text-right">
                      <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                        <span className="font-bold text-red-600">{note.author}</span>
                        <span>{new Date(note.createdAt).toLocaleDateString('fa-IR')}</span>
                      </div>
                      <p className="text-[10.5px] text-gray-600 leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 text-center">هیچ یادداشت داخلی تاکنون ثبت نشده است.</p>
              )}

              {/* Add Note form */}
              <form onSubmit={handleAddInternalNote} className="space-y-2 pt-2" id="add-note-form">
                <textarea
                  rows={2}
                  placeholder="یادداشت محرمانه بازرس..."
                  value={internalNoteText}
                  onChange={(e) => setInternalNoteText(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-none text-xs resize-none focus:outline-none focus:border-red-600 transition"
                  id="textarea-note"
                />
                <button
                  type="submit"
                  disabled={internalNoteSubmitting || !internalNoteText.trim()}
                  className="w-full py-1.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold text-[10px] rounded-none transition cursor-pointer"
                  id="btn-submit-note"
                >
                  {internalNoteSubmitting ? "ثبت یادداشت..." : "افزودن یادداشت"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
