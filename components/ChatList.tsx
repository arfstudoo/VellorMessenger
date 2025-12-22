
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Settings, User, LogOut, Lock, ChevronRight, Save, Phone, Smartphone, Send, MessageSquare, Group, Info, Music, Gift, Cake, Camera, Loader2, ChevronLeft, Volume2, BellRing, Bell, Moon, Pin, BellOff, Trash2, Shield, Eye, CreditCard, Search, Plus, Users, Check, CheckCheck, Zap, Sparkles, Sun, Leaf, Activity, Gem, Battery, BatteryCharging, AtSign, Terminal, ShieldAlert, BadgeCheck, Play, Pause, PenLine, Mic, Copy, Crown, Calendar, Hash, Edit3, Eraser, VolumeX, SmartphoneCharging, LayoutDashboard, Radio, MessageCircle, BarChart2, Ban, Unlock, FileText, ArrowLeft, History, Database, UserX, Skull, Volume1 } from 'lucide-react';
import { Chat, UserProfile, UserStatus, PrivacyValue, User as UserType } from '../types';
import { supabase } from '../supabaseClient';
import { ToastType } from './Toast';
import { NOTIFICATION_SOUNDS } from '../constants';
import { NftGallery } from './NftGallery';

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
  onBroadcast?: (message: string) => Promise<void>;
}

const THEME_DATA = [
  { id: 'crimson', name: 'Crimson', icon: Zap, bg: 'linear-gradient(135deg, #4a0404 0%, #000000 100%)', accent: 'bg-red-500' },
  { id: 'ocean', name: 'Ocean', icon: Zap, bg: 'linear-gradient(135deg, #041f4a 0%, #000000 100%)', accent: 'bg-cyan-400' },
  { id: 'cyber', name: 'Cyber', icon: Sparkles, bg: 'linear-gradient(135deg, #2e044a 0%, #000000 100%)', accent: 'bg-fuchsia-400' },
  { id: 'gold', name: 'Gold', icon: Sun, bg: 'linear-gradient(135deg, #4a3804 0%, #000000 100%)', accent: 'bg-amber-400' },
  { id: 'emerald', name: 'Emerald', icon: Leaf, bg: 'linear-gradient(135deg, #022c22 0%, #000000 100%)', accent: 'bg-emerald-400' },
  { id: 'obsidian', name: 'Obsidian', icon: Moon, bg: 'linear-gradient(135deg, #262626 0%, #000000 100%)', accent: 'bg-white' },
  { id: 'sunset', name: 'Sunset', icon: Sun, bg: 'linear-gradient(135deg, #4a0426 0%, #0f0005 100%)', accent: 'bg-orange-400' }
];

const STATUS_OPTIONS = [
    { id: 'online', label: 'В СЕТИ', color: 'bg-green-500', desc: 'Вас видят все' },
    { id: 'away', label: 'ОТОШЕЛ', color: 'bg-yellow-500', desc: 'Временно недоступен' },
    { id: 'dnd', label: 'ЗАНЯТ', color: 'bg-red-500', desc: 'Не беспокоить' },
    { id: 'offline', label: 'СКРЫТ', color: 'bg-gray-500', desc: 'Офлайн для всех' }
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
            <MDiv 
                animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                className={`absolute inset-0 rounded-full bg-vellor-red -z-0`}
            />
        )}
    </div>
  );
};

// Custom Switch Component for Settings
const SettingSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button 
        onClick={onChange} 
        className={`w-11 h-6 rounded-full relative transition-colors duration-300 flex items-center ${checked ? 'bg-vellor-red' : 'bg-white/10'}`}
    >
        <MDiv 
            className="w-4 h-4 bg-white rounded-full shadow-sm"
            initial={false}
            animate={{ x: checked ? 24 : 4 }} // Adjusted values for 48px width container
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
    </button>
);

export const ChatList: React.FC<ChatListProps> = ({ 
  chats, activeChatId, onSelectChat, userProfile, onUpdateProfile, onSaveProfile, onSetTheme, currentThemeId, onUpdateStatus, settings, onUpdateSettings, typingUsers, onChatAction, showToast, onlineUsers, onBroadcast
}) => {
  const [activeModal, setActiveModal] = useState<'profile' | 'settings' | 'privacy' | 'privacy_item' | 'new_chat' | 'create_group' | 'nft' | 'admin_login' | 'admin_panel' | 'changelog' | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chat: Chat } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
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

  // Admin Features
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [adminPin, setAdminPin] = useState("");
  const [adminTab, setAdminTab] = useState<'dashboard' | 'users' | 'broadcast'>('dashboard');
  const [adminUserSearch, setAdminUserSearch] = useState("");
  const [adminUsers, setAdminUsers] = useState<any[]>([]); // Using any for extended properties
  const [adminBroadcastMsg, setAdminBroadcastMsg] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isAdminActionLoading, setIsAdminActionLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({ users: 0, messages: 0 });
  
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
      if (activeModal !== 'new_chat' && activeModal !== 'create_group' && activeModal !== 'admin_panel') return;
      
      const term = activeModal === 'admin_panel' ? adminUserSearch : searchQuery;
      if (!term.trim()) {
          setGlobalSearchResults([]);
          if (activeModal === 'admin_panel') setAdminUsers([]);
          setIsSearchingGlobal(false);
          return;
      }
      
      const searchUsers = async () => {
          setIsSearchingGlobal(true);
          let query = supabase.from('profiles').select('*').limit(20);
          
          if (term) {
              query = query.or(`username.ilike.%${term}%,full_name.ilike.%${term}%`);
          }
          
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
              if (activeModal === 'admin_panel') setAdminUsers(mappedUsers);
              else setGlobalSearchResults(mappedUsers);
          }
          setIsSearchingGlobal(false);
      };
      
      const timeout = setTimeout(searchUsers, 500);
      return () => clearTimeout(timeout);
  }, [searchQuery, adminUserSearch, activeModal]);

  // Load Dashboard Stats
  useEffect(() => {
      if (activeModal === 'admin_panel' && adminTab === 'dashboard') {
          const loadStats = async () => {
              const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
              const { count: msgsCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });
              setDashboardStats({ users: usersCount || 0, messages: msgsCount || 0 });
          };
          loadStats();
      }
  }, [activeModal, adminTab]);

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

  const handleAdminUserAction = async (userId: string, action: 'verify' | 'admin' | 'ban' | 'reset_avatar' | 'reset_name' | 'wipe_messages', value?: boolean) => {
    setIsAdminActionLoading(true);
    try {
        if (action === 'verify') {
            await supabase.from('profiles').update({ is_verified: value }).eq('id', userId);
            setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, isVerified: value } : u));
            showToast(value ? "Пользователь верифицирован" : "Верификация снята", "success");
        }
        else if (action === 'admin') {
            await supabase.from('profiles').update({ is_admin: value }).eq('id', userId);
            setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, isAdmin: value } : u));
            showToast(value ? "Права выданы" : "Права сняты", "success");
        }
        else if (action === 'ban') {
            await supabase.from('profiles').update({ is_banned: value }).eq('id', userId);
            setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: value } : u));
            showToast(value ? "Пользователь заблокирован" : "Пользователь разблокирован", "warning");
        }
        else if (action === 'reset_avatar') {
            await supabase.from('profiles').update({ avatar_url: '' }).eq('id', userId);
            setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, avatar: '' } : u));
            showToast("Аватар сброшен", "info");
        }
        else if (action === 'reset_name') {
            await supabase.from('profiles').update({ full_name: 'Renamed User' }).eq('id', userId);
            setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, name: 'Renamed User' } : u));
            showToast("Имя сброшено", "info");
        }
        else if (action === 'wipe_messages') {
            if(!confirm("Удалить ВСЕ сообщения этого пользователя?")) return;
            await supabase.from('messages').delete().eq('sender_id', userId);
            showToast("Сообщения удалены", "error");
        }
    } catch(e) {
        showToast("Ошибка обновления", "error");
    } finally {
        setIsAdminActionLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!adminBroadcastMsg.trim() || !onBroadcast) return;
    setIsBroadcasting(true);
    await onBroadcast(adminBroadcastMsg);
    setIsBroadcasting(false);
    setAdminBroadcastMsg("");
    showToast("Рассылка завершена", "success");
  };

  const filteredChats = chats.filter(chat => 
      chat.user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      chat.lastMessage?.text?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentContacts = chats.filter(c => !c.user.isGroup).map(c => c.user);
  const isSuperAdmin = userProfile.username?.toLowerCase() === 'arfstudoo';

  // --- RENDER HELPERS ---
  const renderPrivacyOption = (label: string, value: PrivacyValue, type: string, Icon: any) => (
      <button onClick={() => { setPrivacyItem(type); setActiveModal('privacy_item'); }} className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 hover:bg-white/10 transition-all active:scale-[0.98] mb-2">
          <div className="flex items-center gap-3">
              <Icon size={20} className="text-white/60"/>
              <span className="text-sm font-bold text-white">{label}</span>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">{value === 'everybody' ? 'Все' : value === 'contacts' ? 'Мои контакты' : 'Никто'}</span>
              <ChevronRight size={16} className="text-white/20"/>
          </div>
      </button>
  );

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

        <div className="relative group">
            <Search className="absolute left-3 top-2.5 text-white/30 group-focus-within:text-vellor-red transition-colors" size={16} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск..." className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-sm focus:border-vellor-red/30 outline-none transition-all" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-20 custom-scrollbar relative touch-pan-y">
        {filteredChats.map(chat => {
          const realtimeStatus = onlineUsers.get(chat.user.id) || chat.user.status || 'offline';
          const typers = typingUsers[chat.id] || [];
          
          return (
          <MDiv 
            key={chat.id} 
            layout={!settings.liteMode && !isMobile} 
            onContextMenu={(e: any) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, chat }); }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectChat(chat.id, chat.user)}
            className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all mb-1 relative group ${activeChatId === chat.id ? 'bg-white/10 shadow-lg border border-white/5' : 'hover:bg-white/[0.03]'}`}
          >
            {chat.isPinned && <div className="absolute top-2 right-2 text-vellor-red/80"><Pin size={10} fill="currentColor"/></div>}
            
            <div className="relative shrink-0">
                <div className="w-[50px] h-[50px] rounded-2xl border border-[var(--border)] overflow-hidden bg-black">
                  <img src={chat.user.avatar || 'https://via.placeholder.com/56'} className="w-full h-full object-cover" alt={chat.user.name} />
                </div>
                {!chat.user.isGroup && (
                    <div className="absolute -bottom-1 -right-1">
                        <StatusIndicator status={realtimeStatus} />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className="text-[15px] font-bold truncate flex items-center gap-1.5 text-white/90">
                    {chat.user.name} 
                    {chat.user.username?.toLowerCase() === 'arfstudoo' && <Crown size={12} className="text-yellow-400 fill-yellow-400" />}
                    {chat.user.isVerified && <BadgeCheck size={12} className="text-blue-400 fill-blue-400/20" />}
                    {chat.isMuted && <BellOff size={10} className="text-white/30" />}
                </h3>
                <span className="text-[10px] opacity-30 font-medium">
                  {chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}) : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                  <div className="text-[13px] opacity-50 truncate font-medium max-w-[85%]">
                    {typers.length > 0 ? (
                      <span className="text-vellor-red flex items-center gap-1 animate-pulse">
                          <PenLine size={12} /> 
                          {typers.length === 1 ? `${typers[0]}: печатает...` : `${typers.length} чел. печатают...`}
                      </span>
                    ) : (
                      chat.lastMessage?.type === 'audio' ? <span className="flex items-center gap-1"><Mic size={12}/> Голосовое</span> : 
                      chat.lastMessage?.type === 'image' ? <span className="flex items-center gap-1"><div className="w-3 h-3 bg-white/20 rounded-sm"/> Фотография</span> : 
                      chat.lastMessage?.text || (chat.user.isGroup ? 'Нет сообщений' : 'Начать общение')
                    )}
                  </div>
                  {chat.lastMessage?.senderId === 'me' && typers.length === 0 && (
                      chat.lastMessage.isRead ? <CheckCheck size={14} className="text-vellor-red"/> : <Check size={14} className="text-white/30"/>
                  )}
              </div>
            </div>
            {chat.unreadCount > 0 && (
                <div className="absolute right-3 bottom-3 bg-vellor-red text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full shadow-lg shadow-vellor-red/20">
                    {chat.unreadCount}
                </div>
            )}
          </MDiv>
        )})}
      </div>
      
      <button onClick={() => { setSearchQuery(''); setActiveModal('new_chat'); }} className="absolute bottom-6 right-6 w-14 h-14 bg-vellor-red text-white rounded-full shadow-[0_0_30px_rgba(255,0,51,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10 border border-white/20">
          <Plus size={28} />
      </button>

      <AnimatePresence>
        {contextMenu && (
           <MDiv
             initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
             style={{ top: contextMenu.y, left: contextMenu.x }}
             className="fixed z-[100] w-48 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl origin-top-left overflow-hidden"
             onClick={(e: any) => e.stopPropagation()}
           >
              <button onClick={() => { onChatAction(contextMenu.chat.id, 'pin'); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors active:scale-95">
                  <Pin size={14} className={contextMenu.chat.isPinned ? "text-vellor-red fill-vellor-red" : "text-white/60"} /> {contextMenu.chat.isPinned ? 'Открепить' : 'Закрепить'}
              </button>
              <button onClick={() => { onChatAction(contextMenu.chat.id, 'mute'); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors active:scale-95">
                  <BellOff size={14} className={contextMenu.chat.isMuted ? "text-vellor-red" : "text-white/60"} /> {contextMenu.chat.isMuted ? 'Включить звук' : 'Выключить звук'}
              </button>
              <div className="h-px bg-white/10 my-1.5" />
              <button onClick={() => { onChatAction(contextMenu.chat.id, 'delete'); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-colors active:scale-95">
                  <Trash2 size={14} /> Удалить чат
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
              <button onClick={() => { setActiveModal('profile'); setIsMenuOpen(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all active:scale-95">
                <User size={16} className="text-vellor-red"/> Профиль
              </button>
              <button onClick={() => { setActiveModal('nft'); setIsMenuOpen(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all active:scale-95">
                <Gem size={16} className="text-fuchsia-400"/> Коллекция NFT
              </button>
              <button onClick={() => { setActiveModal('settings'); setIsMenuOpen(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-white/5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all active:scale-95">
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
             
             {/* NFT MODAL WITH CLOSE BUTTON */}
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

             {/* ADMIN PANEL - REDESIGNED */}
             {activeModal === 'admin_panel' && (
                 <div className="flex flex-col h-full bg-[#050505]">
                     {/* Header */}
                     <div className="p-6 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center">
                                 <Crown size={20} className="text-yellow-500" />
                             </div>
                             <div>
                                 <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">GOD MODE</h2>
                                 <p className="text-[9px] text-white/40">Vellor Administration</p>
                             </div>
                         </div>
                         <button onClick={() => setActiveModal(null)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 hover:text-white transition-all"><X size={20}/></button>
                     </div>
                     
                     {/* Tabs */}
                     <div className="flex p-2 gap-2 bg-black/20 border-b border-white/5">
                         <button onClick={() => setAdminTab('dashboard')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all ${adminTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}><LayoutDashboard size={14}/> Dash</button>
                         <button onClick={() => setAdminTab('users')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all ${adminTab === 'users' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}><Users size={14}/> Users</button>
                         <button onClick={() => setAdminTab('broadcast')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all ${adminTab === 'broadcast' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}><Radio size={14}/> Broadcast</button>
                     </div>

                     <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                         {adminTab === 'dashboard' && (
                             <div className="space-y-6">
                                 <div className="grid grid-cols-2 gap-4">
                                     <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                                         <p className="text-[10px] text-white/40 font-bold uppercase">Total Users</p>
                                         <h3 className="text-2xl font-black text-white mt-1">{dashboardStats.users}</h3>
                                     </div>
                                     <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                                         <p className="text-[10px] text-white/40 font-bold uppercase">Messages</p>
                                         <h3 className="text-2xl font-black text-green-400 mt-1">{dashboardStats.messages}</h3>
                                     </div>
                                 </div>
                                 <div className="p-5 bg-gradient-to-br from-yellow-900/20 to-black border border-yellow-500/20 rounded-2xl">
                                     <div className="flex items-center gap-3 mb-4">
                                         <Activity size={20} className="text-yellow-500" />
                                         <h4 className="text-xs font-bold uppercase text-white">System Status</h4>
                                     </div>
                                     <div className="space-y-3">
                                         <div className="flex justify-between text-xs"><span className="text-white/60">Database</span><span className="text-green-400 font-bold">Connected</span></div>
                                         <div className="flex justify-between text-xs"><span className="text-white/60">Realtime</span><span className="text-green-400 font-bold">Active</span></div>
                                         <div className="flex justify-between text-xs"><span className="text-white/60">Online Now</span><span className="text-white font-bold">{onlineUsers.size}</span></div>
                                     </div>
                                 </div>
                             </div>
                         )}

                         {adminTab === 'users' && (
                             <div className="space-y-4">
                                 <div className="relative group">
                                    <Search className="absolute left-3 top-3 text-white/30" size={16} />
                                    <input autoFocus value={adminUserSearch} onChange={(e) => setAdminUserSearch(e.target.value)} placeholder="Search user..." className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-yellow-500/30 outline-none transition-all" />
                                </div>
                                {isAdminActionLoading && <div className="flex justify-center"><Loader2 className="animate-spin text-yellow-500"/></div>}
                                {adminUsers.map(u => (
                                    <div key={u.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3 group hover:border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-black overflow-hidden relative">
                                                <img src={u.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" />
                                                {u.isBanned && <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center"><Ban size={16} className="text-white"/></div>}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white flex items-center gap-1">
                                                    {u.name} 
                                                    {u.isAdmin && <Crown size={10} className="text-yellow-500 fill-yellow-500"/>} 
                                                    {u.isVerified && <BadgeCheck size={10} className="text-blue-400 fill-blue-400/20"/>}
                                                </p>
                                                <p className="text-[10px] text-white/40">@{u.username}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-5 gap-1">
                                            <button onClick={() => handleAdminUserAction(u.id, 'verify', !u.isVerified)} title="Toggle Verify" className={`p-2 rounded-lg flex items-center justify-center transition-all ${u.isVerified ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/30 hover:bg-blue-500/20 hover:text-blue-400'}`}><BadgeCheck size={16}/></button>
                                            <button onClick={() => handleAdminUserAction(u.id, 'admin', !u.isAdmin)} title="Toggle Admin" className={`p-2 rounded-lg flex items-center justify-center transition-all ${u.isAdmin ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white/30 hover:bg-yellow-500/20 hover:text-yellow-400'}`}><Crown size={16}/></button>
                                            <button onClick={() => handleAdminUserAction(u.id, 'ban', !u.isBanned)} title="Ban User" className={`p-2 rounded-lg flex items-center justify-center transition-all ${u.isBanned ? 'bg-red-500 text-white' : 'bg-white/5 text-white/30 hover:bg-red-500/20 hover:text-red-500'}`}><Ban size={16}/></button>
                                            <button onClick={() => handleAdminUserAction(u.id, 'reset_name')} title="Reset Name" className="p-2 rounded-lg bg-white/5 text-white/30 hover:bg-orange-500/20 hover:text-orange-500 flex items-center justify-center"><UserX size={16}/></button>
                                            <button onClick={() => handleAdminUserAction(u.id, 'wipe_messages')} title="Delete All Messages" className="p-2 rounded-lg bg-white/5 text-white/30 hover:bg-red-900/40 hover:text-red-500 flex items-center justify-center"><Skull size={16}/></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            <button onClick={() => handleAdminUserAction(u.id, 'reset_avatar')} className="text-[9px] bg-white/5 hover:bg-white/10 p-1.5 rounded-lg text-white/50 hover:text-white transition-colors">Reset Avatar</button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                         )}

                         {adminTab === 'broadcast' && (
                             <div className="space-y-6">
                                 <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                     <div className="flex items-center gap-3 mb-2">
                                         <Radio size={20} className="text-blue-400" />
                                         <h4 className="text-xs font-bold uppercase text-white">System Broadcast</h4>
                                     </div>
                                     <p className="text-[10px] text-white/60 mb-4">Send a message to ALL active chats from "System".</p>
                                     <textarea value={adminBroadcastMsg} onChange={(e) => setAdminBroadcastMsg(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white h-32 resize-none focus:border-blue-500/50 outline-none mb-3" placeholder="Message content..." />
                                     <button onClick={handleSendBroadcast} disabled={isBroadcasting || !adminBroadcastMsg} className="w-full py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 disabled:opacity-50">
                                         {isBroadcasting ? <Loader2 className="animate-spin" /> : <Send size={16}/>} Send Broadcast
                                     </button>
                                 </div>
                             </div>
                         )}
                     </div>
                 </div>
             )}

             {/* SETTINGS MODAL - REDESIGNED */}
             {activeModal === 'settings' && (
                 <div className="flex flex-col h-full bg-[#050505]">
                     {/* Header */}
                     <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl sticky top-0 z-10">
                         <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">НАСТРОЙКИ</h2>
                         <button onClick={() => setActiveModal(null)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all text-white/50 hover:text-white active:scale-90"><X size={20}/></button>
                     </div>

                     <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-24">
                         
                         {/* Profile Summary Card */}
                         <div className="p-4 bg-gradient-to-br from-white/10 to-black border border-white/10 rounded-3xl flex items-center gap-4 relative overflow-hidden group">
                             <div className="absolute inset-0 bg-vellor-red/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                             <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 overflow-hidden relative z-10 shadow-xl">
                                 <img src={userProfile.avatar || 'https://via.placeholder.com/64'} className="w-full h-full object-cover" />
                             </div>
                             <div className="flex-1 z-10">
                                 <h3 className="text-lg font-black text-white flex items-center gap-2">
                                     {userProfile.name}
                                     {userProfile.isVerified && <BadgeCheck size={16} className="text-blue-400 fill-blue-400/20" />}
                                 </h3>
                                 <p className="text-xs text-white/40">@{userProfile.username}</p>
                             </div>
                             <button onClick={() => setActiveModal('profile')} className="p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all active:scale-95 z-10"><Edit3 size={18}/></button>
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
                             <button onClick={() => setActiveModal('privacy')} className="w-full p-4 bg-[#0f0f0f] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                                 <div className="flex items-center gap-3">
                                     <Shield size={18} className="text-white/60 group-hover:text-white transition-colors"/>
                                     <span className="text-sm font-bold text-white">Приватность</span>
                                 </div>
                                 <ChevronRight size={16} className="text-white/20 group-hover:text-white/50"/>
                             </button>
                             <button onClick={() => setActiveModal('changelog')} className="w-full p-4 bg-[#0f0f0f] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                                 <div className="flex items-center gap-3">
                                     <History size={18} className="text-white/60 group-hover:text-white transition-colors"/>
                                     <span className="text-sm font-bold text-white">Список изменений</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <span className="text-[9px] font-mono text-vellor-red bg-vellor-red/10 px-2 py-0.5 rounded-md">v1.4</span>
                                     <ChevronRight size={16} className="text-white/20 group-hover:text-white/50"/>
                                 </div>
                             </button>
                         </div>

                     </div>
                 </div>
             )}

             {/* PRIVACY MODAL - REIMPLEMENTED */}
             {activeModal === 'privacy' && (
                 <div className="flex flex-col h-full bg-[#050505] relative">
                     <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                        <button onClick={() => setActiveModal('settings')} className="p-3 -ml-2 text-white/40 hover:text-white transition-colors active:scale-90"><ChevronLeft size={24}/></button>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">Приватность</h2>
                     </div>
                     <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar">
                         {renderPrivacyOption('Номер телефона', userProfile.privacy_phone || 'everybody', 'privacy_phone', Phone)}
                         {renderPrivacyOption('Время захода', userProfile.privacy_last_seen || 'everybody', 'privacy_last_seen', Eye)}
                         {renderPrivacyOption('Фото профиля', userProfile.privacy_avatar || 'everybody', 'privacy_avatar', Camera)}
                         {renderPrivacyOption('Пересылка сообщений', userProfile.privacy_forwards || 'everybody', 'privacy_forwards', MessageSquare)}
                         {renderPrivacyOption('Звонки', userProfile.privacy_calls || 'everybody', 'privacy_calls', Phone)}
                         {renderPrivacyOption('Группы', userProfile.privacy_groups || 'everybody', 'privacy_groups', Users)}
                     </div>
                 </div>
             )}

             {/* PRIVACY ITEM SELECTION MODAL */}
             {activeModal === 'privacy_item' && privacyItem && (
                 <div className="flex flex-col h-full bg-[#050505] relative">
                     <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                        <button onClick={() => setActiveModal('privacy')} className="p-3 -ml-2 text-white/40 hover:text-white transition-colors active:scale-90"><ChevronLeft size={24}/></button>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">Кто видит?</h2>
                     </div>
                     <div className="flex-1 p-6 space-y-2">
                         {['everybody', 'contacts', 'nobody'].map((val) => (
                             <button 
                                key={val}
                                onClick={async () => {
                                    const updated = { ...userProfile, [privacyItem]: val };
                                    onUpdateProfile(updated);
                                    await onSaveProfile(updated); // Auto-save
                                    setActiveModal('privacy');
                                }}
                                className={`w-full p-4 border rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] ${userProfile[privacyItem as keyof UserProfile] === val ? 'bg-vellor-red/20 border-vellor-red text-white' : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'}`}
                             >
                                 <span className="text-sm font-bold capitalize">
                                     {val === 'everybody' ? 'Все' : val === 'contacts' ? 'Мои контакты' : 'Никто'}
                                 </span>
                                 {userProfile[privacyItem as keyof UserProfile] === val && <Check size={16} className="text-vellor-red"/>}
                             </button>
                         ))}
                         <p className="text-[10px] text-white/30 mt-4 px-2 leading-relaxed">
                             Изменение настроек может занять некоторое время для применения на всех устройствах.
                         </p>
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
                         
                         {/* VERSION 1.4 */}
                         <div className="relative pl-6 border-l border-white/10 space-y-4">
                             <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-vellor-red shadow-[0_0_10px_currentColor]" />
                             <div>
                                 <h3 className="text-lg font-black text-white">Версия 1.4</h3>
                                 <p className="text-[10px] text-white/40 font-mono">Только что</p>
                             </div>
                             
                             <div className="space-y-3">
                                 <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                     <h4 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2"><MessageCircle size={14}/> Fix: Unread Counter</h4>
                                     <p className="text-sm text-white/80 leading-relaxed">
                                         Исправил баг, когда счетчик непрочитанных слетал после перезагрузки. Теперь система правильно запоминает, когда вы в последний раз читали группу, и сравнивает это с датой сообщений.
                                     </p>
                                 </div>
                                 <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                     <h4 className="text-xs font-bold text-fuchsia-400 mb-2 flex items-center gap-2"><Sparkles size={14}/> UI Overhaul</h4>
                                     <p className="text-sm text-white/80 leading-relaxed">
                                         Полный редизайн настроек и окна NFT. Добавлено больше визуальных эффектов и анимаций. Исправлены баги отображения текста на мобильных.
                                     </p>
                                 </div>
                             </div>
                         </div>

                         {/* VERSION 1.3 */}
                         <div className="relative pl-6 border-l border-white/10 space-y-4 opacity-50">
                             <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-white/20" />
                             <div>
                                 <h3 className="text-lg font-black text-white">Версия 1.3</h3>
                                 <p className="text-[10px] text-white/40 font-mono">Ранее</p>
                             </div>
                             <div className="space-y-3">
                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                     <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2"><Zap size={14}/> Anti-Spam</h4>
                                     <p className="text-sm text-white/80 leading-relaxed">
                                         Тротлинг сообщений и оптимизация групп.
                                     </p>
                                 </div>
                             </div>
                         </div>

                     </div>
                 </div>
             )}

             {/* Rest of the modals (new_chat, create_group, etc.) standard render logic */}
             {activeModal !== 'settings' && activeModal !== 'admin_login' && activeModal !== 'admin_panel' && activeModal !== 'nft' && activeModal !== 'privacy' && activeModal !== 'privacy_item' && activeModal !== 'changelog' && (
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        {(activeModal === 'create_group') && (
                            <button onClick={() => setActiveModal(activeModal === 'create_group' ? 'new_chat' : 'settings')} className="p-3 -ml-2 text-white/40 hover:text-white transition-colors active:scale-90"><ChevronLeft size={24}/></button>
                        )}
                        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">
                        {activeModal === 'profile' ? 'Мой Профиль' : activeModal === 'new_chat' ? 'Новый чат' : activeModal === 'create_group' ? 'Новая группа' : ''}
                        </h2>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-3 bg-white/5 rounded-full hover:bg-vellor-red/20 hover:text-vellor-red transition-all active:scale-90"><X size={20}/></button>
                </div>
             )}

             <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                 {activeModal === 'create_group' && (
                  <div className="space-y-6">
                      <div className="flex flex-col items-center gap-4">
                           <div className="relative group cursor-pointer" onClick={() => groupAvatarInputRef.current?.click()}>
                                <div className="w-24 h-24 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                     {newGroupAvatarPreview ? <img src={newGroupAvatarPreview} className="w-full h-full object-cover" /> : <Camera size={32} className="text-white/20" />}
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-vellor-red p-2 rounded-full text-white shadow-lg"><Plus size={16}/></div>
                                <input type="file" ref={groupAvatarInputRef} onChange={(e) => { const file = e.target.files?.[0]; if(file) { setNewGroupAvatar(file); setNewGroupAvatarPreview(URL.createObjectURL(file)); } }} accept="image/*" className="hidden" />
                           </div>
                           <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Название группы" className="bg-transparent border-b border-white/20 text-center py-2 text-lg font-bold outline-none focus:border-vellor-red w-full" />
                      </div>
                      <div className="relative group">
                        <Search className="absolute left-3 top-3 text-white/30" size={18} />
                        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Добавить участников..." className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:border-vellor-red/30 outline-none transition-all" />
                      </div>
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
                           <h4 className="text-[9px] font-bold uppercase tracking-widest opacity-40 sticky top-0 bg-[#0a0a0a] py-2 z-10">{searchQuery ? 'Результаты поиска' : 'Ваши контакты'}</h4>
                           {(searchQuery ? globalSearchResults : recentContacts).filter(u => !selectedUsersForGroup.some(s => s.id === u.id)).map(user => (
                               <button key={user.id} onClick={() => setSelectedUsersForGroup(prev => [...prev, user])} className="w-full p-2 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-all text-left active:scale-98">
                                   <div className="w-9 h-9 rounded-full bg-gray-800 overflow-hidden shrink-0"><img src={user.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" /></div>
                                   <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{user.name}</p><p className="text-[10px] opacity-40 truncate">@{user.username || 'user'}</p></div>
                                   <div className="w-5 h-5 rounded-full border border-white/20" />
                               </button>
                           ))}
                      </div>
                      <button onClick={handleCreateGroup} disabled={isCreatingGroup} className="w-full py-4 bg-vellor-red text-white font-black uppercase text-[11px] tracking-[0.3em] rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95">
                          {isCreatingGroup ? <Loader2 className="animate-spin" /> : 'Создать'}
                      </button>
                  </div>
              )}
              {activeModal === 'profile' && (
                <div className="space-y-8 pb-10">
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
                    <input value={userProfile.name} onChange={(e) => onUpdateProfile({...userProfile, name: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-bold focus:border-vellor-red/50 outline-none transition-all" placeholder="Name"/>
                    <input value={userProfile.username} onChange={(e) => onUpdateProfile({...userProfile, username: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-bold focus:border-vellor-red/50 outline-none transition-all" placeholder="@username"/>
                    <textarea value={userProfile.bio} onChange={(e) => onUpdateProfile({...userProfile, bio: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm min-h-[100px] resize-none focus:border-vellor-red/50 outline-none transition-all leading-relaxed" placeholder="Bio..." />
                  </div>
                </div>
              )}
             </div>
             
             <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
               {activeModal === 'profile' && (
                 <button onClick={async () => { setIsSaving(true); await onSaveProfile(userProfile); setIsSaving(false); setActiveModal(null); }} disabled={isSaving} className="w-full py-4 bg-white text-black font-black uppercase text-[11px] tracking-[0.3em] rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95">
                    {isSaving ? <Loader2 className="animate-spin" /> : 'Сохранить'}
                 </button>
               )}
            </div>
          </MDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
