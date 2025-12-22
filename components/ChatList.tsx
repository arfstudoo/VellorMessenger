
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Settings, User, LogOut, ChevronLeft, Crown, BadgeCheck, History, ShieldAlert, Check, Folder, Users, MessageCircle } from 'lucide-react';
import { Chat, UserProfile, UserStatus, PrivacyValue, User as UserType } from '../types';
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
}

// Render Helper moved from inline to keep it accessible
const renderPrivacyOption = (label: string, value: PrivacyValue, type: string, Icon: any, setPrivacyItem: any, setActiveModal: any) => (
    <button onClick={() => { setPrivacyItem(type); setActiveModal('privacy_item'); }} className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 hover:bg-white/10 transition-all active:scale-[0.98] mb-2">
        <div className="flex items-center gap-3">
            <Icon size={20} className="text-white/60"/>
            <span className="text-sm font-bold text-white">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">{value === 'everybody' ? 'Все' : value === 'contacts' ? 'Мои контакты' : 'Никто'}</span>
            {/* Using a simple chevron here as import might be tricky in pure helper */}
            <div className="text-white/20">›</div>
        </div>
    </button>
);

export const ChatList: React.FC<ChatListProps> = ({ 
  chats, activeChatId, onSelectChat, userProfile, onUpdateProfile, onSaveProfile, onSetTheme, currentThemeId, onUpdateStatus, settings, onUpdateSettings, typingUsers, onChatAction, showToast, onlineUsers, onBroadcast, onToggleMaintenance, isMaintenanceMode
}) => {
  const [activeModal, setActiveModal] = useState<'profile' | 'settings' | 'privacy' | 'privacy_item' | 'new_chat' | 'create_group' | 'nft' | 'admin_login' | 'admin_panel' | 'changelog' | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chat: Chat } | null>(null);
  
  // Folders State with Persistence
  const [activeFolder, setActiveFolder] = useState<'all' | 'personal' | 'groups'>(() => {
      const saved = localStorage.getItem('vellor_active_folder');
      return (saved === 'personal' || saved === 'groups') ? saved : 'all';
  });

  // Persist folder change
  useEffect(() => {
      localStorage.setItem('vellor_active_folder', activeFolder);
  }, [activeFolder]);

  // Privacy State
  const [privacyItem, setPrivacyItem] = useState<string | null>(null);
  
  // Search & Contacts
  const [searchQuery, setSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<UserType[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  
  // Group Creation
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState<UserType[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAvatar, setNewGroupAvatar] = useState<File | null>(null);
  const [newGroupAvatarPreview, setNewGroupAvatarPreview] = useState<string>("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Admin Features (State required for triggers)
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [adminPin, setAdminPin] = useState("");
  
  // Audio preview state
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
        audio.onended = () => {
            setPlayingSoundId(null);
            setPreviewAudio(null);
        };
        audio.onerror = () => {
            if (src === soundObj?.url && soundObj?.fallback) {
                playAudio(soundObj.fallback);
            } else {
                setPlayingSoundId(null);
                setPreviewAudio(null);
            }
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

  // Global Search Logic
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
              const mappedUsers = data.map(p => ({
                  id: p.id,
                  name: p.full_name,
                  username: p.username,
                  avatar: p.avatar_url,
                  status: p.status || 'offline',
                  bio: p.bio,
                  isVerified: p.is_verified,
                  isAdmin: p.is_admin,
                  isBanned: p.is_banned
              }));
              setGlobalSearchResults(mappedUsers);
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

          const { data: groupData, error: groupError } = await supabase.from('groups').insert({
              name: newGroupName,
              avatar_url: avatarUrl,
              created_by: userProfile.id
          }).select().single();

          if (groupError || !groupData) throw groupError;

          const members = [
              { group_id: groupData.id, user_id: userProfile.id, is_admin: true },
              ...selectedUsersForGroup.map(u => ({ group_id: groupData.id, user_id: u.id, is_admin: false }))
          ];

          const { error: membersError } = await supabase.from('group_members').insert(members);
          if (membersError) throw membersError;

          showToast("Группа создана!", "success");
          setActiveModal(null);
          setNewGroupName("");
          setSelectedUsersForGroup([]);
          setNewGroupAvatar(null);
          setNewGroupAvatarPreview("");
          
          onSelectChat(groupData.id, {
               id: groupData.id,
               name: groupData.name,
               avatar: groupData.avatar_url,
               status: 'online',
               isGroup: true
          });

      } catch (e: any) {
          console.error(e);
          showToast("Ошибка создания группы", "error");
      } finally {
          setIsCreatingGroup(false);
      }
  };

  const handleAdminTrigger = () => {
      setAdminTapCount(prev => prev + 1);
      if (adminTapCount + 1 >= 7) {
          setAdminTapCount(0);
          setActiveModal('admin_login');
      }
  };

  const handleAdminLogin = async () => {
      if (adminPin === "2077") {
          if (!userProfile.isAdmin) {
              const { error } = await supabase.rpc('claim_admin');
              if (error) {
                  showToast("Ошибка: Функция claim_admin отсутствует.", "warning");
              } else {
                  showToast("Права администратора активированы", "success");
                  onUpdateProfile({ ...userProfile, isAdmin: true, isVerified: true });
              }
          }
          setActiveModal('admin_panel');
          setAdminPin("");
      } else {
          showToast("Access Denied", "error");
          setAdminPin("");
      }
  };

  // Filter Logic including Folders
  const filteredChats = chats.filter(chat => {
      const matchesSearch = chat.user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            chat.lastMessage?.text?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (activeFolder === 'personal') return !chat.user.isGroup;
      if (activeFolder === 'groups') return chat.user.isGroup;
      
      return true; // 'all'
  });

  const recentContacts = chats.filter(c => !c.user.isGroup).map(c => c.user);
  const isSuperAdmin = userProfile.username?.toLowerCase() === 'arfstudoo';

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 flex flex-col gap-3 border-b border-[var(--border)] bg-black/10 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white transition-all active:scale-90">
              <Menu size={22}/>
            </button>
            
            <div className="flex items-center justify-center">
                 <div className="w-8 h-8 flex items-center justify-center relative" onClick={handleAdminTrigger}>
                    {!settings.liteMode && !isMobile && <div className="absolute inset-0 bg-vellor-red/20 blur-xl rounded-full"></div>}
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_rgba(255,0,51,0.5)]">
                        <path d="M 25 25 L 50 85 L 75 25" fill="none" stroke="#ff0033" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                 </div>
            </div>

            <div className="relative group cursor-pointer active:scale-95 transition-transform" onClick={() => setActiveModal('profile')}>
              <div className="w-10 h-10 rounded-xl border border-[var(--border)] overflow-hidden bg-black/40 shadow-xl">
                  <img src={userProfile.avatar || 'https://via.placeholder.com/44'} className="w-full h-full object-cover" alt="Avatar" />
              </div>
              <div className="absolute -bottom-1 -right-1">
                 <StatusIndicator status={userProfile.status} size="w-3 h-3" />
              </div>
              {isSuperAdmin && (
                  <div className="absolute -top-1.5 -right-1.5 bg-black/80 rounded-full p-0.5 border border-yellow-500/50 shadow-lg shadow-yellow-500/20">
                      <Crown size={10} className="text-yellow-400 fill-yellow-400" />
                  </div>
              )}
            </div>
        </div>

        {/* FOLDERS / TABS */}
        <div className="flex gap-2 mb-1">
            <button onClick={() => setActiveFolder('all')} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${activeFolder === 'all' ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/10 hover:bg-white/5'}`}>
                Все
            </button>
            <button onClick={() => setActiveFolder('personal')} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${activeFolder === 'personal' ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/10 hover:bg-white/5'}`}>
                Личные
            </button>
            <button onClick={() => setActiveFolder('groups')} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${activeFolder === 'groups' ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/10 hover:bg-white/5'}`}>
                Группы
            </button>
        </div>

        {/* This input is just for the header view, the actual search state is used for the list filtering */}
        <div className="relative group">
            <div className="absolute left-3 top-2.5 text-white/30"><div className="w-4 h-4" /></div> 
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск..." className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-sm focus:border-vellor-red/30 outline-none transition-all text-white" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-20 custom-scrollbar relative touch-pan-y">
        {filteredChats.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 opacity-30 text-white">
                <Folder size={32} strokeWidth={1} className="mb-2"/>
                <span className="text-xs">Пусто</span>
            </div>
        )}
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
            />
        ))}
      </div>
      
      {/* ADD BUTTON */}
      <button onClick={() => { setSearchQuery(''); setActiveModal('new_chat'); }} className="absolute bottom-6 right-6 w-14 h-14 bg-vellor-red text-white rounded-full shadow-[0_0_30px_rgba(255,0,51,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10 border border-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
      </button>

      {/* CONTEXT MENU */}
      <AnimatePresence>
        {contextMenu && (
           <MDiv
             initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
             style={{ top: contextMenu.y, left: contextMenu.x }}
             className="fixed z-[100] w-48 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl origin-top-left overflow-hidden"
             onClick={(e: any) => e.stopPropagation()}
           >
              {/* Context menu items mostly use simple text or existing imports */}
              <button onClick={() => { onChatAction(contextMenu.chat.id, 'pin'); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors active:scale-95 text-white">
                  {contextMenu.chat.isPinned ? 'Открепить' : 'Закрепить'}
              </button>
              <button onClick={() => { onChatAction(contextMenu.chat.id, 'mute'); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors active:scale-95 text-white">
                  {contextMenu.chat.isMuted ? 'Включить звук' : 'Выключить звук'}
              </button>
              <div className="h-px bg-white/10 my-1.5" />
              <button onClick={() => { onChatAction(contextMenu.chat.id, 'delete'); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-colors active:scale-95">
                  Удалить чат
              </button>
           </MDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <MDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <MDiv initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="absolute top-20 left-4 w-60 bg-[#050505] border border-white/10 rounded-3xl z-50 p-2 shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="p-4 mb-2 bg-white/5 rounded-2xl border border-white/5">
                 <p className="text-white font-bold flex items-center gap-2">
                     {userProfile.name}
                     {isSuperAdmin && <Crown size={14} className="text-yellow-400 fill-yellow-400" />}
                     {userProfile.isVerified && <BadgeCheck size={14} className="text-blue-400 fill-blue-400/20" />}
                 </p>
                 <p className="text-xs text-white/50">@{userProfile.username}</p>
              </div>
              <button onClick={() => { setActiveModal('profile'); setIsMenuOpen(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all active:scale-95 text-white">
                <User size={16} className="text-vellor-red"/> Профиль
              </button>
              <button onClick={() => { setActiveModal('nft'); setIsMenuOpen(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all active:scale-95 text-white">
                <Settings size={16} className="text-fuchsia-400"/> Коллекция NFT
              </button>
              <button onClick={() => { setActiveModal('settings'); setIsMenuOpen(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all active:scale-95 text-white">
                <Settings size={16} className="text-vellor-red"/> Настройки
              </button>
              <div className="h-px bg-white/5 my-2" />
              <button onClick={() => (supabase.auth as any).signOut().then(() => window.location.reload())} className="flex items-center gap-4 w-full p-4 text-red-500/80 hover:text-red-500 rounded-2xl text-xs font-black tracking-widest uppercase transition-all active:scale-95"><LogOut size={16}/> Выйти</button>
            </MDiv>
          </>
        )}
        
        {/* MODALS */}
        {activeModal && (
          <MDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-[#0a0a0a] z-[60] flex flex-col overflow-hidden">
             
             {/* NFT MODAL */}
             {activeModal === 'nft' && <NftGallery onClose={() => setActiveModal(null)} />}
             
             {/* ADMIN LOGIN */}
             {activeModal === 'admin_login' && (
                 <div className="flex flex-col items-center justify-center h-full p-8 bg-black">
                     <ShieldAlert size={48} className="text-vellor-red mb-4" />
                     <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6">Security Clearance</h2>
                     <input type="password" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} placeholder="PIN" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-white font-mono tracking-widest mb-4 outline-none focus:border-vellor-red" />
                     <button onClick={handleAdminLogin} className="px-8 py-3 bg-vellor-red text-white font-bold rounded-xl uppercase tracking-wider text-xs hover:bg-red-600 transition-colors">Access</button>
                     <button onClick={() => setActiveModal(null)} className="mt-8 text-white/30 text-xs hover:text-white">Cancel</button>
                 </div>
             )}

             {/* ADMIN PANEL */}
             {activeModal === 'admin_panel' && (
                 <AdminPanel 
                    onClose={() => setActiveModal(null)} 
                    showToast={showToast}
                    onlineUsers={onlineUsers as any}
                    onBroadcast={onBroadcast}
                    onToggleMaintenance={onToggleMaintenance}
                    isMaintenanceMode={isMaintenanceMode}
                    userProfile={userProfile}
                    onUpdateStatus={onUpdateStatus}
                 />
             )}

             {/* SETTINGS MODAL */}
             {activeModal === 'settings' && (
                 <SettingsModal 
                    onClose={() => setActiveModal(null)}
                    userProfile={userProfile}
                    onUpdateStatus={onUpdateStatus}
                    onSetTheme={onSetTheme}
                    currentThemeId={currentThemeId}
                    settings={settings}
                    onUpdateSettings={onUpdateSettings}
                    playPreviewSound={playPreviewSound}
                    playingSoundId={playingSoundId}
                    onOpenPrivacy={() => setActiveModal('privacy')}
                    onOpenChangelog={() => setActiveModal('changelog')}
                    onOpenProfile={() => setActiveModal('profile')}
                 />
             )}

             {/* PROFILE MODAL */}
             {activeModal === 'profile' && (
                 <ProfileModal 
                    userProfile={userProfile}
                    onUpdateProfile={onUpdateProfile}
                    onSaveProfile={onSaveProfile}
                    onClose={() => setActiveModal(null)}
                 />
             )}

             {/* PRIVACY MODAL */}
             {activeModal === 'privacy' && (
                 <div className="flex flex-col h-full bg-[#050505] relative">
                     <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                        <button onClick={() => setActiveModal('settings')} className="p-3 -ml-2 text-white/40 hover:text-white transition-colors active:scale-90"><ChevronLeft size={24}/></button>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">Приватность</h2>
                     </div>
                     <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar">
                         {['Номер телефона', 'Время захода', 'Фото профиля'].map(item => (
                             <div key={item} className="p-4 bg-white/5 rounded-2xl text-white text-sm">{item}</div>
                         ))}
                         <div className="text-center text-white/30 text-xs mt-4">Настройки приватности временно недоступны в этом меню (WIP)</div>
                     </div>
                 </div>
             )}

             {/* CHANGELOG MODAL */}
             {activeModal === 'changelog' && (
                 <div className="flex flex-col h-full bg-[#050505] relative">
                     <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveModal('settings')} className="p-3 -ml-2 text-white/40 hover:text-white transition-colors active:scale-90"><ChevronLeft size={24}/></button>
                            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">LOGS</h2>
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg"><History size={16} className="text-white/50"/></div>
                     </div>
                     <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                         
                         {/* VERSION 2.2.0 (NEW) */}
                         <div className="relative pl-6 border-l border-white/10 space-y-4">
                             <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-vellor-red shadow-[0_0_10px_currentColor]" />
                             <div>
                                 <h3 className="text-lg font-black text-white">Версия 2.2.0</h3>
                                 <p className="text-[10px] text-white/40 font-mono">System & Profile Overhaul</p>
                             </div>
                             <div className="space-y-3">
                                 <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                     <h4 className="text-xs font-bold text-vellor-red mb-2 flex items-center gap-2"><User size={14}/> New Profile UI</h4>
                                     <p className="text-sm text-white/80 leading-relaxed">
                                         Полностью переработан экран профиля. Добавлены баннеры, вкладки и улучшенная навигация.
                                     </p>
                                 </div>
                                 <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                     <h4 className="text-xs font-bold text-yellow-500 mb-2 flex items-center gap-2"><ShieldAlert size={14}/> Admin Tools</h4>
                                     <p className="text-sm text-white/80 leading-relaxed">
                                         Добавлен режим технического обслуживания (блокировка экрана) и персональный режим невидимки (Ghost Protocol).
                                     </p>
                                 </div>
                             </div>
                         </div>

                         {/* VERSION 2.1.1 */}
                         <div className="relative pl-6 border-l border-white/10 space-y-4 opacity-50">
                             <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-white/20" />
                             <div>
                                 <h3 className="text-lg font-black text-white">Версия 2.1.1</h3>
                                 <p className="text-[10px] text-white/40 font-mono">UX Polish</p>
                             </div>
                             <div className="space-y-3">
                                 <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                     <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2"><Folder size={14}/> Persistent Folders</h4>
                                     <p className="text-sm text-white/80 leading-relaxed">
                                         Теперь приложение запоминает выбранную вкладку чатов ("Все", "Личные", "Группы") и восстанавливает её при запуске.
                                     </p>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
             )}

             {/* Rest of the modals */}
             {activeModal !== 'settings' && activeModal !== 'admin_login' && activeModal !== 'admin_panel' && activeModal !== 'nft' && activeModal !== 'privacy' && activeModal !== 'privacy_item' && activeModal !== 'changelog' && activeModal !== 'profile' && (
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        {(activeModal === 'create_group') && (
                            <button onClick={() => setActiveModal(activeModal === 'create_group' ? 'new_chat' : 'settings')} className="p-3 -ml-2 text-white/40 hover:text-white transition-colors active:scale-90"><ChevronLeft size={24}/></button>
                        )}
                        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">
                        {activeModal === 'new_chat' ? 'Новый чат' : activeModal === 'create_group' ? 'Новая группа' : ''}
                        </h2>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-3 bg-white/5 rounded-full hover:bg-vellor-red/20 hover:text-vellor-red transition-all active:scale-90"><X size={20}/></button>
                </div>
             )}

             <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                 {/* NEW CHAT / GLOBAL SEARCH */}
                 {activeModal === 'new_chat' && (
                     <NewChatModal 
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        onSelectChat={onSelectChat}
                        onClose={() => setActiveModal(null)}
                        onOpenCreateGroup={() => setActiveModal('create_group')}
                        isSearchingGlobal={isSearchingGlobal}
                        globalSearchResults={globalSearchResults}
                        recentContacts={recentContacts}
                     />
                 )}

                 {activeModal === 'create_group' && (
                  <CreateGroupModal 
                    newGroupName={newGroupName}
                    setNewGroupName={setNewGroupName}
                    newGroupAvatarPreview={newGroupAvatarPreview}
                    setNewGroupAvatar={setNewGroupAvatar}
                    setNewGroupAvatarPreview={setNewGroupAvatarPreview}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    selectedUsersForGroup={selectedUsersForGroup}
                    setSelectedUsersForGroup={setSelectedUsersForGroup}
                    globalSearchResults={globalSearchResults}
                    recentContacts={recentContacts}
                    isCreatingGroup={isCreatingGroup}
                    handleCreateGroup={handleCreateGroup}
                  />
              )}
             </div>
          </MDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
