
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, Copy, Check, X, User, AtSign, AlignLeft, Calendar, Shield, Smartphone, Eye, Bell, Lock, QrCode, Palette, Image as ImageIcon, Link } from 'lucide-react';
import { UserProfile } from '../../types';
import { supabase } from '../../supabaseClient';

const MDiv = motion.div as any;

interface ProfileModalProps {
  userProfile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  onSaveProfile: (p: UserProfile) => Promise<void>;
  onClose: () => void;
  isReadOnly?: boolean;
}

const NAME_COLORS = [
    { id: 'default', value: '#ffffff', label: 'Default' },
    { id: 'red', value: '#ef4444', label: 'Crimson' },
    { id: 'blue', value: '#3b82f6', label: 'Azure' },
    { id: 'green', value: '#10b981', label: 'Emerald' },
    { id: 'purple', value: '#a855f7', label: 'Amethyst' },
    { id: 'gold', value: '#eab308', label: 'Gold' },
    { id: 'pink', value: '#ec4899', label: 'Neon' },
    { id: 'cyan', value: '#06b6d4', label: 'Cyber' },
];

const BANNER_PRESETS = [
    { id: 'void', value: 'linear-gradient(135deg, #000000 0%, #2e022e 100%)', label: 'Void' },
    { id: 'crimson', value: 'linear-gradient(135deg, #4a0404 0%, #000000 100%)', label: 'Crimson' },
    { id: 'ocean', value: 'linear-gradient(135deg, #041f4a 0%, #000205 100%)', label: 'Ocean' },
    { id: 'sunset', value: 'linear-gradient(135deg, #4a0426 0%, #0f0005 100%)', label: 'Sunset' },
    { id: 'matrix', value: 'linear-gradient(135deg, #022c22 0%, #000000 100%)', label: 'Matrix' },
    { id: 'gold', value: 'linear-gradient(135deg, #4a3804 0%, #050200 100%)', label: 'Gold' },
    { id: 'cyber', value: 'linear-gradient(135deg, #2e044a 0%, #000000 100%)', label: 'Cyber' },
    { id: 'clean', value: 'linear-gradient(135deg, #222 0%, #111 100%)', label: 'Clean' }
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ userProfile, onUpdateProfile, onSaveProfile, onClose, isReadOnly = false }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'appearance'>('general');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [customBannerUrl, setCustomBannerUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
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

  const defaultBanner = `linear-gradient(135deg, #${userProfile.id.slice(0,6)} 0%, #000000 100%)`;
  const currentBanner = userProfile.banner?.startsWith('http') ? `url(${userProfile.banner}) center/cover no-repeat` : (userProfile.banner || defaultBanner);
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=vellor://u/${userProfile.id}&color=ffffff&bgcolor=000000`;

  return (
    <div className="flex flex-col h-full bg-[#050505] relative">
      {/* HEADER / BANNER */}
      <div className="relative h-40 shrink-0">
          <div className="absolute inset-0 transition-all duration-500" style={{ background: currentBanner }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505]" />
          
          <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10">
             <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90 drop-shadow-md">
                 {isReadOnly ? 'ПРОФИЛЬ' : 'МОЙ ПРОФИЛЬ'}
             </h2>
             <button onClick={onClose} className="p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 text-white transition-all active:scale-90 border border-white/10"><X size={20}/></button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 custom-scrollbar -mt-16 relative z-10">
          
          {/* AVATAR SECTION */}
          <div className="flex flex-col items-center mb-8">
            <div className={`relative group ${isReadOnly ? '' : 'cursor-pointer'}`}>
              <div className="w-32 h-32 rounded-[2rem] border-4 border-[#050505] overflow-hidden bg-black relative shadow-2xl">
                  <img src={userProfile.avatar || 'https://via.placeholder.com/176'} className={`w-full h-full object-cover transition-opacity duration-300 ${isUploadingAvatar ? 'opacity-40' : 'opacity-100'}`} alt="Profile" />
                  {isUploadingAvatar && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-vellor-red" size={32} /></div>}
              </div>
              {!isReadOnly && (
                  <>
                    <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2.5 bg-vellor-red rounded-2xl text-white shadow-lg border-4 border-[#050505] hover:scale-110 transition-transform active:scale-95">
                        <Camera size={16} />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                  </>
              )}
            </div>
            
            <div className="text-center mt-4">
                <h2 className="text-2xl font-black mb-1" style={{ color: userProfile.nameColor || 'white' }}>{userProfile.name}</h2>
                <div 
                    className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" 
                    onClick={() => { navigator.clipboard.writeText(userProfile.id); setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 2000); }}
                >
                    <span className="text-[10px] font-mono text-white/40 tracking-wider">ID: {userProfile.id.slice(0, 8)}...</span>
                    {copyFeedback ? <Check size={10} className="text-green-500" /> : <Copy size={10} className="opacity-30" />}
                </div>
            </div>
          </div>

          {/* TABS (Hidden in ReadOnly mode) */}
          {!isReadOnly && (
              <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 mb-6">
                  <button onClick={() => setActiveTab('general')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white'}`}>
                      Основное
                  </button>
                  <button onClick={() => setActiveTab('appearance')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'appearance' ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white'}`}>
                      Стиль
                  </button>
                  <button onClick={() => setActiveTab('privacy')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'privacy' ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white'}`}>
                      QR & ID
                  </button>
              </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'general' ? (
                <MDiv key="general" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Отображаемое имя</label>
                        <div className={`bg-white/5 border border-white/5 rounded-2xl flex items-center px-4 transition-colors ${!isReadOnly ? 'focus-within:border-vellor-red/50 focus-within:bg-black/40' : ''}`}>
                            <User size={18} className="text-white/30" />
                            {isReadOnly ? (
                                <div className="w-full bg-transparent p-4 text-sm font-bold text-white">{userProfile.name}</div>
                            ) : (
                                <input value={userProfile.name} onChange={(e) => onUpdateProfile({...userProfile, name: e.target.value})} className="w-full bg-transparent p-4 text-sm font-bold outline-none text-white placeholder:text-white/20" placeholder="Ваше имя"/>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Username</label>
                        <div className={`bg-white/5 border border-white/5 rounded-2xl flex items-center px-4 transition-colors ${!isReadOnly ? 'focus-within:border-vellor-red/50 focus-within:bg-black/40' : ''}`}>
                            <AtSign size={18} className="text-white/30" />
                            {isReadOnly ? (
                                <div className="w-full bg-transparent p-4 text-sm font-bold text-white">@{userProfile.username}</div>
                            ) : (
                                <input value={userProfile.username} onChange={(e) => onUpdateProfile({...userProfile, username: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full bg-transparent p-4 text-sm font-bold outline-none text-white placeholder:text-white/20" placeholder="@username"/>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">О себе</label>
                        <div className={`bg-white/5 border border-white/5 rounded-2xl flex items-start px-4 py-3 transition-colors ${!isReadOnly ? 'focus-within:border-vellor-red/50 focus-within:bg-black/40' : ''}`}>
                            <AlignLeft size={18} className="text-white/30 mt-1" />
                            {isReadOnly ? (
                                <div className="w-full bg-transparent px-4 text-sm min-h-[100px] leading-relaxed text-white whitespace-pre-wrap">
                                    {userProfile.bio || <span className="text-white/20 italic">Информация не заполнена</span>}
                                </div>
                            ) : (
                                <textarea value={userProfile.bio} onChange={(e) => onUpdateProfile({...userProfile, bio: e.target.value})} className="w-full bg-transparent px-4 text-sm min-h-[100px] resize-none outline-none leading-relaxed text-white placeholder:text-white/20 custom-scrollbar" placeholder="Расскажите о себе..." />
                            )}
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
            ) : activeTab === 'appearance' ? (
                <MDiv key="appearance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    {/* NAME COLOR */}
                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                        <h4 className="text-xs font-bold uppercase text-white mb-4 flex items-center gap-2">
                            <Palette size={16} className="text-vellor-red" /> Цвет имени
                        </h4>
                        <div className="grid grid-cols-4 gap-3">
                            {NAME_COLORS.map(color => (
                                <button 
                                    key={color.id} 
                                    onClick={() => onUpdateProfile({...userProfile, nameColor: color.value})}
                                    className={`aspect-square rounded-xl border flex items-center justify-center transition-all active:scale-95 relative overflow-hidden group ${userProfile.nameColor === color.value ? 'border-white' : 'border-white/10 hover:border-white/30'}`}
                                    style={{ background: color.value === '#ffffff' ? '#222' : color.value }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/50 to-transparent" />
                                    {userProfile.nameColor === color.value && <Check size={20} className="text-white relative z-10 drop-shadow-md"/>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* BANNER PRESETS */}
                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                        <h4 className="text-xs font-bold uppercase text-white mb-4 flex items-center gap-2">
                            <ImageIcon size={16} className="text-blue-400" /> Фон профиля
                        </h4>
                        
                        <div className="flex gap-2">
                            <div className="bg-white/5 border border-white/10 rounded-xl px-3 flex items-center flex-1 focus-within:border-blue-500/50 transition-colors">
                                <Link size={14} className="text-white/30 mr-2" />
                                <input 
                                    value={customBannerUrl}
                                    onChange={(e) => setCustomBannerUrl(e.target.value)}
                                    placeholder="Ссылка на картинку..."
                                    className="bg-transparent w-full py-3 text-xs text-white outline-none"
                                />
                            </div>
                            <button 
                                onClick={() => onUpdateProfile({...userProfile, banner: customBannerUrl})}
                                disabled={!customBannerUrl}
                                className="px-4 bg-blue-500 rounded-xl text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 hover:bg-blue-600 transition-colors"
                            >
                                OK
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {BANNER_PRESETS.map(preset => (
                                <button 
                                    key={preset.id} 
                                    onClick={() => onUpdateProfile({...userProfile, banner: preset.value})}
                                    className={`h-16 rounded-xl border flex items-center justify-center transition-all active:scale-95 relative overflow-hidden group ${userProfile.banner === preset.value ? 'border-white ring-2 ring-white/20' : 'border-white/10 hover:border-white/30'}`}
                                    style={{ background: preset.value }}
                                >
                                    <span className="relative z-10 text-[9px] font-bold uppercase tracking-widest text-white drop-shadow-lg">{preset.label}</span>
                                    {userProfile.banner === preset.value && <div className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5"><Check size={10} className="text-white"/></div>}
                                </button>
                            ))}
                        </div>
                    </div>
                </MDiv>
            ) : (
                <MDiv key="privacy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    <div className="flex flex-col items-center p-6 bg-white rounded-3xl border-4 border-white shadow-xl relative overflow-hidden group">
                        <img src={qrCodeUrl} className="w-48 h-48 mix-blend-multiply" alt="QR Code" />
                        <div className="absolute inset-0 bg-black flex items-center justify-center opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity">
                            <div className="bg-white text-black text-[10px] font-bold px-3 py-1 rounded-full">Scan to Chat</div>
                        </div>
                    </div>
                    <p className="text-center text-[10px] text-white/40 uppercase tracking-widest">
                        Ваш персональный QR код
                    </p>
                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 opacity-50 pointer-events-none">
                        <div className="flex items-center gap-3 text-white/60">
                            <Shield size={20} className="text-white" />
                            <span className="text-xs font-bold uppercase tracking-widest">Безопасность (Скоро)</span>
                        </div>
                    </div>
                </MDiv>
            )}
          </AnimatePresence>
      </div>
      
      {/* FLOATING ACTION BUTTON (Hide in ReadOnly) */}
      {!isReadOnly && (
          <div className="absolute bottom-6 left-6 right-6 z-20">
             <button 
                onClick={async () => { setIsSaving(true); await onSaveProfile(userProfile); setIsSaving(false); onClose(); }} 
                disabled={isSaving} 
                className="w-full py-4 bg-white text-black font-black uppercase text-[11px] tracking-[0.3em] rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
             >
                {isSaving ? <Loader2 className="animate-spin" /> : 'Сохранить изменения'}
             </button>
          </div>
      )}
    </div>
  );
};
