
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2, Copy, Check, X } from 'lucide-react';
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

  return (
    <div className="flex flex-col h-full bg-[#050505] relative">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
         <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">МОЙ ПРОФИЛЬ</h2>
         <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-vellor-red/20 hover:text-vellor-red transition-all active:scale-90"><X size={20}/></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-10 custom-scrollbar">
          <div className="flex flex-col items-center gap-6 relative">
            <div className="relative group">
              <div className="w-40 h-40 rounded-[2.5rem] border-4 border-white/5 overflow-hidden bg-black relative shadow-2xl">
                  <img src={userProfile.avatar || 'https://via.placeholder.com/176'} className={`w-full h-full object-cover transition-opacity duration-300 ${isUploadingAvatar ? 'opacity-40' : 'opacity-100'}`} alt="Profile" />
                  {isUploadingAvatar && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-vellor-red" size={32} /></div>}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 p-3 bg-vellor-red rounded-full text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100"><Camera size={18} /></button>
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
            </div>
            <div className="text-center">
                <h2 className="text-2xl font-black text-white mb-1 flex items-center justify-center gap-2">{userProfile.name}</h2>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => { navigator.clipboard.writeText(userProfile.id); setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 2000); }}>
                    <span className="text-[10px] font-mono opacity-50">ID: {userProfile.id.substring(0, 8)}...</span>
                    {copyFeedback ? <Check size={10} className="text-green-500" /> : <Copy size={10} className="opacity-30" />}
                </div>
            </div>
          </div>
          <div className="space-y-4">
            <input value={userProfile.name} onChange={(e) => onUpdateProfile({...userProfile, name: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-bold focus:border-vellor-red/50 outline-none transition-all text-white" placeholder="Name"/>
            <input value={userProfile.username} onChange={(e) => onUpdateProfile({...userProfile, username: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-bold focus:border-vellor-red/50 outline-none transition-all text-white" placeholder="@username"/>
            <textarea value={userProfile.bio} onChange={(e) => onUpdateProfile({...userProfile, bio: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm min-h-[100px] resize-none focus:border-vellor-red/50 outline-none transition-all leading-relaxed text-white" placeholder="Bio..." />
          </div>
      </div>
      
      <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
         <button onClick={async () => { setIsSaving(true); await onSaveProfile(userProfile); setIsSaving(false); onClose(); }} disabled={isSaving} className="w-full py-4 bg-white text-black font-black uppercase text-[11px] tracking-[0.3em] rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95">
            {isSaving ? <Loader2 className="animate-spin" /> : 'Сохранить'}
         </button>
      </div>
    </div>
  );
};
