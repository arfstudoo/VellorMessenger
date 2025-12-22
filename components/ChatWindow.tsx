
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Paperclip, Smile, Mic, Phone, Video, Info, Image as ImageIcon, FileText, Trash2, StopCircle, X, Edit2, Crown, LogOut, Check, Loader2, Reply, BadgeCheck, Mail, Calendar, User, ArrowDown, Users, Search, Plus, Save, MapPin } from 'lucide-react';
import { Chat, MessageType, CallType, UserStatus, User as UserType } from '../types';
import { supabase } from '../supabaseClient';
import { ToastType } from './Toast';
import { MessageItem } from './chat/MessageItem';
import { ProfileModal } from './modals/ProfileModal';

const MDiv = motion.div as any;
const MImg = motion.img as any;
const MButton = motion.button as any;

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
  onLeaveGroup?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  typingUserNames?: string[]; 
  onUpdateGroupInfo?: (groupId: string, description: string) => void;
}

const QUICK_REACTIONS = ["❤️", "👍", "🔥", "😂", "😮", "😢"];
const EMOJI_LIST = ["😀","😃","😄","😁","😆","😅","😂","🤣","🥲","🥹","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥸","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😶‍🌫️","😱","😨","ox","🤔","🤫","🤭","🫢","🫡","🫠","🤥","😶","🫥","😐","🫤","😑","🫨","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","😵‍💫","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀","☠️","👽","👾","🤖","🎃","😺","😺","😹","😻","😼","😽","🙀","😿","😾","🫶","👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","🫷","🫸","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏"];

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
    chat, myId, onBack, isMobile, onSendMessage, markAsRead, onStartCall, isPartnerTyping, onSendTypingSignal, wallpaper,
    onEditMessage, onDeleteMessage, onPinMessage, onlineUsers, showToast, onLeaveGroup, onDeleteGroup, typingUserNames = [], onUpdateGroupInfo
}) => {
  const [inputText, setInputText] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [pendingFile, setPendingFile] = useState<{file: File, url: string, type: MessageType} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<UserType[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescText, setEditDescText] = useState("");

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: any } | null>(null);
  const [uploadingType, setUploadingType] = useState<MessageType | null>(null);

  // New state for viewing member profile from chat
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<any | null>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const lastMessageTimeRef = useRef(0);

  const pinnedMessage = chat.messages.find(m => m.isPinned);

  // ESCAPE KEY HANDLER
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showUserInfo) setShowUserInfo(false);
        else if (zoomedImage) setZoomedImage(null);
        else onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUserInfo, zoomedImage, onBack]);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
      if (messagesContainerRef.current) {
          const { scrollHeight, clientHeight } = messagesContainerRef.current;
          messagesContainerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior });
          setIsAtBottom(true);
          setShowScrollButton(false);
      }
  };

  const handleScroll = () => {
      if (messagesContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
          const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
          setIsAtBottom(isBottom);
          setShowScrollButton(!isBottom);
      }
  };

  useEffect(() => {
      markAsRead(chat.id);
      if (isAtBottom) {
          scrollToBottom(chat.messages.length > 20 ? 'smooth' : 'auto');
      }
  }, [chat.messages.length, chat.id]);

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
                        return { 
                            ...m, 
                            user: { 
                                id: p?.id || m.user_id, 
                                name: p?.full_name || 'Unknown', 
                                avatar: p?.avatar_url || '', 
                                username: p?.username, 
                                isVerified: p?.is_verified, 
                                bio: p?.bio, 
                                email: p?.email, 
                                created_at: p?.created_at,
                                nameColor: p?.name_color, 
                                banner: p?.banner_url
                            } 
                        };
                    }));
                }
            }
        };
        fetchMembers();
    }
  }, [chat.id, chat.user.isGroup, showUserInfo]);

  const handleViewMemberProfile = (userId: string) => {
      const member = groupMembers.find(m => m.user.id === userId);
      if (member) {
          setSelectedMemberProfile(member.user);
      }
  };

  // ... (Rest of component functions like useEffect, handlers etc.) ...
  useEffect(() => {
      if (!isAddingMember || !memberSearchQuery.trim()) {
          setMemberSearchResults([]);
          return;
      }
      
      const searchUsers = async () => {
          setIsSearchingMembers(true);
          const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .or(`username.ilike.%${memberSearchQuery}%,full_name.ilike.%${memberSearchQuery}%`)
              .limit(10);
          
          if (!error && data) {
              const mappedUsers: UserType[] = data.map(p => ({
                  id: p.id,
                  name: p.full_name,
                  username: p.username,
                  avatar: p.avatar_url,
                  status: p.status || 'offline',
                  isVerified: p.is_verified,
                  nameColor: p.name_color,
                  banner: p.banner_url
              }));
              setMemberSearchResults(mappedUsers.filter(u => !groupMembers.some(gm => gm.user.id === u.id)));
          }
          setIsSearchingMembers(false);
      };
      
      const timeout = setTimeout(searchUsers, 500);
      return () => clearTimeout(timeout);
  }, [memberSearchQuery, isAddingMember, groupMembers]);

  const handleAddMember = async (user: UserType) => {
      try {
          const { error } = await supabase.from('group_members').insert({
              group_id: chat.id,
              user_id: user.id,
              is_admin: false
          });
          
          if (error) throw error;
          
          showToast(`${user.name} добавлен в группу`, "success");
          onSendMessage(chat.id, `добавил(а) ${user.name}`, 'system');
          setIsAddingMember(false);
          setMemberSearchQuery("");
          
          const newMember = { 
              group_id: chat.id, 
              user_id: user.id, 
              is_admin: false, 
              user: user 
          };
          setGroupMembers(prev => [...prev, newMember]);
      } catch(e) {
          showToast("Ошибка добавления участника", "error");
      }
  };

  useEffect(() => {
      const handleClick = () => setContextMenu(null);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, message: any) => {
      e.preventDefault();
      let x = e.clientX;
      let y = e.clientY;
      if (x > window.innerWidth - 200) x = window.innerWidth - 210;
      if (y > window.innerHeight - 300) y = window.innerHeight - 310;
      setContextMenu({ x, y, message });
  }, []);

  const handleCopyMessage = async (text: string) => {
      try {
          await navigator.clipboard.writeText(text);
          showToast("Скопировано", "success");
      } catch (err) {
          showToast("Ошибка копирования", "error");
      }
      setContextMenu(null);
  };

  const handleToggleReaction = useCallback(async (messageId: string, emoji: string) => {
      setContextMenu(null);
      const message = chat.messages.find(m => m.id === messageId);
      if (!message) return;
      const currentReactions = message.reactions || [];
      const hasReacted = currentReactions.some(r => r.emoji === emoji && r.senderId === myId);
      let newReactions = hasReacted 
          ? currentReactions.filter(r => !(r.emoji === emoji && r.senderId === myId)) 
          : [...currentReactions, { emoji, senderId: myId }];
      await supabase.from('messages').update({ reactions: newReactions }).eq('id', messageId);
  }, [chat.messages, myId]);

  const handleSendLocation = () => {
      if (!navigator.geolocation) {
          showToast("Геолокация не поддерживается вашим устройством", "error");
          return;
      }
      
      setShowAttachments(false);
      showToast("Определение местоположения...", "info");

      navigator.geolocation.getCurrentPosition(
          (position) => {
              const { latitude, longitude } = position.coords;
              const staticMapUrl = `https://static-maps.yandex.ru/1.x/?ll=${longitude},${latitude}&z=15&l=map&pt=${longitude},${latitude},pm2rdm&theme=dark`;
              
              onSendMessage(
                  chat.id, 
                  `${latitude},${longitude}`, 
                  'location', 
                  staticMapUrl,
                  undefined, 
                  undefined, 
                  undefined, 
                  replyingTo?.id
              );
          },
          (error) => {
              console.error("Location Error:", error);
              showToast("Не удалось получить геопозицию. Разрешите доступ.", "error");
          }
      );
  };

  const handleSend = async () => { 
    if (!inputText.trim() && !pendingFile) return; 
    if (isUploading) return;

    const now = Date.now();
    if (now - lastMessageTimeRef.current < 300) { 
        showToast("Помедленнее! Вы отправляете слишком часто.", "warning");
        return;
    }
    lastMessageTimeRef.current = now;

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
        scrollToBottom('smooth');
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onSendTypingSignal(false); 
    setShowEmojis(false); 
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    
    if (!typingTimeoutRef.current) {
        onSendTypingSignal(true);
        typingTimeoutRef.current = setTimeout(() => { 
            onSendTypingSignal(false); 
            typingTimeoutRef.current = null; 
        }, 2000);
    }
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
        scrollToBottom('smooth');
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

  const scrollToMessage = useCallback((messageId: string) => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'background 0.3s';
          const originalBg = el.style.backgroundColor;
          el.style.backgroundColor = 'rgba(255, 0, 51, 0.2)';
          setTimeout(() => { el.style.backgroundColor = originalBg; }, 1000);
      }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingType) return;
    setPendingFile({ file, url: URL.createObjectURL(file), type: uploadingType });
    setShowAttachments(false);
    setUploadingType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveGroupDescription = () => {
      if (!onUpdateGroupInfo) return;
      onUpdateGroupInfo(chat.id, editDescText);
      setIsEditingDesc(false);
  };

  const addEmoji = (emoji: string) => {
      setInputText(prev => prev + emoji);
  };

  const statusColors = { online: 'bg-vellor-red', away: 'bg-yellow-500', dnd: 'bg-crimson', offline: 'bg-gray-600' };
  
  const realtimeStatus = onlineUsers.has(chat.user.id) ? (onlineUsers.get(chat.user.id) || 'online') : 'offline';
  
  const isSuperAdmin = chat.user.username?.toLowerCase() === 'arfstudoo';
  const isOwner = chat.ownerId === myId;

  // BANNER LOGIC
  const defaultBanner = `linear-gradient(135deg, #${chat.user.id.slice(0,6)} 0%, #000000 100%)`;
  const infoBanner = chat.user.banner || defaultBanner;

  // IMPROVED TYPING TEXT LOGIC
  let typingText = "";
  if (chat.user.isGroup) {
      if (typingUserNames.length > 0) {
          typingText = typingUserNames.length === 1 
              ? `${typingUserNames[0]} печатает...` 
              : `${typingUserNames.length} чел. печатают...`;
      } else {
          typingText = "группа";
      }
  } else {
      if (typingUserNames.length > 0) {
          typingText = "печатает...";
      } else {
          typingText = realtimeStatus === 'online' ? 'в сети' : 'был(а) недавно';
      }
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-black/10">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept={uploadingType === 'image' ? "image/*" : "*"} />
        
        {/* Read-only Profile Modal */}
        <AnimatePresence>
            {selectedMemberProfile && (
                <MDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <MDiv initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-sm h-[80vh] overflow-hidden rounded-[2rem] shadow-2xl relative">
                        <ProfileModal 
                            userProfile={selectedMemberProfile}
                            onUpdateProfile={() => {}} // No-op, readonly
                            onSaveProfile={async () => {}} // No-op
                            onClose={() => setSelectedMemberProfile(null)}
                            isReadOnly={true}
                        />
                        {/* Overlay to block editing */}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent z-30 flex items-center justify-center">
                            <button onClick={() => setSelectedMemberProfile(null)} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-xs font-bold backdrop-blur-md transition-colors">Закрыть</button>
                        </div>
                    </MDiv>
                </MDiv>
            )}
        </AnimatePresence>

        <div className="h-14 flex items-center justify-between px-2 md:px-6 bg-black/40 backdrop-blur-3xl z-30 border-b border-[var(--border)] shrink-0">
            {/* ... rest of the header ... */}
            <div className="flex items-center gap-1 md:gap-4 overflow-hidden">
                {isMobile && <button onClick={onBack} className="text-white p-3 -ml-2 hover:bg-white/5 rounded-full active:scale-95 transition-transform"><ArrowLeft size={22}/></button>}
                <div className="relative cursor-pointer shrink-0" onClick={() => setShowUserInfo(true)}>
                    <div className="w-9 h-9 rounded-full bg-gray-800 overflow-hidden border border-white/5">
                      <img src={chat.user.avatar || 'https://via.placeholder.com/44'} className="w-full h-full object-cover" alt="Avatar"/>
                    </div>
                    {!chat.user.isGroup && (
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black ${statusColors[realtimeStatus] || statusColors.offline}`} />
                    )}
                </div>
                <div className="cursor-pointer min-w-0" onClick={() => setShowUserInfo(true)}>
                    <h3 className="font-bold text-white text-sm tracking-tight leading-none mb-0.5 flex items-center gap-1.5 truncate">
                        {chat.user.name}
                        {isSuperAdmin && <Crown size={12} className="text-yellow-400 fill-yellow-400" />}
                        {chat.user.isVerified && <BadgeCheck size={12} className="text-blue-400 fill-blue-400/20" />}
                    </h3>
                    {typingUserNames.length > 0 ? (
                        <p className="text-[10px] text-vellor-red font-bold animate-pulse truncate max-w-[150px] md:max-w-[200px]">{typingText}</p>
                    ) : (
                        <p className="text-[10px] font-medium text-white/40 truncate">{typingText}</p>
                    )}
                </div>
            </div>
            <div className="flex gap-0 md:gap-2 shrink-0">
                <button onClick={() => onStartCall(chat.id, 'audio')} className="text-white/60 hover:text-white p-3 transition-all active:scale-90 active:text-vellor-red"><Phone size={20} /></button>
                <button onClick={() => onStartCall(chat.id, 'video')} className="text-white/60 hover:text-white p-3 transition-all active:scale-90 active:text-vellor-red"><Video size={20} /></button>
                <button onClick={() => setShowUserInfo(!showUserInfo)} className="text-white/60 hover:text-white p-3 transition-all active:scale-90"><Info size={20} /></button>
            </div>
        </div>

        {/* ... Rest of ChatWindow (Message List, Input, etc) ... */}
        <AnimatePresence>
            {pinnedMessage && (
                <MDiv onClick={() => scrollToMessage(pinnedMessage.id)} initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="bg-black/40 backdrop-blur-md border-b border-vellor-red/20 flex items-center gap-3 px-4 py-1.5 cursor-pointer z-20">
                    <div className="w-0.5 h-6 bg-vellor-red rounded-full" />
                    <div className="flex-1 min-w-0"><p className="text-[9px] font-bold text-vellor-red uppercase">Pinned</p><p className="text-[11px] text-white/80 truncate">{pinnedMessage.text || 'Media'}</p></div>
                </MDiv>
            )}
        </AnimatePresence>

        <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-2 md:p-6 space-y-1 custom-scrollbar relative z-10 scroll-smooth touch-pan-y">
            {chat.messages.map((msg) => (
                <MessageItem 
                    key={msg.id} 
                    msg={msg} 
                    isMe={msg.senderId === 'me' || msg.senderId === myId} 
                    chatUser={chat.user} 
                    groupMembers={groupMembers} 
                    myId={myId} 
                    onContextMenu={handleContextMenu} 
                    onReply={(m: any) => setReplyingTo(m)} 
                    scrollToMessage={scrollToMessage} 
                    setZoomedImage={setZoomedImage} 
                    chatMessages={chat.messages} 
                    handleToggleReaction={handleToggleReaction}
                    onShowProfile={handleViewMemberProfile}
                />
            ))}
        </div>
        
        {showScrollButton && (
            <button onClick={() => scrollToBottom('smooth')} className="absolute bottom-20 right-4 z-50 p-2 bg-black/80 border border-white/10 rounded-full text-white shadow-xl hover:bg-vellor-red transition-colors animate-bounce">
                <ArrowDown size={20} />
            </button>
        )}

        {/* Context Menu, Zoom Image, Side Panel, Input Area... (Standard Components) */}
        <AnimatePresence>
            {contextMenu && (
                <MDiv initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[100] w-60 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl origin-top-left overflow-hidden flex flex-col gap-1" onClick={(e: any) => e.stopPropagation()}>
                    <div className="p-2 bg-white/5 rounded-xl mb-1 flex justify-between gap-1">
                        {QUICK_REACTIONS.map(emoji => <MButton key={emoji} whileHover={{ scale: 1.2 }} onClick={() => handleToggleReaction(contextMenu.message.id, emoji)} className="text-xl p-1">{emoji}</MButton>)}
                    </div>
                    {contextMenu.message.type === 'text' && (
                         <button onClick={() => handleCopyMessage(contextMenu.message.text)} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors active:scale-95 text-white">
                             Копировать
                        </button>
                    )}
                    <button onClick={() => { setReplyingTo(contextMenu.message); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors active:scale-95 text-white">
                        <Reply size={14} className="text-white/60" /> Ответить
                    </button>
                    <button onClick={() => { onPinMessage(contextMenu.message.id, contextMenu.message.isPinned || false); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors active:scale-95 text-white">
                        {contextMenu.message.isPinned ? 'Открепить' : 'Закрепить'}
                    </button>
                    {(contextMenu.message.senderId === 'me' || contextMenu.message.senderId === myId) && contextMenu.message.type === 'text' && (
                        <button onClick={() => { setEditingMessageId(contextMenu.message.id); setInputText(contextMenu.message.text); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors active:scale-95 text-white"><Edit2 size={14} className="text-white/60" /> Изменить</button>
                    )}
                    <div className="h-px bg-white/10 my-1" />
                    <button onClick={() => { onDeleteMessage(contextMenu.message.id); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-colors active:scale-95"><Trash2 size={14} /> Удалить</button>
                </MDiv>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {zoomedImage && (
                <MDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setZoomedImage(null)}>
                    <MImg src={zoomedImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} onClick={(e: any) => e.stopPropagation()} />
                    <button className="absolute top-4 right-4 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white active:scale-90"><X size={24} /></button>
                </MDiv>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {showUserInfo && (
                <MDiv initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute top-0 right-0 w-full md:w-[400px] h-full bg-[#0a0a0a] border-l border-white/10 z-[50] flex flex-col shadow-2xl">
                    
                    {/* CUSTOM INFO HEADER WITH BANNER */}
                    <div className="relative h-32 shrink-0">
                        <div className="absolute inset-0 transition-all duration-500" style={{ background: infoBanner }} />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]" />
                        <div className="absolute top-0 left-0 w-full h-16 flex items-center justify-between px-6 z-10">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90 drop-shadow-md">ИНФОРМАЦИЯ</h2>
                            <button onClick={() => { setShowUserInfo(false); setIsAddingMember(false); setIsEditingDesc(false); }} className="p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 hover:text-white transition-all active:scale-90 border border-white/10"><X size={18}/></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 flex flex-col items-center -mt-16 relative z-10">
                        <div className="w-32 h-32 rounded-[2rem] p-1 border-4 border-[#0a0a0a] bg-black/50 relative mb-4 shadow-2xl group">
                            <div className="w-full h-full rounded-[1.7rem] overflow-hidden relative">
                                <img src={chat.user.avatar || 'https://via.placeholder.com/400'} className="w-full h-full object-cover" alt="" />
                            </div>
                            {isSuperAdmin && <div className="absolute -top-3 -right-3 bg-black/90 p-2 rounded-full border border-yellow-500/50 shadow-xl shadow-yellow-500/20"><Crown size={20} className="text-yellow-400 fill-yellow-400" /></div>}
                        </div>
                        <div className="text-center space-y-1">
                            <h1 className="text-2xl font-black text-white flex items-center justify-center gap-2" style={{ color: chat.user.nameColor || 'white' }}>
                                {chat.user.name}
                                {chat.user.isVerified && <BadgeCheck size={20} className="text-blue-400 fill-blue-400/20" />}
                            </h1>
                            <p className="text-sm text-white/40 font-mono">@{chat.user.username}</p>
                        </div>
                        
                        {isAddingMember ? (
                            <MDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <button onClick={() => setIsAddingMember(false)} className="p-3 hover:bg-white/10 rounded-full text-white/50 hover:text-white active:scale-90"><ArrowLeft size={16}/></button>
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-white">Добавить участника</h4>
                                </div>
                                <div className="relative group">
                                    <Search className="absolute left-3 top-3 text-white/30" size={16} />
                                    <input autoFocus value={memberSearchQuery} onChange={(e) => setMemberSearchQuery(e.target.value)} placeholder="Поиск по юзернейму..." className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-vellor-red/30 outline-none transition-all text-white" />
                                </div>
                                <div className="space-y-2">
                                    {isSearchingMembers ? <div className="flex justify-center p-4"><Loader2 className="animate-spin text-white/30" /></div> : 
                                     memberSearchResults.map(user => (
                                        <button key={user.id} onClick={() => handleAddMember(user)} className="w-full p-3 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-all text-left active:scale-98">
                                            <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden shrink-0"><img src={user.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" /></div>
                                            <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate text-white">{user.name}</p><p className="text-[10px] opacity-40 truncate">@{user.username}</p></div>
                                            <div className="p-1.5 bg-vellor-red/20 text-vellor-red rounded-full"><Plus size={14}/></div>
                                        </button>
                                    ))}
                                    {!isSearchingMembers && memberSearchQuery && memberSearchResults.length === 0 && <p className="text-center text-[10px] opacity-30 text-white">Никого не найдено</p>}
                                </div>
                            </MDiv>
                        ) : (
                            <div className="w-full space-y-3">
                                <div className="p-5 bg-white/5 border border-white/5 rounded-2xl relative group/desc">
                                    <h4 className="text-[10px] font-bold uppercase text-vellor-red tracking-wider mb-2 flex items-center gap-2"><Info size={12}/> О себе</h4>
                                    
                                    {isEditingDesc ? (
                                        <div className="space-y-2">
                                            <textarea 
                                                value={editDescText} 
                                                onChange={(e) => setEditDescText(e.target.value)}
                                                className="w-full bg-black/40 p-2 rounded-lg text-sm text-white border border-white/10 outline-none focus:border-vellor-red/50"
                                                rows={3}
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setIsEditingDesc(false)} className="px-3 py-1 bg-white/5 rounded-lg text-xs hover:bg-white/10 text-white">Отмена</button>
                                                <button onClick={saveGroupDescription} className="px-3 py-1 bg-vellor-red rounded-lg text-xs font-bold text-white hover:bg-red-600 flex items-center gap-1"><Save size={12}/> Сохранить</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm font-medium text-white/80 leading-relaxed whitespace-pre-wrap">{chat.user.bio || 'Информация не заполнена.'}</p>
                                            {isOwner && chat.user.isGroup && (
                                                <button onClick={() => { setIsEditingDesc(true); setEditDescText(chat.user.bio || ""); }} className="absolute top-4 right-4 p-1.5 bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors opacity-0 group-hover/desc:opacity-100">
                                                    <Edit2 size={12}/>
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                                
                                {chat.user.isGroup && (
                                    <div className="p-4 bg-black/30 border border-white/5 rounded-2xl space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-white/50"><Users size={14}/><span className="text-[10px] font-bold uppercase tracking-wider">Участники ({groupMembers.length})</span></div>
                                            <button onClick={() => setIsAddingMember(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-vellor-red transition-colors active:scale-90" title="Добавить участника"><Plus size={16}/></button>
                                        </div>
                                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                            {groupMembers.map(member => {
                                                const status = onlineUsers.has(member.user.id) ? 'online' : 'offline';
                                                return (
                                                    <div 
                                                        key={member.user.id} 
                                                        className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                                                        onClick={() => setSelectedMemberProfile(member.user)}
                                                    >
                                                        <div className="relative">
                                                            <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden"><img src={member.user.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" /></div>
                                                            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-black rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                                                                {member.user.name}
                                                                {member.is_admin && <Crown size={10} className="text-yellow-500 fill-yellow-500" />}
                                                            </p>
                                                            <p className="text-[9px] opacity-40 truncate">@{member.user.username}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 bg-black/30 border border-white/5 rounded-2xl space-y-3">
                                    {!chat.user.isGroup && (
                                        <div className="flex items-center gap-3 opacity-70 text-white"><Mail size={16} /><span className="text-xs">{chat.user.email || 'Скрыто'}</span></div>
                                    )}
                                    <div className="flex items-center gap-3 opacity-70 text-white">
                                        <Calendar size={16} />
                                        <div className="flex flex-col">
                                            <span className="text-xs">{chat.user.isGroup ? 'Дата создания:' : 'Участник с:'}</span>
                                            <span className="text-xs font-bold text-white/90">
                                                {chat.user.username === 'arfstudoo' ? (
                                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 font-black">Early Access / R&D</span>
                                                ) : (
                                                    chat.user.created_at ? new Date(chat.user.created_at).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Неизвестно'
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 opacity-70 text-white"><User size={16} /><span className="text-xs font-mono text-[10px] opacity-50">ID: {chat.user.id}</span></div>
                                </div>
                                {chat.user.isGroup && (
                                    <>
                                        {onLeaveGroup && (
                                            <button onClick={() => onLeaveGroup(chat.id)} className="w-full py-4 mt-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 font-bold uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95">
                                                <LogOut size={16} /> Покинуть группу
                                            </button>
                                        )}
                                        {/* DELETE GROUP BUTTON (Only for owner) */}
                                        {onDeleteGroup && chat.ownerId === myId && (
                                            <button onClick={() => onDeleteGroup(chat.id)} className="w-full py-4 bg-black/40 border border-red-500 rounded-2xl text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.15)] active:scale-95">
                                                <Trash2 size={16} /> Удалить группу
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </MDiv>
            )}
        </AnimatePresence>

        {/* BOTTOM INPUT */}
        <div className="p-2 md:p-4 bg-black/50 backdrop-blur-3xl border-t border-[var(--border)] z-30 relative pb-[env(safe-area-inset-bottom)]">
             {/* ... Input elements ... */}
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
                     <button onClick={() => { setEditingMessageId(null); setReplyingTo(null); setInputText(''); }} className="p-2 hover:text-white text-gray-400 active:scale-90"><X size={16}/></button>
                 </div>
             )}

             {pendingFile && (
                 <MDiv initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute -top-28 left-4 w-32 p-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20">
                     <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5 mb-1 group">
                         {pendingFile.type === 'image' ? <img src={pendingFile.url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-white/50"><FileText size={24} /></div>}
                         <button onClick={() => setPendingFile(null)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 active:scale-90"><X size={10} /></button>
                     </div>
                 </MDiv>
             )}

             <div className="flex items-end gap-2 max-w-5xl mx-auto relative mb-1">
                {!isRecording ? (
                  <>
                    <div className="relative">
                        <button onClick={() => setShowAttachments(!showAttachments)} className={`p-3 rounded-2xl transition-all active:scale-90 ${showAttachments ? 'bg-vellor-red text-white' : 'text-gray-400 hover:text-white bg-white/5'}`}><Paperclip size={20}/></button>
                        <AnimatePresence>
                            {showAttachments && (
                                <MDiv initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} className="absolute bottom-14 left-0 w-48 bg-black/95 border border-white/10 p-1.5 rounded-2xl shadow-2xl overflow-hidden z-[100]">
                                    <button onClick={() => { setUploadingType('image'); setTimeout(() => fileInputRef.current?.click(), 50); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors active:scale-95 text-white"><ImageIcon size={16} className="text-vellor-red"/> Фото</button>
                                    <button onClick={() => { setUploadingType('file'); setTimeout(() => fileInputRef.current?.click(), 50); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors active:scale-95 text-white"><FileText size={16} className="text-vellor-red"/> Файл</button>
                                    <button onClick={handleSendLocation} className="flex items-center gap-3 w-full p-3 hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors active:scale-95 text-white"><MapPin size={16} className="text-vellor-red"/> Локация</button>
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
                        <button onClick={() => setShowEmojis(!showEmojis)} className={`p-2.5 mb-0.5 transition-colors active:scale-90 ${showEmojis ? 'text-vellor-red' : 'text-gray-500 hover:text-white'}`}><Smile size={20}/></button>
                        
                        <AnimatePresence>
                            {showEmojis && (
                                <MDiv 
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute bottom-12 right-0 w-full max-w-[320px] h-[300px] bg-black/95 border border-white/10 rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden backdrop-blur-2xl"
                                >
                                    <div className="p-3 border-b border-white/5 flex justify-between items-center">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Emoji</span>
                                        <button onClick={() => setShowEmojis(false)} className="text-white"><X size={14}/></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 grid grid-cols-7 gap-1">
                                        {EMOJI_LIST.map((emoji, idx) => (
                                            <button key={idx} onClick={() => addEmoji(emoji)} className="text-2xl p-2 hover:bg-white/10 rounded-lg transition-colors">{emoji}</button>
                                        ))}
                                    </div>
                                </MDiv>
                            )}
                        </AnimatePresence>
                    </div>

                    {inputText.trim() || pendingFile ? (
                        <button 
                            onClick={handleSend} 
                            onMouseDown={(e) => e.preventDefault()} 
                            disabled={isUploading} 
                            className="p-3 bg-vellor-red rounded-2xl text-white shadow-lg shadow-vellor-red/20 active:scale-90 transition-transform disabled:opacity-50 disabled:scale-100 touch-manipulation"
                            type="button"
                        >
                            {isUploading ? <Loader2 className="animate-spin" size={20}/> : (editingMessageId ? <Check size={20}/> : <Send size={20}/>)}
                        </button>
                    ) : (
                        <button onClick={startRecording} className="p-3 rounded-2xl bg-white/5 text-gray-400 hover:text-vellor-red hover:bg-white/10 transition-all active:scale-90"><Mic size={20}/></button>
                    )}
                  </>
                ) : (
                  <MDiv initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex items-center justify-between bg-vellor-red/10 border border-vellor-red/20 rounded-[2rem] p-2 pr-4 h-[44px]">
                    <div className="flex items-center gap-4 pl-4"><MDiv animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2.5 h-2.5 rounded-full bg-vellor-red" /><span className="text-sm font-black text-white font-mono">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span></div>
                    <div className="flex items-center gap-3"><button onClick={() => stopRecording(false)} className="p-2 text-white/40 hover:text-white transition-colors active:scale-90"><Trash2 size={18}/></button><button onClick={() => stopRecording(true)} className="p-2 bg-vellor-red rounded-full text-white active:scale-90"><StopCircle size={18}/></button></div>
                  </MDiv>
                )}
             </div>
        </div>
    </div>
  );
};
