
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
import { AlertTriangle, ServerCrash, RefreshCw, Copy, Check, Terminal, ShieldAlert, Zap, Database } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { NOTIFICATION_SOUND_URL } from './constants';

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

const CALL_RINGTONE = "https://cdn.freesound.org/previews/344/344153_5723683-lq.mp3"; 

const SQL_FIX_SCRIPT = `-- OPTIMIZED SCRIPT (Fixes Warnings & Adds Reactions)
-- Run in Supabase SQL Editor

-- 1. CLEANUP: Drop Function first
DROP FUNCTION IF EXISTS get_my_messenger_data();

-- 2. CLEANUP: Drop ALL existing policies to fix warnings
DROP POLICY IF EXISTS "Enable all for groups" ON groups;
DROP POLICY IF EXISTS "Enable all for members" ON group_members;
DROP POLICY IF EXISTS "Enable all for messages" ON messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON groups;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON groups;

-- 3. SCHEMA: Ensure columns exist (Idempotent)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_members' AND column_name = 'is_admin') THEN
    ALTER TABLE group_members ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'group_id') THEN
    ALTER TABLE messages ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_members' AND column_name = 'last_read_at') THEN
    ALTER TABLE group_members ADD COLUMN last_read_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'reactions') THEN
    ALTER TABLE messages ADD COLUMN reactions JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;

-- 4. RLS: Re-enable and set SINGLE consolidated policy per table
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for groups" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for members" ON group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for messages" ON messages FOR ALL USING (true) WITH CHECK (true);

-- 5. REALTIME: Safe addition
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE group_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE groups; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 6. FUNCTION: Optimized logic with SECURITY DEFINER
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
      FROM messages m
      WHERE (m.sender_id = _user_id OR m.receiver_id = _user_id)
      AND m.group_id IS NULL
    ),
    'group_messages', (
      SELECT COALESCE(json_agg(t), '[]'::json)
      FROM (
        SELECT m.id, m.sender_id, m.group_id, m.content, m.created_at, m.type,
               m.media_url, m.is_pinned, m.is_edited, m.file_name, m.file_size, m.duration,
               m.reactions,
               CASE 
                 WHEN m.sender_id = _user_id THEN false 
                 WHEN m.created_at <= gm.last_read_at THEN true
                 ELSE false
               END as is_read
        FROM messages m
        JOIN group_members gm ON m.group_id = gm.group_id
        WHERE gm.user_id = _user_id
        AND m.group_id IS NOT NULL
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. REFRESH
NOTIFY pgrst, 'reload config';
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
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [tempChatUser, setTempChatUser] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES_CONFIG>('crimson');
  
  // Call State
  const [callData, setCallData] = useState<CallSession | null>(null);
  
  // CHANGED: onlineUsers is now a Map to store specific status (online/away/dnd)
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserStatus>>(new Map());

  const [userProfile, setUserProfile] = useState<UserProfile>({ 
    id: '', name: '', phone: '', bio: '', username: '', avatar: '', status: 'online' 
  });
  
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('vellor_settings');
    // Default pulsing to true if not present
    return saved ? { pulsing: true, ...JSON.parse(saved) } : { sound: true, notifications: true, pulsing: true };
  });

  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean; icon?: string }>({ 
    message: '', type: 'info', visible: false 
  });

  const showToast = (message: string, type: ToastType = 'info', icon?: string) => {
    setToast({ message, type, visible: true, icon });
  };

  const playNotificationSound = () => {
      if (!settings.sound) return;
      try {
          const audio = new Audio(NOTIFICATION_SOUND_URL);
          audio.volume = 0.6;
          audio.play().catch(e => console.warn("Audio play blocked (interaction required)", e));
      } catch (e) {
          console.error("Audio error", e);
      }
  };

  // --- NOTIFICATION PERMISSIONS ---
  const requestNotificationPermission = useCallback(async () => {
      if (!("Notification" in window)) return;
      
      if (Notification.permission === 'default') {
          showToast("Пожалуйста, разрешите уведомления, чтобы не пропускать сообщения", "info");
          try {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                  showToast("Уведомления успешно включены!", "success");
              }
          } catch (e) {
              console.error("Permission request failed", e);
          }
      }
  }, []);

  const sendBrowserNotification = (title: string, body: string, icon?: string) => {
      if (settings.notifications && "Notification" in window && Notification.permission === "granted") {
          try {
              new Notification(title, {
                  body,
                  icon: icon || 'https://via.placeholder.com/128',
                  silent: !settings.sound // Mute if sound is off in app settings, let app handle sound
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
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
           setUserProfile({
              id: profile.id, name: profile.full_name, username: profile.username, avatar: profile.avatar_url,
              phone: session.user.email || '', bio: profile.bio || '', status: 'online'
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

  useEffect(() => {
    const root = document.documentElement;
    const theme = THEMES_CONFIG[currentTheme];
    Object.entries(theme).forEach(([key, val]) => { 
        if (key !== 'wallpaper') root.style.setProperty(key, val as string); 
    });
  }, [currentTheme]);

  // --- PRESENCE LOGIC ---
  useEffect(() => {
    if (appState !== 'app' || !userProfile.id || isDatabaseError) return;

    const channel = supabase.channel('global_presence', {
      config: { presence: { key: userProfile.id } }
    });

    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const newOnlineMap = new Map<string, UserStatus>();
        Object.entries(state).forEach(([key, value]) => {
            const presenceData = value[0] as any;
            newOnlineMap.set(key, presenceData?.status || 'online');
        });
        setOnlineUsers(newOnlineMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
         setOnlineUsers(prev => {
             const next = new Map(prev);
             next.set(key, (newPresences[0] as any)?.status || 'online');
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

    return () => { supabase.removeChannel(channel); presenceChannelRef.current = null; };
  }, [appState, userProfile.id, isDatabaseError]);

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
                try {
                    const audio = new Audio(CALL_RINGTONE);
                    audio.loop = true;
                    (window as any).callRingtone = audio;
                    await audio.play().catch(e => console.warn(e));
                } catch(e) {}
            }
        })
        .subscribe();
    return () => { supabase.removeChannel(mySignalingChannel); if ((window as any).callRingtone) (window as any).callRingtone.pause(); };
  }, [appState, userProfile.id]);

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

  // --- FETCH DATA ---
  const fetchChats = useCallback(async () => {
    if (!userProfile.id) return;
    try {
        const { data, error } = await supabase.rpc('get_my_messenger_data');
        if (error) { setErrorDetail(error.message); setIsDatabaseError(true); return; }

        const groups = data.groups || [];
        const allMessages = [...(data.private_messages || []), ...(data.group_messages || [])];
        const { data: chatSettings } = await supabase.from('chat_settings').select('*').eq('user_id', userProfile.id);
        const settingsMap = new Map();
        chatSettings?.forEach(s => settingsMap.set(s.partner_id, s));

        const chatsMap = new Map<string, Chat>();

        groups.forEach((g: any) => {
            const s = settingsMap.get(g.id);
            chatsMap.set(g.id, {
                id: g.id,
                user: { id: g.id, name: g.name, avatar: g.avatar_url, status: 'online', isGroup: true, username: 'group' },
                messages: [], unreadCount: 0, hasStory: false, lastMessage: {} as Message,
                isPinned: s?.is_pinned || false, isMuted: s?.is_muted || false
            });
        });

        const partnerIds = new Set<string>();
        (data.private_messages || []).forEach((m: any) => {
            partnerIds.add(m.sender_id === userProfile.id ? m.receiver_id : m.sender_id);
        });
        partnerIds.delete(userProfile.id);

        if (partnerIds.size > 0) {
            const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(partnerIds));
            profiles?.forEach(p => {
                const pid = p.id;
                const s = settingsMap.get(pid);
                chatsMap.set(pid, {
                    id: pid,
                    user: { id: pid, name: p.full_name, avatar: p.avatar_url, status: p.status || 'offline', username: p.username, isGroup: false },
                    messages: [], unreadCount: 0, hasStory: false, lastMessage: {} as Message,
                    isPinned: s?.is_pinned || false, isMuted: s?.is_muted || false
                });
            });
        }

        allMessages.forEach((msg: any) => {
            const chatId = msg.group_id || (msg.sender_id === userProfile.id ? msg.receiver_id : msg.sender_id);
            const chat = chatsMap.get(chatId);
            if (chat) {
                const isMe = msg.sender_id === userProfile.id;
                // NOTE: msg.is_read comes from RPC for both groups (calculated) and private (column)
                const m: Message = { 
                  id: msg.id, senderId: isMe ? 'me' : msg.sender_id, text: msg.content || '', 
                  type: msg.type as MessageType, timestamp: new Date(msg.created_at), isRead: msg.is_read,
                  mediaUrl: msg.media_url, isPinned: msg.is_pinned, isEdited: msg.is_edited,
                  duration: msg.duration, fileName: msg.file_name, fileSize: msg.file_size,
                  groupId: msg.group_id,
                  reactions: msg.reactions || [] // Map reactions from DB
                };
                if (!chat.messages.some(ex => ex.id === m.id)) chat.messages.push(m);
                if (!chat.lastMessage.timestamp || m.timestamp > chat.lastMessage.timestamp) chat.lastMessage = m;
                if (!isMe && !msg.is_read) chat.unreadCount += 1;
            }
        });

        for (const chat of chatsMap.values()) {
            chat.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        }

        setChats(Array.from(chatsMap.values()).sort((a,b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return (b.lastMessage?.timestamp?.getTime() || 0) - (a.lastMessage?.timestamp?.getTime() || 0);
        }));
        setIsDatabaseError(false);
    } catch (e) { setIsDatabaseError(true); }
  }, [userProfile.id]);

  useEffect(() => { if (appState === 'app' && userProfile.id) fetchChats(); }, [appState, userProfile.id, fetchChats]);

  // --- REALTIME UPDATES ---
  const handleRealtimePayload = useCallback((payload: any) => { 
      // 1. Handle INSERT (New Message)
      if (payload.eventType === 'INSERT' && payload.table === 'messages') {
          const newMsg = payload.new;
          const chatId = newMsg.group_id || (newMsg.sender_id === userProfileRef.current?.id ? newMsg.receiver_id : newMsg.sender_id);
          const isMe = newMsg.sender_id === userProfileRef.current?.id;

          if (!isMe) {
              playNotificationSound();
              
              // Find sender/group info for notification
              const chat = chatsRef.current.find(c => c.id === chatId);
              const senderName = chat?.user.isGroup 
                  ? `${chat.user.name} (Группа)` 
                  : (chat?.user.name || 'Новое сообщение');
              
              const notificationText = newMsg.type === 'image' ? 'Отправил фото' : 
                                       newMsg.type === 'audio' ? 'Голосовое сообщение' : 
                                       newMsg.content;

              // 1. In-App Toast
              showToast(`${senderName}: ${notificationText}`, "info", chat?.user.avatar);

              // 2. Native Browser Notification (if active)
              sendBrowserNotification(senderName, notificationText, chat?.user.avatar);
          }

          setChats(prevChats => {
             const chatIndex = prevChats.findIndex(c => c.id === chatId);
             if (chatIndex === -1) {
                 fetchChats();
                 return prevChats; 
             }
             
             const updatedChats = [...prevChats];
             const chat = { ...updatedChats[chatIndex] };
             
             const message: Message = {
                 id: newMsg.id,
                 senderId: isMe ? 'me' : newMsg.sender_id,
                 text: newMsg.content || '',
                 type: newMsg.type,
                 timestamp: new Date(newMsg.created_at),
                 isRead: newMsg.is_read, 
                 mediaUrl: newMsg.media_url,
                 isPinned: newMsg.is_pinned,
                 isEdited: newMsg.is_edited,
                 duration: newMsg.duration,
                 fileName: newMsg.file_name,
                 fileSize: newMsg.file_size,
                 groupId: newMsg.group_id,
                 reactions: newMsg.reactions || []
             };

             if (!chat.messages.some(m => m.id === message.id)) {
                 chat.messages = [...chat.messages, message];
                 chat.lastMessage = message;
                 if (!isMe) chat.unreadCount += 1;
             }
             
             updatedChats[chatIndex] = chat;
             return updatedChats.sort((a,b) => {
                 if (a.isPinned && !b.isPinned) return -1;
                 if (!a.isPinned && b.isPinned) return 1;
                 return (b.lastMessage?.timestamp?.getTime() || 0) - (a.lastMessage?.timestamp?.getTime() || 0);
             });
          });
      } 
      // 2. Handle UPDATE
      else if (payload.eventType === 'UPDATE' && payload.table === 'messages') {
          setChats(prev => prev.map(c => {
              const updatedMessages = c.messages.map(m => {
                  if (m.id === payload.new.id) {
                      return {
                          ...m,
                          isRead: payload.new.is_read,
                          isPinned: payload.new.is_pinned,
                          isEdited: payload.new.is_edited,
                          text: payload.new.content || m.text,
                          reactions: payload.new.reactions || m.reactions // Sync reactions
                      };
                  }
                  return m;
              });
              return { ...c, messages: updatedMessages };
          }));
      } 
      // 3. Handle DELETE
      else if (payload.eventType === 'DELETE' && payload.table === 'messages') {
          setChats(prev => prev.map(c => ({ ...c, messages: c.messages.filter(m => m.id !== payload.old.id) })));
      }
  }, [fetchChats, settings.notifications, settings.sound]);

  useEffect(() => {
    if (appState !== 'app' || !userProfile.id || isDatabaseError) return;
    const channel = supabase.channel('updates');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, handleRealtimePayload);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, (payload: any) => {
        if (payload.new?.user_id === userProfile.id || payload.old?.user_id === userProfile.id) {
            fetchChats();
        }
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [appState, userProfile.id, handleRealtimePayload, isDatabaseError, fetchChats]);

  // --- ACTIONS ---
  const sendMessage = async (chatId: string, text: string, type: MessageType = 'text', mediaUrl?: string, duration?: string, fileName?: string, fileSize?: string) => {
    const isGroup = chats.find(c => c.id === chatId)?.user.isGroup;
    const payload: any = { 
        sender_id: userProfile.id, content: text || '', type: type,
        media_url: mediaUrl || null, duration: duration || null,
        file_name: fileName || null, file_size: fileSize || null,
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
          await supabase.from('group_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('group_id', chatId)
            .eq('user_id', userProfile.id);
      } else {
          await supabase.from('messages').update({ is_read: true }).eq('receiver_id', userProfile.id).eq('sender_id', chatId).eq('is_read', false);
      }
  };

  const handleUpdateStatus = async (status: UserStatus) => {
      setUserProfile(prev => ({ ...prev, status }));
      if (presenceChannelRef.current) await presenceChannelRef.current.track({ online_at: new Date().toISOString(), user_id: userProfile.id, status: status });
      await supabase.from('profiles').update({ status }).eq('id', userProfile.id);
  };

  const retryConnection = () => {
      setIsDatabaseError(false);
      fetchChats();
  };

  const activeChat = chats.find(c => c.id === activeChatId) || (tempChatUser?.id === activeChatId ? { id: activeChatId, user: tempChatUser, messages: [], unreadCount: 0, lastMessage: {} as Message } : null);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 pointer-events-none transition-all duration-1000 ease-in-out" style={{ background: THEMES_CONFIG[currentTheme].wallpaper, opacity: 1 }} />
      {settings.pulsing && <motion.div key={currentTheme} animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }} className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none z-0" style={{ backgroundColor: THEMES_CONFIG[currentTheme]['--accent'] }} />}
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 w-full h-full flex overflow-hidden bg-transparent" style={{ color: 'var(--text)' }}>
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
                  <ChatList chats={chats} activeChatId={activeChatId} onSelectChat={(id, u) => { if (u && !chats.some(c=>c.id===id)) setTempChatUser({id, ...u}); setActiveChatId(id); }} userProfile={userProfile} onUpdateProfile={(p) => setUserProfile(p)} onSetTheme={(theme) => setCurrentTheme(theme as keyof typeof THEMES_CONFIG)} currentThemeId={currentTheme} settings={settings} onUpdateSettings={(s) => {setSettings(s); localStorage.setItem('vellor_settings', JSON.stringify(s));}} onUpdateStatus={handleUpdateStatus} typingUsers={typingUsers} onChatAction={() => {}} showToast={showToast} onlineUsers={onlineUsers} />
              )}
            </div>
            <div className="flex-1 h-full bg-black/10 relative">
              {activeChat && !isDatabaseError ? (
                <ChatWindow chat={activeChat as Chat} myId={userProfile.id} onBack={() => setActiveChatId(null)} isMobile={isMobile} onSendMessage={sendMessage} markAsRead={handleMarkAsRead} onStartCall={handleStartCall} isPartnerTyping={false} onSendTypingSignal={() => {}} wallpaper={THEMES_CONFIG[currentTheme].wallpaper} onEditMessage={handleEditMessage} onDeleteMessage={handleDeleteMessage} onPinMessage={handlePinMessage} onlineUsers={onlineUsers} />
              ) : (
                <div className="hidden md:flex flex-col items-center justify-center h-full opacity-10 select-none pointer-events-none"><h1 className="text-[140px] font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-transparent">VELLOR</h1></div>
              )}
            </div>
        </motion.div>
      )}
    </div>
  );
};

export default App;
