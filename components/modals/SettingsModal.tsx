
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Volume2, Bell, SmartphoneCharging, Activity, Check, Shield, History, ChevronRight, Download, Volume1, Edit3, BadgeCheck, Monitor, Keyboard, AlertTriangle, Zap } from 'lucide-react';
import { UserProfile, UserStatus } from '../../types';
import { NOTIFICATION_SOUNDS } from '../../constants';

const MDiv = motion.div as any;

const THEME_DATA = [
  { id: 'crimson', name: 'Crimson', bg: 'linear-gradient(135deg, #4a0404 0%, #000000 100%)' },
  { id: 'ocean', name: 'Ocean', bg: 'linear-gradient(135deg, #041f4a 0%, #000000 100%)' },
  { id: 'cyber', name: 'Cyber', bg: 'linear-gradient(135deg, #2e044a 0%, #000000 100%)' },
  { id: 'gold', name: 'Gold', bg: 'linear-gradient(135deg, #4a3804 0%, #000000 100%)' },
  { id: 'emerald', name: 'Emerald', bg: 'linear-gradient(135deg, #022c22 0%, #000000 100%)' },
  { id: 'obsidian', name: 'Obsidian', bg: 'linear-gradient(135deg, #262626 0%, #000000 100%)' },
  { id: 'sunset', name: 'Sunset', bg: 'linear-gradient(135deg, #4a0426 0%, #0f0005 100%)' }
];

const STATUS_OPTIONS = [
    { id: 'online', label: 'В СЕТИ', color: 'bg-green-500', desc: 'Вас видят все' },
    { id: 'away', label: 'ОТОШЕЛ', color: 'bg-yellow-500', desc: 'Временно недоступен' },
    { id: 'dnd', label: 'ЗАНЯТ', color: 'bg-red-500', desc: 'Не беспокоить' },
    { id: 'offline', label: 'СКРЫТ', color: 'bg-gray-500', desc: 'Офлайн для всех' }
];

// Re-using the Switch component
const SettingSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button 
        onClick={onChange} 
        className={`w-11 h-6 rounded-full relative transition-colors duration-300 flex items-center ${checked ? 'bg-vellor-red' : 'bg-white/10'}`}
    >
        <MDiv 
            className="w-4 h-4 bg-white rounded-full shadow-sm"
            initial={false}
            animate={{ x: checked ? 24 : 4 }} 
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
    </button>
);

interface SettingsModalProps {
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateStatus: (status: UserStatus) => void;
  onSetTheme: (theme: string) => void;
  currentThemeId: string;
  settings: { sound: boolean; notifications: boolean; pulsing?: boolean; liteMode?: boolean; notificationSound?: string };
  onUpdateSettings: (s: any) => void;
  playPreviewSound: (url: string, id: string) => void;
  playingSoundId: string | null;
  onOpenPrivacy: () => void;
  onOpenChangelog: () => void;
  onOpenProfile: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    onClose, userProfile, onUpdateStatus, onSetTheme, currentThemeId, settings, onUpdateSettings, 
    playPreviewSound, playingSoundId, onOpenPrivacy, onOpenChangelog, onOpenProfile
}) => {
  return (
    <div className="flex flex-col h-full bg-[#050505]">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl sticky top-0 z-10">
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">НАСТРОЙКИ</h2>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all text-white/50 hover:text-white active:scale-90"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-24">
            
            {/* Profile Summary Card */}
            <div className="p-4 bg-gradient-to-br from-white/10 to-black border border-white/10 rounded-3xl flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-vellor-red/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 overflow-hidden relative z-10 shadow-xl">
                    <img src={userProfile.avatar || 'https://via.placeholder.com/64'} className="w-full h-full object-cover" alt="Avatar"/>
                </div>
                <div className="flex-1 z-10">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                        {userProfile.name}
                        {userProfile.isVerified && <BadgeCheck size={16} className="text-blue-400 fill-blue-400/20" />}
                    </h3>
                    <p className="text-xs text-white/40">@{userProfile.username}</p>
                </div>
                <button onClick={onOpenProfile} className="p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all active:scale-95 z-10"><Edit3 size={18}/></button>
            </div>

            {/* Status Section */}
            <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 ml-2">Мой Статус</h4>
                <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map(s => (
                        <button 
                        key={s.id} 
                        onClick={() => onUpdateStatus(s.id as UserStatus)}
                        className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${userProfile.status === s.id ? 'bg-white/10 border-white/20 shadow-lg' : 'bg-[#0f0f0f] border-transparent hover:bg-white/5'}`}
                        >
                            <div className={`w-3 h-3 rounded-full ${s.color} shadow-[0_0_10px_currentColor]`} />
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-white uppercase">{s.label}</p>
                                <p className="text-[9px] text-white/30">{s.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Appearance Section */}
            <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 ml-2">Оформление</h4>
                <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 custom-scrollbar touch-pan-x">
                    {THEME_DATA.map(t => (
                        <button 
                        key={t.id} 
                        onClick={() => onSetTheme(t.id)}
                        className={`flex flex-col items-center gap-2 min-w-[70px] group`}
                        >
                            <div className={`w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-all border ${currentThemeId === t.id ? 'border-white scale-110' : 'border-white/10 group-hover:border-white/30'}`} style={{ background: t.bg }}>
                                {currentThemeId === t.id && <Check size={20} className="text-white drop-shadow-md" />}
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${currentThemeId === t.id ? 'text-white' : 'text-white/40'}`}>{t.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* General Settings */}
            <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1 ml-2">Система</h4>
                <div className="bg-[#0f0f0f] rounded-3xl border border-white/5 overflow-hidden">
                    <div className="p-4 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-xl"><Volume2 size={18} className="text-white/70"/></div>
                            <span className="text-sm font-bold text-white">Звуки</span>
                        </div>
                        <SettingSwitch checked={settings.sound} onChange={() => onUpdateSettings({...settings, sound: !settings.sound})} />
                    </div>
                    <div className="p-4 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-xl"><Bell size={18} className="text-white/70"/></div>
                            <span className="text-sm font-bold text-white">Уведомления</span>
                        </div>
                        <SettingSwitch checked={settings.notifications} onChange={() => onUpdateSettings({...settings, notifications: !settings.notifications})} />
                    </div>
                    <div className="p-4 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-xl"><SmartphoneCharging size={18} className="text-white/70"/></div>
                            <div>
                                <p className="text-sm font-bold text-white">Lite Режим</p>
                                <p className="text-[9px] text-white/30">Экономия батареи</p>
                            </div>
                        </div>
                        <SettingSwitch checked={settings.liteMode} onChange={() => onUpdateSettings({...settings, liteMode: !settings.liteMode})} />
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-xl"><Activity size={18} className="text-white/70"/></div>
                            <span className="text-sm font-bold text-white">Анимации фона</span>
                        </div>
                        <SettingSwitch checked={settings.pulsing} onChange={() => onUpdateSettings({...settings, pulsing: !settings.pulsing})} />
                    </div>
                </div>
            </div>

            {/* Notification Sounds */}
            <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 ml-2">Мелодия уведомлений</h4>
                <div className="bg-[#0f0f0f] rounded-3xl border border-white/5 p-2 space-y-1">
                    {NOTIFICATION_SOUNDS.map(sound => (
                        <button 
                            key={sound.id}
                            onClick={() => { onUpdateSettings({...settings, notificationSound: sound.id}); playPreviewSound(sound.url, sound.id); }}
                            className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${settings.notificationSound === sound.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg ${settings.notificationSound === sound.id ? 'bg-vellor-red text-white' : 'bg-white/5 text-white/30'}`}>
                                    {playingSoundId === sound.id ? <Volume2 size={14} className="animate-pulse"/> : <Volume1 size={14}/>}
                                </div>
                                <span className={`text-xs font-bold ${settings.notificationSound === sound.id ? 'text-white' : 'text-white/50'}`}>{sound.name}</span>
                            </div>
                            {settings.notificationSound === sound.id && <Check size={14} className="text-vellor-red"/>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Additional Links */}
            <div className="space-y-2">
                <a 
                href="https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/releases" 
                target="_blank" 
                rel="noreferrer"
                className="w-full p-4 bg-[#0f0f0f] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <Download size={18} className="text-white/60 group-hover:text-white transition-colors"/>
                        <span className="text-sm font-bold text-white">Проверить обновления</span>
                    </div>
                    <ChevronRight size={16} className="text-white/20 group-hover:text-white/50"/>
                </a>
                <button onClick={onOpenPrivacy} className="w-full p-4 bg-[#0f0f0f] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-3">
                        <Shield size={18} className="text-white/60 group-hover:text-white transition-colors"/>
                        <span className="text-sm font-bold text-white">Приватность</span>
                    </div>
                    <ChevronRight size={16} className="text-white/20 group-hover:text-white/50"/>
                </button>
                <button onClick={onOpenChangelog} className="w-full p-4 bg-[#0f0f0f] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-3">
                        <History size={18} className="text-white/60 group-hover:text-white transition-colors"/>
                        <span className="text-sm font-bold text-white">Список изменений</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-vellor-red bg-vellor-red/10 px-2 py-0.5 rounded-md">v2.3.0</span>
                        <ChevronRight size={16} className="text-white/20 group-hover:text-white/50"/>
                    </div>
                </button>
            </div>
        </div>
    </div>
  );
};
