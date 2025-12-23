
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Settings, User, LogOut, ChevronLeft, Crown, BadgeCheck, History, ShieldAlert, Check, Folder, Users, MessageCircle, Monitor, Keyboard, Zap, Bug, Sparkles, Phone, ArrowUpRight, ArrowDownLeft, Clock, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { Chat, UserProfile, UserStatus, PrivacyValue, User as UserType, CallLogItem } from '../types';
import { supabase } from '../supabaseClient';
import { ToastType } from './Toast';
import { NOTIFICATION_SOUNDS } from '../constants';
import { NftGallery } from './NftGallery';
import { AdminPanel } from './modals/AdminPanel';
import { SettingsModal } from './modals/SettingsModal';
import { ProfileModal } from './modals/ProfileModal';
import { ChatItem } from './chat/ChatItem';
import { NewChatModal } from './modals/NewChatModal';
import { CreateGroupModal } from './modals/CreateGroupModal';
import { StatusIndicator } from './ui/StatusIndicator';
import { CallHistoryModal } from './modals/CallHistoryModal';

const MDiv = motion.div as any;

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string, user: any) => void;
  userProfile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  onSaveProfile: (p: UserProfile) => Promise<void>;
  onSetTheme: (theme: string) => void;
  currentThemeId: string;
  onUpdateStatus: (status: UserStatus) => void;
  settings: { sound: boolean; notifications: boolean; pulsing?: boolean; liteMode?: boolean; notificationSound?: string };
  onUpdateSettings: (s: { sound: boolean; notifications: boolean; pulsing?: boolean; liteMode?: boolean; notificationSound?: string }) => void;
  typingUsers: Record<string, string[]>; 
  onChatAction: (chatId: string, action: 'pin' | 'mute' | 'delete') => void;
  showToast: (msg: string, type: ToastType) => void;
  onlineUsers: Map<string, UserStatus>;
  onBroadcast?: (message: string) => Promise<boolean>; 
  onToggleMaintenance?: (active: boolean) => Promise<boolean>;
  isMaintenanceMode?: boolean;
  callHistory: CallLogItem[];
}

export const ChatList: React.FC<ChatListProps> = ({ 
  chats, activeChatId, onSelectChat, userProfile, onUpdateProfile, onSaveProfile, onSetTheme, currentThemeId, onUpdateStatus, settings, onUpdateSettings, typingUsers, onChatAction, showToast, onlineUsers, onBroadcast, onToggleMaintenance, isMaintenanceMode, callHistory
}) => {
  const [activeModal, setActiveModal] = useState<'profile' | 'settings' | 'privacy' | 'privacy_item' | 'new_chat' | 'create_group' | 'nft' | 'admin_login' | 'admin_panel' | 'changelog' | 'calls' | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chat: Chat } | null>(null);
  const [showChangelogAlert, setShowChangelogAlert] = useState(false);
  
  // Privacy editing state
  const [privacyKey, setPrivacyKey] = useState<keyof UserProfile | null>(null);
  
  const [activeFolder, setActiveFolder] = useState<'all' | 'personal' | 'groups'>(() => {
      const saved = localStorage.getItem('vellor_active_folder');
      return (saved === 'personal' || saved === 'groups') ? saved : 'all';
  });

  useEffect(() => {
      const lastVersion = localStorage.getItem('vellor_version');
      if (lastVersion !== '2.3.2') {
          setShowChangelogAlert(true);
      }
  }, []);

  const handleOpenChangelog = () => {
      localStorage.setItem('vellor_version', '2.3.2');
      setShowChangelogAlert(false);
      setActiveModal('changelog');
  };

  useEffect(() => {
      localStorage.setItem('vellor_active_folder', activeFolder);
  }, [activeFolder]);

  const [searchQuery, setSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<UserType[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState<UserType[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAvatar, setNewGroupAvatar] = useState<File | null>(null);
  const [newGroupAvatarPreview, setNewGroupAvatarPreview] = useState<string>("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [adminTapCount, setAdminTapCount] = useState(0);
  const [adminPin, setAdminPin] = useState("");
  
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);

  const isMobile = window.innerWidth < 768;

  const playPreviewSound = (url: string, id: string) => {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    }
    const soundObj = NOTIFICATION_SOUNDS.find(s => s.id === id);
    const playAudio = (src: string) => {
        const audio = new Audio(src);
        audio.onended = () => { setPlayingSoundId(null); setPreviewAudio(null); };
        audio.onerror = () => {
            if (src === soundObj?.url && soundObj?.fallback) playAudio(soundObj.fallback);
            else { setPlayingSoundId(null); setPreviewAudio(null); }
        };
        setPlayingSoundId(id);
        setPreviewAudio(audio);
        audio.play().catch(() => setPlayingSoundId(null));
    };
    playAudio(url);
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
      if (activeModal !== 'new_chat' && activeModal !== 'create_group') return;
      if (!searchQuery.trim()) {
          setGlobalSearchResults([]);
          setIsSearchingGlobal(false);
          return;
      }
      const searchUsers = async () => {
          setIsSearchingGlobal(true);
          let query = supabase.from('profiles').select('*').limit(20);
          query = query.or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
          const { data, error } = await query;
          if (!error && data) {
              setGlobalSearchResults(data.map(p => ({
                  id: p.id, name: p.full_name, username: p.username, avatar: p.avatar_url, status: p.status || 'offline', bio: p.bio, isVerified: p.is_verified, isAdmin: p.is_admin, isBanned: p.is_banned
              })));
          }
          setIsSearchingGlobal(false);
      };
      const timeout = setTimeout(searchUsers, 500);
      return () => clearTimeout(timeout);
  }, [searchQuery, activeModal]);

  const handleCreateGroup = async () => {
      if (!newGroupName.trim()) { showToast("Введите название группы", "warning"); return; }
      if (selectedUsersForGroup.length === 0) { showToast("Выберите участников", "warning"); return; }
      setIsCreatingGroup(true);
      try {
          let avatarUrl = "";
          if (newGroupAvatar) {
              const fileName = `groups/${Date.now()}_${newGroupAvatar.name}`;
              const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, newGroupAvatar);
              if (!uploadError) {
                  const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                  avatarUrl = data.publicUrl;
              }
          }
          const { data: groupData, error: groupError } = await supabase.from('groups').insert({ name: newGroupName, avatar_url: avatarUrl, created_by: userProfile.id }).select().single();
          if (groupError || !groupData) throw groupError;
          const members = [ { group_id: groupData.id, user_id: userProfile.id, is_admin: true }, ...selectedUsersForGroup.map(u => ({ group_id: groupData.id, user_id: u.id, is_admin: false })) ];
          const { error: membersError } = await supabase.from('group_members').insert(members);
          if (membersError) throw membersError;
          showToast("Группа создана!", "success");
          setActiveModal(null);
          setNewGroupName("");
          setSelectedUsersForGroup([]);
          setNewGroupAvatar(null);
          setNewGroupAvatarPreview("");
          onSelectChat(groupData.id, { id: groupData.id, name: groupData.name, avatar: groupData.avatar_url, status: 'online', isGroup: true });
      } catch (e: any) { showToast("Ошибка создания группы", "error"); } finally { setIsCreatingGroup(false); }
  };

  const handleAdminTrigger = () => {
      setAdminTapCount(prev => prev + 1);
      if (adminTapCount + 1 >= 7) { setAdminTapCount(0); setActiveModal('admin_login'); }
  };

  const handleAdminLogin = async () => {
      if (adminPin === "2077") {
          if (!userProfile.isAdmin) {
              const { error } = await supabase.rpc('claim_admin');
              if (error) showToast("Ошибка: Функция claim_admin отсутствует.", "warning");
              else { showToast("Права администратора активированы", "success"); onUpdateProfile({ ...userProfile, isAdmin: true, isVerified: true }); }
          }
          setActiveModal('admin_panel');
          setAdminPin("");
      } else { showToast("Access Denied", "error"); setAdminPin(""); }
  };

  const handlePrivacyChange = async (value: PrivacyValue) => {
      if (!privacyKey) return;
      const updatedProfile = { ...userProfile, [privacyKey]: value };
      onUpdateProfile(updatedProfile);
      
      // Persist immediately
      await supabase.from('profiles').update({ [privacyKey]: value }).eq('id', userProfile.id);
      
      setActiveModal('privacy');
      setPrivacyKey(null);
  };

  const openPrivacySelector = (key: keyof UserProfile) => {
      setPrivacyKey(key);
      setActiveModal('privacy_item');
  };

  const filteredChats = chats.filter(chat => {
      const matchesSearch = chat.user.name.toLowerCase().includes(searchQuery.toLowerCase()) || chat.lastMessage?.text?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeFolder === 'personal') return !chat.user.isGroup;
      if (activeFolder === 'groups') return chat.user.isGroup;
      return true;
  });

  const recentContacts = chats.filter(c => !c.user.isGroup).map(c => c.user);
  const isSuperAdmin = userProfile.username?.toLowerCase() === 'arfstudoo';

  const PRIVACY_ITEMS = [
      { key: 'privacy_phone', label: 'Номер телефона', icon: Phone },
      { key: 'privacy_last_seen', label: 'Последняя активность', icon: Clock },
      { key: 'privacy_avatar', label: 'Фото профиля', icon: User },
      { key: 'privacy_calls', label: 'Звонки', icon: Phone },
      { key: 'privacy_groups', label: 'Приглашения в группы', icon: Users },
  ];

  const getPrivacyLabel = (val?: string) => {
      if (val === 'nobody') return 'Никто';
      if (val === 'contacts') return 'Контакты';
      return 'Все';
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 flex flex-col gap-3 border-b border-[var(--border)] bg-black/10 backdrop-blur-sm sticky top-0 z-20">
        
        {/* CHANGELOG ALERT */}
        <AnimatePresence>
            {showChangelogAlert && (
                <MDiv initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <button onClick={handleOpenChangelog} className="w-full bg-gradient-to-r from-vellor-red/20 to-transparent border border-vellor-red/30 rounded-xl p-2.5 flex items-center gap-3 mb-2 group">
                        <div className="bg-vellor-red rounded-lg p-1 text-white animate-pulse"><Sparkles size={14}/></div>
                        <div className="text-left flex-1">
                            <p className="text-[10px] font-bold text-vellor-red uppercase tracking-wider">Обновление v2.3.2</p>
                            <p className="text-[10px] text-white/70">Нажмите, чтобы узнать что нового</p>
                        </div>
                    </button>
                </MDiv>
            )}
        </AnimatePresence>

        <div className="flex items-center justify-between">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white transition-all active:scale-90"><Menu size={22}/></button>
            <div className="flex items-center justify-center">
                 <div className="w-8 h-8 flex items-center justify-center relative" onClick={handleAdminTrigger}>
                    {!settings.liteMode && !isMobile && <div className="absolute inset-0 bg-vellor-red/20 blur-xl rounded-full"></div>}
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_rgba(255,0,51,0.5)]"><path d="M 25 25 L 50 85 L 75 25" fill="none" stroke="#ff0033" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                 </div>
            </div>
            <div className="relative group cursor-pointer active:scale-95 transition-transform" onClick={() => setActiveModal('profile')}>
              <div className="w-10 h-10 rounded-xl border border-[var(--border)] overflow-hidden bg-black/40 shadow-xl">
                  <img src={userProfile.avatar || 'https://via.placeholder.com/44'} className="w-full h-full object-cover" alt="Avatar" />
              </div>
              <div className="absolute -bottom-1 -right-1">
                 {/* Local user status is always reliable from props */}
                 <StatusIndicator status={userProfile.status} size="w-3 h-3" />
              </div>
              {isSuperAdmin && <div className="absolute -top-1.5 -right-1.5 bg-black/80 rounded-full p-0.5 border border-yellow-500/50 shadow-lg shadow-yellow-500/20"><Crown size={10} className="text-yellow-400 fill-yellow-400" /></div>}
            </div>
        </div>

        <div className="flex gap-2 mb-1 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveFolder('all')} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border min-w-[70px] ${activeFolder === 'all' ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/10 hover:bg-white/5'}`}>Все</button>
            <button onClick={() => setActiveFolder('personal')} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border min-w-[70px] ${activeFolder === 'personal' ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/10 hover:bg-white/5'}`}>Личные</button>
            <button onClick={() => setActiveFolder('groups')} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border min-w-[70px] ${activeFolder === 'groups' ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/10 hover:bg-white/5'}`}>Группы</button>
            <button onClick={() => setActiveModal('calls')} className={`px-3 py-2 rounded-xl text-white/40 border border-white/10 hover:bg-white/5 transition-all`}><Phone size={14}/></button>
        </div>

        <div className="relative group">
            <div className="absolute left-3 top-2.5 text-white/30"><div className="w-4 h-4" /></div> 
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск..." className="w-full bg-white/5 border border-white/5 rounded-2xl py-2 pl-9 pr-4 text-sm focus:border-vellor-red/30 outline-none transition-all text-white" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-20 custom-scrollbar relative touch-pan-y">
        {filteredChats.length === 0 && <div className="flex flex-col items-center justify-center h-40 opacity-30 text-white"><Folder size={32} strokeWidth={1} className="mb-2"/><span className="text-xs">Пусто</span></div>}
        {filteredChats.map(chat => (
            <ChatItem 
                key={chat.id}
                chat={chat}
                activeChatId={activeChatId}
                onSelectChat={onSelectChat}
                onContextMenu={(e: any, c: Chat) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, chat: c }); }}
                onlineUsers={onlineUsers}
                typingUsers={typingUsers}
                settings={settings}
                myPrivacyLastSeen={userProfile.privacy_last_seen}
            />
        ))}
      </div>
      
      <button onClick={() => { setSearchQuery(''); setActiveModal('new_chat'); }} className="absolute bottom-6 right-6 w-14 h-14 bg-vellor-red text-white rounded-full shadow-[0_0_30px_rgba(255,0,51,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10 border border-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
      </button>

      <AnimatePresence>
        {contextMenu && (
           <MDiv initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[100] w-48 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl origin-top-left overflow-hidden" onClick={(e: any) => e.stopPropagation()}>
              <button onClick={() => { onChatAction(contextMenu.chat.id, 'pin'); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors active:scale-95 text-white">{contextMenu.chat.isPinned ? 'Открепить' : 'Закрепить'}</button>
              <button onClick={() => { onChatAction(contextMenu.chat.id, 'mute'); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors active:scale-95 text-white">{contextMenu.chat.isMuted ? 'Включить звук' : 'Выключить звук'}</button>
              <div className="h-px bg-white/10 my-1.5" />
              <button onClick={() => { onChatAction(contextMenu.chat.id, 'delete'); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-colors active:scale-95">Удалить чат</button>
           </MDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <MDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <MDiv initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="absolute top-20 left-4 w-60 bg-[#050505] border border-white/10 rounded-3xl z-50 p-2 shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="p-4 mb-2 bg-white/5 rounded-2xl border border-white/5">
                 <p className="text-white font-bold flex items-center gap-2">{userProfile.name}{isSuperAdmin && <Crown size={14} className="text-yellow-400 fill-yellow-400" />}{userProfile.isVerified && <BadgeCheck size={14} className="text-blue-400 fill-blue-400/20" />}</p>
                 <p className="text-xs text-white/50">@{userProfile.username}</p>
              </div>
              <button onClick={() => { setActiveModal('profile'); setIsMenuOpen(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all active:scale-95 text-white"><User size={16} className="text-vellor-red"/> Профиль</button>
              <button onClick={() => { setActiveModal('nft'); setIsMenuOpen(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all active:scale-95 text-white"><Settings size={16} className="text-fuchsia-400"/> Коллекция NFT</button>
              <button onClick={() => { setActiveModal('settings'); setIsMenuOpen(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all active:scale-95 text-white"><Settings size={16} className="text-vellor-red"/> Настройки</button>
              <div className="h-px bg-white/5 my-2" />
              <button onClick={() => (supabase.auth as any).signOut().then(() => window.location.reload())} className="flex items-center gap-4 w-full p-4 text-red-500/80 hover:text-red-500 rounded-2xl text-xs font-black tracking-widest uppercase transition-all active:scale-95"><LogOut size={16}/> Выйти</button>
            </MDiv>
          </>
        )}
        
        {activeModal && (
          <MDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-[#0a0a0a] z-[60] flex flex-col overflow-hidden">
             {activeModal === 'nft' && <NftGallery onClose={() => setActiveModal(null)} />}
             {activeModal === 'calls' && <CallHistoryModal onClose={() => setActiveModal(null)} history={callHistory} />}
             {activeModal === 'admin_login' && (
                 <div className="flex flex-col items-center justify-center h-full p-8 bg-black">
                     <ShieldAlert size={48} className="text-vellor-red mb-4" />
                     <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6">Security Clearance</h2>
                     <input type="password" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} placeholder="PIN" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-white font-mono tracking-widest mb-4 outline-none focus:border-vellor-red" />
                     <button onClick={handleAdminLogin} className="px-8 py-3 bg-vellor-red text-white font-bold rounded-xl uppercase tracking-wider text-xs hover:bg-red-600 transition-colors">Access</button>
                     <button onClick={() => setActiveModal(null)} className="mt-8 text-white/30 text-xs hover:text-white">Cancel</button>
                 </div>
             )}
             {activeModal === 'admin_panel' && (
                 <AdminPanel onClose={() => setActiveModal(null)} showToast={showToast} onlineUsers={onlineUsers as any} onBroadcast={onBroadcast} onToggleMaintenance={onToggleMaintenance} isMaintenanceMode={isMaintenanceMode} userProfile={userProfile} onUpdateStatus={onUpdateStatus} />
             )}
             {activeModal === 'settings' && (
                 <SettingsModal onClose={() => setActiveModal(null)} userProfile={userProfile} onUpdateStatus={onUpdateStatus} onSetTheme={onSetTheme} currentThemeId={currentThemeId} settings={settings} onUpdateSettings={onUpdateSettings} playPreviewSound={playPreviewSound} playingSoundId={playingSoundId} onOpenPrivacy={() => setActiveModal('privacy')} onOpenChangelog={() => setActiveModal('changelog')} onOpenProfile={() => setActiveModal('profile')} />
             )}
             {activeModal === 'profile' && <ProfileModal userProfile={userProfile} onUpdateProfile={onUpdateProfile} onSaveProfile={onSaveProfile} onClose={() => setActiveModal(null)} />}
             
             {/* PRIVACY MENU */}
             {activeModal === 'privacy' && (
                 <div className="flex flex-col h-full bg-[#050505] relative">
                     <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                        <button onClick={() => setActiveModal('settings')} className="p-3 -ml-2 text-white/40 hover:text-white transition-colors active:scale-90"><ChevronLeft size={24}/></button>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">Приватность</h2>
                     </div>
                     <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar">
                         {PRIVACY_ITEMS.map(item => (
                             <button 
                                key={item.key} 
                                onClick={() => openPrivacySelector(item.key as keyof UserProfile)}
                                className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all active:scale-95"
                             >
                                 <div className="flex items-center gap-4">
                                     <div className="p-2 rounded-xl bg-white/5 text-white/60"><item.icon size={18}/></div>
                                     <div className="text-left">
                                         <p className="text-sm font-bold text-white">{item.label}</p>
                                         <p className="text-[10px] text-white/40">{getPrivacyLabel((userProfile as any)[item.key])}</p>
                                     </div>
                                 </div>
                                 <ChevronLeft size={16} className="rotate-180 text-white/20"/>
                             </button>
                         ))}
                         <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl mt-4 flex items-start gap-3">
                             <Lock size={16} className="text-yellow-500 shrink-0 mt-0.5"/>
                             <p className="text-[10px] text-white/60 leading-relaxed">
                                 Применяя строгие настройки, вы также можете потерять возможность видеть данные других пользователей (принцип взаимности).
                             </p>
                         </div>
                     </div>
                 </div>
             )}

             {/* PRIVACY SELECTOR */}
             {activeModal === 'privacy_item' && privacyKey && (
                 <div className="flex flex-col h-full bg-[#050505] relative">
                     <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                        <button onClick={() => setActiveModal('privacy')} className="p-3 -ml-2 text-white/40 hover:text-white transition-colors active:scale-90"><ChevronLeft size={24}/></button>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">
                            {PRIVACY_ITEMS.find(i => i.key === privacyKey)?.label}
                        </h2>
                     </div>
                     <div className="p-6 space-y-2">
                         <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                             {['everybody', 'contacts', 'nobody'].map((val) => {
                                 const isSelected = (userProfile as any)[privacyKey] === val || (! (userProfile as any)[privacyKey] && val === 'everybody');
                                 return (
                                     <button 
                                        key={val} 
                                        onClick={() => handlePrivacyChange(val as PrivacyValue)}
                                        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                     >
                                         <span className="text-sm font-bold text-white">
                                             {val === 'everybody' ? 'Все' : val === 'contacts' ? 'Мои контакты' : 'Никто'}
                                         </span>
                                         {isSelected && <Check size={16} className="text-vellor-red"/>}
                                     </button>
                                 )
                             })}
                         </div>
                         <p className="text-[10px] text-white/30 px-2 pt-2">
                             {privacyKey === 'privacy_last_seen' ? 
                                 'Если вы скроете время захода, вы не увидите время захода других.' : 
                                 'Укажите, кто может видеть эту информацию.'}
                         </p>
                     </div>
                 </div>
             )}

             {activeModal === 'changelog' && (
                 <div className="flex flex-col h-full bg-[#050505] relative">
                     <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveModal('settings')} className="p-3 -ml-2 text-white/40 hover:text-white transition-colors active:scale-90"><ChevronLeft size={24}/></button>
                            <div>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">UPDATES</h2>
                                <p className="text-[9px] text-white/40 font-mono">Build v2.3.2</p>
                            </div>
                        </div>
                        <div className="p-2 bg-vellor-red/10 rounded-lg"><History size={16} className="text-vellor-red"/></div>
                     </div>
                     <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-24">
                         {/* VERSION 2.3.2 (NEW) */}
                         <div className="relative pl-6 border-l-2 border-vellor-red space-y-4">
                             <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-vellor-red shadow-[0_0_15px_#ff0033]" />
                             <div>
                                 <h3 className="text-2xl font-black text-white uppercase tracking-tight">Vellor v2.3.2</h3>
                                 <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Четкое обновление</p>
                             </div>
                             
                             <div className="space-y-3">
                                 <div className="p-4 bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-2xl relative overflow-hidden group">
                                     <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2"><Bug size={14} className="text-red-400"/> Фиксы</h4>
                                     <p className="text-sm text-white/80 leading-relaxed">
                                         Короче, починил техработы. Раньше они висели даже после выключения, теперь всё четко. Если вы админ — вас вообще не заблокирует.
                                     </p>
                                 </div>

                                 <div className="p-4 bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-2xl relative overflow-hidden group">
                                     <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2"><Zap size={14} className="text-yellow-400"/> Кастомные профили</h4>
                                     <p className="text-sm text-white/80 leading-relaxed">
                                         Добавил поле для ссылки на картинку. Теперь в профиле можно поставить ЛЮБОЙ фон, хоть гифку с котиками. Просто вставь ссылку.
                                     </p>
                                 </div>
                             </div>
                         </div>

                         {/* VERSION 2.3.1 */}
                         <div className="relative pl-6 border-l border-white/10 space-y-4 opacity-60 hover:opacity-100 transition-opacity">
                             <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-white/20" />
                             <div><h3 className="text-lg font-black text-white">Обнова для души</h3><p className="text-[10px] text-white/40 font-mono">v2.3.1</p></div>
                             <div className="space-y-3">
                                 <div className="p-4 bg-white/5 border border-white/5 rounded-2xl"><h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2"><Phone size={14}/> Звонки</h4><p className="text-sm text-white/80 leading-relaxed">Добавил историю звонков.</p></div>
                             </div>
                         </div>
                     </div>
                 </div>
             )}
             {activeModal !== 'settings' && activeModal !== 'admin_login' && activeModal !== 'admin_panel' && activeModal !== 'nft' && activeModal !== 'privacy' && activeModal !== 'privacy_item' && activeModal !== 'changelog' && activeModal !== 'profile' && activeModal !== 'calls' && (
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        {(activeModal === 'create_group') && <button onClick={() => setActiveModal(activeModal === 'create_group' ? 'new_chat' : 'settings')} className="p-3 -ml-2 text-white/40 hover:text-white transition-colors active:scale-90"><ChevronLeft size={24}/></button>}
                        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">{activeModal === 'new_chat' ? 'Новый чат' : activeModal === 'create_group' ? 'Новая группа' : ''}</h2>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-3 bg-white/5 rounded-full hover:bg-vellor-red/20 hover:text-vellor-red transition-all active:scale-90"><X size={20}/></button>
                </div>
             )}
             <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                 {activeModal === 'new_chat' && <NewChatModal searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSelectChat={onSelectChat} onClose={() => setActiveModal(null)} onOpenCreateGroup={() => setActiveModal('create_group')} isSearchingGlobal={isSearchingGlobal} globalSearchResults={globalSearchResults} recentContacts={recentContacts} />}
                 {activeModal === 'create_group' && <CreateGroupModal newGroupName={newGroupName} setNewGroupName={setNewGroupName} newGroupAvatarPreview={newGroupAvatarPreview} setNewGroupAvatar={setNewGroupAvatar} setNewGroupAvatarPreview={setNewGroupAvatarPreview} searchQuery={searchQuery} setSearchQuery={setSearchQuery} selectedUsersForGroup={selectedUsersForGroup} setSelectedUsersForGroup={setSelectedUsersForGroup} globalSearchResults={globalSearchResults} recentContacts={recentContacts} isCreatingGroup={isCreatingGroup} handleCreateGroup={handleCreateGroup} />}
             </div>
          </MDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
