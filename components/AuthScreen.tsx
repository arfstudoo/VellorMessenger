
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Camera, ChevronLeft, Check, AtSign, Upload, Loader2, LogIn, Palette, Zap, Sparkles, Moon, Sun, Leaf, AlertCircle, RefreshCw } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';

const MDiv = motion.div as any;
const MH1 = motion.h1 as any;
const MP = motion.p as any;
const MButton = motion.button as any;

interface AuthScreenProps {
  onComplete: (data: UserProfile) => void;
}

type AuthTheme = 'crimson' | 'ocean' | 'cyber' | 'gold' | 'emerald' | 'obsidian' | 'sunset';

const THEMES: Record<AuthTheme, {
    label: string;
    bgGradient: string;
    accentColor: string;
    accentBg: string;
    buttonGradient: string;
    glow: string;
    inputFocus: string;
    icon: any;
}> = {
    crimson: {
        label: 'CRIMSON',
        bgGradient: 'radial-gradient(circle at 50% 0%, #4a0404 0%, #050505 100%)',
        accentColor: 'text-red-500',
        accentBg: 'bg-red-500',
        buttonGradient: 'bg-gradient-to-r from-red-600 to-red-900',
        glow: 'shadow-[0_0_50px_-10px_rgba(220,38,38,0.4)]',
        inputFocus: 'border-red-500/60 shadow-[0_0_20px_rgba(220,38,38,0.15)]',
        icon: Zap
    },
    ocean: {
        label: 'DEEP OCEAN',
        bgGradient: 'radial-gradient(circle at 50% 0%, #041f4a 0%, #000205 100%)',
        accentColor: 'text-cyan-400',
        accentBg: 'bg-cyan-500',
        buttonGradient: 'bg-gradient-to-r from-cyan-600 to-blue-900',
        glow: 'shadow-[0_0_50px_-10px_rgba(34,211,238,0.4)]',
        inputFocus: 'border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.15)]',
        icon: Zap
    },
    cyber: {
        label: 'NEON CITY',
        bgGradient: 'radial-gradient(circle at 50% 0%, #2e044a 0%, #050005 100%)',
        accentColor: 'text-fuchsia-400',
        accentBg: 'bg-fuchsia-500',
        buttonGradient: 'bg-gradient-to-r from-fuchsia-600 to-purple-900',
        glow: 'shadow-[0_0_50px_-10px_rgba(232,121,249,0.4)]',
        inputFocus: 'border-fuchsia-400/60 shadow-[0_0_20px_rgba(232,121,249,0.15)]',
        icon: Sparkles
    },
    gold: {
        label: 'LUXURY',
        bgGradient: 'radial-gradient(circle at 50% 0%, #4a3804 0%, #050200 100%)',
        accentColor: 'text-amber-400',
        accentBg: 'bg-amber-500',
        buttonGradient: 'bg-gradient-to-r from-amber-500 to-yellow-800',
        glow: 'shadow-[0_0_50px_-10px_rgba(251,191,36,0.4)]',
        inputFocus: 'border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.15)]',
        icon: Sun
    },
    emerald: {
        label: 'NATURE',
        bgGradient: 'radial-gradient(circle at 50% 0%, #022c22 0%, #000000 100%)',
        accentColor: 'text-emerald-400',
        accentBg: 'bg-emerald-500',
        buttonGradient: 'bg-gradient-to-r from-emerald-500 to-green-900',
        glow: 'shadow-[0_0_50px_-10px_rgba(52,211,153,0.4)]',
        inputFocus: 'border-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.15)]',
        icon: Leaf
    },
    obsidian: {
        label: 'OBSIDIAN',
        bgGradient: 'radial-gradient(circle at 50% 0%, #262626 0%, #000000 100%)',
        accentColor: 'text-white',
        accentBg: 'bg-white',
        buttonGradient: 'bg-gradient-to-r from-gray-200 to-gray-600',
        glow: 'shadow-[0_0_50px_-10px_rgba(255,255,255,0.25)]',
        inputFocus: 'border-white/60 shadow-[0_0_20px_rgba(255,255,255,0.1)]',
        icon: Moon
    },
    sunset: {
        label: 'SUNSET',
        bgGradient: 'radial-gradient(circle at 50% 0%, #4a0426 0%, #0f0005 100%)',
        accentColor: 'text-orange-400',
        accentBg: 'bg-orange-500',
        buttonGradient: 'bg-gradient-to-r from-orange-500 to-rose-700',
        glow: 'shadow-[0_0_50px_-10px_rgba(251,146,60,0.4)]',
        inputFocus: 'border-orange-400/60 shadow-[0_0_20px_rgba(251,146,60,0.15)]',
        icon: Sun
    }
};

const getFriendlyErrorMessage = (errorMsg: string): string => {
    // Supabase Rate Limit Error
    if (errorMsg.includes("security purposes") || errorMsg.includes("rate limit") || errorMsg.includes("429")) {
        return "Слишком частые запросы. Система безопасности временно ограничила отправку писем. Пожалуйста, подождите 1-2 минуты.";
    }
    if (errorMsg.includes("User already registered")) {
        return "Пользователь с таким email уже зарегистрирован. Попробуйте войти.";
    }
    if (errorMsg.includes("Invalid login credentials")) {
        return "Неверный email или пароль.";
    }
    if (errorMsg.includes("validation failed")) {
        return "Проверьте правильность введенных данных (Email должен быть настоящим).";
    }
    if (errorMsg.includes("Database error")) {
        return "Ошибка соединения с базой данных. Попробуйте позже.";
    }
    return errorMsg; 
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onComplete }) => {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AuthTheme>('crimson');
  
  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    firstName: '',
    lastName: '',
    avatarFile: null as File | null,
    avatarPreview: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [emailSent, setEmailSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = THEMES[currentTheme];
  const ThemeIcon = theme.icon;

  const cycleTheme = () => {
      const themes: AuthTheme[] = ['crimson', 'ocean', 'cyber', 'gold', 'emerald', 'obsidian', 'sunset'];
      const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
      setCurrentTheme(themes[nextIndex]);
  };

  const validateStep = (currentStep: number) => {
    const newErrors: {[key: string]: string} = {};
    let isValid = true;

    if (currentStep === 1) {
        if (!formData.email || !formData.email.includes('@')) {
            newErrors.email = 'Введите корректный Email';
            isValid = false;
        }
        if (!formData.password || formData.password.length < 6) {
            newErrors.password = 'Пароль должен быть не менее 6 символов';
            isValid = false;
        }
    } else if (currentStep === 2) {
        if (!formData.username) {
            newErrors.username = 'Юзернейм обязателен';
            isValid = false;
        }
    } else if (currentStep === 3) {
        if (!formData.firstName) {
            newErrors.firstName = 'Имя обязательно';
            isValid = false;
        }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleFirstStepNext = () => {
    if (validateStep(1)) {
        if (mode === 'login') {
            handleLogin();
        } else {
            setDirection(1);
            setStep(2);
        }
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
        setDirection(1);
        setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setDirection(-1);
    setStep(prev => prev - 1);
  };

  const handleLogin = async () => {
      setLoading(true);
      setErrors({}); // Clear previous errors
      const { data, error } = await (supabase.auth as any).signInWithPassword({
          email: formData.email,
          password: formData.password
      });

      if (error) {
          setErrors({ form: getFriendlyErrorMessage(error.message) });
          setLoading(false);
          return;
      }

      if (data.user) {
          await supabase.from('profiles').update({ status: 'online' }).eq('id', data.user.id);
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

          if (profile) {
              onComplete({
                  id: profile.id,
                  name: profile.full_name,
                  username: profile.username,
                  avatar: profile.avatar_url,
                  phone: data.user.email || '',
                  email: data.user.email,
                  bio: profile.bio || '',
                  status: 'online',
                  isAdmin: profile.is_admin,
                  isVerified: profile.is_verified
              });
          } else {
             // Fallback if profile trigger failed
             onComplete({
                 id: data.user.id,
                 name: 'User',
                 username: 'user',
                 avatar: '',
                 phone: data.user.email || '',
                 email: data.user.email,
                 bio: '',
                 status: 'online'
             });
          }
      }
      setLoading(false);
  };

  const handleRegister = async () => {
      setLoading(true);
      setErrors({}); // Clear previous errors
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      const { data: authData, error: authError } = await (supabase.auth as any).signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: fullName,
              username: formData.username,
              avatar_url: '', 
              status: 'online'
            }
          }
      });

      if (authError) {
          setErrors({ form: getFriendlyErrorMessage(authError.message) });
          setLoading(false);
          return;
      }

      if (authData.user) {
          if (authData.session) {
              // Auto-login case (if email confirmation is off in Supabase)
              const userId = authData.user.id;
              let avatarUrl = '';

              if (formData.avatarFile) {
                  const fileExt = formData.avatarFile.name.split('.').pop();
                  const fileName = `${userId}/${Math.random()}.${fileExt}`;
                  const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, formData.avatarFile);

                  if (!uploadError) {
                      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                      avatarUrl = publicUrlData.publicUrl;
                      // Profile updated via trigger usually, but we update explicitly to be safe
                      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
                  }
              }

              await supabase.from('profiles').update({ status: 'online' }).eq('id', userId);
              
              const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

              if (profile) {
                  onComplete({
                      id: profile.id,
                      name: profile.full_name,
                      username: profile.username,
                      avatar: profile.avatar_url,
                      phone: authData.user.email || '',
                      email: authData.user.email,
                      bio: profile.bio || '',
                      status: 'online',
                      isAdmin: profile.is_admin,
                      isVerified: profile.is_verified
                  });
              } else {
                 onComplete({
                     id: userId,
                     name: fullName,
                     username: formData.username,
                     avatar: avatarUrl,
                     phone: authData.user.email || '',
                     email: authData.user.email,
                     bio: '',
                     status: 'online'
                 });
              }
          } else {
              setEmailSent(true);
          }
      }
      setLoading(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setFormData(prev => ({ ...prev, avatarFile: file, avatarPreview: URL.createObjectURL(file) }));
      }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black overflow-hidden font-sans">
       {/* Background */}
       <div className="absolute inset-0 z-0 transition-all duration-1000 ease-in-out" style={{ background: theme.bgGradient }}>
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
           {/* Animated Background Blob */}
           <MDiv 
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] opacity-20 ${theme.accentBg}`}
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
              transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
           />
       </div>

       {/* Main Card */}
       <MDiv 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "circOut" }}
          className={`relative z-10 w-[90%] max-w-[420px] bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col ${theme.glow}`}
       >
          {/* Theme Switcher (Top Right) */}
          <button onClick={cycleTheme} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all z-20">
             <Palette size={18} />
          </button>

          {/* Header */}
          <div className="pt-10 px-8 pb-6 flex flex-col items-center">
             <div className={`w-16 h-16 rounded-2xl ${theme.accentBg} flex items-center justify-center shadow-lg mb-6 rotate-3 hover:rotate-6 transition-transform`}>
                 <ThemeIcon size={32} className="text-white drop-shadow-md" />
             </div>
             <h1 className="text-3xl font-black text-white tracking-tight mb-2">VELLOR</h1>
             <p className={`text-[10px] font-bold uppercase tracking-[0.4em] ${theme.accentColor} opacity-80`}>{theme.label} EDITION</p>
          </div>

          {/* Mode Switcher (Hide if Email Sent) */}
          {!emailSent && (
              <div className="flex px-8 mb-8">
                 <div className="w-full bg-white/5 rounded-2xl p-1 flex relative">
                     <MDiv 
                        layoutId="mode-pill"
                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-xl shadow-sm"
                        initial={false}
                        animate={{ x: mode === 'login' ? 0 : '100%' }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                     />
                     <button onClick={() => setMode('login')} className={`flex-1 relative z-10 py-3 text-xs font-black uppercase tracking-wider transition-colors ${mode === 'login' ? 'text-white' : 'text-white/40'}`}>Вход</button>
                     <button onClick={() => { setMode('register'); setStep(1); }} className={`flex-1 relative z-10 py-3 text-xs font-black uppercase tracking-wider transition-colors ${mode === 'register' ? 'text-white' : 'text-white/40'}`}>Регистрация</button>
                 </div>
              </div>
          )}

          {/* Form Content */}
          <div className="px-8 pb-10 flex-1 relative min-h-[300px]">
             <AnimatePresence mode="wait" custom={direction}>
                
                {/* EMAIL SENT SUCCESS STATE */}
                {emailSent ? (
                    <MDiv key="email-sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center space-y-6 pt-4">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 animate-pulse">
                            <Mail size={40} className="text-green-500"/>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Письмо отправлено!</h3>
                            <p className="text-white/60 text-xs leading-relaxed">
                                Мы отправили ссылку для входа на <strong>{formData.email}</strong>.
                            </p>
                        </div>
                        
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl w-full">
                            <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                                <AlertCircle size={14}/> Внимание
                            </p>
                            <p className="text-white/70 text-[11px] leading-relaxed">
                                Письма от Supabase могут задерживаться или попадать в спам.
                                <br/><br/>
                                <span className="text-white font-bold">Если письмо не пришло:</span>
                                <br/>
                                Обратитесь к Администратору для ручной верификации и смены пароля через <span className="text-vellor-red">Admin Panel</span>.
                            </p>
                        </div>

                        <button onClick={() => { setEmailSent(false); setMode('login'); }} className="text-white/40 hover:text-white text-xs underline transition-colors">
                            Вернуться ко входу
                        </button>
                    </MDiv>
                ) : (
                    <>
                    {/* LOGIN FORM */}
                    {mode === 'login' && (
                        <MDiv key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                            <div className="space-y-4">
                                <div className="group">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-3 mb-1 block group-focus-within:text-white/80 transition-colors">Email</label>
                                    <div className={`flex items-center bg-black/40 border border-white/10 rounded-2xl px-4 transition-all focus-within:bg-black/60 ${theme.inputFocus}`}>
                                        <Mail size={18} className="text-white/30" />
                                        <input 
                                            type="email" 
                                            value={formData.email} 
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full bg-transparent border-none p-4 text-sm font-bold text-white outline-none placeholder:text-white/20"
                                            placeholder="user@example.com"
                                        />
                                    </div>
                                    {errors.email && <p className="text-[10px] text-red-500 font-bold ml-3 mt-1">{errors.email}</p>}
                                </div>
                                <div className="group">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-3 mb-1 block group-focus-within:text-white/80 transition-colors">Пароль</label>
                                    <div className={`flex items-center bg-black/40 border border-white/10 rounded-2xl px-4 transition-all focus-within:bg-black/60 ${theme.inputFocus}`}>
                                        <Lock size={18} className="text-white/30" />
                                        <input 
                                            type="password" 
                                            value={formData.password}
                                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                                            className="w-full bg-transparent border-none p-4 text-sm font-bold text-white outline-none placeholder:text-white/20"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    {errors.password && <p className="text-[10px] text-red-500 font-bold ml-3 mt-1">{errors.password}</p>}
                                </div>
                            </div>

                            {errors.form && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                    <AlertCircle size={16} className="text-red-500 shrink-0"/>
                                    <p className="text-[10px] font-bold text-red-400 leading-tight">{errors.form}</p>
                                </div>
                            )}

                            <button onClick={handleFirstStepNext} disabled={loading} className={`w-full py-4 rounded-2xl text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 ${theme.buttonGradient}`}>
                                {loading ? <Loader2 className="animate-spin" /> : <>Войти <LogIn size={16}/></>}
                            </button>
                        </MDiv>
                    )}

                    {/* REGISTER FORM - STEP 1 */}
                    {mode === 'register' && step === 1 && (
                        <MDiv key="reg-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="space-y-4">
                                <div className="group">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-3 mb-1 block group-focus-within:text-white/80 transition-colors">Email</label>
                                    <div className={`flex items-center bg-black/40 border border-white/10 rounded-2xl px-4 transition-all focus-within:bg-black/60 ${theme.inputFocus}`}>
                                        <Mail size={18} className="text-white/30" />
                                        <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-transparent border-none p-4 text-sm font-bold text-white outline-none placeholder:text-white/20" placeholder="user@example.com" />
                                    </div>
                                    {errors.email && <p className="text-[10px] text-red-500 font-bold ml-3 mt-1">{errors.email}</p>}
                                </div>
                                <div className="group">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-3 mb-1 block group-focus-within:text-white/80 transition-colors">Придумайте пароль</label>
                                    <div className={`flex items-center bg-black/40 border border-white/10 rounded-2xl px-4 transition-all focus-within:bg-black/60 ${theme.inputFocus}`}>
                                        <Lock size={18} className="text-white/30" />
                                        <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-transparent border-none p-4 text-sm font-bold text-white outline-none placeholder:text-white/20" placeholder="Min. 6 characters" />
                                    </div>
                                    {errors.password && <p className="text-[10px] text-red-500 font-bold ml-3 mt-1">{errors.password}</p>}
                                </div>
                            </div>
                            <button onClick={nextStep} className={`w-full py-4 rounded-2xl text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all ${theme.buttonGradient}`}>
                                Далее <ArrowRight size={16}/>
                            </button>
                        </MDiv>
                    )}

                    {/* REGISTER FORM - STEP 2 */}
                    {mode === 'register' && step === 2 && (
                        <MDiv key="reg-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="text-center">
                                <h3 className="text-white font-bold text-lg">Как вас называть?</h3>
                                <p className="text-white/40 text-xs mt-1">Придумайте уникальный username</p>
                            </div>
                            
                            <div className="group">
                                <div className={`flex items-center bg-black/40 border border-white/10 rounded-2xl px-4 transition-all focus-within:bg-black/60 ${theme.inputFocus}`}>
                                    <AtSign size={18} className="text-white/30" />
                                    <input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full bg-transparent border-none p-4 text-sm font-bold text-white outline-none placeholder:text-white/20" placeholder="username" autoFocus />
                                </div>
                                {errors.username && <p className="text-[10px] text-red-500 font-bold ml-3 mt-1">{errors.username}</p>}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={prevStep} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronLeft size={20}/></button>
                                <button onClick={nextStep} className={`flex-1 py-4 rounded-2xl text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all ${theme.buttonGradient}`}>
                                    Далее <ArrowRight size={16}/>
                                </button>
                            </div>
                        </MDiv>
                    )}

                    {/* REGISTER FORM - STEP 3 */}
                    {mode === 'register' && step === 3 && (
                        <MDiv key="reg-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className={`w-24 h-24 rounded-3xl bg-black/40 border-2 border-dashed ${formData.avatarPreview ? 'border-transparent' : 'border-white/20'} flex items-center justify-center overflow-hidden transition-all hover:border-white/40`}>
                                        {formData.avatarPreview ? (
                                            <img src={formData.avatarPreview} className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera size={32} className="text-white/20" />
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-2 -right-2 p-2 rounded-full text-white shadow-lg ${theme.accentBg}`}><Upload size={14}/></div>
                                    <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Фото профиля (опционально)</p>
                            </div>

                            <div className="space-y-3">
                                <div className={`flex items-center bg-black/40 border border-white/10 rounded-2xl px-4 transition-all focus-within:bg-black/60 ${theme.inputFocus}`}>
                                    <User size={18} className="text-white/30" />
                                    <input value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full bg-transparent border-none p-4 text-sm font-bold text-white outline-none placeholder:text-white/20" placeholder="Имя" />
                                </div>
                                <div className={`flex items-center bg-black/40 border border-white/10 rounded-2xl px-4 transition-all focus-within:bg-black/60 ${theme.inputFocus}`}>
                                    <User size={18} className="text-white/30" />
                                    <input value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full bg-transparent border-none p-4 text-sm font-bold text-white outline-none placeholder:text-white/20" placeholder="Фамилия (опционально)" />
                                </div>
                                {errors.firstName && <p className="text-[10px] text-red-500 font-bold ml-3 mt-1">{errors.firstName}</p>}
                            </div>

                            {errors.form && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                    <AlertCircle size={16} className="text-red-500 shrink-0"/>
                                    <p className="text-[10px] font-bold text-red-400 leading-tight">{errors.form}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button onClick={prevStep} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronLeft size={20}/></button>
                                <button onClick={handleRegister} disabled={loading} className={`flex-1 py-4 rounded-2xl text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 ${theme.buttonGradient}`}>
                                    {loading ? <Loader2 className="animate-spin" /> : <>Завершить <Check size={16}/></>}
                                </button>
                            </div>
                        </MDiv>
                    )}
                    </>
                )}
             </AnimatePresence>
          </div>
       </MDiv>
       
       <div className="absolute bottom-6 text-[10px] font-black uppercase tracking-[0.3em] text-white/10 pointer-events-none">
           Secure Encrypted Connection
       </div>
    </div>
  );
};
