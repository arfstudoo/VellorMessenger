
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Camera, ChevronLeft, Check, AtSign, Upload, Loader2, LogIn, Palette, Zap, Sparkles, Moon, Sun, Leaf } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';

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
      const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
      });

      if (error) {
          setErrors({ form: error.message });
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
                  status: 'online'
              });
          } else {
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
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
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
          setErrors({ form: authError.message });
          setLoading(false);
          return;
      }

      if (authData.user) {
          if (authData.session) {
              const userId = authData.user.id;
              let avatarUrl = '';

              if (formData.avatarFile) {
                  const fileExt = formData.avatarFile.name.split('.').pop();
                  const fileName = `${userId}/${Math.random()}.${fileExt}`;
                  const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, formData.avatarFile);

                  if (!uploadError) {
                      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                      avatarUrl = publicUrlData.publicUrl;
                      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
                  }
              }

              await supabase.from('profiles').update({ status: 'online' }).eq('id', userId);

              onComplete({
                  id: userId,
                  name: fullName,
                  username: formData.username,
                  avatar: avatarUrl,
                  phone: formData.email,
                  email: formData.email,
                  bio: 'Привет! Я использую Vellor.',
                  status: 'online'
              });
          } else {
              setErrors({ form: 'Регистрация успешна! Проверьте email для подтверждения.' });
          }
      }
      setLoading(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, avatarPreview: url, avatarFile: file }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'login') {
             handleFirstStepNext();
        } else {
            if (step === 1) handleFirstStepNext();
            else if (step === 2) nextStep();
            else if (step === 3) nextStep();
            else if (step === 4) handleRegister();
        }
    }
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
  };

  return (
    <motion.div 
        key="auth-root"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed inset-0 flex flex-col items-center justify-center p-6 z-40 overflow-hidden"
    >
        {/* Animated Dynamic Background */}
        <motion.div 
            className="absolute inset-0 z-0"
            animate={{ background: theme.bgGradient }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        
        {/* Animated Background Noise */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] z-0 pointer-events-none" />
        
        {/* Floating Particles/Glow */}
        <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ repeat: Infinity, duration: 8 }}
            className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 pointer-events-none ${theme.accentBg}`}
        />

        {/* --- MAIN CARD --- */}
        <motion.div 
            layout
            className={`relative w-full max-w-[420px] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 overflow-hidden z-20 ${theme.glow} transition-shadow duration-700`}
        >
            
            {/* Header / Logo */}
            <div className="flex flex-col items-center mb-6 relative z-10">
                 <motion.div 
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-white/10 bg-white/5 relative group cursor-pointer transition-colors`}
                    onClick={cycleTheme}
                 >
                      <div className={`absolute inset-0 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500 ${theme.accentBg}`} />
                      <ThemeIcon size={28} className={`${theme.accentColor} relative z-10 drop-shadow-[0_0_10px_currentColor] transition-colors duration-500`} />
                 </motion.div>
                 
                 <AnimatePresence mode="wait">
                    <motion.h2 
                        key={mode}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        className="text-2xl font-black tracking-[0.3em] text-white text-center"
                    >
                        {mode === 'register' ? 'РЕГИСТРАЦИЯ' : 'ВХОД'}
                    </motion.h2>
                 </AnimatePresence>
                 
                 {mode === 'register' && (
                     <div className="flex gap-2 mt-6">
                        {[1, 2, 3, 4].map(i => (
                            <div 
                                key={i} 
                                className={`h-1 rounded-full transition-all duration-500 ${step >= i ? `w-8 ${theme.accentBg}` : 'w-2 bg-white/10'}`} 
                            />
                        ))}
                     </div>
                 )}
            </div>

            {/* Content Area */}
            <div className="relative min-h-[300px]">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    
                    {/* STEP 1: EMAIL & PASSWORD */}
                    {step === 1 && (
                        <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col">
                            <h3 className="text-sm font-bold text-white/50 mb-6 text-center uppercase tracking-widest">
                                {mode === 'register' ? 'Создание учетной записи' : 'Добро пожаловать'}
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="group space-y-2">
                                    <div className={`flex items-center bg-black/30 border border-white/10 rounded-2xl px-4 py-3.5 transition-all duration-300 group-focus-within:${theme.inputFocus} ${errors.email ? 'border-red-500' : ''}`}>
                                        <Mail size={18} className="text-white/40 mr-3 transition-colors group-focus-within:text-white" />
                                        <input 
                                            type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} onKeyDown={handleKeyDown}
                                            placeholder="Email" className="bg-transparent border-none outline-none text-white w-full placeholder:text-white/20 text-sm font-medium" autoFocus
                                        />
                                    </div>
                                    {errors.email && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wide ml-1">{errors.email}</p>}
                                </div>

                                <div className="group space-y-2">
                                    <div className={`flex items-center bg-black/30 border border-white/10 rounded-2xl px-4 py-3.5 transition-all duration-300 group-focus-within:${theme.inputFocus} ${errors.password ? 'border-red-500' : ''}`}>
                                        <Lock size={18} className="text-white/40 mr-3 transition-colors group-focus-within:text-white" />
                                        <input 
                                            type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} onKeyDown={handleKeyDown}
                                            placeholder="Пароль" className="bg-transparent border-none outline-none text-white w-full placeholder:text-white/20 text-sm font-medium"
                                        />
                                    </div>
                                    {errors.password && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wide ml-1">{errors.password}</p>}
                                </div>
                            </div>

                            {errors.form && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"><p className="text-red-500 text-xs text-center font-bold">{errors.form}</p></div>}

                            <div className="mt-auto pt-6">
                                <button 
                                    onClick={handleFirstStepNext} disabled={loading}
                                    className={`relative w-full overflow-hidden ${theme.buttonGradient} text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 hover:brightness-110 group`}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                                    {loading ? <Loader2 className="animate-spin" /> : (mode === 'register' ? 'Продолжить' : 'Войти')} 
                                    {!loading && (mode === 'register' ? <ArrowRight size={18} /> : <LogIn size={18} />)}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: USERNAME */}
                    {mode === 'register' && step === 2 && (
                        <motion.div key="step2" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col">
                            <h3 className="text-sm font-bold text-white/50 mb-2 text-center uppercase tracking-widest">Уникальное имя</h3>
                            <p className="text-white/30 text-xs text-center mb-8 px-4">Это имя будут видеть другие пользователи в поиске</p>
                            
                            <div className={`flex items-center bg-black/30 border border-white/10 rounded-2xl px-4 py-3.5 transition-all duration-300 group-focus-within:${theme.inputFocus} ${errors.username ? 'border-red-500' : ''}`}>
                                <AtSign size={18} className={`${theme.accentColor} mr-3`} />
                                <input 
                                    type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})} onKeyDown={handleKeyDown}
                                    placeholder="username" className="bg-transparent border-none outline-none text-white w-full placeholder:text-white/20 text-lg font-bold" autoFocus 
                                />
                            </div>
                            {errors.username && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wide mt-2 ml-1">{errors.username}</p>}
                            
                            <div className="mt-auto pt-6 flex gap-3">
                                <button onClick={prevStep} className="px-4 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"><ChevronLeft size={24} /></button>
                                <button onClick={nextStep} className="flex-1 bg-white text-black hover:bg-gray-200 font-black uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-[0.98]">Далее</button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: NAMES */}
                    {mode === 'register' && step === 3 && (
                         <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col">
                            <h3 className="text-sm font-bold text-white/50 mb-6 text-center uppercase tracking-widest">Как вас зовут?</h3>
                            <div className="space-y-4">
                                <div className={`flex items-center bg-black/30 border border-white/10 rounded-2xl px-4 py-3.5 transition-all duration-300 group-focus-within:${theme.inputFocus} ${errors.firstName ? 'border-red-500' : ''}`}>
                                    <User size={18} className="text-white/40 mr-3" />
                                    <input type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} onKeyDown={handleKeyDown} placeholder="Имя" className="bg-transparent border-none outline-none text-white w-full placeholder:text-white/20 text-sm font-bold" autoFocus />
                                </div>
                                <div className={`flex items-center bg-black/30 border border-white/10 rounded-2xl px-4 py-3.5 transition-all duration-300 group-focus-within:${theme.inputFocus}`}>
                                    <User size={18} className="text-white/10 mr-3" />
                                    <input type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} onKeyDown={handleKeyDown} placeholder="Фамилия (необязательно)" className="bg-transparent border-none outline-none text-white w-full placeholder:text-white/20 text-sm font-medium" />
                                </div>
                            </div>
                            <div className="mt-auto pt-6 flex gap-3">
                                <button onClick={prevStep} className="px-4 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"><ChevronLeft size={24} /></button>
                                <button onClick={nextStep} className="flex-1 bg-white text-black hover:bg-gray-200 font-black uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-[0.98]">Далее</button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: AVATAR */}
                    {mode === 'register' && step === 4 && (
                        <motion.div key="step4" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col items-center">
                             <h3 className="text-sm font-bold text-white/50 mb-2 text-center uppercase tracking-widest">Фото профиля</h3>
                             <p className="text-white/30 text-xs text-center mb-8">Необязательно, но желательно</p>
                             
                             <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                 <div className={`w-32 h-32 rounded-[2rem] border-2 border-dashed border-white/20 flex items-center justify-center bg-black/20 group-hover:bg-white/5 transition-all overflow-hidden relative group-hover:${theme.inputFocus}`}>
                                     {formData.avatarPreview ? (<img src={formData.avatarPreview} alt="Preview" className="w-full h-full object-cover" />) : (<div className="flex flex-col items-center text-white/30"><Camera size={28} className="mb-2" /><span className="text-[10px] uppercase font-bold">Загрузить</span></div>)}
                                 </div>
                                 <div className={`absolute -bottom-2 -right-2 p-2 rounded-full text-white shadow-lg ${theme.accentBg}`}><Upload size={16}/></div>
                                 <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                             </div>
                             
                             <div className="mt-auto w-full pt-6 flex gap-3">
                                 <button onClick={prevStep} className="px-4 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"><ChevronLeft size={24} /></button>
                                 <button onClick={handleRegister} disabled={loading} className={`flex-1 ${theme.buttonGradient} text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 hover:brightness-110`}>
                                     {loading ? <Loader2 className="animate-spin" /> : 'Завершить'} {!loading && <Check size={18} />}
                                 </button>
                             </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Switch Mode */}
            {!loading && (
                <div className="mt-8 text-center relative z-20">
                    <button 
                        onClick={() => { setMode(prev => prev === 'login' ? 'register' : 'login'); setStep(1); setErrors({}); }} 
                        className="text-xs font-bold text-white/50 hover:text-white transition-colors uppercase tracking-wider"
                    >
                        {mode === 'register' ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
                        <span className={`${theme.accentColor} font-black underline decoration-2 underline-offset-4 decoration-transparent hover:decoration-current transition-all`}>
                             {mode === 'register' ? 'Войти' : 'Создать'}
                        </span>
                    </button>
                </div>
            )}
        </motion.div>

        {/* --- BOTTOM LEFT THEME SWITCHER --- */}
        <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={cycleTheme}
            className="absolute bottom-6 left-6 p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all z-50 flex items-center gap-2 group"
        >
            <Palette size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 whitespace-nowrap opacity-0 group-hover:opacity-100">
                {theme.label}
            </span>
        </motion.button>
    </motion.div>
  );
};
