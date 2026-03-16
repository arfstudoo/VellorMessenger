
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Volume2, Bell, SmartphoneCharging, Activity, Check, Shield, History, ChevronRight, Download, Volume1, Edit3, BadgeCheck, Monitor, Keyboard, AlertTriangle, Zap, Smartphone } from 'lucide-react';
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
  onOpenDevices?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    onClose, userProfile, onUpdateStatus, onSetTheme, currentThemeId, settings, onUpdateSettings, 
    playPreviewSound, playingSoundId, onOpenPrivacy, onOpenChangelog, onOpenProfile, onOpenDevices
}) => {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0a0a0a] to-[#050505] relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
        
        {/* Header */}
        <div className="relative p-6 border-b border-white/5 flex items-center justify-between glass-panel sticky top-0 z-10 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-vellor-red to-transparent rounded-full" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white drop-shadow-md">настройки</h2>
            </div>
            <button onClick={onClose} className="p-3 glass-panel-light rounded-2xl hover:bg-white/10 text-white transition-all active:scale-90 shadow-lg group">
                <X size={20} className="group-hover:rotate-90 transition-transform duration-300"/>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 pb-24">
            
            {/* Profile Card */}
            <div className="relative p-5 glass-panel rounded-3xl overflow-hidden group hover:shadow-glow-red transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-vellor-red/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-vellor-red/5 rounded-full blur-3xl" />
                
                <div className="relative flex items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl glass-panel-light overflow-hidden shadow-xl border-2 border-white/10">
                            <img src={userProfile.avatar || 'https://via.placeholder.com/64'} className="w-full h-full object-cover" alt="Avatar"/>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#0a0a0a] shadow-lg" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-white flex items-center gap-2 truncate">
                            {userProfile.name}
                            {userProfile.isVerified && <BadgeCheck size={16} className="text-blue-400 fill-blue-400/20 shrink-0" />}
                        </h3>
                        <p className="text-xs text-white/50 font-medium">@{userProfile.username}</p>
                    </div>
                    
                    <button onClick={onOpenProfile} className="p-3 glass-panel-light rounded-xl text-white hover:bg-white/10 transition-all active:scale-95 shrink-0 group/btn">
                        <Edit3 size={18} className="group-hover/btn:rotate-12 transition-transform"/>
                    </button>
                </div>
            </div>

            {/* Status Section */}
            <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-4 ml-2 flex items-center gap-2">
                    <Activity size={12} className="text-vellor-red"/>
                    статус
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {STATUS_OPTIONS.map(s => (
                        <button 
                        key={s.id} 
                        onClick={() => onUpdateStatus(s.id as UserStatus)}
                        className={`relative p-4 rounded-2xl border transition-all duration-300 overflow-hidden group/status ${userProfile.status === s.id ? 'glass-panel-light border-white/20 shadow-lg scale-105' : 'glass-panel border-white/5 hover:border-white/10'}`}
                        >
                            {userProfile.status === s.id && (
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                            )}
                            <div className="relative flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${s.color} shadow-[0_0_10px_currentColor] ${userProfile.status === s.id ? 'animate-pulse' : ''}`} />
                                <div className="text-left flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">{s.label}</p>
                                    <p className="text-[9px] text-white/40 truncate">{s.desc}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Theme Section */}
            <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-4 ml-2 flex items-center gap-2">
                    <Monitor size={12} className="text-vellor-red"/>
                    тема
                </h4>
                <div className="grid grid-cols-4 gap-3">
                    {THEME_DATA.map(t => (
                        <button 
                        key={t.id} 
                        onClick={() => onSetTheme(t.id)}
                        className="flex flex-col items-center gap-2 group"
                        >
                            <div className={`relative w-full aspect-square rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 border-2 overflow-hidden ${currentThemeId === t.id ? 'border-white scale-105 shadow-glow-red' : 'border-white/10 group-hover:border-white/30 group-hover:scale-105'}`} style={{ background: t.bg }}>
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/30 to-transparent" />
                                {currentThemeId === t.id && (
                                    <div className="relative z-10 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                                        <Check size={14} className="text-black" />
                                    </div>
                                )}
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors truncate w-full text-center ${currentThemeId === t.id ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}>{t.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Settings Toggles */}
            <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-4 ml-2 flex items-center gap-2">
                    <Zap size={12} className="text-vellor-red"/>
                    система
                </h4>
                <div className="glass-panel rounded-3xl overflow-hidden shadow-lg">
                    <div className="p-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 glass-panel-light rounded-xl">
                                <Volume2 size={18} className="text-white/80"/>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">звуки</p>
                                <p className="text-[9px] text-white/40">звуковые эффекты</p>
                            </div>
                        </div>
                        <SettingSwitch checked={settings.sound} onChange={() => onUpdateSettings({...settings, sound: !settings.sound})} />
                    </div>
                    
                    <div className="p-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 glass-panel-light rounded-xl">
                                <Bell size={18} className="text-white/80"/>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">уведомления</p>
                                <p className="text-[9px] text-white/40">push и тосты</p>
                            </div>
                        </div>
                        <SettingSwitch checked={settings.notifications} onChange={() => onUpdateSettings({...settings, notifications: !settings.notifications})} />
                    </div>
                    
                    <div className="p-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 glass-panel-light rounded-xl">
                                <SmartphoneCharging size={18} className="text-white/80"/>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">lite режим</p>
                                <p className="text-[9px] text-white/40">экономия батареи</p>
                            </div>
                        </div>
                        <SettingSwitch checked={settings.liteMode} onChange={() => onUpdateSettings({...settings, liteMode: !settings.liteMode})} />
                    </div>
                    
                    <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 glass-panel-light rounded-xl">
                                <Activity size={18} className="text-white/80"/>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">анимации фона</p>
                                <p className="text-[9px] text-white/40">пульсирующий эффект</p>
                            </div>
                        </div>
                        <SettingSwitch checked={settings.pulsing} onChange={() => onUpdateSettings({...settings, pulsing: !settings.pulsing})} />
                    </div>
                </div>
            </div>

            {/* Notification Sounds */}
            <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-4 ml-2 flex items-center gap-2">
                    <Volume1 size={12} className="text-vellor-red"/>
                    мелодия
                </h4>
                <div className="glass-panel rounded-3xl p-2 space-y-1 shadow-lg">
                    {NOTIFICATION_SOUNDS.map(sound => (
                        <button 
                            key={sound.id}
                            onClick={() => { onUpdateSettings({...settings, notificationSound: sound.id}); playPreviewSound(sound.url, sound.id); }}
                            className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-all group ${settings.notificationSound === sound.id ? 'glass-panel-light shadow-md' : 'hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl transition-all ${settings.notificationSound === sound.id ? 'bg-vellor-red text-white shadow-glow-red' : 'glass-panel-light text-white/40 group-hover:text-white/60'}`}>
                                    {playingSoundId === sound.id ? <Volume2 size={14} className="animate-pulse"/> : <Volume1 size={14}/>}
                                </div>
                                <span className={`text-xs font-bold transition-colors ${settings.notificationSound === sound.id ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>{sound.name}</span>
                            </div>
                            {settings.notificationSound === sound.id && (
                                <div className="w-5 h-5 bg-vellor-red rounded-full flex items-center justify-center">
                                    <Check size={12} className="text-white"/>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Links */}
            <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-4 ml-2 flex items-center gap-2">
                    <Keyboard size={12} className="text-vellor-red"/>
                    ссылки
                </h4>
                <div className="space-y-2">
                    {onOpenDevices && (
                        <button onClick={onOpenDevices} className="w-full p-4 glass-panel rounded-2xl flex items-center justify-between group hover:glass-panel-light transition-all shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 glass-panel-light rounded-xl group-hover:bg-white/10 transition-colors">
                                    <Smartphone size={18} className="text-white/70 group-hover:text-white transition-colors"/>
                                </div>
                                <span className="text-sm font-bold text-white">устройства</span>
                            </div>
                            <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all"/>
                        </button>
                    )}
                    
                    <button onClick={onOpenPrivacy} className="w-full p-4 glass-panel rounded-2xl flex items-center justify-between group hover:glass-panel-light transition-all shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 glass-panel-light rounded-xl group-hover:bg-white/10 transition-colors">
                                <Shield size={18} className="text-white/70 group-hover:text-white transition-colors"/>
                            </div>
                            <span className="text-sm font-bold text-white">приватность</span>
                        </div>
                        <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all"/>
                    </button>
                    
                    <button onClick={onOpenChangelog} className="w-full p-4 glass-panel rounded-2xl flex items-center justify-between group hover:glass-panel-light transition-all shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 glass-panel-light rounded-xl group-hover:bg-white/10 transition-colors">
                                <History size={18} className="text-white/70 group-hover:text-white transition-colors"/>
                            </div>
                            <span className="text-sm font-bold text-white">что нового</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-vellor-red bg-vellor-red/10 px-2 py-1 rounded-lg border border-vellor-red/20">v2.4.3</span>
                            <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all"/>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
