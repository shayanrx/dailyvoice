import React, { useState, useRef, useEffect } from 'react';
import { STANDARD_CATEGORIES, Ticket } from '../types';
import { Landmark, ArrowRight, ArrowLeft, Clipboard, CheckCircle2, AlertTriangle, Shield, Check, Mic, Trash2, Play, Pause, X, Send } from 'lucide-react';

interface AnonymousFormProps {
  onBack: () => void;
  onViewTicket: (ticket: Ticket) => void;
}

export default function AnonymousForm({ onBack, onViewTicket }: AnonymousFormProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [view, setView] = useState<'create' | 'success'>('create');
  
  // Submit state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [confidential, setConfidential] = useState(true);
  const [voiceData, setVoiceData] = useState<string[]>([]);
  const [textSegments, setTextSegments] = useState<string[]>([]);
  const [successCode, setSuccessCode] = useState('');
  const [loading, setLoading] = useState(false);
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

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveforms, setWaveforms] = useState<number[]>([]);
  const [playingVoiceIdx, setPlayingVoiceIdx] = useState<number | null>(null);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 250)}px`;
    }
  }, [description]);

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

  const handlePlayVoice = (base64: string, index: number) => {
    if (playingVoiceIdx === index) {
      audioRef.current?.pause();
      setPlayingVoiceIdx(null);
    } else {
      setActiveAudioUrl(base64);
      setPlayingVoiceIdx(index);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(err => {
            console.error("Playback error:", err);
            setPlayingVoiceIdx(null);
          });
        }
      }, 50);
    }
  };

  const selectedCategoryObj = dynamicCategories.find(c => c.name === category);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate that either text description or a voice recording is provided
    const allTextParts = [...textSegments];
    if (description.trim()) {
      allTextParts.push(description.trim());
    }
    const combinedDesc = allTextParts.join('\n\n');

    if (!title || !category || (allTextParts.length === 0 && voiceData.length === 0)) {
      setError('پر کردن فیلدهای عنوان، دسته‌بندی و ارائه شرح گزارش (به صورت متنی یا صوتی) الزامی است.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/tickets/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          subcategory,
          description: combinedDesc || "گزارش ثبت شده به همراه فایل صوتی ضمیمه",
          confidential,
          voiceData
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'خطا در ثبت گزارش.');
      }

      setSuccessCode(data.id);
      setView('success');
      // Reset form
      setTitle('');
      setCategory('');
      setSubcategory('');
      setDescription('');
      setTextSegments([]);
      setConfidential(true);
      setVoiceData([]);
      setStep(1);
    } catch (err: any) {
      setError(err.message || 'متاسفانه خطایی در ارتباط با سرور رخ داد.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(successCode);
    alert('کد رهگیری با موفقیت در حافظه کپی شد.');
  };

  const nextStep = () => {
    if (step === 1 && !title.trim()) return;
    if (step === 2 && !category) return;
    setStep((prev) => (prev + 1) as any);
  };

  const prevStep = () => {
    setStep((prev) => (prev - 1) as any);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-none p-4 md:p-6" id="anonymous-form-wrapper">
      {/* Header and Close button */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6" id="anonymous-header">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-50 text-red-600 rounded-none shrink-0" id="anonymous-logo-badge">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">ثبت گزارش ناشناس</h2>
            <p className="text-gray-400 text-[10px] mt-0.5">هیچ آدرس آی‌پی یا اطلاعات هویتی از شما ذخیره نخواهد شد.</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-xs font-bold text-gray-500 hover:text-red-600 border border-gray-200 px-3 py-1.5 rounded-none hover:bg-gray-50 transition cursor-pointer"
          id="btn-back-to-home"
        >
          بستن
        </button>
      </div>

      {view === 'create' && (
        <div className="space-y-6" id="anonymous-create-wizard">
          {/* Step Indicator Progress Bar */}
          <div className="flex items-center justify-between px-2 mb-6" id="wizard-progress-bar">
            {[
              { num: 1, label: 'عنوان' },
              { num: 2, label: 'دسته‌بندی' },
              { num: 3, label: 'زیر موضوع' },
              { num: 4, label: 'شرح و ارسال' }
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center gap-1.5" id={`wizard-step-${s.num}`}>
                  <div 
                    className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-full transition ${
                      step === s.num 
                        ? 'bg-red-600 text-white ring-4 ring-red-100' 
                        : step > s.num 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-[10px] font-bold ${step === s.num ? 'text-red-600' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < 3 && (
                  <div 
                    className={`flex-1 h-[2px] mx-2 ${
                      step > s.num ? 'bg-green-500' : 'bg-gray-100'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border-r-4 border-red-500 p-3.5 text-xs text-red-700 flex items-start gap-2" id="error-alert">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: TITLE */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in" id="step-1-content">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">موضوع یا عنوان کوتاه گزارش چیست؟</label>
                <input
                  type="text"
                  placeholder="مثال: رفتار نامناسب سرپرست شیفت یا نقص مسائل بهداشتی در فروشگاه"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:border-red-600 transition text-sm text-gray-800"
                  id="input-title"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!title.trim()}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  id="btn-step1-next"
                >
                  <span>مرحله بعد: انتخاب دسته‌بندی</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CATEGORY */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in" id="step-2-content">
              <label className="block text-xs font-bold text-gray-700 mb-2">دسته‌بندی اصلی موضوع گزارش را انتخاب کنید:</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="categories-grid">
                {dynamicCategories.map((c) => {
                  const isSelected = category === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setCategory(c.name);
                        setSubcategory('');
                      }}
                      className={`p-4 text-right border transition text-xs font-bold cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'border-red-600 bg-red-50/50 text-red-900' 
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>{c.name}</span>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-red-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  id="btn-step2-prev"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>مرحله قبل</span>
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!category}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  id="btn-step2-next"
                >
                  <span>مرحله بعد: زیر موضوع</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUBCATEGORY */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in" id="step-3-content">
              <div className="bg-gray-50 p-3 text-xs border border-gray-100 text-gray-600 flex justify-between items-center">
                <span>دسته‌بندی انتخاب شده: <strong>{category}</strong></span>
                <button 
                  onClick={() => setStep(2)} 
                  className="text-red-600 font-bold hover:underline"
                >
                  تغییر دسته‌بندی
                </button>
              </div>

              <label className="block text-xs font-bold text-gray-700 mb-2">زیر موضوع مرتبط را انتخاب کنید:</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="subcategories-grid">
                {selectedCategoryObj?.subcategories.map((sub) => {
                  const isSelected = subcategory === sub;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSubcategory(sub)}
                      className={`p-4 text-right border transition text-xs font-bold cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'border-red-600 bg-red-50/50 text-red-900' 
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>{sub}</span>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-red-600" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSubcategory('سایر موارد')}
                  className={`p-4 text-right border transition text-xs font-bold cursor-pointer flex items-center justify-between ${
                    subcategory === 'سایر موارد' || !subcategory
                      ? 'border-red-600 bg-red-50/50 text-red-900' 
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span>موارد دیگر / مشخص نیست</span>
                  {(subcategory === 'سایر موارد' || !subcategory) && <div className="w-2 h-2 rounded-full bg-red-600" />}
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  id="btn-step3-prev"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>مرحله قبل</span>
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  id="btn-step3-next"
                >
                  <span>مرحله بعد: شرح گزارش</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: DESCRIPTION & AUDIO & SUBMIT */}
          {step === 4 && (
            <form onSubmit={handleCreateSubmit} className="space-y-5 animate-fade-in" id="step-4-form">
              <div className="bg-gray-50 p-3.5 border border-gray-100 text-xs text-gray-600 space-y-1">
                <div>موضوع: <strong className="text-gray-800">{title}</strong></div>
                <div>دسته‌بندی: <strong className="text-gray-800">{category} {subcategory ? `» ${subcategory}` : ''}</strong></div>
              </div>

              {error && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-100 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-700">شرح و جزئیات گزارش (متنی یا صوتی):</label>
                
                {/* Text segments listing */}
                {textSegments.length > 0 && (
                  <div className="space-y-2">
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

                {/* Voice recordings listing */}
                {voiceData.length > 0 && (
                  <div className="space-y-2">
                    {voiceData.map((base64, idx) => (
                      <div key={idx} className="bg-red-50 p-3 border border-red-100 flex items-center justify-between gap-3 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePlayVoice(base64, idx)}
                            className="w-8 h-8 rounded-none bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition shadow-sm cursor-pointer"
                          >
                            {playingVoiceIdx === idx ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current translate-x-[1px]" />
                            )}
                          </button>
                          <div>
                            <span className="text-xs font-bold text-red-900 block">فایل صوتی گزارش شماره {idx + 1}</span>
                            <span className="text-[10px] text-red-500">آماده ارسال نهایی</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setVoiceData(prev => prev.filter((_, i) => i !== idx));
                            if (playingVoiceIdx === idx) setPlayingVoiceIdx(null);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-none transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Integrated WhatsApp-style Input Bar */}
                <div className={`flex items-end border transition-all p-1.5 rounded-none ${isRecording ? 'border-red-400 bg-red-50/30' : 'border-gray-200 bg-gray-50'}`}>
                  {isRecording ? (
                    /* Active Audio Recording View */
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

                      {/* Waveforms representation */}
                      <div className="flex-1 flex items-end gap-[2.5px] h-6 px-4 overflow-hidden justify-center">
                        {waveforms.map((h, i) => (
                          <div
                            key={i}
                            className="bg-red-600 rounded-none w-[3px]"
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => stopRecording(false)}
                          className="p-1.5 hover:bg-red-100 text-red-600 rounded-none transition flex items-center justify-center cursor-pointer"
                          title="لغو ضبط"
                        >
                          <X className="w-4.5 h-4.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => stopRecording(true)}
                          className="p-1.5 hover:bg-green-100 text-green-700 rounded-none transition flex items-center justify-center cursor-pointer"
                          title="تایید و ذخیره ویس"
                        >
                          <Check className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Typing/Text Entry with Action Button on the Right for RTL */
                    <>
                      {/* Action Button: Mic recording trigger */}
                      <div className="flex items-center p-0.5 self-center shrink-0">
                        <button
                          type="button"
                          onClick={startRecording}
                          className="w-10 h-10 rounded-none bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition shadow-sm cursor-pointer shrink-0"
                          title="ضبط گزارش صوتی"
                        >
                          <Mic className="w-4.5 h-4.5" />
                        </button>
                      </div>

                      <textarea
                        ref={textareaRef}
                        rows={3}
                        placeholder="شرح دقیق واقعه، نام شعبه یا اشخاص مرتبط را بنویسید (یا دکمه میکروفون را جهت ضبط صدا بزنید)."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="flex-1 px-3 py-2 bg-transparent border-0 focus:outline-none focus:ring-0 transition text-sm resize-none overflow-y-auto max-h-[180px] leading-relaxed text-gray-800"
                        id="textarea-description"
                      />

                      {description.trim().length > 0 && (
                        <div className="flex items-center p-0.5 self-center shrink-0 animate-fade-in">
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
                    </>
                  )}
                </div>
              </div>

              {/* Confidential toggle */}
              <div className="flex items-center gap-3 bg-red-50/20 border border-red-100 p-4">
                <input
                  type="checkbox"
                  id="toggle-confidential"
                  checked={confidential}
                  onChange={(e) => setConfidential(e.target.checked)}
                  className="w-4.5 h-4.5 text-red-600 border-gray-300 rounded-none focus:ring-0 cursor-pointer"
                />
                <div className="flex-1">
                  <label htmlFor="toggle-confidential" className="block text-xs font-bold text-gray-800 cursor-pointer">
                    این گزارش با برچسب محرمانه ثبت شود.
                  </label>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                    در حالت محرمانه، جزئیات پرونده منحصراً توسط تیم صیانت دیلی مارکت بررسی خواهد شد.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  id="btn-step4-prev"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>مرحله قبل</span>
                </button>
                <button
                  type="submit"
                  disabled={loading || (!description.trim() && voiceData.length === 0)}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs cursor-pointer"
                  id="btn-submit-anonymous-report"
                >
                  {loading ? "در حال ثبت گزارش..." : "ثبت نهایی گزارش و دریافت کد رهگیری"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* VIEW: SUCCESS SCREEN */}
      {view === 'success' && (
        <div className="text-center py-6 space-y-6 animate-fade-in" id="anonymous-success-screen">
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-none flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-gray-800">گزارش شما با موفقیت ثبت شد</h3>
            <p className="text-gray-400 text-xs max-w-md mx-auto">
              کد رهگیری زیر را حتماً در جایی یادداشت کنید. واحد صیانت و پاسخگویی صدای همکار تنها از طریق این کد پیگیر و پاسخگو خواهد بود.
            </p>
          </div>

          <div className="max-w-sm mx-auto bg-gray-50 border border-gray-200 rounded-none p-4 flex items-center justify-between">
            <div className="text-right">
              <span className="text-[9px] text-gray-400 block font-sans">کد رهگیری اختصاصی</span>
              <span className="text-xl font-bold text-gray-800 font-sans tracking-wider" id="display-success-code">{successCode}</span>
            </div>
            <button
              onClick={copyToClipboard}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-none transition flex items-center gap-1 text-xs cursor-pointer border border-gray-200 bg-white"
              id="btn-copy-code"
            >
              <Clipboard className="w-4 h-4 text-red-600" />
              کپی کد رهگیری
            </button>
          </div>

          <div className="max-w-md mx-auto text-[10px] text-amber-600 bg-amber-50 p-3 leading-relaxed border border-amber-100 flex items-start gap-1.5 text-right font-medium">
            <span>توجه: به دلیل حفظ مسائل امنیتی، این کد به هیچ عنوان قابل بازیابی مجدد نخواهد بود. لطفاً از ذخیره آن مطمئن شوید.</span>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={onBack}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 border border-gray-200 rounded-none hover:bg-gray-50 transition cursor-pointer"
              id="btn-success-close"
            >
              بستن پنجره
            </button>
            <button
              onClick={async () => {
                // Instantly search to view details
                try {
                  const response = await fetch(`/api/tickets/search?code=${successCode}`);
                  const data = await response.json();
                  if (response.ok && data.success) {
                    onViewTicket(data.ticket);
                  }
                } catch (err) {
                  console.error(err);
                }
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-none shadow-xs transition cursor-pointer"
              id="btn-track-now"
            >
              مشاهده و گفتگو در گزارش ثبت شده
            </button>
          </div>
        </div>
      )}

      {/* Hidden Audio Player for playback */}
      {activeAudioUrl && (
        <audio
          ref={audioRef}
          src={activeAudioUrl}
          onEnded={() => setPlayingVoiceIdx(null)}
          onPause={() => setPlayingVoiceIdx(null)}
          className="hidden"
        />
      )}
    </div>
  );
}
