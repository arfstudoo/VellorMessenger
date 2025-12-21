
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { ArrowLeft, Send, Paperclip, Smile, Mic, Phone, Video, Info, Image as ImageIcon, FileText, MoreVertical, Play, Pause, Trash2, StopCircle, Download, X, Bell, Shield, Smartphone, Pin, Edit2, Crown, LogOut, Plus, Check, Loader2, Reply, ZoomIn, BadgeCheck, Mail, Calendar, User } from 'lucide-react';
import { Chat, Message, MessageType, CallType, UserStatus } from '../types';
import { supabase } from '../supabaseClient';
import { ToastType } from './Toast';

const MDiv = motion.div as any;
const MImg = motion.img as any;
const MButton = motion.button as any;
const MSvg = motion.svg as any;
const MPath = motion.path as any;

interface ChatWindowProps {
  chat: Chat;
  myId: string;
  onBack: () => void;
  isMobile: boolean;
  onSendMessage: (chatId: string, text: string, type?: MessageType, mediaUrl?: string, duration?: string, fileName?: string, fileSize?: string, replyToId?: string) => void;
  markAsRead: (chatId: string) => void;
  onStartCall: (chatId: string, type: CallType) => void;
  isPartnerTyping: boolean;
  onSendTypingSignal: (isTyping: boolean) => void;
  wallpaper?: string;
  onEditMessage: (id: string, text: string) => void;
  onDeleteMessage: (id: string) => void;
  onPinMessage: (id: string, currentStatus: boolean) => void;
  onlineUsers: Map<string, UserStatus>;
  showToast: (msg: string, type: ToastType) => void;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "🎉", "👻", "👀", "🙌", "💀", "😊", "🤔", "🤣", "😍", "😒", "😭", "😩", "😤", "👋", "🙏", "🤝", "👌", "✨", "💯", "🚀", "🍕", "🍺", "⚽️"];
const QUICK_REACTIONS = ["❤️", "👍", "🔥", "😂", "😮", "😢"];

// --- Animated Message Status ---
const MessageStatus: React.FC<{ isRead: boolean; isOwn: boolean }> = ({ isRead, isOwn }) => {
  if (!isOwn) return null;
  return (
    <div className="flex items-center justify-center w-3.5 h-3.5 relative ml-0.5">
       <MSvg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full" initial="hidden" animate="visible">
         <MPath d="M20 6L9 17l-5-5" fill="none" stroke={isRead ? "#ff0033" : "rgba(255,255,255,0.7)"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.3 } } }} />
       </MSvg>
       <MSvg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full left-[4px] -top-[1px]" initial="hidden" animate={isRead ? "visible" : "hidden"}>
         <MPath d="M20 6L9 17l-5-5" fill="none" stroke="#ff0033" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.3, delay: 0.1 } } }} />
       </MSvg>
    </div>
  );
};

// --- Audio Player ---
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
    <div className="flex items-center gap-3 py-1.5 px-1 min-w-[180px]">
      <button onClick={togglePlay} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all shrink-0">
        {isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor" className="ml-0.5"/>}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden w-full"><div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} /></div>
        <div className="flex justify-between items-center opacity-50 text-[9px] font-bold">
           <span>{isPlaying ? `${Math.floor(audioRef.current?.currentTime || 0)}s` : (duration || '0:00')}</span>
           <span>Voice</span>
        </div>
      </div>
      <audio ref={audioRef} src={url} className="hidden" />
    </div>
  );
};

// --- Swipeable Message Component (Telegram Style) ---
const SwipeableMessage = ({ children, onReply, isMe }: { children: React.ReactNode, onReply: () => void, isMe: boolean }) => {
    const x = useMotionValue(0);
    const opacity = useTransform(x, [-50, 0], [1, 0]);
    const scale = useTransform(x, [-50, 0], [1, 0.5]);

    return (
        <div className="relative w-full">
            {/* Reply Icon Indicator behind the message */}
            <MDiv 
                style={{ opacity, scale }}
                className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white z-0"
            >
                <Reply size={16} />
            </MDiv>

            <MDiv
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.3, right: 0.05 }} // Allow pulling left
                onDragEnd={(e: any, info: any) => {
                    if (info.offset.x < -60) {
                        onReply();
                    }
                }}
                className={`relative z-10 w-full flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
                {children}
            </MDiv>
        </div>
    );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
    chat, myId, onBack, isMobile, onSendMessage, markAsRead, onStartCall, isPartnerTyping, onSendTypingSignal, wallpaper,
    onEditMessage, onDeleteMessage, onPinMessage, onlineUsers, showToast
}) => {
  const [inputText, setInputText] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [newMemberSearch, setNewMemberSearch] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [pendingFile, setPendingFile] = useState<{file: File, url: string, type: MessageType} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: Message } | null>(null);
  const [uploadingType, setUploadingType] = useState<MessageType | null>(null);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pinnedMessage = chat.messages.find(m => m.isPinned);

  // Scroll logic
  const scrollToBottom = (smooth = false) => {
    if (messagesContainerRef.current) {
        const { scrollHeight, clientHeight } = messagesContainerRef.current;
        messagesContainerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  const scrollToMessage = (messageId: string) => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'background 0.3s';
          const originalBg = el.style.backgroundColor;
          el.style.backgroundColor = 'rgba(255, 0, 51, 0.2)';
          setTimeout(() => { el.style.backgroundColor = originalBg; }, 1000);
      }
  };

  useEffect(() => { markAsRead(chat.id); setTimeout(() => scrollToBottom(true), 50); }, [chat.messages.length, chat.id]);

  useEffect(() => {
    if (chat.user.isGroup) {
        const fetchMembers = async () => {
            const { data: members } = await supabase.from('group_members').select('*').eq('group_id', chat.id);
            if (members && members.length > 0) {
                const userIds = members.map(m => m.user_id);
                const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
                if (profiles) {
                    setGroupMembers(members.map(m => {
                        const p = profiles.find(pr => pr.id === m.user_id);
                        return { ...m, user: { id: p?.id || m.user_id, name: p?.full_name || 'Unknown', avatar: p?.avatar_url || '', username: p?.username, isVerified: p?.is_verified, bio: p?.bio, email: p?.email, created_at: p?.created_at } };
                    }));
                }
            }
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
      let newReactions = hasReacted 
          ? currentReactions.filter(r => !(r.emoji === emoji && r.senderId === myId)) 
          : [...currentReactions, { emoji, senderId: myId }];
      await supabase.from('messages').update({ reactions: newReactions }).eq('id', messageId);
  };

  const handleSend = async () => { 
    if (!inputText.trim() && !pendingFile) return; 
    if (isUploading) return;

    if (editingMessageId) {
        onEditMessage(editingMessageId, inputText);
        setEditingMessageId(null);
        setInputText('');
    } else {
        if (pendingFile) {
            setIsUploading(true);
            const fileName = `${myId}/${pendingFile.type}_${Date.now()}_${pendingFile.file.name}`;
            const { data, error } = await supabase.storage.from('messages').upload(fileName, pendingFile.file);
            if (!error && data) {
                const { data: publicUrl } = supabase.storage.from('messages').getPublicUrl(fileName);
                const size = (pendingFile.file.size / 1024 / 1024).toFixed(2) + ' MB';
                onSendMessage(chat.id, '', pendingFile.type, publicUrl.publicUrl, undefined, pendingFile.file.name, size, replyingTo?.id);
                if (inputText.trim()) setTimeout(() => onSendMessage(chat.id, inputText, 'text', undefined, undefined, undefined, undefined, replyingTo?.id), 100);
            }
            setIsUploading(false);
            setPendingFile(null);
            setInputText('');
        } else {
            onSendMessage(chat.id, inputText, 'text', undefined, undefined, undefined, undefined, replyingTo?.id);
            setInputText(''); 
        }
        setReplyingTo(null);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onSendTypingSignal(false); 
    setShowEmojis(false); 
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onSendTypingSignal(true);
    typingTimeoutRef.current = setTimeout(() => { onSendTypingSignal(false); }, 2000);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        const file = e.clipboardData.files[0];
        const type: MessageType = file.type.startsWith('image/') ? 'image' : 'file';
        setPendingFile({ file, url: URL.createObjectURL(file), type });
    }
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
          onSendMessage(chat.id, '', 'audio', publicUrl.publicUrl, durationStr, undefined, undefined, replyingTo?.id);
        }
        stream.getTracks().forEach(track => track.stop());
        setReplyingTo(null);
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

  // Improved Sender Info Lookup
  const getSenderInfo = (senderId: string) => {
      if (senderId === 'me' || senderId === myId) return { name: 'Вы', avatar: '', id: myId };
      
      // If group, look in fetched members
      if (chat.user.isGroup && groupMembers.length > 0) {
          const member = groupMembers.find(m => m.user.id === senderId)?.user;
          if (member) return member;
      }
      
      // If DM, it's likely the chat partner
      if (!chat.user.isGroup && senderId === chat.user.id) {
          return chat.user;
      }

      // Fallback
      return { name: 'Unknown', avatar: '', id: senderId };
  };

  const statusColors = { online: 'bg-vellor-red', away: 'bg-yellow-500', dnd: 'bg-crimson', offline: 'bg-gray-600' };
  const realtimeStatus = onlineUsers.get(chat.id) || chat.user.status;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingType) return;
    setPendingFile({ file, url: URL.createObjectURL(file), type: uploadingType });
    setShowAttachments(false);
    setUploadingType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Admin Check for Header
  const isSuperAdmin = chat.user.username?.toLowerCase() === 'arfstudoo';

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-black/10">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept={uploadingType === 'image' ? "image/*" : "*"} />
        
        {/* Header - Fixed Compact Height */}
        <div className="h-14 flex items-center justify-between px-3 md:px-6 bg-black/40 backdrop-blur-3xl z-30 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-2 md:gap-4">
                {isMobile && <button onClick={onBack} className="text-white p-1 hover:bg-white/5 rounded-full"><ArrowLeft size={22}/></button>}
                <div className="relative cursor-pointer" onClick={() => setShowUserInfo(true)}>
                    <div className="w-9 h-9 rounded-full bg-gray-800 overflow-hidden border border-white/5">
                      <img src={chat.user.avatar || 'https://via.placeholder.com/44'} className="w-full h-full object-cover" alt="Avatar"/>
                    </div>
                    {!chat.user.isGroup && (
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${statusColors[realtimeStatus] || statusColors.offline}`} />
                    )}
                </div>
                <div className="cursor-pointer" onClick={() => setShowUserInfo(true)}>
                    <h3 className="font-bold text-white text-sm tracking-tight leading-none mb-0.5 flex items-center gap-1.5">
                        {chat.user.name}
                        {isSuperAdmin && (
                            <div 
                                title="Администратор"
                                onClick={(e) => { e.stopPropagation(); showToast("Администратор Vellor", "info"); }}
                            >
                                <Crown size={12} className="text-yellow-400 fill-yellow-400" />
                            </div>
                        )}
                        {chat.user.isVerified && (
                            <div
                                title="Верифицированный пользователь"
                                onClick={(e) => { e.stopPropagation(); showToast("Верифицированный пользователь", "info"); }}
                            >
                                <BadgeCheck size={12} className="text-blue-400 fill-blue-400/20" />
                            </div>
                        )}
                    </h3>
                    {isPartnerTyping ? (
                        <p className="text-[10px] text-vellor-red font-bold animate-pulse">печатает...</p>
                    ) : (
                        <p className="text-[10px] font-medium text-white/40">{chat.user.isGroup ? 'группа' : (realtimeStatus === 'online' ? 'в сети' : 'был(а) недавно')}</p>
                    )}
                </div>
            </div>
            <div className="flex gap-1 md:gap-2">
                <button onClick={() => onStartCall(chat.id, 'audio')} className="text-white/40 hover:text-white p-2 transition-all"><Phone size={18} /></button>
                <button onClick={() => onStartCall(chat.id, 'video')} className="text-white/40 hover:text-white p-2 transition-all"><Video size={18} /></button>
                <button onClick={() => setShowUserInfo(!showUserInfo)} className="text-white/40 hover:text-white p-2 transition-all"><Info size={18} /></button>
            </div>
        </div>

        {/* Pinned Message */}
        <AnimatePresence>
            {pinnedMessage && (
                <MDiv onClick={() => scrollToMessage(pinnedMessage.id)} initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="bg-black/40 backdrop-blur-md border-b border-vellor-red/20 flex items-center gap-3 px-4 py-1.5 cursor-pointer z-20">
                    <div className="w-0.5 h-6 bg-vellor-red rounded-full" />
                    <div className="flex-1 min-w-0"><p className="text-[9px] font-bold text-vellor-red uppercase">Pinned</p><p className="text-[11px] text-white/80 truncate">{pinnedMessage.text || 'Media'}</p></div>
                    <Pin size={12} className="text-vellor-red fill-vellor-red rotate-45" />
                </MDiv>
            )}
        </AnimatePresence>

        {/* Messages Container */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2 md:p-6 space-y-1 custom-scrollbar relative z-10 scroll-smooth">
            {chat.messages.map((msg, index) => {
                const isMe = msg.senderId === 'me' || msg.senderId === myId;
                const senderInfo = getSenderInfo(msg.senderId);
                
                // Reply Lookup
                const replyParent = msg.replyToId ? chat.messages.find(m => m.id === msg.replyToId) : null;
                const replySender = replyParent ? getSenderInfo(replyParent.senderId) : null;

                const reactionsGrouped = (msg.reactions || []).reduce((acc, r) => {
                    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasReacted: false };
                    acc[r.emoji].count += 1;
                    if (r.senderId === myId) acc[r.emoji].hasReacted = true;
                    return acc;
                }, {} as Record<string, { count: number, hasReacted: boolean }>);

                return (
                    <MDiv key={msg.id} id={`msg-${msg.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                        <SwipeableMessage isMe={isMe} onReply={() => setReplyingTo(msg)}>
                            <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                                {!isMe && chat.user.isGroup && (
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 shrink-0 mb-1 mr-2 self-end border border-white/10">
                                        {senderInfo && senderInfo.avatar ? <img src={senderInfo.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-700" />}
                                    </div>
                                )}

                                <div 
                                    onContextMenu={(e: any) => handleContextMenu(e, msg)}
                                    className={`max-w-[85%] md:max-w-[70%] p-2 rounded-2xl relative shadow-sm border border-white/5 cursor-pointer group ${isMe ? 'bg-[var(--msg-me)] text-white rounded-br-none' : 'bg-white/5 backdrop-blur-md text-gray-200 rounded-bl-none'} ${msg.isPinned ? 'ring-1 ring-vellor-red/50' : ''}`}
                                >
                                    {/* --- REPLY VISUALIZATION --- */}
                                    {replyParent && (
                                        <div onClick={(e) => { e.stopPropagation(); scrollToMessage(replyParent.id); }} className="mb-1.5 rounded-lg bg-black/20 p-1.5 flex gap-2 items-center border-l-2 border-vellor-red/70 overflow-hidden cursor-pointer hover:bg-black/30 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-vellor-red truncate">{replySender?.name || 'Unknown'}</p>
                                                <p className="text-[10px] text-white/60 truncate">
                                                    {replyParent.type === 'image' ? 'Фотография' : replyParent.type === 'audio' ? 'Голосовое' : replyParent.text}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {!isMe && chat.user.isGroup && (
                                        <div className="flex items-center gap-1 mb-1 ml-1">
                                            <p className="text-[10px] font-bold text-vellor-red">{senderInfo?.name}</p>
                                            {/* Admin Check for Group Members if we had username, for now relying on senderInfo structure which might need username populated */}
                                        </div>
                                    )}

                                    {msg.isPinned && <div className="absolute -top-3 right-2 bg-vellor-red text-white text-[9px] px-1.5 rounded-md flex items-center gap-1 shadow-lg"><Pin size={8} fill="currentColor"/></div>}
                                    
                                    {msg.type === 'audio' && <AudioPlayer url={msg.mediaUrl || ''} duration={msg.duration} />}
                                    {msg.type === 'image' && (
                                        <div className="relative group/img">
                                            <MImg src={msg.mediaUrl} className="max-w-full max-h-[300px] w-auto h-auto rounded-lg border border-white/10 object-cover" />
                                            <button onClick={(e) => { e.stopPropagation(); setZoomedImage(msg.mediaUrl || ''); }} className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity"><ZoomIn size={24} className="text-white"/></button>
                                        </div>
                                    )}
                                    {msg.type === 'file' && (
                                        <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                                            <div className="p-2 bg-vellor-red/20 text-vellor-red rounded-lg"><FileText size={24}/></div>
                                            <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate max-w-[150px]">{msg.fileName}</p><p className="text-[9px] opacity-50 uppercase font-black">{msg.fileSize || 'FILE'}</p></div>
                                            <a href={msg.mediaUrl} download className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white"><Download size={16}/></a>
                                        </div>
                                    )}
                                    {msg.type === 'text' && <p className="whitespace-pre-wrap leading-snug px-2 py-1 text-[15px]">{msg.text}</p>}
                                    
                                    <div className="flex items-center justify-end gap-1 mt-0.5 px-1 opacity-40 select-none">
                                        {msg.isEdited && <span className="text-[9px] mr-1">изм.</span>}
                                        <span className="text-[10px]">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                        {isMe && <MessageStatus isRead={msg.isRead} isOwn={true} />}
                                    </div>

                                    {/* Reactions */}
                                    <div className="absolute -bottom-3 left-0 flex gap-1 z-10 px-1">
                                        <AnimatePresence>
                                            {Object.entries(reactionsGrouped).map(([emoji, data]: any) => (
                                                <MButton key={emoji} initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={(e: any) => { e.stopPropagation(); handleToggleReaction(msg.id, emoji); }} className={`px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-md border border-white/10 text-[10px] ${data.hasReacted ? 'bg-vellor-red/20 border-vellor-red/50 text-white' : 'bg-black/60 text-white/80'}`}>
                                                    <span>{emoji}</span>{data.count > 1 && <span className="font-bold">{data.count}</span>}
                                                </MButton>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </SwipeableMessage>
                    </MDiv>
                );
            })}
        </div>

        {/* Context Menu */}
        <AnimatePresence>
            {contextMenu && (
                <MDiv initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[100] w-60 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl origin-top-left overflow-hidden flex flex-col gap-1" onClick={(e: any) => e.stopPropagation()}>
                    <div className="p-2 bg-white/5 rounded-xl mb-1 flex justify-between gap-1">
                        {QUICK_REACTIONS.map(emoji => <MButton key={emoji} whileHover={{ scale: 1.2 }} onClick={() => handleToggleReaction(contextMenu.message.id, emoji)} className="text-xl p-1">{emoji}</MButton>)}
                    </div>
                    <button onClick={() => { setReplyingTo(contextMenu.message); setContextMenu(null); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors">
                        <Reply size={14} className="text-white/60" /> Ответить
                    </button>
                    <button onClick={() => { onPinMessage(contextMenu.message.id, contextMenu.message.isPinned || false); setContextMenu(null); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors">
                        <Pin size={14} className={contextMenu.message.isPinned ? "text-vellor-red" : "text-white/60"} /> {contextMenu.message.isPinned ? 'Открепить' : 'Закрепить'}
                    </button>
                    {(contextMenu.message.senderId === 'me' || contextMenu.message.senderId === myId) && contextMenu.message.type === 'text' && (
                        <button onClick={() => { setEditingMessageId(contextMenu.message.id); setInputText(contextMenu.message.text); setContextMenu(null); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors"><Edit2 size={14} className="text-white/60" /> Изменить</button>
                    )}
                    <div className="h-px bg-white/10 my-1" />
                    <button onClick={() => { onDeleteMessage(contextMenu.message.id); setContextMenu(null); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-colors"><Trash2 size={14} /> Удалить</button>
                </MDiv>
            )}
        </AnimatePresence>

        {/* Lightbox */}
        <AnimatePresence>
            {zoomedImage && (
                <MDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setZoomedImage(null)}>
                    <MImg src={zoomedImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} onClick={(e: any) => e.stopPropagation()} />
                    <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"><X size={24} /></button>
                </MDiv>
            )}
        </AnimatePresence>

        {/* User Info Panel - REPAIRED AND ENHANCED */}
        <AnimatePresence>
            {showUserInfo && (
                <MDiv initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute top-0 right-0 w-full md:w-[400px] h-full bg-[#0a0a0a] border-l border-white/10 z-[50] flex flex-col shadow-2xl">
                    <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">ИНФОРМАЦИЯ</h2>
                        <button onClick={() => setShowUserInfo(false)} className="p-2 bg-white/5 rounded-full hover:bg-vellor-red/20 hover:text-vellor-red transition-all"><X size={18}/></button>
                    </div>
                    {/* User Info Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 flex flex-col items-center">
                        <div className="w-32 h-32 rounded-[2rem] p-1 border border-white/10 bg-black/50 relative mb-4 shadow-2xl group">
                            <div className="w-full h-full rounded-[1.8rem] overflow-hidden relative">
                                <img src={chat.user.avatar || 'https://via.placeholder.com/400'} className="w-full h-full object-cover" />
                            </div>
                            {isSuperAdmin && (
                                <div 
                                    title="Администратор"
                                    onClick={(e) => { e.stopPropagation(); showToast("Администратор Vellor", "info"); }}
                                    className="absolute -top-3 -right-3 bg-black/90 p-2 rounded-full border border-yellow-500/50 shadow-xl shadow-yellow-500/20 cursor-pointer hover:scale-110 transition-transform"
                                >
                                    <Crown size={20} className="text-yellow-400 fill-yellow-400" />
                                </div>
                            )}
                        </div>
                        
                        <div className="text-center space-y-1">
                            <h1 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                                {chat.user.name}
                                {chat.user.isVerified && (
                                    <div
                                        title="Верифицированный пользователь"
                                        onClick={(e) => { e.stopPropagation(); showToast("Верифицированный пользователь", "info"); }}
                                        className="cursor-pointer"
                                    >
                                        <BadgeCheck size={20} className="text-blue-400 fill-blue-400/20" />
                                    </div>
                                )}
                            </h1>
                            <p className="text-sm text-white/40 font-mono">@{chat.user.username}</p>
                        </div>

                        {/* Info Cards */}
                        <div className="w-full space-y-3">
                            {/* Bio Card */}
                            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                                <h4 className="text-[10px] font-bold uppercase text-vellor-red tracking-wider mb-2 flex items-center gap-2">
                                    <Info size={12}/> О себе
                                </h4>
                                <p className="text-sm font-medium text-white/80 leading-relaxed whitespace-pre-wrap">
                                    {chat.user.bio || 'Информация не заполнена.'}
                                </p>
                            </div>

                            {/* Contact Details */}
                            <div className="p-4 bg-black/30 border border-white/5 rounded-2xl space-y-3">
                                <div className="flex items-center gap-3 opacity-70">
                                    <Mail size={16} />
                                    <span className="text-xs">{chat.user.email || 'Скрыто'}</span>
                                </div>
                                <div className="flex items-center gap-3 opacity-70">
                                    <Calendar size={16} />
                                    <span className="text-xs">
                                        {chat.user.created_at 
                                            ? `Участник с ${new Date(chat.user.created_at).toLocaleDateString()}` 
                                            : 'Дата регистрации скрыта'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 opacity-70">
                                    <User size={16} />
                                    <span className="text-xs font-mono text-[10px] opacity-50">ID: {chat.user.id}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </MDiv>
            )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="p-2 md:p-4 bg-black/50 backdrop-blur-3xl border-t border-[var(--border)] z-30 relative pb-safe-bottom">
             {/* Reply / Edit Overlays */}
             {(editingMessageId || replyingTo) && (
                 <div className="absolute -top-12 left-0 w-full bg-[#0a0a0a]/90 backdrop-blur-md border-t border-white/10 p-2 px-4 flex items-center justify-between z-10 border-b border-white/5">
                     <div className="flex items-center gap-3 overflow-hidden">
                         <div className="w-1 self-stretch bg-vellor-red rounded-full" />
                         <div className="flex flex-col min-w-0">
                             <div className="flex items-center gap-2">
                                 {editingMessageId ? <Edit2 size={12} className="text-vellor-red"/> : <Reply size={12} className="text-vellor-red"/>}
                                 <span className="text-[10px] font-bold text-vellor-red uppercase tracking-wide">{editingMessageId ? 'Редактирование' : `Ответ ${replyingTo?.senderId === 'me' || replyingTo?.senderId === myId ? 'себе' : ''}`}</span>
                             </div>
                             <p className="text-xs text-white/70 truncate max-w-[200px]">{editingMessageId ? 'Исправьте сообщение' : replyingTo?.text || 'Медиа'}</p>
                         </div>
                     </div>
                     <button onClick={() => { setEditingMessageId(null); setReplyingTo(null); setInputText(''); }} className="p-2 hover:text-white text-gray-400"><X size={16}/></button>
                 </div>
             )}

             {/* Pending File Preview */}
             {pendingFile && (
                 <MDiv initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute -top-28 left-4 w-32 p-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20">
                     <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5 mb-1 group">
                         {pendingFile.type === 'image' ? <img src={pendingFile.url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-white/50"><FileText size={24} /></div>}
                         <button onClick={() => setPendingFile(null)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X size={10} /></button>
                     </div>
                 </MDiv>
             )}

             <div className="flex items-end gap-2 max-w-5xl mx-auto relative">
                {!isRecording ? (
                  <>
                    <div className="relative">
                        <button onClick={() => setShowAttachments(!showAttachments)} className={`p-3 rounded-2xl transition-all ${showAttachments ? 'bg-vellor-red text-white' : 'text-gray-400 hover:text-white bg-white/5'}`}><Paperclip size={20}/></button>
                        <AnimatePresence>
                            {showAttachments && (
                                <MDiv initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} className="absolute bottom-14 left-0 w-40 bg-black/95 border border-white/10 p-1.5 rounded-2xl shadow-2xl overflow-hidden z-[100]">
                                    <button onClick={() => { setUploadingType('image'); setTimeout(() => fileInputRef.current?.click(), 50); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors"><ImageIcon size={16} className="text-vellor-red"/> Фото</button>
                                    <button onClick={() => { setUploadingType('file'); setTimeout(() => fileInputRef.current?.click(), 50); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors"><FileText size={16} className="text-vellor-red"/> Файл</button>
                                </MDiv>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex-1 bg-white/5 border border-white/10 rounded-[1.2rem] focus-within:border-vellor-red/40 transition-all flex items-end px-2 relative min-h-[44px]">
                        <textarea 
                            value={inputText} 
                            onChange={handleInputChange} 
                            onPaste={handlePaste}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                            placeholder={pendingFile ? "Подпись..." : "Сообщение..."}
                            className="w-full bg-transparent text-white py-3 px-2 max-h-32 min-h-[44px] resize-none outline-none custom-scrollbar text-[15px] leading-snug" 
                        />
                        <button onClick={() => setShowEmojis(!showEmojis)} className={`p-2.5 mb-0.5 transition-colors ${showEmojis ? 'text-vellor-red' : 'text-gray-500 hover:text-white'}`}><Smile size={20}/></button>
                    </div>

                    {inputText.trim() || pendingFile ? (
                        <button onClick={handleSend} disabled={isUploading} className="p-3 bg-vellor-red rounded-2xl text-white shadow-lg shadow-vellor-red/20 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100">
                            {isUploading ? <Loader2 className="animate-spin" size={20}/> : (editingMessageId ? <Check size={20}/> : <Send size={20}/>)}
                        </button>
                    ) : (
                        <button onClick={startRecording} className="p-3 rounded-2xl bg-white/5 text-gray-400 hover:text-vellor-red hover:bg-white/10 transition-all"><Mic size={20}/></button>
                    )}
                  </>
                ) : (
                  <MDiv initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex items-center justify-between bg-vellor-red/10 border border-vellor-red/20 rounded-[2rem] p-2 pr-4 h-[44px]">
                    <div className="flex items-center gap-4 pl-4"><MDiv animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2.5 h-2.5 rounded-full bg-vellor-red" /><span className="text-sm font-black text-white font-mono">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span></div>
                    <div className="flex items-center gap-3"><button onClick={() => stopRecording(false)} className="p-2 text-white/40 hover:text-white transition-colors"><Trash2 size={18}/></button><button onClick={() => stopRecording(true)} className="p-2 bg-vellor-red rounded-full text-white"><StopCircle size={18}/></button></div>
                  </MDiv>
                )}
             </div>
        </div>
    </div>
  );
};
