
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, Copy, Check, X, User, AtSign, AlignLeft, Calendar, Shield, Smartphone, Eye, Bell, Lock } from 'lucide-react';
import { UserProfile } from '../../types';
import { supabase } from '../../supabaseClient';

const MDiv = motion.div as any;

interface ProfileModalProps {
  userProfile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  onSaveProfile: (p: UserProfile) => Promise<void>;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ userProfile, onUpdateProfile, onSaveProfile, onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'privacy'>('general');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile.id) return;
    setIsUploadingAvatar(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${userProfile.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      onUpdateProfile({ ...userProfile, avatar: publicUrlData.publicUrl });
    }
    setIsUploadingAvatar(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Dynamic banner gradient based on User ID to give unique feel
  const bannerGradient = `linear-gradient(135deg, #${userProfile.id.slice(0,6)} 0%, #000000 100%)`;

  return (
    <div className="flex flex-col h-full bg-[#050505] relative">
      {/* HEADER / BANNER */}
      <div className="relative h-40 shrink-0">
          <div className="absolute inset-0 opacity-80" style={{ background: bannerGradient }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505]" />
          
          <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10">
             <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90 drop-shadow-md">МОЙ ПРОФИЛЬ</h2>
             <button onClick={onClose} className="p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 text-white transition-all active:scale-90 border border-white/10"><X size={20}/></button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 custom-scrollbar -mt-16 relative z-10">
          
          {/* AVATAR SECTION */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2rem] border-4 border-[#050505] overflow-hidden bg-black relative shadow-2xl">
                  <img src={userProfile.avatar || 'https://via.placeholder.com/176'} className={`w-full h-full object-cover transition-opacity duration-300 ${isUploadingAvatar ? 'opacity-40' : 'opacity-100'}`} alt="Profile" />
                  {isUploadingAvatar && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-vellor-red" size={32} /></div>}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2.5 bg-vellor-red rounded-2xl text-white shadow-lg border-4 border-[#050505] hover:scale-110 transition-transform active:scale-95">
                  <Camera size={16} />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
            </div>
            
            <div className="text-center mt-4">
                <h2 className="text-2xl font-black text-white mb-1">{userProfile.name}</h2>
                <div 
                    className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" 
                    onClick={() => { navigator.clipboard.writeText(userProfile.id); setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 2000); }}
                >
                    <span className="text-[10px] font-mono text-white/40 tracking-wider">ID: {userProfile.id.slice(0, 8)}...</span>
                    {copyFeedback ? <Check size={10} className="text-green-500" /> : <Copy size={10} className="opacity-30" />}
                </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 mb-6">
              <button onClick={() => setActiveTab('general')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white'}`}>
                  Основное
              </button>
              <button onClick={() => setActiveTab('privacy')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'privacy' ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white'}`}>
                  Приватность
              </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'general' ? (
                <MDiv key="general" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Отображаемое имя</label>
                        <div className="bg-white/5 border border-white/5 rounded-2xl flex items-center px-4 focus-within:border-vellor-red/50 focus-within:bg-black/40 transition-colors">
                            <User size={18} className="text-white/30" />
                            <input value={userProfile.name} onChange={(e) => onUpdateProfile({...userProfile, name: e.target.value})} className="w-full bg-transparent p-4 text-sm font-bold outline-none text-white placeholder:text-white/20" placeholder="Ваше имя"/>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Username</label>
                        <div className="bg-white/5 border border-white/5 rounded-2xl flex items-center px-4 focus-within:border-vellor-red/50 focus-within:bg-black/40 transition-colors">
                            <AtSign size={18} className="text-white/30" />
                            <input value={userProfile.username} onChange={(e) => onUpdateProfile({...userProfile, username: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full bg-transparent p-4 text-sm font-bold outline-none text-white placeholder:text-white/20" placeholder="@username"/>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">О себе</label>
                        <div className="bg-white/5 border border-white/5 rounded-2xl flex items-start px-4 py-3 focus-within:border-vellor-red/50 focus-within:bg-black/40 transition-colors">
                            <AlignLeft size={18} className="text-white/30 mt-1" />
                            <textarea value={userProfile.bio} onChange={(e) => onUpdateProfile({...userProfile, bio: e.target.value})} className="w-full bg-transparent px-4 text-sm min-h-[100px] resize-none outline-none leading-relaxed text-white placeholder:text-white/20 custom-scrollbar" placeholder="Расскажите о себе..." />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 mt-4">
                        <div className="flex items-center gap-3 mb-2 opacity-50">
                            <Calendar size={16} />
                            <span className="text-xs font-bold uppercase tracking-wide">Дата регистрации</span>
                        </div>
                        <p className="text-sm font-mono text-white pl-7">
                            {userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'Неизвестно'}
                        </p>
                    </div>
                </MDiv>
            ) : (
                <MDiv key="privacy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-white/60">
                            <Shield size={20} className="text-vellor-red" />
                            <span className="text-xs font-bold uppercase tracking-widest">Настройки видимости</span>
                        </div>
                        <div className="space-y-1">
                             {['Номер телефона', 'Последняя активность', 'Фото профиля'].map((item, i) => (
                                 <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors cursor-pointer group">
                                     <span className="text-sm text-white/80">{item}</span>
                                     <span className="text-xs text-white/30 group-hover:text-white transition-colors">Все</span>
                                 </div>
                             ))}
                        </div>
                    </div>

                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 opacity-50 pointer-events-none">
                        <div className="flex items-center gap-3 text-white/60">
                            <Lock size={20} className="text-white" />
                            <span className="text-xs font-bold uppercase tracking-widest">Безопасность (Скоро)</span>
                        </div>
                        <div className="space-y-1">
                             <div className="flex items-center justify-between p-3">
                                 <span className="text-sm text-white/80">Двухфакторная аутентификация</span>
                                 <div className="w-8 h-4 bg-white/10 rounded-full" />
                             </div>
                        </div>
                    </div>
                </MDiv>
            )}
          </AnimatePresence>
      </div>
      
      {/* FLOATING ACTION BUTTON */}
      <div className="absolute bottom-6 left-6 right-6 z-20">
         <button 
            onClick={async () => { setIsSaving(true); await onSaveProfile(userProfile); setIsSaving(false); onClose(); }} 
            disabled={isSaving} 
            className="w-full py-4 bg-white text-black font-black uppercase text-[11px] tracking-[0.3em] rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
         >
            {isSaving ? <Loader2 className="animate-spin" /> : 'Сохранить изменения'}
         </button>
      </div>
    </div>
  );
};
