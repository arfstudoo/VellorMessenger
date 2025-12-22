
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { CallModal } from './components/CallModal';
import { Toast, ToastType } from './components/Toast';
import { Chat, Message, UserProfile, MessageType, User, CallState, CallType, UserStatus } from './types';
import { supabase } from './supabaseClient';
import { AlertTriangle, ServerCrash, RefreshCw, Copy, Check, Terminal, ShieldAlert, Zap, Database, Crown, BadgeCheck, Lock } from 'lucide-react';
// import { RealtimeChannel } from '@supabase/supabase-js';
import { NOTIFICATION_SOUNDS, CALL_RINGTONE_URL, CALL_RINGTONE_FALLBACK } from './constants';

const MDiv = motion.div as any;

const THEMES_CONFIG = {
  crimson: {
    '--bg': '#050505',
    '--panel': 'rgba(20, 5, 5, 0.6)',
    '--accent': '#ef4444', // Red-500
    '--text': '#ffffff',
    '--border': 'rgba(220, 38, 38, 0.2)',
    '--glass': 'rgba(220, 38, 38, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)', // Red-800 to Red-950
    wallpaper: "radial-gradient(circle at 50% 0%, #4a0404 0%, #000000 100%)"
  },
  ocean: {
    '--bg': '#020617',
    '--panel': 'rgba(2, 6, 23, 0.7)',
    '--accent': '#22d3ee', // Cyan-400
    '--text': '#ecfeff',
    '--border': 'rgba(34, 211, 238, 0.2)',
    '--glass': 'rgba(34, 211, 238, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #0891b2 0%, #0c4a6e 100%)', // Cyan-600 to Blue-900
    wallpaper: "radial-gradient(circle at 50% 0%, #041f4a 0%, #000205 100%)"
  },
  cyber: {
    '--bg': '#0f0518',
    '--panel': 'rgba(20, 5, 30, 0.7)',
    '--accent': '#e879f9', // Fuchsia-400
    '--text': '#fae8ff',
    '--border': 'rgba(232, 121, 249, 0.2)',
    '--glass': 'rgba(232, 121, 249, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #c026d3 0%, #581c87 100%)', // Fuchsia-600 to Purple-900
    wallpaper: "radial-gradient(circle at 50% 0%, #2e044a 0%, #000000 100%)"
  },
  gold: {
    '--bg': '#1a1205',
    '--panel': 'rgba(30, 20, 5, 0.7)',
    '--accent': '#fbbf24', // Amber-400
    '--text': '#fffbeb',
    '--border': 'rgba(251, 191, 36, 0.2)',
    '--glass': 'rgba(251, 191, 36, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #d97706 0%, #713f12 100%)', // Amber-600 to Yellow-800
    wallpaper: "radial-gradient(circle at 50% 0%, #4a3804 0%, #050200 100%)"
  },
  emerald: {
    '--bg': '#022c22',
    '--panel': 'rgba(2, 44, 34, 0.7)',
    '--accent': '#34d399', // Emerald-400
    '--text': '#ecfdf5',
    '--border': 'rgba(52, 211, 153, 0.2)',
    '--glass': 'rgba(52, 211, 153, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)', // Emerald-500 to Green-900
    wallpaper: "radial-gradient(circle at 50% 0%, #022c22 0%, #000000 100%)"
  },
  obsidian: {
    '--bg': '#000000',
    '--panel': 'rgba(15, 15, 15, 0.8)',
    '--accent': '#ffffff', // White
    '--text': '#ffffff',
    '--border': 'rgba(255, 255, 255, 0.15)',
    '--glass': 'rgba(255, 255, 255, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #525252 0%, #171717 100%)', // Neutral-600 to Neutral-900
    wallpaper: "radial-gradient(circle at 50% 0%, #262626 0%, #000000 100%)"
  },
  sunset: {
    '--bg': '#1a050d',
    '--panel': 'rgba(40, 5, 20, 0.7)',
    '--accent': '#fb923c', // Orange-400
    '--text': '#fff7ed',
    '--border': 'rgba(251, 146, 60, 0.2)',
    '--glass': 'rgba(251, 146, 60, 0.05)',
    '--msg-me': 'linear-gradient(135deg, #f97316 0%, #be123c 100%)', // Orange-500 to Rose-700
    wallpaper: "radial-gradient(circle at 50% 0%, #4a0426 0%, #0f0005 100%)"
  }
};

const SQL_FIX_SCRIPT = `-- ULTIMATE UPDATE V1.4
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Ensure Groups have description
ALTER TABLE groups ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Add is_banned to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- 3. Create chat_settings table if not exists (for Pinning/Muting)
CREATE TABLE IF NOT EXISTS chat_settings (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL, 
  is_pinned BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, partner_id)
);

ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own settings" ON chat_settings;
CREATE POLICY "Users can manage their own settings" ON chat_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Remove FK Constraint for flexible pinning
ALTER TABLE chat_settings DROP CONSTRAINT IF EXISTS chat_settings_partner_id_fkey;

-- 5. Messages group_id
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;

-- 6. Indexes for Speed
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);

-- 7. Recreate Data Fetch Function with Banned Status & Description
DROP FUNCTION IF EXISTS get_my_messenger_data();

CREATE OR REPLACE FUNCTION get_my_messenger_data()
RETURNS json AS $$
DECLARE
  _user_id uuid := auth.uid();
  result json;
BEGIN
  SELECT json_build_object(
    'groups', (
      SELECT COALESCE(json_agg(g_info), '[]'::json)
      FROM (
        SELECT g.*, gm.last_read_at
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = _user_id
      ) g_info
    ),
    'private_messages', (
      SELECT COALESCE(json_agg(m), '[]'::json)
      FROM (
        SELECT * FROM messages 
        WHERE (sender_id = _user_id OR receiver_id = _user_id)
        AND group_id IS NULL
        ORDER BY created_at DESC
        LIMIT 1000 
      ) m
    ),
    'group_messages', (
      SELECT COALESCE(json_agg(m), '[]'::json)
      FROM (
        SELECT msg.* 
        FROM messages msg
        JOIN group_members gm ON msg.group_id = gm.group_id
        WHERE gm.user_id = _user_id
        AND msg.group_id IS NOT NULL
        ORDER BY msg.created_at DESC
        LIMIT 1000 
      ) m
    ),
    'settings', (
      SELECT COALESCE(json_agg(cs), '[]'::json)
      FROM chat_settings cs
      WHERE cs.user_id = _user_id
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
`;

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
  const [chats, setChats] = useState<Chat[]>([]);
  
  const [isDatabaseError, setIsDatabaseError] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string>("");
  const [sqlCopied, setSqlCopied] = useState(false);

  // Refs for logic that needs current state inside callbacks
  const chatsRef = useRef<Chat[]>([]);
  useEffect(() => { chatsRef.current = chats; }, [chats]);
  const userProfileRef = useRef<UserProfile | null>(null);
  const presenceChannelRef = useRef<any | null>(null);

  // Audio Context Ref (Better for iOS)
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [tempChatUser, setTempChatUser] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // CHANGED: Stores an array of names for each chat
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  
  // Theme state with localStorage persistence
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES_CONFIG>(() => {
      const saved = localStorage.getItem('vellor_theme');
      return (saved && THEMES_CONFIG[saved as keyof typeof THEMES_CONFIG]) ? (saved as keyof typeof THEMES_CONFIG) : 'crimson';
  });
  
  // Call State
  const [callData, setCallData] = useState<CallSession | null>(null);
  
  // CHANGED: onlineUsers is now a Map to store specific status (online/away/dnd)
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserStatus>>(new Map());

  const [userProfile, setUserProfile] = useState<UserProfile>({ 
    id: '', name: '', phone: '', bio: '', username: '', avatar: '', status: 'online', isAdmin: false, isVerified: false, isBanned: false, created_at: new Date().toISOString()
  });
  
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('vellor_settings');
    const defaults = { sound: true, notifications: true, pulsing: true, liteMode: false, notificationSound: 'default' };
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return { ...defaults, ...parsed };
  });

  // Create a ref for settings to avoid stale closures in event listeners
  const settingsRef = useRef(settings);
  useEffect(() => {
      settingsRef.current = settings;
  }, [settings]);

  // Apply Lite Mode Class
  useEffect(() => {
    if (settings.liteMode) {
      document.body.classList.add('lite-mode');
    } else {
      document.body.classList.remove('lite-mode');
    }
  }, [settings.liteMode]);

  // --- GLOBAL ESCAPE KEY HANDLER ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (activeChatId) {
                setActiveChatId(null);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeChatId]);

  // --- AUDIO SYSTEM (iOS Compatible) ---
  const initAudioContext = () => {
      if (!audioContextRef.current) {
          const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
          if (AudioContextClass) {
              audioContextRef.current = new AudioContextClass();
          }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
      }
  };

  useEffect(() => {
    const unlockAudio = () => {
        initAudioContext();
        if (audioContextRef.current) {
            const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            source.start(0);
        }
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    return () => {
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    }
  }, []);

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
          try {
              audioBuffer = await loadBuffer(url);
          } catch (e) {
              if (fallbackUrl) {
                  audioBuffer = await loadBuffer(fallbackUrl);
              } else {
                  throw e;
              }
          }

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.loop = loop;
          source.start(0);
          return source;
      } catch (e) {
          console.error("Audio Play Failed:", e);
      }
  };

  const playNotificationSound = async () => {
      if (!settingsRef.current.notifications) return; // Also check notification specific setting
      const currentSettings = settingsRef.current;
      const soundDef = NOTIFICATION_SOUNDS.find(s => s.id === currentSettings.notificationSound) || NOTIFICATION_SOUNDS[0];
      await playSound(soundDef.url, soundDef.fallback);
  };

  const startRingtone = async () => {
      if (ringtoneSourceRef.current) return;
      const source = await playSound(CALL_RINGTONE_URL, CALL_RINGTONE_FALLBACK, true);
      if (source) {
          ringtoneSourceRef.current = source;
      }
  };

  const stopRingtone = () => {
      if (ringtoneSourceRef.current) {
          try { ringtoneSourceRef.current.stop(); } catch(e) {}
          ringtoneSourceRef.current = null;
      }
  };

  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean; icon?: string }>({ 
    message: '', type: 'info', visible: false 
  });

  const showToast = (message: string, type: ToastType = 'info', icon?: string) => {
    setToast({ message, type, visible: true, icon });
  };

  const requestNotificationPermission = useCallback(async () => {
      if (!("Notification" in window)) return;
      if (Notification.permission === 'granted') return;
      if (Notification.permission === 'default') {
          showToast("Включите уведомления, чтобы не пропускать сообщения", "info");
          try {
              await Notification.requestPermission();
          } catch (e) {
              console.error("Permission request failed", e);
          }
      }
  }, []);

  const sendBrowserNotification = (title: string, body: string, icon?: string) => {
      const currentSettings = settingsRef.current;
      if (currentSettings.notifications && "Notification" in window && Notification.permission === "granted") {
          try {
              new Notification(title, {
                  body,
                  icon: icon || 'https://via.placeholder.com/128',
                  silent: !currentSettings.sound, 
                  tag: 'vellor-msg'
              });
          } catch (e) {
              console.error("Notification failed", e);
          }
      }
  };

  useEffect(() => {
      if (appState === 'app') {
          requestNotificationPermission();
      }
  }, [appState, requestNotificationPermission]);

  const handleSplashComplete = async () => {
    try {
      const { data: { session } } = await (supabase.auth as any).getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
           setUserProfile({
              id: profile.id, name: profile.full_name, username: profile.username, avatar: profile.avatar_url,
              phone: session.user.email || '', bio: profile.bio || '', status: 'online', 
              isAdmin: profile.is_admin || false, isVerified: profile.is_verified || false,
              isBanned: profile.is_banned || false,
              created_at: profile.created_at,
              // Map privacy fields if they exist in DB, default to 'everybody'
              privacy_phone: profile.privacy_phone,
              privacy_last_seen: profile.privacy_last_seen,
              privacy_avatar: profile.privacy_avatar,
              privacy_forwards: profile.privacy_forwards,
              privacy_calls: profile.privacy_calls,
              privacy_groups: profile.privacy_groups
           });
           setAppState('app');
        } else { setAppState('auth'); }
      } else { setAppState('auth'); }
    } catch (e) { setAppState('auth'); }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update Theme & Save to LocalStorage
  useEffect(() => {
    const root = document.documentElement;
    const theme = THEMES_CONFIG[currentTheme];
    Object.entries(theme).forEach(([key, val]) => { 
        if (key !== 'wallpaper') root.style.setProperty(key, val as string); 
    });
    localStorage.setItem('vellor_theme', currentTheme);
  }, [currentTheme]);

  // --- PRESENCE LOGIC (FIXED & IMPROVED) ---
  useEffect(() => {
    if (appState !== 'app' || !userProfile.id || isDatabaseError) return;

    const channel = supabase.channel('global_presence', {
      config: { presence: { key: userProfile.id } }
    });

    presenceChannelRef.current = channel;

    const handleBeforeUnload = async () => {
       await channel.untrack();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const newOnlineMap = new Map<string, UserStatus>();
        
        Object.entries(state).forEach(([key, value]) => {
            const presenceData = value[0] as any;
            if (key !== userProfile.id) {
                // Ensure we get the status from the payload
                newOnlineMap.set(key, presenceData?.status || 'online');
            }
        });
        setOnlineUsers(newOnlineMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
         if (key === userProfile.id) return;
         setOnlineUsers(prev => {
             const next = new Map(prev);
             // Ensure robust status check
             const status = (newPresences[0] as any)?.status || 'online';
             next.set(key, status);
             return next;
         });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
         setOnlineUsers(prev => {
             const next = new Map(prev);
             next.delete(key);
             return next;
         });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString(), user_id: userProfile.id, status: 'online' });
        }
      });

    return () => { 
        window.removeEventListener('beforeunload', handleBeforeUnload);
        channel.untrack();
        supabase.removeChannel(channel); 
        presenceChannelRef.current = null; 
    };
  }, [appState, userProfile.id, isDatabaseError]);

  // --- SYSTEM BROADCAST LISTENER ---
  useEffect(() => {
      if (appState !== 'app' || isDatabaseError) return;
      
      const channel = supabase.channel('global_system');
      
      channel.on('broadcast', { event: 'system_alert' }, ({ payload }) => {
          const { message, title } = payload;
          showToast(message, 'info', 'https://cdn.lucide.dev/icon/radio.svg');
          sendBrowserNotification(title || 'SYSTEM BROADCAST', message);
          playNotificationSound();
      }).subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [appState, isDatabaseError]);

  // --- TYPING BROADCAST LISTENER ---
  useEffect(() => {
      if (appState !== 'app' || !userProfile.id) return;
      const channel = supabase.channel('global_typing');
      
      channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (payload.userId === userProfile.id) return; // Ignore self
          
          setTypingUsers(prev => {
              const currentList = prev[payload.chatId] || [];
              let newList = [...currentList];
              
              if (payload.isTyping) {
                  if (!newList.includes(payload.name)) {
                      newList.push(payload.name);
                  }
              } else {
                  newList = newList.filter(name => name !== payload.name);
              }
              
              return { ...prev, [payload.chatId]: newList };
          });
      }).subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [appState, userProfile.id]);

  const handleSendTypingSignal = async (isTyping: boolean) => {
      if (!activeChatId) return;
      await supabase.channel('global_typing').send({ 
          type: 'broadcast', 
          event: 'typing', 
          payload: { chatId: activeChatId, userId: userProfile.id, name: userProfile.name, isTyping } 
      });
  };

  // --- SIGNALING ---
  useEffect(() => {
    if (appState !== 'app' || !userProfile.id) return;
    const mySignalingChannel = supabase.channel(`signaling:${userProfile.id}`);
    mySignalingChannel
        .on('broadcast', { event: 'call-request' }, async ({ payload }) => {
            const { data: callerProfile } = await supabase.from('profiles').select('*').eq('id', payload.callerId).single();
            if (callerProfile) {
                setCallData({
                    state: 'incoming', type: payload.type, partnerId: callerProfile.id,
                    partnerName: callerProfile.full_name, partnerAvatar: callerProfile.avatar_url, isCaller: false
                });
                startRingtone();
            }
        })
        .subscribe();
    
    return () => { 
        supabase.removeChannel(mySignalingChannel); 
        stopRingtone();
    };
  }, [appState, userProfile.id]);

  useEffect(() => {
      if (!callData || callData.state === 'connected' || callData.state === 'ended') {
          stopRingtone();
      }
  }, [callData]);

  useEffect(() => {
    if (appState !== 'app' || !userProfile.id) return;
    const handleVisibilityChange = async () => {
        const newStatus: UserStatus = document.hidden ? 'away' : 'online';
        setUserProfile(prev => ({ ...prev, status: newStatus }));
        if (presenceChannelRef.current) await presenceChannelRef.current.track({ online_at: new Date().toISOString(), user_id: userProfile.id, status: newStatus });
        await supabase.from('profiles').update({ status: newStatus }).eq('id', userProfile.id);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [appState, userProfile.id]);

  // --- FETCH DATA (OPTIMIZED) ---
  const fetchChats = useCallback(async () => {
    if (!userProfile.id) return;
    try {
        const { data, error } = await supabase.rpc('get_my_messenger_data');
        if (error) { setErrorDetail(error.message); setIsDatabaseError(true); return; }

        const groups = data.groups || [];
        const allMessages = [...(data.private_messages || []), ...(data.group_messages || [])];
        const chatSettings = data.settings || [];
        const settingsMap = new Map();
        chatSettings.forEach((s: any) => settingsMap.set(s.partner_id, s));

        const chatsMap = new Map<string, Chat>();

        groups.forEach((g: any) => {
            const s = settingsMap.get(g.id);
            chatsMap.set(g.id, {
                id: g.id,
                user: { 
                    id: g.id, 
                    name: g.name, 
                    avatar: g.avatar_url, 
                    status: 'online', 
                    isGroup: true, 
                    username: 'group',
                    created_at: g.created_at, 
                    bio: g.description 
                },
                messages: [], unreadCount: 0, hasStory: false, lastMessage: {} as Message,
                isPinned: s?.is_pinned || false, isMuted: s?.is_muted || false,
                ownerId: g.created_by,
                lastReadAt: g.last_read_at // Capture Last Read for Group
            });
        });

        const partnerIds = new Set<string>();
        (data.private_messages || []).forEach((m: any) => {
            const pid = m.sender_id === userProfile.id ? m.receiver_id : m.sender_id;
            if (pid) partnerIds.add(pid);
        });
        partnerIds.delete(userProfile.id);

        if (partnerIds.size > 0) {
            const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(partnerIds));
            profiles?.forEach(p => {
                const pid = p.id;
                const s = settingsMap.get(pid);
                chatsMap.set(pid, {
                    id: pid,
                    user: { 
                        id: pid, name: p.full_name, avatar: p.avatar_url, status: p.status || 'offline', 
                        username: p.username, isGroup: false, isVerified: p.is_verified, bio: p.bio, email: p.email, created_at: p.created_at 
                    },
                    messages: [], unreadCount: 0, hasStory: false, lastMessage: {} as Message,
                    isPinned: s?.is_pinned || false, isMuted: s?.is_muted || false,
                    lastReadAt: null // DMs use is_read boolean
                });
            });
        }

        allMessages.forEach((msg: any) => {
            const chatId = msg.group_id || (msg.sender_id === userProfile.id ? msg.receiver_id : msg.sender_id);
            const chat = chatsMap.get(chatId);
            if (chat) {
                const isMe = msg.sender_id === userProfile.id;
                const m: Message = { 
                  id: msg.id, senderId: isMe ? 'me' : msg.sender_id, text: msg.content || '', 
                  type: msg.type as MessageType, timestamp: new Date(msg.created_at), isRead: msg.is_read,
                  mediaUrl: msg.media_url, isPinned: msg.is_pinned, isEdited: msg.is_edited,
                  duration: msg.duration, fileName: msg.file_name, fileSize: msg.file_size,
                  groupId: msg.group_id,
                  reactions: msg.reactions || [],
                  replyToId: msg.reply_to_id
                };
                if (!chat.messages.some(ex => ex.id === m.id)) chat.messages.push(m);
                if (!chat.lastMessage.timestamp || m.timestamp > chat.lastMessage.timestamp) chat.lastMessage = m;
                
                // UNREAD LOGIC FIX
                if (!isMe) {
                    if (chat.user.isGroup) {
                        // For groups: check if message time > last_read_at
                        if (!chat.lastReadAt || new Date(msg.created_at) > new Date(chat.lastReadAt)) {
                            chat.unreadCount += 1;
                        }
                    } else {
                        // For DMs: use standard boolean
                        if (!msg.is_read) chat.unreadCount += 1;
                    }
                }
            }
        });

        // Sort: Pinned first, then by date
        for (const chat of chatsMap.values()) {
            chat.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        }

        setChats(Array.from(chatsMap.values()).sort((a,b) => {
            // STRICT SORTING PRIORITY: PINNED > DATE
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return (b.lastMessage?.timestamp?.getTime() || 0) - (a.lastMessage?.timestamp?.getTime() || 0);
        }));
        setIsDatabaseError(false);
    } catch (e) { setIsDatabaseError(true); }
  }, [userProfile.id]);

  useEffect(() => { if (appState === 'app' && userProfile.id) fetchChats(); }, [appState, userProfile.id, fetchChats]);

  const handleRealtimePayload = useCallback((payload: any) => { 
      if (payload.eventType === 'INSERT' && payload.table === 'messages') {
          const newMsg = payload.new;
          const myId = userProfileRef.current?.id;
          const isMine = newMsg.sender_id === myId;
          const isForMe = newMsg.receiver_id === myId;
          const isMyGroup = newMsg.group_id && chatsRef.current.some(c => c.id === newMsg.group_id);

          if (!isMine && !isForMe && !isMyGroup) return;

          const chatId = newMsg.group_id || (isMine ? newMsg.receiver_id : newMsg.sender_id);
          const chat = chatsRef.current.find(c => c.id === chatId);

          if (!isMine && chat && !chat.isMuted) { 
              playNotificationSound();
              const senderName = chat?.user.isGroup ? `${chat.user.name}` : (chat?.user.name || 'Новое сообщение');
              const notificationText = newMsg.type === 'image' ? 'Фото' : newMsg.type === 'audio' ? 'Голосовое' : newMsg.type === 'system' ? newMsg.content : newMsg.content;
              showToast(`${senderName}: ${notificationText}`, "info", chat?.user.avatar);
              sendBrowserNotification(senderName, notificationText, chat?.user.avatar);
          }

          setChats(prevChats => {
             const chatIndex = prevChats.findIndex(c => c.id === chatId);
             if (chatIndex === -1) { fetchChats(); return prevChats; }
             
             const updatedChats = [...prevChats];
             const chat = { ...updatedChats[chatIndex] };
             
             const message: Message = {
                 id: newMsg.id, senderId: isMine ? 'me' : newMsg.sender_id, text: newMsg.content || '',
                 type: newMsg.type, timestamp: new Date(newMsg.created_at), isRead: newMsg.is_read, 
                 mediaUrl: newMsg.media_url, isPinned: newMsg.is_pinned, isEdited: newMsg.is_edited,
                 duration: newMsg.duration, fileName: newMsg.file_name, fileSize: newMsg.file_size,
                 groupId: newMsg.group_id, reactions: newMsg.reactions || [], replyToId: newMsg.reply_to_id
             };

             if (!chat.messages.some(m => m.id === message.id)) {
                 chat.messages = [...chat.messages, message];
                 chat.lastMessage = message;
                 if (!isMine) chat.unreadCount += 1;
             }
             
             updatedChats[chatIndex] = chat;
             
             // STRICT RE-SORTING ON EVERY MESSAGE INSERT
             return updatedChats.sort((a,b) => {
                 if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                 return (b.lastMessage?.timestamp?.getTime() || 0) - (a.lastMessage?.timestamp?.getTime() || 0);
             });
          });
      } 
      else if (payload.eventType === 'UPDATE' && payload.table === 'messages') {
          setChats(prev => prev.map(c => {
              const updatedMessages = c.messages.map(m => {
                  if (m.id === payload.new.id) {
                      return {
                          ...m, isRead: payload.new.is_read, isPinned: payload.new.is_pinned,
                          isEdited: payload.new.is_edited, text: payload.new.content || m.text,
                          reactions: payload.new.reactions || m.reactions
                      };
                  }
                  return m;
              });
              return { ...c, messages: updatedMessages };
          }));
      } 
      else if (payload.eventType === 'DELETE' && payload.table === 'messages') {
          setChats(prev => prev.map(c => ({ ...c, messages: c.messages.filter(m => m.id !== payload.old.id) })));
      }
      else if (payload.eventType === 'UPDATE' && payload.table === 'profiles') {
          const updatedProfile = payload.new;
          if (updatedProfile.id === userProfileRef.current?.id) {
              const currentProfile = userProfileRef.current;
              if (!currentProfile) return;
              if (!currentProfile.isVerified && updatedProfile.is_verified) {
                  showToast("Аккаунт верифицирован!", "success");
              }
              // Check for Ban
              if(updatedProfile.is_banned && !currentProfile.isBanned) {
                  // User just got banned
              }
              
              setUserProfile(prev => ({ 
                  ...prev, 
                  name: updatedProfile.full_name, 
                  username: updatedProfile.username, 
                  bio: updatedProfile.bio, 
                  avatar: updatedProfile.avatar_url, 
                  isAdmin: updatedProfile.is_admin, 
                  isVerified: updatedProfile.is_verified,
                  isBanned: updatedProfile.is_banned
              }));
          } else {
             setChats(prev => prev.map(c => {
                 if (c.user.id === updatedProfile.id) {
                     return { ...c, user: { ...c.user, name: updatedProfile.full_name, username: updatedProfile.username, avatar: updatedProfile.avatar_url, isVerified: updatedProfile.is_verified, bio: updatedProfile.bio, email: updatedProfile.email } };
                 }
                 return c;
             }));
          }
      }
  }, [fetchChats]);

  // Separate Effect to handle Group Updates (Description changes)
  const handleUpdateGroup = useCallback((updatedGroup: any) => {
      setChats(prev => prev.map(c => {
          if (c.id === updatedGroup.id) {
              return {
                  ...c,
                  user: {
                      ...c.user,
                      name: updatedGroup.name,
                      avatar: updatedGroup.avatar_url,
                      bio: updatedGroup.description // Map description to bio
                  }
              };
          }
          return c;
      }));
  }, []);

  useEffect(() => {
    if (appState !== 'app' || !userProfile.id || isDatabaseError) return;
    const channel = supabase.channel('updates');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, handleRealtimePayload);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, (payload: any) => {
        fetchChats();
    });
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'groups' }, (payload: any) => {
        setChats(prev => prev.filter(c => c.id !== payload.old.id));
        if (activeChatId === payload.old.id) setActiveChatId(null);
    });
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'groups' }, (payload: any) => {
        handleUpdateGroup(payload.new);
    });

    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, handleRealtimePayload);
    
    // Listen for Chat Setting changes (Pin/Mute) from other devices
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'chat_settings' }, (payload: any) => {
        if (payload.new?.user_id === userProfile.id || payload.old?.user_id === userProfile.id) fetchChats();
    });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [appState, userProfile.id, handleRealtimePayload, isDatabaseError, fetchChats, activeChatId, handleUpdateGroup]);

  const sendMessage = async (chatId: string, text: string, type: MessageType = 'text', mediaUrl?: string, duration?: string, fileName?: string, fileSize?: string, replyToId?: string) => {
    const isGroup = chats.find(c => c.id === chatId)?.user.isGroup;
    const payload: any = { 
        sender_id: userProfile.id, content: text || '', type: type,
        media_url: mediaUrl || null, duration: duration || null,
        file_name: fileName || null, file_size: fileSize || null,
        reply_to_id: replyToId || null,
        created_at: new Date().toISOString()
    };
    if (isGroup) { payload.group_id = chatId; payload.receiver_id = null; } 
    else { payload.receiver_id = chatId; }

    const { error } = await supabase.from('messages').insert(payload);
    if (error) { console.error("Send Error", error); showToast("Не удалось отправить сообщение.", "error"); }
  };

  const handleStartCall = async (chatId: string, type: CallType) => {
      const chat = chats.find(c => c.id === chatId);
      if (!chat) return;
      if (chat.user.isGroup) { showToast("Звонки в группах пока недоступны", "warning"); return; }
      setCallData({ state: 'calling', type, partnerId: chatId, partnerName: chat.user.name, partnerAvatar: chat.user.avatar, isCaller: true });
      await supabase.channel(`signaling:${chatId}`).send({ type: 'broadcast', event: 'call-request', payload: { callerId: userProfile.id, type } });
  };

  const handleChatAction = async (chatId: string, action: 'pin' | 'mute' | 'delete') => {
      if (action === 'delete') {
          setChats(prev => prev.filter(c => c.id !== chatId));
          if (activeChatId === chatId) setActiveChatId(null);
          return;
      }

      const chat = chats.find(c => c.id === chatId);
      if (!chat) return;

      const isPinned = action === 'pin' ? !chat.isPinned : chat.isPinned;
      const isMuted = action === 'mute' ? !chat.isMuted : chat.isMuted;

      // Optimistic Update WITH SORTING
      setChats(prev => {
          const mapped = prev.map(c => {
              if (c.id === chatId) return { ...c, isPinned, isMuted };
              return c;
          });
          // Sort Pinned > Date
          return mapped.sort((a,b) => {
              if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
              return (b.lastMessage?.timestamp?.getTime() || 0) - (a.lastMessage?.timestamp?.getTime() || 0);
          });
      });

      const { error } = await supabase.from('chat_settings').upsert({
          user_id: userProfile.id,
          partner_id: chatId,
          is_pinned: isPinned,
          is_muted: isMuted
      });

      if (error) {
          console.error("Chat Action Error", error);
          showToast("Ошибка сохранения настроек чата", "error");
          // Revert optimistic update
          fetchChats(); 
      } else {
          showToast(action === 'pin' ? (isPinned ? 'Чат закреплен' : 'Чат откреплен') : (isMuted ? 'Уведомления выключены' : 'Уведомления включены'), "success");
      }
  };

  const handleDeleteGroup = async (groupId: string) => {
      if (!confirm("Внимание! Вы удаляете группу. Это действие необратимо и удалит чат у всех участников.")) return;
      
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) {
          console.error("Delete Group Error", error);
          showToast("Ошибка удаления группы", "error");
      } else {
          showToast("Группа удалена", "success");
          setChats(prev => prev.filter(c => c.id !== groupId));
          setActiveChatId(null);
      }
  };

  const handleLeaveGroup = async (groupId: string) => {
      if (!confirm("Вы действительно хотите покинуть эту группу?")) return;

      await sendMessage(groupId, `${userProfile.name} покинул(а) группу`, 'system');
      
      const { error } = await supabase.from('group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', userProfile.id);

      if (error) {
          showToast("Не удалось выйти из группы", "error");
      } else {
          setChats(prev => prev.filter(c => c.id !== groupId));
          setActiveChatId(null);
          showToast("Вы покинули группу", "success");
      }
  };

  // Group Update Handler (Description)
  const handleUpdateGroupInfo = async (groupId: string, newDescription: string) => {
      try {
          const { error } = await supabase.from('groups').update({ description: newDescription }).eq('id', groupId);
          if (error) throw error;
          showToast("Информация о группе обновлена", "success");
      } catch(e) {
          console.error(e);
          showToast("Ошибка обновления", "error");
      }
  };

  const handleEditMessage = async (id: string, newText: string) => await supabase.from('messages').update({ content: newText, is_edited: true }).eq('id', id);
  const handleDeleteMessage = async (id: string) => await supabase.from('messages').delete().eq('id', id);
  const handlePinMessage = async (id: string, currentStatus: boolean) => await supabase.from('messages').update({ is_pinned: !currentStatus }).eq('id', id);

  const handleMarkAsRead = async (chatId: string) => {
      if (!userProfile.id) return;
      const isGroup = chats.find(c => c.id === chatId)?.user.isGroup;

      setChats(prev => prev.map(c => {
          if (c.id === chatId) return { ...c, unreadCount: 0, messages: c.messages.map(m => m.senderId !== 'me' ? { ...m, isRead: true } : m) };
          return c;
      }));

      if (isGroup) {
          await supabase.from('group_members').update({ last_read_at: new Date().toISOString() }).eq('group_id', chatId).eq('user_id', userProfile.id);
      } else {
          await supabase.from('messages').update({ is_read: true }).eq('receiver_id', userProfile.id).eq('sender_id', chatId).eq('is_read', false);
      }
  };

  const handleUpdateStatus = async (status: UserStatus) => {
      setUserProfile(prev => ({ ...prev, status }));
      if (presenceChannelRef.current) await presenceChannelRef.current.track({ online_at: new Date().toISOString(), user_id: userProfile.id, status: status });
      await supabase.from('profiles').update({ status }).eq('id', userProfile.id);
  };
  
  const handleSaveProfile = async (updatedProfile: UserProfile) => {
      try {
          const { error } = await supabase.from('profiles').update({
              full_name: updatedProfile.name,
              username: updatedProfile.username,
              bio: updatedProfile.bio,
              // Privacy Settings update
              privacy_phone: updatedProfile.privacy_phone,
              privacy_last_seen: updatedProfile.privacy_last_seen,
              privacy_avatar: updatedProfile.privacy_avatar,
              privacy_forwards: updatedProfile.privacy_forwards,
              privacy_calls: updatedProfile.privacy_calls,
              privacy_groups: updatedProfile.privacy_groups
          }).eq('id', updatedProfile.id);

          if (error) {
              if (error.code === '23505') { 
                   showToast("Этот юзернейм уже занят", "error");
              } else {
                   showToast("Ошибка сохранения профиля", "error");
              }
          } else {
              showToast("Профиль сохранен", "success");
              setUserProfile(updatedProfile);
          }
      } catch (e) { showToast("Ошибка соединения", "error"); }
  };

  // Broadcast function for Admin (via System Channel)
  const handleBroadcast = async (message: string) => {
      const channel = supabase.channel('global_system');
      channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              await channel.send({
                  type: 'broadcast',
                  event: 'system_alert',
                  payload: { message, title: 'SYSTEM BROADCAST' }
              });
              supabase.removeChannel(channel);
          }
      });
  };

  const retryConnection = () => {
      setIsDatabaseError(false);
      fetchChats();
  };

  const activeChat = chats.find(c => c.id === activeChatId) || (tempChatUser?.id === activeChatId ? { id: activeChatId, user: tempChatUser, messages: [], unreadCount: 0, lastMessage: {} as Message } : null);

  // BANNED SCREEN
  if (userProfile.isBanned) {
      return (
          <div className="fixed inset-0 flex items-center justify-center bg-black text-white z-[9999]">
              <div className="text-center p-8 bg-white/5 border border-red-500/30 rounded-3xl max-w-sm">
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                      <Lock size={40} className="text-red-500" />
                  </div>
                  <h1 className="text-2xl font-black uppercase tracking-widest text-red-500 mb-2">Access Denied</h1>
                  <p className="text-sm text-white/60 leading-relaxed mb-6">
                      Ваш аккаунт был заблокирован администратором за нарушение правил сообщества.
                  </p>
                  <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                      Попробовать снова
                  </button>
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
                          <div className="bg-black/50 rounded-xl p-4 border border-red-500/20 max-w-[320px] mx-auto text-left mb-6">
                              <pre className="text-[9px] text-white/50 font-mono overflow-x-auto whitespace-pre-wrap break-all bg-black p-3 rounded-lg h-32 custom-scrollbar">{SQL_FIX_SCRIPT}</pre>
                          </div>
                          <div className="flex gap-2 justify-center">
                              <button onClick={() => { navigator.clipboard.writeText(SQL_FIX_SCRIPT); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000); }} className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-white/5">{sqlCopied ? <Check size={14} className="text-green-500"/> : <Copy size={14} />} {sqlCopied ? 'Скопировано' : 'Копировать'}</button>
                              <button onClick={retryConnection} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-white/5"><RefreshCw size={14} /> Обновить</button>
                          </div>
                      </div>
                  </div>
              ) : (
                  <ChatList chats={chats} activeChatId={activeChatId} onSelectChat={(id, u) => { if (u && !chats.some(c=>c.id===id)) setTempChatUser({id, ...u}); setActiveChatId(id); }} userProfile={userProfile} onUpdateProfile={(p) => setUserProfile(p)} onSetTheme={(theme) => setCurrentTheme(theme as keyof typeof THEMES_CONFIG)} currentThemeId={currentTheme} settings={settings} onUpdateSettings={(s) => {setSettings(s); localStorage.setItem('vellor_settings', JSON.stringify(s));}} onUpdateStatus={handleUpdateStatus} typingUsers={typingUsers} onChatAction={handleChatAction} showToast={showToast} onlineUsers={onlineUsers} onSaveProfile={handleSaveProfile} onBroadcast={userProfile.isAdmin ? handleBroadcast : undefined} />
              )}
            </div>
            <div className={`flex-1 h-full bg-black/10 relative ${isMobile && !activeChatId ? 'hidden' : 'block'}`}>
              {activeChat && !isDatabaseError ? (
                <ChatWindow chat={activeChat as Chat} myId={userProfile.id} onBack={() => setActiveChatId(null)} isMobile={isMobile} onSendMessage={sendMessage} markAsRead={handleMarkAsRead} onStartCall={handleStartCall} isPartnerTyping={false} onSendTypingSignal={handleSendTypingSignal} wallpaper={THEMES_CONFIG[currentTheme].wallpaper} onEditMessage={handleEditMessage} onDeleteMessage={handleDeleteMessage} onPinMessage={handlePinMessage} onlineUsers={onlineUsers} showToast={showToast} onLeaveGroup={handleLeaveGroup} onDeleteGroup={handleDeleteGroup} typingUserNames={typingUsers[activeChat.id] || []} onUpdateGroupInfo={handleUpdateGroupInfo} />
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
