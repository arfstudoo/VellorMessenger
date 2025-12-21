

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Paperclip, Smile, Mic, Phone, Video, Info, User, Image as ImageIcon, FileText, MoreVertical, Play, Pause, Trash2, StopCircle, Download, X, Bell, Shield, Hash, Smartphone, Pin, Edit2, CornerUpLeft, Clock, Calendar, Users, Music, Crown, LogOut, Search, Plus, Check, Loader2 } from 'lucide-react';
import { Chat, Message, MessageType, CallType, UserStatus, Reaction } from '../types';
import { supabase } from '../supabaseClient';

const MDiv = motion.div as any;
const MImg = motion.img as any;
const MButton = motion.button as any;
const MP = motion.p as any;
const MSvg = motion.svg as any;
const MPath = motion.path as any;

interface ChatWindowProps {
  chat: Chat;
  myId: string;
  onBack: () => void;
  isMobile: boolean;
  onSendMessage: (chatId: string, text: string, type?: MessageType, mediaUrl?: string, duration?: string, fileName?: string, fileSize?: string) => void;
  markAsRead: (chatId: string) => void;
  onStartCall: (chatId: string, type: CallType) => void;
  isPartnerTyping: boolean;
  onSendTypingSignal: (isTyping: boolean) => void;
  wallpaper?: string;
  onEditMessage: (id: string, text: string) => void;
  onDeleteMessage: (id: string) => void;
  onPinMessage: (id: string, currentStatus: boolean) => void;
  onlineUsers: Map<string, UserStatus>;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "🎉", "👻", "👀", "🙌", "💀", "😊", "🤔", "🤣", "😍", "😒", "😭", "😩", "😤", "👋", "🙏", "🤝", "👌", "✨", "💯", "🚀", "🍕", "🍺", "⚽️"];

const QUICK_REACTIONS = ["❤️", "👍", "🔥", "😂", "😮", "😢"];

// --- Animated Message Status Component ---
const MessageStatus: React.FC<{ isRead: boolean; isOwn: boolean }> = ({ isRead, isOwn }) => {
  if (!isOwn) return null;

  return (
    <div className="flex items-center justify-center w-4 h-4 relative ml-0.5">
       {/* First Check (Sent) */}
       <MSvg 
         viewBox="0 0 24 24" 
         className="absolute inset-0 w-full h-full"
         initial="hidden" animate="visible"
       >
         <MPath 
           d="M20 6L9 17l-5-5" 
           fill="none" 
           stroke={isRead ? "#ff0033" : "rgba(255,255,255,0.7)"} 
           strokeWidth="3" 
           strokeLinecap="round" 
           strokeLinejoin="round"
           variants={{
             hidden: { pathLength: 0, opacity: 0 },
             visible: { pathLength: 1, opacity: 1, transition: { duration: 0.3 } }
           }}
         />
       </MSvg>
       
       {/* Second Check (Read) */}
       <MSvg 
         viewBox="0 0 24 24" 
         className="absolute inset-0 w-full h-full left-[5px] -top-[1px]" // Slight offset for double check
         initial="hidden" animate={isRead ? "visible" : "hidden"}
       >
         <MPath 
           d="M20 6L9 17l-5-5" 
           fill="none" 
           stroke="#ff0033" 
           strokeWidth="3" 
           strokeLinecap="round" 
           strokeLinejoin="round"
           variants={{
             hidden: { pathLength: 0, opacity: 0 },
             visible: { pathLength: 1, opacity: 1, transition: { duration: 0.3, delay: 0.1 } }
           }}
         />
       </MSvg>
    </div>
  );
};

const AudioPlayer: React.FC<{ url: string, duration?: string }> = ({ url, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100);
    const handleEnded = () => { setIsPlaying(false); setProgress(0); };
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    return () => { audio.removeEventListener('timeupdate', updateProgress); audio.removeEventListener('ended', handleEnded); };
  }, []);

  const togglePlay = () => {
    if (isPlaying) audioRef.current?.pause(); else audioRef.current?.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-4 py-2 px-1 min-w-[200px]">
      <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all shrink-0">
        {isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor" className="ml-0.5"/>}
      </button>
      <div className="flex-1 space-y-1.5">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden w-full"><div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} /></div>
        <div className="flex justify-between items-center opacity-40 text-[9px] font-black uppercase tracking-widest">
           <span>{isPlaying ? `${Math.floor(audioRef.current?.currentTime || 0)}s` : (duration || '0:00')}</span>
           <span>Голосовое</span>
        </div>
      </div>
      <audio ref={audioRef} src={url} className="hidden" />
    </div>
  );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
    chat, myId, onBack, isMobile, onSendMessage, markAsRead, onStartCall, isPartnerTyping, onSendTypingSignal, wallpaper,
    onEditMessage, onDeleteMessage, onPinMessage, onlineUsers
}) => {
  const [inputText, setInputText] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [newMemberSearch, setNewMemberSearch] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  
  // Pending File Preview State
  const [pendingFile, setPendingFile] = useState<{file: File, url: string, type: MessageType} | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: Message } | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingType, setUploadingType] = useState<MessageType | null>(null);

  const pinnedMessage = chat.messages.find(m => m.isPinned);

  // Exit on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (pendingFile) {
                setPendingFile(null);
            } else {
                onBack();
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, pendingFile]);

  const scrollToBottom = (smooth = false) => {
    if (messagesContainerRef.current) {
        const { scrollHeight, clientHeight } = messagesContainerRef.current;
        messagesContainerRef.current.scrollTo({
            top: scrollHeight - clientHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }
  };

  const scrollToMessage = (messageId: string) => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'background 0.3s';
          const originalBg = el.style.backgroundColor;
          el.style.backgroundColor = 'rgba(255, 0, 51, 0.2)';
          setTimeout(() => {
              el.style.backgroundColor = originalBg;
          }, 1000);
      }
  };

  useEffect(() => {
    markAsRead(chat.id);
    setTimeout(() => scrollToBottom(true), 50);
  }, [chat.messages.length, chat.id]);

  // Load group members robustly (2-step fetch to avoid FK issues and ensure mapping)
  useEffect(() => {
    if (chat.user.isGroup) {
        const fetchMembers = async () => {
            // 1. Fetch Members
            const { data: members, error: membersError } = await supabase.from('group_members').select('*').eq('group_id', chat.id);
            
            if (members && members.length > 0) {
                // 2. Fetch Profiles for these members
                const userIds = members.map(m => m.user_id);
                const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
                
                if (profiles) {
                    // 3. Combine and Map to User interface
                    const combined = members.map(m => {
                        const p = profiles.find(pr => pr.id === m.user_id);
                        return {
                            ...m,
                            user: {
                                id: p?.id || m.user_id,
                                name: p?.full_name || 'Unknown', // FIX: Map full_name to name
                                avatar: p?.avatar_url || '', // FIX: Map avatar_url to avatar
                                username: p?.username
                            }
                        };
                    });
                    setGroupMembers(combined);
                }
            }

            // Fetch group details
            const { data: grp } = await supabase.from('groups').select('*').eq('id', chat.id).single();
            if(grp) setGroupDetails(grp);
        };
        fetchMembers();
    }
  }, [chat.id, chat.user.isGroup]);

  useEffect(() => {
      const handleClick = () => setContextMenu(null);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
      e.preventDefault();
      // Adjust coordinates to not overflow screen
      let x = e.clientX;
      let y = e.clientY;
      if (x > window.innerWidth - 200) x = window.innerWidth - 210;
      if (y > window.innerHeight - 300) y = window.innerHeight - 310;
      
      setContextMenu({ x, y, message });
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
      setContextMenu(null);
      
      const message = chat.messages.find(m => m.id === messageId);
      if (!message) return;

      const currentReactions = message.reactions || [];
      const hasReacted = currentReactions.some(r => r.emoji === emoji && r.senderId === myId);
      
      let newReactions;
      if (hasReacted) {
          // Remove my reaction of this type
          newReactions = currentReactions.filter(r => !(r.emoji === emoji && r.senderId === myId));
      } else {
          // Add my reaction (allow multiple different emojis from same person? Yes, standard pattern)
          // If you want to limit to 1 reaction per person per message, filter out all myId reactions first.
          // For now, let's allow multiple emojis but toggle the specific one.
          newReactions = [...currentReactions, { emoji, senderId: myId }];
      }

      // Update DB directly. 
      // NOTE: App.tsx Realtime listener MUST handle the UPDATE event's 'reactions' column 
      // for this to persist across clients and not be overwritten by old state.
      await supabase.from('messages').update({ 
          reactions: newReactions 
      }).eq('id', messageId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onSendTypingSignal(true);
    typingTimeoutRef.current = setTimeout(() => {
        onSendTypingSignal(false);
    }, 2000);
  };

  // --- PASTE HANDLER ---
  const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of items) {
          if (item.type.indexOf('image') === 0) {
              e.preventDefault();
              const file = item.getAsFile();
              if (file) {
                  setPendingFile({
                      file,
                      url: URL.createObjectURL(file),
                      type: 'image'
                  });
              }
              return; // Handle only one image at a time for simplicity
          }
      }
  };

  const handleSend = async () => { 
    if (!inputText.trim() && !pendingFile) return; 
    
    if (isUploading) return;

    if (editingMessageId) {
        onEditMessage(editingMessageId, inputText);
        setEditingMessageId(null);
        setInputText('');
    } else {
        // If there's a pending file, upload it first
        if (pendingFile) {
            setIsUploading(true);
            const fileName = `${myId}/${pendingFile.type}_${Date.now()}_${pendingFile.file.name}`;
            const { data, error } = await supabase.storage.from('messages').upload(fileName, pendingFile.file);
            
            if (!error && data) {
                const { data: publicUrl } = supabase.storage.from('messages').getPublicUrl(fileName);
                const size = (pendingFile.file.size / 1024 / 1024).toFixed(2) + ' MB';
                // Send with caption if text exists, otherwise just media
                // Currently send function separates them, so we might need two calls or updated logic. 
                // For now, let's send image, then text if exists.
                onSendMessage(chat.id, '', pendingFile.type, publicUrl.publicUrl, undefined, pendingFile.file.name, size);
                
                if (inputText.trim()) {
                    // Small delay to ensure order
                    setTimeout(() => onSendMessage(chat.id, inputText, 'text'), 100);
                }
            } else {
                console.error("Upload error during send", error);
            }
            setIsUploading(false);
            setPendingFile(null);
            setInputText('');
        } else {
            // Just text
            onSendMessage(chat.id, inputText, 'text');
            setInputText(''); 
        }
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onSendTypingSignal(false); 
    setShowEmojis(false); 
  };

  const triggerFileUpload = (type: MessageType) => {
    setUploadingType(type);
    setTimeout(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, 50);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingType) return;
    
    // Instead of immediate upload, set pending
    setPendingFile({
        file,
        url: URL.createObjectURL(file),
        type: uploadingType
    });
    
    setShowAttachments(false);
    setUploadingType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const fileName = `${myId}/voice_${Date.now()}.webm`;
        const { error } = await supabase.storage.from('messages').upload(fileName, audioBlob);
        if (!error) {
          const { data: publicUrl } = supabase.storage.from('messages').getPublicUrl(fileName);
          const durationStr = `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}`;
          onSendMessage(chat.id, '', 'audio', publicUrl.publicUrl, durationStr);
        }
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      const timer = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      (recorder as any)._timer = timer;
    } catch (err) { console.error("Mic failed", err); }
  };

  const stopRecording = (shouldSend: boolean) => { 
    if (!mediaRecorder) return; 
    clearInterval((mediaRecorder as any)._timer); 
    if (shouldSend) { mediaRecorder.stop(); } else { mediaRecorder.stream.getTracks().forEach(t => t.stop()); }
    setIsRecording(false); 
    setMediaRecorder(null); 
  };

  const handleLeaveGroup = async () => {
      if (!confirm("Вы уверены, что хотите покинуть группу?")) return;
      await supabase.from('group_members').delete().eq('group_id', chat.id).eq('user_id', myId);
      onBack();
  };

  const handleDeleteGroup = async () => {
      if (!confirm("Вы уверены, что хотите удалить группу? Это действие нельзя отменить.")) return;
      await supabase.from('groups').delete().eq('id', chat.id);
      onBack();
  };

  const handleAddMember = async () => {
      if (!newMemberSearch.trim()) return;
      
      // Find user by username
      const { data: users, error } = await supabase.from('profiles').select('*').ilike('username', newMemberSearch).limit(1);
      
      if (users && users.length > 0) {
          const userToAdd = users[0];
          // Check if already member
          if (groupMembers.some(m => m.user.id === userToAdd.id)) {
              alert("Пользователь уже в группе");
              return;
          }

          const { error: addError } = await supabase.from('group_members').insert({
              group_id: chat.id,
              user_id: userToAdd.id
          });

          if (!addError) {
              setNewMemberSearch("");
              setShowAddMember(false);
              // Refresh members will happen on next update or could force re-fetch, but simple reload works too
              const { data: members } = await supabase.from('group_members').select('*').eq('group_id', chat.id);
              if (members) {
                  // Quick refresh logic duplicating useEffect logic
                   const userIds = members.map(m => m.user_id);
                   const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
                   if (profiles) {
                       const combined = members.map(m => ({
                           ...m,
                           user: {
                               id: profiles.find(p => p.id === m.user_id)?.id || m.user_id,
                               name: profiles.find(p => p.id === m.user_id)?.full_name || 'Unknown',
                               avatar: profiles.find(p => p.id === m.user_id)?.avatar_url || '',
                               username: profiles.find(p => p.id === m.user_id)?.username
                           }
                       }));
                       setGroupMembers(combined);
                   }
              }
          } else {
              alert("Ошибка добавления");
          }
      } else {
          alert("Пользователь не найден");
      }
  };

  const getSenderInfo = (senderId: string) => {
      if (senderId === 'me' || senderId === myId) return null;
      if (chat.user.isGroup && groupMembers.length > 0) {
          const member = groupMembers.find(m => m.user.id === senderId);
          return member ? member.user : null;
      }
      return chat.user;
  };

  const statusColors = { online: 'bg-vellor-red', away: 'bg-yellow-500', dnd: 'bg-crimson', offline: 'bg-gray-600' };

  // Calculate realtime status
  const realtimeStatus = onlineUsers.get(chat.id);
  const displayStatus = realtimeStatus || chat.user.status;

  const getStatusText = (status: UserStatus, isGroup: boolean) => {
      if (isGroup) return 'группа';
      switch (status) {
          case 'online': return 'в сети';
          case 'away': return 'отошел';
          case 'dnd': return 'не беспокоить';
          default: return 'был недавно';
      }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-black/10">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept={uploadingType === 'image' ? "image/*" : "*"} />
        
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 bg-black/40 backdrop-blur-3xl z-30 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-4">
                {isMobile && <button onClick={onBack} className="text-white p-1 hover:bg-white/5 rounded-full"><ArrowLeft size={24}/></button>}
                <div className="relative cursor-pointer" onClick={() => setShowUserInfo(true)}>
                    <div className="w-11 h-11 rounded-2xl bg-gray-800 overflow-hidden border border-white/5">
                      <img src={chat.user.avatar || 'https://via.placeholder.com/44'} className="w-full h-full object-cover" alt="Avatar"/>
                    </div>
                    {!chat.user.isGroup && (
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black ${statusColors[displayStatus] || statusColors.offline}`} />
                    )}
                </div>
                <div className="cursor-pointer" onClick={() => setShowUserInfo(true)}>
                    <h3 className="font-black text-white text-base tracking-tight">{chat.user.name}</h3>
                    <AnimatePresence mode="wait">
                        {isPartnerTyping ? (
                          <MP key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-black italic text-vellor-red uppercase tracking-widest">печатает...</MP>
                        ) : (
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-40">
                             {getStatusText(displayStatus, !!chat.user.isGroup)}
                          </p>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => onStartCall(chat.id, 'audio')} className="text-white/40 hover:text-white p-2.5 transition-all"><Phone size={20}/></button>
                <button onClick={() => onStartCall(chat.id, 'video')} className="text-white/40 hover:text-white p-2.5 transition-all"><Video size={20}/></button>
                <button onClick={() => setShowUserInfo(!showUserInfo)} className="text-white/40 hover:text-white p-2.5 transition-all"><Info size={20}/></button>
            </div>
        </div>

        {/* Pinned Message Bar */}
        <AnimatePresence>
            {pinnedMessage && (
                <MDiv 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    onClick={() => scrollToMessage(pinnedMessage.id)}
                    className="bg-black/40 backdrop-blur-md border-b border-vellor-red/20 flex items-center gap-3 px-6 py-2 cursor-pointer z-20 hover:bg-white/5 transition-colors relative"
                >
                    <div className="w-0.5 h-8 bg-vellor-red rounded-full" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-vellor-red uppercase tracking-widest mb-0.5">Закрепленное сообщение</p>
                        <p className="text-xs text-white/80 truncate font-medium">
                            {pinnedMessage.type === 'image' ? '🖼 Фотография' : 
                             pinnedMessage.type === 'audio' ? '🎤 Голосовое сообщение' : 
                             pinnedMessage.type === 'file' ? '📁 Файл' : pinnedMessage.text}
                        </p>
                    </div>
                    <Pin size={14} className="text-vellor-red fill-vellor-red rotate-45" />
                </MDiv>
            )}
        </AnimatePresence>

        {/* Messages Container */}
        <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative z-10 scroll-smooth"
        >
            {chat.messages.map((msg, index) => {
                const isMe = msg.senderId === 'me' || msg.senderId === myId;
                const isTemp = msg.id.startsWith('temp-');
                const senderInfo = getSenderInfo(msg.senderId);

                // Check if previous message was from same sender to group bubbles
                const isSequence = index > 0 && chat.messages[index-1].senderId === msg.senderId;

                // Group reactions by emoji
                const reactionsGrouped = (msg.reactions || []).reduce((acc, r) => {
                    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasReacted: false };
                    acc[r.emoji].count += 1;
                    if (r.senderId === myId) acc[r.emoji].hasReacted = true;
                    return acc;
                }, {} as Record<string, { count: number, hasReacted: boolean }>);

                return (
                    <MDiv 
                        key={msg.id} 
                        id={`msg-${msg.id}`}
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: isTemp ? 0.7 : 1, y: 0 }} 
                        className={`flex w-full ${isMe ? 'justify-end' : 'justify-start items-end gap-2'}`}
                    >
                        {!isMe && chat.user.isGroup && (
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 shrink-0 mb-1 opacity-80 border border-white/10">
                                {senderInfo ? (
                                    <img src={senderInfo.avatar || 'https://via.placeholder.com/24'} className="w-full h-full object-cover" />
                                ) : <div className="w-full h-full" />}
                            </div>
                        )}

                        <div 
                            onContextMenu={(e: any) => handleContextMenu(e, msg)}
                            className={`max-w-[75%] p-2 rounded-2xl relative shadow-2xl border border-white/5 cursor-pointer group mb-4 ${isMe ? 'bg-[var(--msg-me)] text-white rounded-br-none' : 'bg-white/5 backdrop-blur-md text-gray-200 rounded-bl-none'} ${msg.isPinned ? 'ring-2 ring-vellor-red/50 shadow-[0_0_15px_rgba(255,0,51,0.2)]' : ''}`}
                        >
                            {/* Sender Name in Group (Only for first message in sequence) */}
                            {!isMe && chat.user.isGroup && !isSequence && senderInfo && (
                                <p className="text-[10px] font-bold text-vellor-red mb-1 ml-1">{senderInfo.name}</p>
                            )}

                            {msg.isPinned && <div className="absolute -top-3 right-2 bg-vellor-red text-white text-[9px] px-1.5 rounded-md flex items-center gap-1 shadow-lg"><Pin size={8} fill="currentColor"/> Pin</div>}
                            
                            {msg.type === 'audio' && <AudioPlayer url={msg.mediaUrl || ''} duration={msg.duration} />}
                            
                            {msg.type === 'image' && (
                                <MImg 
                                    layoutId={msg.id} 
                                    src={msg.mediaUrl} 
                                    className="max-w-full rounded-xl border border-white/10" 
                                    alt="Sent" 
                                />
                            )}
                            
                            {msg.type === 'file' && (
                                <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                                    <div className="p-2 bg-vellor-red/20 text-vellor-red rounded-lg"><FileText size={24}/></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate max-w-[150px]">{msg.fileName}</p>
                                        <p className="text-[9px] opacity-50 uppercase font-black">{msg.fileSize || 'FILE'}</p>
                                    </div>
                                    <a href={msg.mediaUrl} download target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white"><Download size={16}/></a>
                                </div>
                            )}

                            {msg.type === 'text' && <p className="whitespace-pre-wrap leading-relaxed px-3 py-2 text-[13.5px]">{msg.text}</p>}
                            
                            <div className="flex items-center justify-end gap-1.5 mt-1 px-2 opacity-30 select-none">
                                {msg.isEdited && <span className="text-[9px] font-black uppercase mr-1">изм.</span>}
                                <span className="text-[9px] font-black uppercase">{new Date(msg.timestamp).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}</span>
                                {isMe && (
                                    isTemp ? (
                                        <div className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin ml-0.5" />
                                    ) : (
                                        <MessageStatus isRead={msg.isRead} isOwn={true} />
                                    )
                                )}
                            </div>

                            {/* Reactions Display (Animated & Grouped) */}
                            <div className="absolute -bottom-5 left-0 flex gap-1 z-10 px-1 pointer-events-auto">
                                <AnimatePresence initial={false}>
                                    {Object.entries(reactionsGrouped).map(([emoji, data]: [string, { count: number; hasReacted: boolean }]) => (
                                        <MButton 
                                            key={emoji}
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            onClick={(e: any) => { e.stopPropagation(); handleToggleReaction(msg.id, emoji); }}
                                            className={`
                                                px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg backdrop-blur-md border transition-all
                                                ${data.hasReacted 
                                                    ? 'bg-vellor-red/20 border-vellor-red/50 text-white' 
                                                    : 'bg-black/60 border-white/10 text-white/80 hover:bg-white/10'
                                                }
                                            `}
                                        >
                                            <span className="text-xs leading-none">{emoji}</span>
                                            {data.count > 1 && <span className="text-[9px] font-bold opacity-80">{data.count}</span>}
                                        </MButton>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </MDiv>
                );
            })}
        </div>

        {/* Message Context Menu */}
        <AnimatePresence>
            {contextMenu && (
                <MDiv
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    className="fixed z-[100] w-64 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl origin-top-left overflow-hidden flex flex-col gap-1"
                    onClick={(e: any) => e.stopPropagation()}
                >
                    {/* Reaction Bar */}
                    <div className="p-2 bg-white/5 rounded-xl mb-1 flex justify-between gap-1">
                        {QUICK_REACTIONS.map(emoji => (
                             <MButton 
                                key={emoji} 
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleToggleReaction(contextMenu.message.id, emoji)}
                                className="text-2xl p-1 transition-transform"
                             >
                                 {emoji}
                             </MButton>
                        ))}
                    </div>

                    <button onClick={() => { onPinMessage(contextMenu.message.id, contextMenu.message.isPinned || false); setContextMenu(null); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors">
                        <Pin size={14} className={contextMenu.message.isPinned ? "text-vellor-red fill-vellor-red" : "text-white/60"} />
                        {contextMenu.message.isPinned ? 'Открепить' : 'Закрепить'}
                    </button>
                    {(contextMenu.message.senderId === 'me' || contextMenu.message.senderId === myId) && contextMenu.message.type === 'text' && (
                        <button onClick={() => { setEditingMessageId(contextMenu.message.id); setInputText(contextMenu.message.text); setContextMenu(null); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors">
                            <Edit2 size={14} className="text-white/60" />
                            Изменить
                        </button>
                    )}
                    <div className="h-px bg-white/10 my-1" />
                    <button onClick={() => { onDeleteMessage(contextMenu.message.id); setContextMenu(null); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-colors">
                        <Trash2 size={14} />
                        Удалить
                    </button>
                </MDiv>
            )}
        </AnimatePresence>

        {/* User Info Side Panel */}
        <AnimatePresence>
            {showUserInfo && (
                <>
                    <MDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUserInfo(false)} className="fixed inset-0 z-[40] bg-black/40 backdrop-blur-md" />
                    <MDiv initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute top-0 right-0 w-full md:w-[400px] h-full bg-[#0a0a0a] border-l border-white/10 z-[50] flex flex-col shadow-2xl">
                        
                        {/* Sidebar Header */}
                        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">ИНФОРМАЦИЯ</h2>
                            <button onClick={() => setShowUserInfo(false)} className="p-2.5 bg-white/5 rounded-full hover:bg-vellor-red/20 hover:text-vellor-red transition-all"><X size={20}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                            {/* ... (Existing User Info Content) ... */}
                            <div className="flex flex-col items-center">
                                <div className="w-40 h-40 rounded-[2.5rem] p-1 border border-white/10 bg-black/50 relative mb-5 shadow-2xl">
                                    <div className="w-full h-full rounded-[2.2rem] overflow-hidden relative">
                                        <img src={chat.user.avatar || 'https://via.placeholder.com/400'} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                    </div>
                                    {!chat.user.isGroup && (
                                        <div className={`absolute -bottom-2 -right-2 w-5 h-5 rounded-full border-4 border-[#0a0a0a] ${statusColors[displayStatus] || statusColors.offline}`} />
                                    )}
                                </div>
                                
                                <h1 className="text-3xl font-black text-white text-center mb-1 leading-tight">{chat.user.name}</h1>
                                
                                <div className="flex items-center gap-2 mb-4">
                                     {chat.user.isGroup ? (
                                         <span className="px-3 py-1 rounded-full bg-vellor-red/10 text-vellor-red text-[10px] font-black uppercase tracking-widest border border-vellor-red/20">Группа • {groupMembers.length} уч.</span>
                                     ) : (
                                         <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">@{chat.user.username}</span>
                                     )}
                                </div>

                                <div className="flex gap-3 w-full justify-center">
                                     <button className="flex-1 max-w-[120px] py-3 rounded-xl bg-white text-black font-black uppercase text-[10px] tracking-wider hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                                         <Bell size={14}/> Mute
                                     </button>
                                     <button className="flex-1 max-w-[120px] py-3 rounded-xl bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-wider hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                                         <Search size={14}/> Поиск
                                     </button>
                                </div>
                            </div>
                            
                            <div className="h-px bg-white/5 w-full" />
                            
                            {chat.user.isGroup ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Участники ({groupMembers.length})</h3>
                                        <button onClick={() => setShowAddMember(!showAddMember)} className="text-[10px] font-bold text-vellor-red hover:text-white transition-colors">Добавить</button>
                                    </div>

                                    {showAddMember && (
                                        <div className="flex gap-2">
                                            <input 
                                                autoFocus
                                                value={newMemberSearch}
                                                onChange={(e) => setNewMemberSearch(e.target.value)}
                                                placeholder="Введите username..."
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs"
                                            />
                                            <button onClick={handleAddMember} className="bg-vellor-red text-white p-2 rounded-xl"><Plus size={16}/></button>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <AnimatePresence>
                                            {groupMembers.map((member) => (
                                                <MDiv 
                                                    key={member.user.id} 
                                                    initial={{ opacity: 0, x: -10 }} 
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-black border border-white/10 overflow-hidden relative">
                                                        <img src={member.user.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-white truncate">{member.user.name}</p>
                                                            {member.is_admin && <Crown size={12} className="text-amber-400 fill-amber-400" />}
                                                        </div>
                                                        <p className="text-[10px] text-white/40 truncate">@{member.user.username || 'user'}</p>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-2 hover:text-white text-white/40"><MoreVertical size={16}/></button>
                                                    </div>
                                                </MDiv>
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    <button onClick={handleLeaveGroup} className="w-full py-4 mt-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all">
                                        <LogOut size={16}/> Выйти из группы
                                    </button>

                                    {groupDetails?.created_by === myId && (
                                        <button onClick={handleDeleteGroup} className="w-full py-4 bg-red-900/20 hover:bg-red-800/30 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all">
                                            <Trash2 size={16}/> Удалить группу
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-black/40 rounded-xl text-vellor-red"><Smartphone size={20}/></div>
                                            <div>
                                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">Телефон</p>
                                                <p className="text-sm font-bold text-white">{chat.user.phone || 'Скрыт'}</p>
                                            </div>
                                        </div>
                                        <div className="h-px bg-white/5" />
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-black/40 rounded-xl text-vellor-red"><Info size={20}/></div>
                                            <div>
                                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">О себе</p>
                                                <p className="text-sm font-medium text-white/80 leading-relaxed">{chat.user.bio || 'Нет информации'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all">
                                        <Shield size={16}/> Заблокировать
                                    </button>
                                </div>
                            )}
                        </div>
                    </MDiv>
                </>
            )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="p-4 bg-black/50 backdrop-blur-3xl border-t border-[var(--border)] z-30 relative">
             {/* EDITING MODE OVERLAY */}
             {editingMessageId && (
                 <div className="absolute -top-12 left-0 w-full bg-black/80 backdrop-blur-md border-t border-white/10 p-2 px-6 flex items-center justify-between z-10">
                     <div className="flex items-center gap-3">
                         <Edit2 size={14} className="text-vellor-red"/>
                         <span className="text-xs font-bold text-white/80">Редактирование сообщения</span>
                     </div>
                     <button onClick={() => { setEditingMessageId(null); setInputText(''); }} className="p-1 hover:text-white text-gray-400"><X size={16}/></button>
                 </div>
             )}

             {/* PENDING FILE PREVIEW OVERLAY */}
             {pendingFile && (
                 <motion.div 
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="absolute -top-32 left-4 w-48 p-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20"
                 >
                     <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5 mb-2 border border-white/5 group">
                         {pendingFile.type === 'image' ? (
                             <img src={pendingFile.url} className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-white/50">
                                 <FileText size={32} />
                                 <span className="text-[9px] uppercase font-black mt-2">File</span>
                             </div>
                         )}
                         <button 
                            onClick={() => setPendingFile(null)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                         >
                             <X size={12} />
                         </button>
                     </div>
                     <p className="text-[10px] text-white/50 truncate px-1 font-mono">{pendingFile.file.name}</p>
                 </motion.div>
             )}

             <div className="flex items-end gap-3 max-w-5xl mx-auto relative">
                {!isRecording ? (
                  <>
                    <div className="relative">
                        <button onClick={() => setShowAttachments(!showAttachments)} className={`p-3.5 rounded-2xl transition-all ${showAttachments ? 'bg-vellor-red text-white' : 'text-gray-400 hover:text-white bg-white/5'}`}><Paperclip size={22}/></button>
                        <AnimatePresence>
                            {showAttachments && (
                                <MDiv initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} className="absolute bottom-16 left-0 w-48 bg-black/95 border border-white/10 p-2 rounded-2xl shadow-2xl overflow-hidden z-[100]">
                                    <button onClick={() => triggerFileUpload('image')} className="flex items-center gap-3 w-full p-4 hover:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"><ImageIcon size={16} className="text-vellor-red"/> Фото</button>
                                    <button onClick={() => triggerFileUpload('file')} className="flex items-center gap-3 w-full p-4 hover:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"><FileText size={16} className="text-vellor-red"/> Файл</button>
                                </MDiv>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl focus-within:border-vellor-red/40 transition-all flex items-end px-2 relative">
                        <button onClick={() => setShowEmojis(!showEmojis)} className={`p-3.5 transition-colors ${showEmojis ? 'text-vellor-red' : 'text-gray-500 hover:text-white'}`}><Smile size={22}/></button>
                        <textarea 
                            value={inputText} 
                            onChange={handleInputChange} 
                            onPaste={handlePaste}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                            placeholder={pendingFile ? "Добавить подпись..." : "Сообщение..."}
                            className="w-full bg-transparent text-white py-4 px-1 max-h-40 min-h-[54px] resize-none outline-none custom-scrollbar text-sm" 
                        />
                        
                        <AnimatePresence>
                           {showEmojis && (
                             <MDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-[60px] left-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 grid grid-cols-6 gap-2 w-64 shadow-2xl z-50">
                                {EMOJIS.map(emoji => (
                                  <button key={emoji} onClick={() => setInputText(prev => prev + emoji)} className="text-xl p-2 hover:bg-white/10 rounded-lg transition-colors">{emoji}</button>
                                ))}
                             </MDiv>
                           )}
                        </AnimatePresence>
                    </div>

                    {inputText.trim() || pendingFile ? (
                        <button onClick={handleSend} disabled={isUploading} className="p-4 bg-vellor-red rounded-2xl text-white shadow-[0_10px_20px_rgba(255,0,51,0.3)] active:scale-90 transition-transform disabled:opacity-50 disabled:scale-100">
                            {isUploading ? <Loader2 className="animate-spin" size={22}/> : (editingMessageId ? <Check size={22}/> : <Send size={22}/>)}
                        </button>
                    ) : (
                        <button onClick={startRecording} className="p-4 rounded-2xl bg-white/5 text-gray-400 hover:text-vellor-red hover:bg-white/10 transition-all"><Mic size={22}/></button>
                    )}
                  </>
                ) : (
                  <MDiv initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex items-center justify-between bg-vellor-red/10 border border-vellor-red/20 rounded-[2rem] p-2 pr-4 h-[54px]">
                    <div className="flex items-center gap-4 pl-4"><MDiv animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2.5 h-2.5 rounded-full bg-vellor-red" /><span className="text-sm font-black text-white font-mono">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span></div>
                    <div className="flex items-center gap-3"><button onClick={() => stopRecording(false)} className="p-2.5 text-white/40 hover:text-white transition-colors"><Trash2 size={20}/></button><button onClick={() => stopRecording(true)} className="p-2.5 bg-vellor-red rounded-full text-white"><StopCircle size={20}/></button></div>
                  </MDiv>
                )}
             </div>
        </div>
    </div>
  );
};