
import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { CallModal } from './components/CallModal';
import { Toast, ToastType } from './components/Toast';
import { MaintenanceOverlay } from './components/MaintenanceOverlay';
import { Chat, Message, UserProfile, MessageType, User, CallState, CallType, UserStatus } from './types';
import { supabase } from './supabaseClient';
import { ShieldAlert, RefreshCw, Copy, Check, Lock } from 'lucide-react';
import { NOTIFICATION_SOUNDS, CALL_RINGTONE_URL, CALL_RINGTONE_FALLBACK } from './constants';
import { useChatData } from './hooks/useChatData';

const MDiv = motion.div as any;

const THEMES_CONFIG = {
  crimson: {
    '--bg': '#050505',
    '--panel': 'rgba(20, 5, 5, 0.6)',
    '--accent': '#ef4444',
    '--text': '#ffffff',
    '--border': 'rgba(220, 38, 38, 0.2)',
    '--glass': 'rgba(220, 38, 38, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)',
    wallpaper: "radial-gradient(circle at 50% 0%, #4a0404 0%, #000000 100%)"
  },
  ocean: {
    '--bg': '#020617',
    '--panel': 'rgba(2, 6, 23, 0.7)',
    '--accent': '#22d3ee',
    '--text': '#ecfeff',
    '--border': 'rgba(34, 211, 238, 0.2)',
    '--glass': 'rgba(34, 211, 238, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #0891b2 0%, #0c4a6e 100%)',
    wallpaper: "radial-gradient(circle at 50% 0%, #041f4a 0%, #000205 100%)"
  },
  cyber: {
    '--bg': '#0f0518',
    '--panel': 'rgba(20, 5, 30, 0.7)',
    '--accent': '#e879f9',
    '--text': '#fae8ff',
    '--border': 'rgba(232, 121, 249, 0.2)',
    '--glass': 'rgba(232, 121, 249, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #c026d3 0%, #581c87 100%)',
    wallpaper: "radial-gradient(circle at 50% 0%, #2e044a 0%, #000000 100%)"
  },
  gold: {
    '--bg': '#1a1205',
    '--panel': 'rgba(30, 20, 5, 0.7)',
    '--accent': '#fbbf24',
    '--text': '#fffbeb',
    '--border': 'rgba(251, 191, 36, 0.2)',
    '--glass': 'rgba(251, 191, 36, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #d97706 0%, #713f12 100%)',
    wallpaper: "radial-gradient(circle at 50% 0%, #4a3804 0%, #050200 100%)"
  },
  emerald: {
    '--bg': '#022c22',
    '--panel': 'rgba(2, 44, 34, 0.7)',
    '--accent': '#34d399',
    '--text': '#ecfdf5',
    '--border': 'rgba(52, 211, 153, 0.2)',
    '--glass': 'rgba(52, 211, 153, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)',
    wallpaper: "radial-gradient(circle at 50% 0%, #022c22 0%, #000000 100%)"
  },
  obsidian: {
    '--bg': '#000000',
    '--panel': 'rgba(15, 15, 15, 0.8)',
    '--accent': '#ffffff',
    '--text': '#ffffff',
    '--border': 'rgba(255, 255, 255, 0.15)',
    '--glass': 'rgba(255, 255, 255, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #525252 0%, #171717 100%)',
    wallpaper: "radial-gradient(circle at 50% 0%, #262626 0%, #000000 100%)"
  },
  sunset: {
    '--bg': '#1a050d',
    '--panel': 'rgba(40, 5, 20, 0.7)',
    '--accent': '#fb923c',
    '--text': '#fff7ed',
    '--border': 'rgba(251, 146, 60, 0.2)',
    '--glass': 'rgba(251, 146, 60, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #f97316 0%, #be123c 100%)',
    wallpaper: "radial-gradient(circle at 50% 0%, #4a0426 0%, #0f0005 100%)"
  }
};

const SQL_FIX_SCRIPT = `-- ULTIMATE UPDATE V1.5 ...`;

interface CallSession {
  state: CallState;
  type: CallType;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  isCaller: boolean;
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<'loading' | 'auth' | 'app'>('loading');
  const [isDatabaseError, setIsDatabaseError] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  
  // Maintenance State
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>({ 
    id: '', name: '', phone: '', bio: '', username: '', avatar: '', status: 'online', isAdmin: false, isVerified: false, isBanned: false, created_at: new Date().toISOString()
  });
  const userProfileRef = useRef<UserProfile | null>(null);
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

  // UI State
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [tempChatUser, setTempChatUser] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserStatus>>(new Map());
  const [callData, setCallData] = useState<CallSession | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean; icon?: string }>({ message: '', type: 'info', visible: false });

  // Refs
  const presenceChannelRef = useRef<any | null>(null);
  const systemChannelRef = useRef<any | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Settings & Theme
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES_CONFIG>(() => {
      const saved = localStorage.getItem('vellor_theme');
      return (saved && THEMES_CONFIG[saved as keyof typeof THEMES_CONFIG]) ? (saved as keyof typeof THEMES_CONFIG) : 'crimson';
  });
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('vellor_settings');
    const defaults = { sound: true, notifications: true, pulsing: true, liteMode: false, notificationSound: 'default' };
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return { ...defaults, ...parsed };
  });
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Audio & Notification Helpers
  const initAudioContext = () => {
      if (!audioContextRef.current) {
          const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
          if (AudioContextClass) audioContextRef.current = new AudioContextClass();
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
  };

  const playSound = async (url: string, fallbackUrl?: string, loop: boolean = false) => {
      if (!settingsRef.current.sound) return;
      initAudioContext();
      if (!audioContextRef.current) return;
      try {
          const ctx = audioContextRef.current;
          const loadBuffer = async (path: string) => {
              const response = await fetch(path);
              if (!response.ok) throw new Error('Fetch failed');
              const arrayBuffer = await response.arrayBuffer();
              return await ctx.decodeAudioData(arrayBuffer);
          };
          let audioBuffer;
          try { audioBuffer = await loadBuffer(url); } catch (e) { if (fallbackUrl) audioBuffer = await loadBuffer(fallbackUrl); else throw e; }
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.loop = loop;
          source.start(0);
          return source;
      } catch (e) { console.error("Audio Play Failed:", e); }
  };

  const playNotificationSound = async () => {
      if (!settingsRef.current.notifications) return;
      const currentSettings = settingsRef.current;
      const soundDef = NOTIFICATION_SOUNDS.find(s => s.id === currentSettings.notificationSound) || NOTIFICATION_SOUNDS[0];
      await playSound(soundDef.url, soundDef.fallback);
  };

  const startRingtone = async () => {
      if (ringtoneSourceRef.current) return;
      const source = await playSound(CALL_RINGTONE_URL, CALL_RINGTONE_FALLBACK, true);
      if (source) ringtoneSourceRef.current = source;
  };

  const stopRingtone = () => {
      if (ringtoneSourceRef.current) {
          try { ringtoneSourceRef.current.stop(); } catch(e) {}
          ringtoneSourceRef.current = null;
      }
  };

  const showToast = (message: string, type: ToastType = 'info', icon?: string) => setToast({ message, type, visible: true, icon });

  const sendBrowserNotification = (title: string, body: string, icon?: string) => {
      const currentSettings = settingsRef.current;
      if (currentSettings.notifications && "Notification" in window && Notification.permission === "granted") {
          try { new Notification(title, { body, icon: icon || 'https://via.placeholder.com/128', silent: !currentSettings.sound, tag: 'vellor-msg' }); } catch (e) {}
      }
  };

  // --- CUSTOM HOOK FOR CHAT LOGIC ---
  const { 
      chats, setChats, fetchChats, handleRealtimePayload, sendMessage, handleChatAction, 
      handleDeleteGroup, handleLeaveGroup, handleUpdateGroupInfo, handleEditMessage, 
      handleDeleteMessage, handlePinMessage, handleMarkAsRead, handleUpdateGroup 
  } = useChatData(userProfile, showToast, playNotificationSound, sendBrowserNotification);

  // --- EFFECTS ---
  useEffect(() => {
    if (settings.liteMode) document.body.classList.add('lite-mode'); else document.body.classList.remove('lite-mode');
  }, [settings.liteMode]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const theme = THEMES_CONFIG[currentTheme];
    Object.entries(theme).forEach(([key, val]) => { if (key !== 'wallpaper') root.style.setProperty(key, val as string); });
    localStorage.setItem('vellor_theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => { if (appState === 'app' && userProfile.id) fetchChats(); }, [appState, userProfile.id, fetchChats]);

  // Realtime Subscriptions
  useEffect(() => {
    if (appState !== 'app' || !userProfile.id || isDatabaseError) return;
    const channel = supabase.channel('updates');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, handleRealtimePayload);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => fetchChats());
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'groups' }, (payload: any) => {
        setChats(prev => prev.filter(c => c.id !== payload.old.id));
        if (activeChatId === payload.old.id) setActiveChatId(null);
    });
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'groups' }, (payload: any) => handleUpdateGroup(payload.new));
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload: any) => {
        // Own profile update logic (local)
        if (payload.new.id === userProfile.id) {
             const u = payload.new;
             setUserProfile(prev => ({ ...prev, name: u.full_name, username: u.username, bio: u.bio, avatar: u.avatar_url, isAdmin: u.is_admin, isVerified: u.is_verified, isBanned: u.is_banned }));
        }
        handleRealtimePayload(payload); // Forward to chat list update
    });
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'chat_settings' }, (payload: any) => {
        if (payload.new?.user_id === userProfile.id || payload.old?.user_id === userProfile.id) fetchChats();
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [appState, userProfile.id, handleRealtimePayload, isDatabaseError, fetchChats, activeChatId, handleUpdateGroup]);

  // Presence & Signaling
  useEffect(() => {
    if (appState !== 'app' || !userProfile.id || isDatabaseError) return;
    const channel = supabase.channel('global_presence', { config: { presence: { key: userProfile.id } } });
    presenceChannelRef.current = channel;
    const handleBeforeUnload = async () => { await channel.untrack(); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const newOnlineMap = new Map<string, UserStatus>();
        Object.entries(state).forEach(([key, value]) => {
            const presenceData = value[0] as any;
            if (key !== userProfile.id) newOnlineMap.set(key, presenceData?.status || 'online');
        });
        setOnlineUsers(newOnlineMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
         if (key === userProfile.id) return;
         setOnlineUsers(prev => { const next = new Map(prev); next.set(key, (newPresences[0] as any)?.status || 'online'); return next; });
      })
      .on('presence', { event: 'leave' }, ({ key }) => setOnlineUsers(prev => { const next = new Map(prev); next.delete(key); return next; }))
      .subscribe(async (status) => { if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString(), user_id: userProfile.id, status: 'online' }); });
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); channel.untrack(); supabase.removeChannel(channel); presenceChannelRef.current = null; };
  }, [appState, userProfile.id, isDatabaseError]);

  const handleBroadcast = async (message: string): Promise<boolean> => {
      if (!systemChannelRef.current) return false;
      try {
          await systemChannelRef.current.send({ type: 'broadcast', event: 'system_alert', payload: { message, title: 'SYSTEM BROADCAST' } });
          return true;
      } catch (e) { return false; }
  };

  const handleMaintenanceToggle = async (active: boolean): Promise<boolean> => {
      if (!systemChannelRef.current) return false;
      try {
          await systemChannelRef.current.send({ type: 'broadcast', event: 'maintenance_toggle', payload: { active } });
          return true;
      } catch (e) { return false; }
  };

  useEffect(() => {
      if (appState !== 'app' || isDatabaseError) return;
      const channel = supabase.channel('global_system');
      systemChannelRef.current = channel;
      channel.on('broadcast', { event: 'system_alert' }, ({ payload }) => {
          showToast(payload.message, 'info', 'https://cdn.lucide.dev/icon/radio.svg');
          sendBrowserNotification(payload.title || 'SYSTEM BROADCAST', payload.message);
          playNotificationSound();
      });
      // Listener for Maintenance Toggle
      channel.on('broadcast', { event: 'maintenance_toggle' }, ({ payload }) => {
          setIsMaintenanceMode(payload.active);
      });
      channel.subscribe();
      return () => { supabase.removeChannel(channel); systemChannelRef.current = null; };
  }, [appState, isDatabaseError]);

  useEffect(() => {
      if (appState !== 'app' || !userProfile.id) return;
      const channel = supabase.channel('global_typing');
      channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (payload.userId === userProfile.id) return;
          setTypingUsers(prev => {
              const currentList = prev[payload.chatId] || [];
              let newList = [...currentList];
              if (payload.isTyping) { if (!newList.includes(payload.name)) newList.push(payload.name); } 
              else { newList = newList.filter(name => name !== payload.name); }
              return { ...prev, [payload.chatId]: newList };
          });
      }).subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [appState, userProfile.id]);

  useEffect(() => {
    if (appState !== 'app' || !userProfile.id) return;
    const mySignalingChannel = supabase.channel(`signaling:${userProfile.id}`);
    mySignalingChannel.on('broadcast', { event: 'call-request' }, async ({ payload }) => {
            const { data: callerProfile } = await supabase.from('profiles').select('*').eq('id', payload.callerId).single();
            if (callerProfile) {
                setCallData({ state: 'incoming', type: payload.type, partnerId: callerProfile.id, partnerName: callerProfile.full_name, partnerAvatar: callerProfile.avatar_url, isCaller: false });
                startRingtone();
            }
    }).subscribe();
    return () => { supabase.removeChannel(mySignalingChannel); stopRingtone(); };
  }, [appState, userProfile.id]);

  useEffect(() => { if (!callData || callData.state === 'connected' || callData.state === 'ended') stopRingtone(); }, [callData]);

  // Handlers
  const handleSplashComplete = async () => {
    try {
      const { data: { session } } = await (supabase.auth as any).getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
           setUserProfile({
              id: profile.id, name: profile.full_name, username: profile.username, avatar: profile.avatar_url,
              phone: session.user.email || '', bio: profile.bio || '', status: 'online', 
              isAdmin: profile.is_admin || false, isVerified: profile.is_verified || false, isBanned: profile.is_banned || false, created_at: profile.created_at
           });
           setAppState('app');
        } else { setAppState('auth'); }
      } else { setAppState('auth'); }
    } catch (e) { setAppState('auth'); }
  };

  const handleUpdateStatus = async (status: UserStatus) => {
      setUserProfile(prev => ({ ...prev, status }));
      if (presenceChannelRef.current) await presenceChannelRef.current.track({ online_at: new Date().toISOString(), user_id: userProfile.id, status: status });
      await supabase.from('profiles').update({ status }).eq('id', userProfile.id);
  };
  
  const handleSaveProfile = async (updatedProfile: UserProfile) => {
      try {
          const { error } = await supabase.from('profiles').update({ full_name: updatedProfile.name, username: updatedProfile.username, bio: updatedProfile.bio, avatar_url: updatedProfile.avatar }).eq('id', updatedProfile.id);
          if (error) { showToast(error.code === '23505' ? "Этот юзернейм уже занят" : "Ошибка сохранения профиля", "error"); } 
          else { showToast("Профиль сохранен", "success"); setUserProfile(updatedProfile); }
      } catch (e) { showToast("Ошибка соединения", "error"); }
  };

  const handleSendTypingSignal = async (isTyping: boolean) => {
      if (!activeChatId) return;
      await supabase.channel('global_typing').send({ type: 'broadcast', event: 'typing', payload: { chatId: activeChatId, userId: userProfile.id, name: userProfile.name, isTyping } });
  };

  const handleStartCall = async (chatId: string, type: CallType) => {
      const chat = chats.find(c => c.id === chatId);
      if (!chat) return;
      if (chat.user.isGroup) { showToast("Звонки в группах пока недоступны", "warning"); return; }
      setCallData({ state: 'calling', type, partnerId: chatId, partnerName: chat.user.name, partnerAvatar: chat.user.avatar, isCaller: true });
      await supabase.channel(`signaling:${chatId}`).send({ type: 'broadcast', event: 'call-request', payload: { callerId: userProfile.id, type } });
  };

  const retryConnection = () => { setIsDatabaseError(false); fetchChats(); };
  const activeChat = chats.find(c => c.id === activeChatId) || (tempChatUser?.id === activeChatId ? { id: activeChatId, user: tempChatUser, messages: [], unreadCount: 0, lastMessage: {} as Message } : null);

  // MAINTENANCE MODE BLOCKER
  // Shows overlay if Maintenance Mode is active AND user is NOT an admin
  if (isMaintenanceMode && !userProfile.isAdmin) {
      return <MaintenanceOverlay />;
  }

  if (userProfile.isBanned) {
      return (
          <div className="fixed inset-0 flex items-center justify-center bg-black text-white z-[9999]">
              <div className="text-center p-8 bg-white/5 border border-red-500/30 rounded-3xl max-w-sm">
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"><Lock size={40} className="text-red-500" /></div>
                  <h1 className="text-2xl font-black uppercase tracking-widest text-red-500 mb-2">Access Denied</h1>
                  <p className="text-sm text-white/60 leading-relaxed mb-6">Ваш аккаунт был заблокирован администратором.</p>
                  <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">Попробовать снова</button>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 pointer-events-none transition-all duration-1000 ease-in-out" style={{ background: THEMES_CONFIG[currentTheme].wallpaper, opacity: 1 }} />
      {settings.pulsing && !settings.liteMode && !isMobile && (
          <MDiv key={currentTheme} animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }} className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none z-0" style={{ backgroundColor: THEMES_CONFIG[currentTheme]['--accent'] }} />
      )}
      {(settings.liteMode || isMobile) && <div className="absolute inset-0 z-0 opacity-20" style={{ background: `radial-gradient(circle at center, ${THEMES_CONFIG[currentTheme]['--accent']}, transparent 70%)` }} />}
      <div className="absolute inset-0 z-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={() => setToast(prev => ({...prev, visible: false}))} icon={toast.icon}/>

      <AnimatePresence mode="wait">
        {appState === 'loading' && <SplashScreen onComplete={handleSplashComplete} />}
        {appState === 'auth' && <AuthScreen onComplete={(p) => { setUserProfile(p); setAppState('app'); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {callData && <CallModal callState={callData.state} callType={callData.type} partnerName={callData.partnerName} partnerAvatar={callData.partnerAvatar} partnerId={callData.partnerId} myId={userProfile.id} isCaller={callData.isCaller} onAnswer={() => setCallData(prev => prev ? { ...prev, state: 'connected' } : null)} onEnd={() => setCallData(null)} />}
      </AnimatePresence>

      {appState === 'app' && (
        <MDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 w-full flex overflow-hidden bg-transparent h-[100dvh]" style={{ color: 'var(--text)' }}>
            <div className={`${isMobile && activeChatId ? 'hidden' : 'w-full md:w-[380px] lg:w-[420px]'} h-full border-r border-[var(--border)] bg-black/30 backdrop-blur-3xl flex flex-col shrink-0`}>
              {isDatabaseError ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-6 overflow-y-auto custom-scrollbar">
                      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center animate-pulse"><ShieldAlert size={40} className="text-red-500" /></div>
                      <div>
                          <h3 className="text-xl font-black uppercase tracking-widest text-white mb-2">ОШИБКА БАЗЫ</h3>
                          <div className="flex gap-2 justify-center">
                              <button onClick={retryConnection} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-white/5"><RefreshCw size={14} /> Обновить</button>
                          </div>
                      </div>
                  </div>
              ) : (
                  <ChatList 
                    chats={chats} 
                    activeChatId={activeChatId} 
                    onSelectChat={(id, u) => { if (u && !chats.some(c=>c.id===id)) setTempChatUser({id, ...u}); setActiveChatId(id); }} 
                    userProfile={userProfile} 
                    onUpdateProfile={(p) => setUserProfile(p)} 
                    onSetTheme={(theme) => setCurrentTheme(theme as keyof typeof THEMES_CONFIG)} 
                    currentThemeId={currentTheme} 
                    settings={settings} 
                    onUpdateSettings={(s) => {setSettings(s); localStorage.setItem('vellor_settings', JSON.stringify(s));}} 
                    onUpdateStatus={handleUpdateStatus} 
                    typingUsers={typingUsers} 
                    onChatAction={(chatId, action) => handleChatAction(chatId, action, activeChatId, setActiveChatId)} 
                    showToast={showToast} 
                    onlineUsers={onlineUsers} 
                    onSaveProfile={handleSaveProfile} 
                    onBroadcast={handleBroadcast} 
                    onToggleMaintenance={handleMaintenanceToggle}
                    isMaintenanceMode={isMaintenanceMode}
                  />
              )}
            </div>
            <div className={`flex-1 h-full bg-black/10 relative ${isMobile && !activeChatId ? 'hidden' : 'block'}`}>
              {activeChat && !isDatabaseError ? (
                <ChatWindow chat={activeChat as Chat} myId={userProfile.id} onBack={() => setActiveChatId(null)} isMobile={isMobile} onSendMessage={sendMessage} markAsRead={handleMarkAsRead} onStartCall={handleStartCall} isPartnerTyping={false} onSendTypingSignal={handleSendTypingSignal} wallpaper={THEMES_CONFIG[currentTheme].wallpaper} onEditMessage={handleEditMessage} onDeleteMessage={handleDeleteMessage} onPinMessage={handlePinMessage} onlineUsers={onlineUsers} showToast={showToast} onLeaveGroup={(gid) => handleLeaveGroup(gid, activeChatId, setActiveChatId)} onDeleteGroup={(gid) => handleDeleteGroup(gid, activeChatId, setActiveChatId)} typingUserNames={typingUsers[activeChat.id] || []} onUpdateGroupInfo={handleUpdateGroupInfo} />
              ) : (
                <div className="hidden md:flex flex-col items-center justify-center h-full opacity-10 select-none pointer-events-none"><h1 className="text-[140px] font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-transparent">VELLOR</h1></div>
              )}
            </div>
        </MDiv>
      )}
    </div>
  );
};

export default App;
