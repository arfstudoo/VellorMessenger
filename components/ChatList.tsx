
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Settings, User, LogOut, Lock, ChevronRight, Save, Phone, Smartphone, Send, MessageSquare, Group, Info, Music, Gift, Cake, Camera, Loader2, ChevronLeft, Volume2, BellRing, Bell, Moon, Pin, BellOff, Trash2, Shield, Eye, CreditCard, Search, Plus, Users, Check, CheckCheck, Zap, Sparkles, Sun, Leaf, Activity, Gem, Battery, BatteryCharging } from 'lucide-react';
import { Chat, UserProfile, UserStatus, PrivacyValue, User as UserType } from '../types';
import { supabase } from '../supabaseClient';
import { ToastType } from './Toast';
import { NOTIFICATION_SOUND_URL } from '../constants';
import { NftGallery } from './NftGallery';

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string, user: any) => void;
  userProfile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  onSetTheme: (theme: string) => void;
  currentThemeId: string;
  onUpdateStatus: (status: UserStatus) => void;
  settings: { sound: boolean; notifications: boolean; pulsing?: boolean; liteMode?: boolean };
  onUpdateSettings: (s: { sound: boolean; notifications: boolean; pulsing?: boolean; liteMode?: boolean }) => void;
  typingUsers: Record<string, boolean>;
  onChatAction: (chatId: string, action: 'pin' | 'mute' | 'delete') => void;
  showToast: (msg: string, type: ToastType) => void;
  onlineUsers: Map<string, UserStatus>; 
}

const THEME_DATA = [
  { id: 'crimson', name: 'CRIMSON', icon: Zap, bg: 'radial-gradient(circle at 50% 0%, #4a0404 0%, #000000 100%)', accent: 'text-red-500' },
  { id: 'ocean', name: 'OCEAN', icon: Zap, bg: 'radial-gradient(circle at 50% 0%, #041f4a 0%, #000000 100%)', accent: 'text-cyan-400' },
  { id: 'cyber', name: 'CYBER', icon: Sparkles, bg: 'radial-gradient(circle at 50% 0%, #2e044a 0%, #000000 100%)', accent: 'text-fuchsia-400' },
  { id: 'gold', name: 'GOLD', icon: Sun, bg: 'radial-gradient(circle at 50% 0%, #4a3804 0%, #000000 100%)', accent: 'text-amber-400' },
  { id: 'emerald', name: 'EMERALD', icon: Leaf, bg: 'radial-gradient(circle at 50% 0%, #022c22 0%, #000000 100%)', accent: 'text-emerald-400' },
  { id: 'obsidian', name: 'OBSIDIAN', icon: Moon, bg: 'radial-gradient(circle at 50% 0%, #262626 0%, #000000 100%)', accent: 'text-white' },
  { id: 'sunset', name: 'SUNSET', icon: Sun, bg: 'radial-gradient(circle at 50% 0%, #4a0426 0%, #0f0005 100%)', accent: 'text-orange-400' }
];

const StatusIndicator: React.FC<{ status: UserStatus; size?: string }> = ({ status, size = "w-3 h-3" }) => {
  const colors = {
    online: 'bg-vellor-red shadow-[0_0_10px_#ff0033]',
    away: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]',
    dnd: 'bg-crimson shadow-[0_0_10px_rgba(220,20,60,0.5)]',
    offline: 'bg-gray-600'
  };

  return (
    <div className="relative">
        <div 
          className={`${size} rounded-full border-2 border-black ${colors[status] || colors.offline} relative z-10 transition-colors duration-300`}
        />
        {status === 'online' && (
            <motion.div 
                animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                className={`absolute inset-0 rounded-full bg-vellor-red -z-0`}
            />
        )}
    </div>
  );
};

export const ChatList: React.FC<ChatListProps> = ({ 
  chats, activeChatId, onSelectChat, userProfile, onUpdateProfile, onSetTheme, currentThemeId, onUpdateStatus, settings, onUpdateSettings, typingUsers, onChatAction, showToast, onlineUsers
}) => {
  const [activeModal, setActiveModal] = useState<'profile' | 'settings' | 'privacy' | 'privacy_item' | 'new_chat' | 'create_group' | 'nft' | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [currentPrivacyKey, setCurrentPrivacyKey] = useState<keyof UserProfile | null>(null);
  const [currentPrivacyLabel, setCurrentPrivacyLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chat: Chat } | null>(null);
  
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
          // Simple search in profiles
          let query = supabase.from('profiles').select('*').neq('id', userProfile.id).limit(20);
          
          if (searchQuery) {
              query = query.or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
          }
          
          const { data, error } = await query;
          if (!error && data) {
              const mappedUsers: UserType[] = data.map(p => ({
                  id: p.id,
                  name: p.full_name,
                  username: p.username,
                  avatar: p.avatar_url,
                  status: p.status || 'offline',
                  bio: p.bio
              }));
              setGlobalSearchResults(mappedUsers);
          }
          setIsSearchingGlobal(false);
      };
      
      const timeout = setTimeout(searchUsers, 500);
      return () => clearTimeout(timeout);
  }, [searchQuery, activeModal, userProfile.id]);

  const handleContextMenu = (e: React.MouseEvent, chat: Chat) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, chat });
  };

  const handleCreateGroup = async () => {
      if (!newGroupName.trim()) { showToast("Введите название группы", "warning"); return; }
      if (selectedUsersForGroup.length === 0) { showToast("Выберите участников", "warning"); return; }
      
      setIsCreatingGroup(true);
      
      try {
          // 1. Upload Avatar if exists
          let avatarUrl = "";
          if (newGroupAvatar) {
              const fileName = `groups/${Date.now()}_${newGroupAvatar.name}`;
              const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, newGroupAvatar);
              if (!uploadError) {
                  const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                  avatarUrl = data.publicUrl;
              }
          }

          // 2. Create Group
          const { data: groupData, error: groupError } = await supabase.from('groups').insert({
              name: newGroupName,
              avatar_url: avatarUrl,
              created_by: userProfile.id
          }).select().single();

          if (groupError || !groupData) throw groupError;

          // 3. Add Members (Me + Selected)
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
          
          // Select the new chat
          onSelectChat(groupData.id, {
               id: groupData.id,
               name: groupData.name,
               avatar: groupData.avatar_url,
               status: 'online',
               isGroup: true
          });

      } catch (e: any) {
          console.error(e);
          // Check for specific Supabase schema error or PGRST204 (column not found)
          if (e.message?.includes('is_admin') || e.code === 'PGRST204' || e.code === '400') {
             showToast("Ошибка базы данных: Отсутствует колонка is_admin. Обновите структуру БД.", "error");
          } else {
             showToast("Ошибка создания группы", "error");
          }
      } finally {
          setIsCreatingGroup(false);
      }
  };

  const privacyOptions: { key: keyof UserProfile; label: string; icon: any }[] = [
    { key: 'privacy_phone', label: 'Номер телефона', icon: Phone },
    { key: 'privacy_last_seen', label: 'Время захода', icon: Smartphone },
    { key: 'privacy_avatar', label: 'Фотографии профиля', icon: User },
    { key: 'privacy_forwards', label: 'Пересылка сообщений', icon: Send },
    { key: 'privacy_calls', label: 'Звонки', icon: Phone },
    { key: 'privacy_voice_msgs', label: 'Голосовые сообщения', icon: Send },
    { key: 'privacy_msgs', label: 'Сообщения', icon: MessageSquare },
  ];

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

  const testSound = () => {
    if (!settings.sound) { showToast("Включите звук в настройках выше", "warning"); return; }
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.6;
    audio.play()
      .then(() => showToast("Проверка звука...", "info"))
      .catch((e) => {
          console.error(e);
          showToast("Ошибка. Взаимодействуйте с сайтом", "error");
      });
  };

  const testNotification = async () => {
    if (!settings.notifications) { showToast("Включите уведомления в настройках выше", "warning"); return; }
    if (!("Notification" in window)) { showToast("Браузер не поддерживает уведомления", "error"); return; }
    if (Notification.permission === "granted") {
      new Notification("Vellor Messenger", { body: "Это тестовое уведомление", icon: userProfile.avatar });
      showToast("Пуш отправлен", "success");
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification("Vellor Messenger", { body: "Спасибо! Уведомления включены." });
        showToast("Разрешение получено", "success");
      }
    } else { showToast("Разрешите уведомления в браузере", "error"); }
  };

  const getPrivacyStatus = (val: PrivacyValue | undefined) => {
    if (val === 'everybody') return 'Все'; if (val === 'contacts') return 'Контакты'; if (val === 'nobody') return 'Никто'; return 'Никто';
  };

  const filteredChats = chats.filter(chat => 
      chat.user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      chat.lastMessage?.text?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentContacts = chats.filter(c => !c.user.isGroup).map(c => c.user);

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 flex flex-col gap-4 border-b border-[var(--border)] bg-black/10 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all">
              <Menu size={22}/>
            </button>
            
            <div className="flex items-center justify-center">
                 <div className="w-9 h-9 flex items-center justify-center relative">
                    {!settings.liteMode && <div className="absolute inset-0 bg-vellor-red/20 blur-xl rounded-full"></div>}
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_rgba(255,0,51,0.5)]">
                        <path d="M 25 25 L 50 85 L 75 25" fill="none" stroke="#ff0033" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                 </div>
            </div>

            <div className="w-11 h-11 rounded-2xl border border-[var(--border)] overflow-hidden bg-black/40 shadow-xl relative cursor-pointer" onClick={() => setActiveModal('profile')}>
              <img src={userProfile.avatar || 'https://via.placeholder.com/44'} className="w-full h-full object-cover" alt="Avatar" />
              <div className="absolute bottom-1 right-1">
                 <StatusIndicator status={userProfile.status} size="w-2.5 h-2.5" />
              </div>
            </div>
        </div>

        <div className="relative group">
            <Search className="absolute left-3 top-3 text-white/30 group-focus-within:text-vellor-red transition-colors" size={18} />
            <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..." 
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:border-vellor-red/30 outline-none transition-all"
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-4 custom-scrollbar relative">
        {filteredChats.map(chat => {
          // Determine realtime status
          const realtimeStatus = onlineUsers.get(chat.id);
          let displayStatus: UserStatus = chat.user.status;
          if (realtimeStatus) displayStatus = realtimeStatus; else displayStatus = 'offline';
          
          return (
          <motion.div 
            key={chat.id} 
            layout={!settings.liteMode} // Disable expensive layout animation in lite mode
            onContextMenu={(e) => handleContextMenu(e, chat)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectChat(chat.id, chat.user)}
            className={`flex items-center gap-4 p-3.5 rounded-[1.5rem] cursor-pointer transition-all mb-2 relative group ${activeChatId === chat.id ? 'bg-white/10 shadow-lg border border-white/5' : 'hover:bg-white/[0.03]'}`}
          >
            {chat.isPinned && <div className="absolute top-2 right-2 text-vellor-red/80"><Pin size={10} fill="currentColor"/></div>}
            <div className="w-14 h-14 rounded-2xl border border-[var(--border)] overflow-hidden shrink-0 relative bg-black">
              <img src={chat.user.avatar || 'https://via.placeholder.com/56'} className="w-full h-full object-cover" alt={chat.user.name} />
              {!chat.user.isGroup && (
                  <div className="absolute bottom-1 right-1">
                    <StatusIndicator status={displayStatus} />
                  </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="text-sm font-black truncate flex items-center gap-2">
                    {chat.user.name} 
                    {chat.isMuted && <BellOff size={10} className="text-white/30" />}
                </h3>
                <span className="text-[10px] opacity-30 font-bold">
                  {chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}) : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                  <p className="text-xs opacity-40 truncate font-medium max-w-[80%]">
                    {typingUsers[chat.id] ? (
                      <span className="text-vellor-red animate-pulse">печатает...</span>
                    ) : (
                      chat.lastMessage?.type === 'audio' ? '🎤 Голосовое' : 
                      chat.lastMessage?.type === 'image' ? '🖼 Фотография' : 
                      chat.lastMessage?.text || (chat.user.isGroup ? 'Нет сообщений' : 'Начать общение')
                    )}
                  </p>
                  {/* Message Status for Last Message (if me) */}
                  {chat.lastMessage?.senderId === 'me' && (
                      chat.lastMessage.isRead ? <CheckCheck size={14} className="text-vellor-red"/> : <Check size={14} className="text-white/30"/>
                  )}
              </div>
            </div>
            {chat.unreadCount > 0 && (
                <div className="absolute right-3 bottom-3 bg-vellor-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-lg shadow-vellor-red/20">
                    {chat.unreadCount}
                </div>
            )}
          </motion.div>
        )})}
      </div>
      
      {/* ... (Rest of modal code remains same) ... */}
      
      <button onClick={() => { setSearchQuery(''); setActiveModal('new_chat'); }} className="absolute bottom-6 right-6 w-14 h-14 bg-vellor-red text-white rounded-full shadow-[0_0_30px_rgba(255,0,51,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10 border border-white/20">
          <Plus size={28} />
      </button>

      <AnimatePresence>
        {contextMenu && (
           <motion.div
             initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
             style={{ top: contextMenu.y, left: contextMenu.x }}
             className="fixed z-[100] w-48 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl origin-top-left overflow-hidden"
             onClick={(e) => e.stopPropagation()}
           >
              <button onClick={() => { onChatAction(contextMenu.chat.id, 'pin'); setContextMenu(null); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors">
                  <Pin size={14} className={contextMenu.chat.isPinned ? "text-vellor-red fill-vellor-red" : "text-white/60"} /> {contextMenu.chat.isPinned ? 'Открепить' : 'Закрепить'}
              </button>
              <button onClick={() => { onChatAction(contextMenu.chat.id, 'mute'); setContextMenu(null); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors">
                  <BellOff size={14} className={contextMenu.chat.isMuted ? "text-vellor-red" : "text-white/60"} /> {contextMenu.chat.isMuted ? 'Включить звук' : 'Выключить звук'}
              </button>
              <div className="h-px bg-white/10 my-1.5" />
              <button onClick={() => { onChatAction(contextMenu.chat.id, 'delete'); setContextMenu(null); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-colors">
                  <Trash2 size={14} /> Удалить чат
              </button>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="absolute top-20 left-4 w-60 bg-[#050505] border border-white/10 rounded-3xl z-50 p-2 shadow-2xl">
              <div className="p-4 mb-2 bg-white/5 rounded-2xl border border-white/5">
                 <p className="text-white font-bold">{userProfile.name}</p>
                 <p className="text-xs text-white/50">@{userProfile.username}</p>
              </div>
              <button onClick={() => { setActiveModal('profile'); setIsMenuOpen(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all">
                <User size={16} className="text-vellor-red"/> Профиль
              </button>
              <button onClick={() => { setActiveModal('nft'); setIsMenuOpen(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all">
                <Gem size={16} className="text-fuchsia-400"/> Коллекция NFT
              </button>
              <button onClick={() => { setActiveModal('settings'); setIsMenuOpen(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all">
                <Settings size={16} className="text-vellor-red"/> Настройки
              </button>
              <div className="h-px bg-white/5 my-2" />
              <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="flex items-center gap-4 w-full p-4 text-red-500/80 hover:text-red-500 rounded-2xl text-xs font-black tracking-widest uppercase transition-all"><LogOut size={16}/> Выйти</button>
            </motion.div>
          </>
        )}

        {/* --- MODALS SECTION --- */}
        {activeModal && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-[#0a0a0a] z-[60] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-4">
                {(activeModal === 'privacy' || activeModal === 'privacy_item' || activeModal === 'create_group') && (
                    <button onClick={() => setActiveModal(activeModal === 'create_group' ? 'new_chat' : activeModal === 'privacy_item' ? 'privacy' : 'settings')} className="p-2 text-white/40 hover:text-white transition-colors"><ChevronLeft size={24}/></button>
                )}
                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">
                  {activeModal === 'profile' ? 'Профиль' : activeModal === 'settings' ? 'Настройки' : activeModal === 'new_chat' ? 'Новый чат' : activeModal === 'create_group' ? 'Новая группа' : activeModal === 'nft' ? 'NFT Collection' : 'Приватность'}
                </h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2.5 bg-white/5 rounded-full hover:bg-vellor-red/20 hover:text-vellor-red transition-all"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* --- NFT GALLERY MODAL --- */}
              {activeModal === 'nft' && <NftGallery />}

              {/* --- NEW CHAT / CONTACTS MODAL --- */}
              {activeModal === 'new_chat' && (
                  <div className="space-y-4">
                      {/* Search in Modal */}
                      <div className="relative group mb-4">
                        <Search className="absolute left-3 top-3 text-white/30 group-focus-within:text-vellor-red transition-colors" size={18} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск людей..." 
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:border-vellor-red/30 outline-none transition-all"
                            autoFocus
                        />
                      </div>

                      <button onClick={() => setActiveModal('create_group')} className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-all group">
                           <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-vellor-red group-hover:text-white transition-colors text-white/50">
                               <Users size={20} />
                           </div>
                           <span className="font-bold text-sm">Создать группу</span>
                      </button>

                      <div className="h-px bg-white/5 my-2" />
                      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Контакты и Глобальный поиск</h3>

                      {isSearchingGlobal ? (
                          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-vellor-red"/></div>
                      ) : (
                          <div className="space-y-2">
                              {globalSearchResults.map(user => (
                                  <button key={user.id} onClick={() => { onSelectChat(user.id, user); setActiveModal(null); }} className="w-full p-3 flex items-center gap-4 hover:bg-white/5 rounded-2xl transition-all text-left">
                                      <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden shrink-0">
                                          <img src={user.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className="text-sm font-bold truncate">{user.name}</p>
                                          <p className="text-xs opacity-40 truncate">@{user.username}</p>
                                      </div>
                                  </button>
                              ))}
                              {globalSearchResults.length === 0 && searchQuery && (
                                  <p className="text-center text-xs opacity-30 py-4">Никого не найдено</p>
                              )}
                              {globalSearchResults.length === 0 && !searchQuery && (
                                  <p className="text-center text-xs opacity-30 py-4">Введите имя для поиска...</p>
                              )}
                          </div>
                      )}
                  </div>
              )}

              {/* --- CREATE GROUP MODAL --- */}
              {activeModal === 'create_group' && (
                  <div className="space-y-6">
                      <div className="flex flex-col items-center gap-4">
                           <div className="relative group cursor-pointer" onClick={() => groupAvatarInputRef.current?.click()}>
                                <div className="w-24 h-24 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                     {newGroupAvatarPreview ? (
                                         <img src={newGroupAvatarPreview} className="w-full h-full object-cover" />
                                     ) : (
                                         <Camera size={32} className="text-white/20" />
                                     )}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-vellor-red p-2 rounded-full text-white shadow-lg"><Plus size={16}/></div>
                                <input type="file" ref={groupAvatarInputRef} onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if(file) {
                                        setNewGroupAvatar(file);
                                        setNewGroupAvatarPreview(URL.createObjectURL(file));
                                    }
                                }} accept="image/*" className="hidden" />
                           </div>
                           <input 
                               value={newGroupName}
                               onChange={(e) => setNewGroupName(e.target.value)}
                               placeholder="Название группы"
                               className="bg-transparent border-b border-white/20 text-center py-2 text-lg font-bold outline-none focus:border-vellor-red w-full"
                           />
                      </div>

                      <div className="relative group">
                        <Search className="absolute left-3 top-3 text-white/30" size={18} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Добавить участников..." 
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:border-vellor-red/30 outline-none transition-all"
                        />
                      </div>
                      
                      {/* Selected Users */}
                      {selectedUsersForGroup.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/5">
                              {selectedUsersForGroup.map(u => (
                                  <div key={u.id} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={() => setSelectedUsersForGroup(prev => prev.filter(p => p.id !== u.id))}>
                                      <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden relative border border-vellor-red">
                                           <img src={u.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" />
                                           <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><X size={16}/></div>
                                      </div>
                                      <span className="text-[9px] max-w-[50px] truncate">{u.name.split(' ')[0]}</span>
                                  </div>
                              ))}
                          </div>
                      )}

                      <div className="space-y-2 h-64 overflow-y-auto custom-scrollbar">
                           <h4 className="text-[9px] font-bold uppercase tracking-widest opacity-40 sticky top-0 bg-[#0a0a0a] py-2 z-10">
                                {searchQuery ? 'Результаты поиска' : 'Ваши контакты'}
                           </h4>
                           
                           {/* Show Global Search Results if query exists, otherwise show Recent Contacts */}
                           {(searchQuery ? globalSearchResults : recentContacts)
                             .filter(u => !selectedUsersForGroup.some(s => s.id === u.id))
                             .map(user => (
                               <button key={user.id} onClick={() => setSelectedUsersForGroup(prev => [...prev, user])} className="w-full p-2 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-all text-left">
                                   <div className="w-9 h-9 rounded-full bg-gray-800 overflow-hidden shrink-0">
                                       <img src={user.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <p className="text-sm font-bold truncate">{user.name}</p>
                                       <p className="text-[10px] opacity-40 truncate">@{user.username || 'user'}</p>
                                   </div>
                                   <div className="w-5 h-5 rounded-full border border-white/20" />
                               </button>
                           ))}

                           {searchQuery && globalSearchResults.length === 0 && (
                               <div className="text-center text-xs opacity-30 py-4">Никого не найдено</div>
                           )}
                           
                           {!searchQuery && recentContacts.length === 0 && (
                               <div className="text-center text-xs opacity-30 py-4">Нет недавних контактов</div>
                           )}
                      </div>

                      <button onClick={handleCreateGroup} disabled={isCreatingGroup} className="w-full py-4 bg-vellor-red text-white font-black uppercase text-[11px] tracking-[0.3em] rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                          {isCreatingGroup ? <Loader2 className="animate-spin" /> : 'Создать'}
                      </button>
                  </div>
              )}

              {activeModal === 'profile' && (
                <div className="space-y-8">
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative group">
                      <div className="w-40 h-40 rounded-full border-4 border-white/5 overflow-hidden bg-black relative shadow-2xl">
                          <img src={userProfile.avatar || 'https://via.placeholder.com/176'} className={`w-full h-full object-cover transition-opacity duration-300 ${isUploadingAvatar ? 'opacity-40' : 'opacity-100'}`} alt="Profile" />
                          {isUploadingAvatar && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-vellor-red" size={32} /></div>}
                      </div>
                      <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 p-3 bg-vellor-red rounded-full text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100">
                        <Camera size={18} />
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase opacity-50 tracking-wider ml-2">Отображаемое имя</label>
                        <input value={userProfile.name} onChange={(e) => onUpdateProfile({...userProfile, name: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-bold focus:border-vellor-red/50 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase opacity-50 tracking-wider ml-2">Bio</label>
                        <textarea value={userProfile.bio} onChange={(e) => onUpdateProfile({...userProfile, bio: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm min-h-[100px] resize-none focus:border-vellor-red/50 outline-none transition-all" />
                    </div>
                  </div>
                </div>
              )}

              {activeModal === 'settings' && (
                <div className="space-y-8 pb-10">
                   {/* Status Section */}
                   <section>
                      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 ml-1">Мой статус</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {(['online', 'away', 'dnd', 'offline'] as UserStatus[]).map(status => (
                            <button key={status} onClick={() => onUpdateStatus(status)} className={`p-4 rounded-2xl border transition-all flex items-center gap-3 relative overflow-hidden group ${userProfile.status === status ? 'border-vellor-red/50 bg-vellor-red/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                                <StatusIndicator status={status} size="w-2.5 h-2.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{status === 'online' ? 'В сети' : status === 'away' ? 'Отошел' : status === 'dnd' ? 'Занят' : 'Скрыт'}</span>
                                {userProfile.status === status && <div className="absolute inset-0 border-2 border-vellor-red/20 rounded-2xl animate-pulse" />}
                            </button>
                        ))}
                      </div>
                   </section>

                   {/* Performance Mode - NEW */}
                   <section>
                      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 ml-1">Производительность</h3>
                      <div className="bg-white/5 border border-white/5 rounded-[20px] overflow-hidden">
                          <div className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white/5 rounded-xl"><BatteryCharging size={18} className="text-green-400"/></div>
                                  <div className="flex flex-col"><span className="text-sm font-bold">Экономия ресурсов</span><span className="text-[10px] opacity-40">Lite Mode (Без размытия)</span></div>
                              </div>
                              <button onClick={() => onUpdateSettings({...settings, liteMode: !settings.liteMode})} className={`w-11 h-6 rounded-full relative transition-colors ${settings.liteMode ? 'bg-green-500' : 'bg-white/10'}`}>
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.liteMode ? 'left-6' : 'left-1'}`} />
                              </button>
                          </div>
                      </div>
                   </section>

                   {/* Appearance Section */}
                   <section>
                      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 ml-1">Тема оформления</h3>
                      <div className="grid grid-cols-2 gap-3">
                          {THEME_DATA.map(t => {
                              const Icon = t.icon;
                              return (
                                <button 
                                    key={t.id} 
                                    onClick={() => onSetTheme(t.id)} 
                                    className={`relative h-28 rounded-3xl border overflow-hidden transition-all duration-300 group ${currentThemeId === t.id ? 'border-white/60 scale-[1.02] shadow-2xl' : 'border-white/5 hover:border-white/20 hover:scale-[1.01]'}`}
                                >
                                    {/* Animated Background Preview */}
                                    <div className="absolute inset-0 transition-all duration-700" style={{ background: t.bg }} />
                                    
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                                    
                                    <div className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Icon size={14} className="text-white" />
                                    </div>

                                    <div className="absolute bottom-4 left-4 flex flex-col items-start gap-1">
                                        <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${currentThemeId === t.id ? t.accent : 'text-white/70'}`}>{t.name}</span>
                                        {currentThemeId === t.id && (
                                            <motion.div layoutId="theme-active" className="h-0.5 w-6 bg-current rounded-full" />
                                        )}
                                    </div>
                                </button>
                              );
                          })}
                      </div>
                   </section>

                   {/* Visual Effects Section */}
                   <section>
                      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 ml-1">Визуальные эффекты</h3>
                      <div className="bg-white/5 border border-white/5 rounded-[20px] overflow-hidden">
                          <div className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white/5 rounded-xl"><Activity size={18} className="text-white/70"/></div>
                                  <div className="flex flex-col"><span className="text-sm font-bold">Пульсация фона</span><span className="text-[10px] opacity-40">Живая анимация</span></div>
                              </div>
                              <button onClick={() => onUpdateSettings({...settings, pulsing: !settings.pulsing})} className={`w-11 h-6 rounded-full relative transition-colors ${settings.pulsing ? 'bg-vellor-red' : 'bg-white/10'}`}>
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.pulsing ? 'left-6' : 'left-1'}`} />
                              </button>
                          </div>
                      </div>
                   </section>

                   {/* Notifications Section */}
                   <section>
                      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 ml-1">Уведомления</h3>
                      <div className="bg-white/5 border border-white/5 rounded-[20px] overflow-hidden">
                          <div className="p-4 flex items-center justify-between border-b border-white/5">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white/5 rounded-xl"><Bell size={18} className="text-white/70"/></div>
                                  <div className="flex flex-col"><span className="text-sm font-bold">Пуш-уведомления</span><span className="text-[10px] opacity-40">Браузерные</span></div>
                              </div>
                              <button onClick={() => onUpdateSettings({...settings, notifications: !settings.notifications})} className={`w-11 h-6 rounded-full relative transition-colors ${settings.notifications ? 'bg-vellor-red' : 'bg-white/10'}`}>
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.notifications ? 'left-6' : 'left-1'}`} />
                              </button>
                          </div>
                          <div className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white/5 rounded-xl"><Volume2 size={18} className="text-white/70"/></div>
                                  <div className="flex flex-col"><span className="text-sm font-bold">Звуки</span><span className="text-[10px] opacity-40">В приложении</span></div>
                              </div>
                              <button onClick={() => onUpdateSettings({...settings, sound: !settings.sound})} className={`w-11 h-6 rounded-full relative transition-colors ${settings.sound ? 'bg-vellor-red' : 'bg-white/10'}`}>
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.sound ? 'left-6' : 'left-1'}`} />
                              </button>
                          </div>
                          <div className="grid grid-cols-2 gap-px bg-white/5">
                             <button onClick={testSound} className="p-3 bg-[#0a0a0a] hover:bg-white/5 transition-colors text-[10px] font-bold uppercase tracking-wider text-center text-white/50 hover:text-white">Тест звука</button>
                             <button onClick={testNotification} className="p-3 bg-[#0a0a0a] hover:bg-white/5 transition-colors text-[10px] font-bold uppercase tracking-wider text-center text-white/50 hover:text-white">Тест пуша</button>
                          </div>
                      </div>
                   </section>

                   {/* Privacy Link */}
                   <button onClick={() => setActiveModal('privacy')} className="w-full p-5 bg-gradient-to-r from-white/5 to-transparent border border-white/5 rounded-[20px] flex items-center justify-between group hover:border-white/10 transition-all">
                       <div className="flex items-center gap-4">
                           <div className="p-2 bg-vellor-red/10 rounded-xl text-vellor-red group-hover:scale-110 transition-transform"><Shield size={20}/></div>
                           <div className="flex flex-col items-start"><span className="text-sm font-bold">Конфиденциальность</span><span className="text-[10px] opacity-40">Кто видит ваши данные</span></div>
                       </div>
                       <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>
                   </button>
                </div>
              )}

              {activeModal === 'privacy' && (
                <div className="space-y-3 pb-10">
                  {privacyOptions.map((item) => (
                    <button key={item.key} onClick={() => { setCurrentPrivacyKey(item.key); setCurrentPrivacyLabel(item.label); setActiveModal('privacy_item'); }} className="w-full p-4 flex items-center justify-between bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 rounded-2xl transition-all group">
                       <div className="flex items-center gap-4">
                          <div className="p-2 bg-black/40 rounded-xl text-white/50 group-hover:text-white transition-colors"><item.icon size={18} /></div>
                          <span className="text-sm font-bold">{item.label}</span>
                       </div>
                       <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-vellor-red/80">{getPrivacyStatus(userProfile[item.key] as PrivacyValue)}</span>
                          <ChevronRight size={16} className="opacity-20" />
                       </div>
                    </button>
                  ))}
                </div>
              )}

              {activeModal === 'privacy_item' && (
                <div className="space-y-4">
                   <div className="p-5 bg-vellor-red/5 border border-vellor-red/10 rounded-2xl mb-6">
                      <p className="text-xs text-white/70 leading-relaxed text-center">Вы настраиваете видимость для: <br/><strong className="text-white text-sm uppercase tracking-wider">{currentPrivacyLabel}</strong></p>
                   </div>
                   {(['everybody', 'contacts', 'nobody'] as PrivacyValue[]).map((val) => (
                      <button key={val} onClick={() => { onUpdateProfile({ ...userProfile, [currentPrivacyKey!] : val }); setActiveModal('privacy'); }} className={`w-full p-5 rounded-2xl border flex items-center justify-between transition-all group ${userProfile[currentPrivacyKey!] === val ? 'border-vellor-red bg-vellor-red/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                         <div className="flex items-center gap-3">
                             {val === 'everybody' && <Eye size={18} className={userProfile[currentPrivacyKey!] === val ? "text-vellor-red" : "text-white/40"}/>}
                             {val === 'contacts' && <User size={18} className={userProfile[currentPrivacyKey!] === val ? "text-vellor-red" : "text-white/40"}/>}
                             {val === 'nobody' && <Lock size={18} className={userProfile[currentPrivacyKey!] === val ? "text-vellor-red" : "text-white/40"}/>}
                             <span className="text-xs font-black uppercase tracking-widest">{getPrivacyStatus(val)}</span>
                         </div>
                         {userProfile[currentPrivacyKey!] === val && <div className="w-2 h-2 rounded-full bg-vellor-red shadow-[0_0_10px_currentColor]" />}
                      </button>
                   ))}
                </div>
              )}
            </div>
            
            {/* Footer Action */}
            <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
               {activeModal === 'profile' && (
                 <button onClick={() => setActiveModal(null)} className="w-full py-4 bg-white text-black font-black uppercase text-[11px] tracking-[0.3em] rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3">
                    Сохранить
                 </button>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
