
import { useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Chat, Message, UserProfile, MessageType } from '../types';
import { ToastType } from '../components/Toast';

export const useChatData = (
    userProfile: UserProfile, 
    showToast: (msg: string, type: ToastType, icon?: string) => void,
    playNotificationSound: () => void,
    sendBrowserNotification: (title: string, body: string, icon?: string) => void
) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const chatsRef = useRef<Chat[]>([]);
    
    // Sync Ref with State
    if (chatsRef.current !== chats) {
        chatsRef.current = chats;
    }

    // --- FETCH DATA ---
    const fetchChats = useCallback(async () => {
        if (!userProfile.id) return;
        try {
            const { data, error } = await supabase.rpc('get_my_messenger_data');
            if (error) throw error;

            const groups = data.groups || [];
            const allMessages = [...(data.private_messages || []), ...(data.group_messages || [])];
            const chatSettings = data.settings || [];
            const settingsMap = new Map();
            chatSettings.forEach((s: any) => settingsMap.set(s.partner_id, s));

            const chatsMap = new Map<string, Chat>();

            // Process Groups
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
                    lastReadAt: g.last_read_at
                });
            });

            // Process DMs
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
                        lastReadAt: null
                    });
                });
            }

            // Process Messages
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
                      groupId: msg.group_id, reactions: msg.reactions || [], replyToId: msg.reply_to_id
                    };
                    if (!chat.messages.some(ex => ex.id === m.id)) chat.messages.push(m);
                    if (!chat.lastMessage.timestamp || m.timestamp > chat.lastMessage.timestamp) chat.lastMessage = m;
                    
                    if (!isMe) {
                        if (chat.user.isGroup) {
                            if (!chat.lastReadAt || new Date(msg.created_at) > new Date(chat.lastReadAt)) chat.unreadCount += 1;
                        } else {
                            if (!msg.is_read) chat.unreadCount += 1;
                        }
                    }
                }
            });

            // Sort Messages
            for (const chat of chatsMap.values()) {
                chat.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            }

            // Set State Sorted
            setChats(Array.from(chatsMap.values()).sort((a,b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return (b.lastMessage?.timestamp?.getTime() || 0) - (a.lastMessage?.timestamp?.getTime() || 0);
            }));

        } catch (e) { console.error("Fetch error", e); }
    }, [userProfile.id]);

    // --- REALTIME HANDLER ---
    const handleRealtimePayload = useCallback((payload: any) => { 
        if (payload.eventType === 'INSERT' && payload.table === 'messages') {
            const newMsg = payload.new;
            const myId = userProfile.id;
            const isMine = newMsg.sender_id === myId;
            const isForMe = newMsg.receiver_id === myId;
            const isMyGroup = newMsg.group_id && chatsRef.current.some(c => c.id === newMsg.group_id);

            if (!isMine && !isForMe && !isMyGroup) return;

            const chatId = newMsg.group_id || (isMine ? newMsg.receiver_id : newMsg.sender_id);
            const chat = chatsRef.current.find(c => c.id === chatId);

            if (!isMine && (!chat || !chat.isMuted)) { 
                playNotificationSound();
                const senderName = chat ? chat.user.name : 'Новое сообщение';
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
            // Note: Own profile updates are handled in App.tsx via setUserProfile
            const updatedProfile = payload.new;
            setChats(prev => prev.map(c => {
                 if (c.user.id === updatedProfile.id) {
                     return { ...c, user: { ...c.user, name: updatedProfile.full_name, username: updatedProfile.username, avatar: updatedProfile.avatar_url, isVerified: updatedProfile.is_verified, bio: updatedProfile.bio, email: updatedProfile.email } };
                 }
                 return c;
            }));
        }
    }, [fetchChats, userProfile.id]);

    // --- ACTIONS ---
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

    const handleChatAction = async (chatId: string, action: 'pin' | 'mute' | 'delete', activeChatId: string | null, setActiveChatId: (id: string|null) => void) => {
        if (action === 'delete') {
            setChats(prev => prev.filter(c => c.id !== chatId));
            if (activeChatId === chatId) setActiveChatId(null);
            return;
        }
  
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;
  
        const isPinned = action === 'pin' ? !chat.isPinned : chat.isPinned;
        const isMuted = action === 'mute' ? !chat.isMuted : chat.isMuted;
  
        setChats(prev => {
            const mapped = prev.map(c => {
                if (c.id === chatId) return { ...c, isPinned, isMuted };
                return c;
            });
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
            showToast("Ошибка сохранения настроек", "error");
            fetchChats(); 
        } else {
            showToast(action === 'pin' ? (isPinned ? 'Чат закреплен' : 'Чат откреплен') : (isMuted ? 'Уведомления выключены' : 'Уведомления включены'), "success");
        }
    };

    const handleDeleteGroup = async (groupId: string, activeChatId: string | null, setActiveChatId: (id: string|null) => void) => {
        if (!confirm("Внимание! Вы удаляете группу. Это действие необратимо.")) return;
        
        const { error } = await supabase.from('groups').delete().eq('id', groupId);
        if (error) {
            showToast("Ошибка удаления группы", "error");
        } else {
            showToast("Группа удалена", "success");
            setChats(prev => prev.filter(c => c.id !== groupId));
            if (activeChatId === groupId) setActiveChatId(null);
        }
    };
  
    const handleLeaveGroup = async (groupId: string, activeChatId: string | null, setActiveChatId: (id: string|null) => void) => {
        if (!confirm("Вы действительно хотите покинуть эту группу?")) return;
        await sendMessage(groupId, `${userProfile.name} покинул(а) группу`, 'system');
        const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userProfile.id);
        if (error) {
            showToast("Не удалось выйти из группы", "error");
        } else {
            setChats(prev => prev.filter(c => c.id !== groupId));
            if (activeChatId === groupId) setActiveChatId(null);
            showToast("Вы покинули группу", "success");
        }
    };

    const handleUpdateGroupInfo = async (groupId: string, newDescription: string) => {
        try {
            const { error } = await supabase.from('groups').update({ description: newDescription }).eq('id', groupId);
            if (error) throw error;
            showToast("Информация обновлена", "success");
        } catch(e) { showToast("Ошибка обновления", "error"); }
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

    const handleUpdateGroup = useCallback((updatedGroup: any) => {
        setChats(prev => prev.map(c => {
            if (c.id === updatedGroup.id) {
                return {
                    ...c,
                    user: {
                        ...c.user,
                        name: updatedGroup.name,
                        avatar: updatedGroup.avatar_url,
                        bio: updatedGroup.description
                    }
                };
            }
            return c;
        }));
    }, []);

    return {
        chats,
        setChats,
        fetchChats,
        handleRealtimePayload,
        sendMessage,
        handleChatAction,
        handleDeleteGroup,
        handleLeaveGroup,
        handleUpdateGroupInfo,
        handleEditMessage,
        handleDeleteMessage,
        handlePinMessage,
        handleMarkAsRead,
        handleUpdateGroup
    };
};
