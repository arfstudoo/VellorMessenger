
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Paperclip, Smile, Mic, Phone, Video, Info, Image as ImageIcon, FileText, Trash2, StopCircle, X, Edit2, Crown, LogOut, Check, Loader2, Reply, BadgeCheck, Mail, Calendar, User, ArrowDown, Users, Search, Plus, Save, MapPin, Lock, CalendarDays, Forward, AtSign } from 'lucide-react';
import { Chat, MessageType, CallType, UserStatus, User as UserType, UserProfile } from '../types';
import { supabase } from '../supabaseClient';
import { ToastType } from './Toast';
import { MessageItem } from './chat/MessageItem';
import { ProfileModal } from './modals/ProfileModal';
import { throttle } from '../utils/performance';
import { LazyImage } from './ui/LazyImage';
import { saveDraft, getDraft, removeDraft } from '../utils/drafts';

const MDiv = motion.div as any;
const MImg = motion.img as any;
const MButton = motion.button as any;

interface ChatWindowProps {
  chat: Chat;
  myId: string;
  onBack: () => void;
  isMobile: boolean;
  onSendMessage: (chatId: string, text: string, type?: MessageType, mediaUrl?: string, duration?: string, fileName?: string, fileSize?: string, replyToId?: string, forwardedFrom?: string, forwardedFromName?: string) => void;
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
  userProfile?: UserProfile;
  allChats?: Chat[]; // Для пересылки сообщений
}

const QUICK_REACTIONS = ["❤️", "👍", "🔥", "😂", "😮", "😢"];
const EMOJI_LIST = ["😀","😃","😄","😁","😆","😅","😂","🤣","🥲","🥹","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥸","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😶‍🌫️","😱","😨","ox","🤔","🤫","🤭","🫢","🫡","🫠","🤥","😶","🫥","😐","🫤","😑","🫨","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","😵‍💫","🤐","🥴","🤢","🤮","🤧","😖","🤒","🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀","☠️","👽","👾","🤖","🎃","😺","😺","😹","😻","😼","😽","🙀","😿","😾","🫶","👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","🫸","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏"];

// Helper to check same day
const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};

const formatDateSeparator = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Сбрасываем время для корректного сравнения
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDate = new Date(date);
    messageDate.setHours(0, 0, 0, 0); // Сбрасываем время

    if (messageDate.getTime() === today.getTime()) return "Сегодня";
    if (messageDate.getTime() === yesterday.getTime()) return "Вчера";
    
    return date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long', 
        year: today.getFullYear() !== date.getFullYear() ? 'numeric' : undefined 
    });
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
    chat, myId, onBack, isMobile, onSendMessage, markAsRead, onStartCall, isPartnerTyping, onSendTypingSignal, wallpaper,
    onEditMessage, onDeleteMessage, onPinMessage, onlineUsers, showToast, onLeaveGroup, onDeleteGroup, typingUserNames = [], onUpdateGroupInfo, userProfile, allChats = []
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

  // Search in chat
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // Forward message
  const [forwardingMessage, setForwardingMessage] = useState<any | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const lastMessageTimeRef = useRef(0);

  const pinnedMessage = chat.messages.find(m => m.isPinned);

  // --- PRIVACY CHECKS ---
  
  // 1. Check if user hides their status
  // 2. Check if *I* hide my status (reciprocity) - if I hide mine, I can't see theirs.
  const isStatusHidden = !chat.user.isGroup && (
      chat.user.privacy_last_seen === 'nobody' ||
      (userProfile?.privacy_last_seen === 'nobody' && !userProfile.isAdmin) // Reciprocity
  );

  // 1. Check if user hides avatar
  const isAvatarHidden = !chat.user.isGroup && chat.user.privacy_avatar === 'nobody';

  // 1. Check if user allows calls
  const isCallsAllowed = chat.user.isGroup || !chat.user.privacy_calls || chat.user.privacy_calls === 'everybody' || chat.user.privacy_calls === 'contacts'; // Simplified contacts for now

  // ... (Rest of Hooks) ...
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
          // Скроллим на полную высоту контента
          const container = messagesContainerRef.current;
          container.scrollTo({ 
              top: container.scrollHeight,
              behavior 
          });
          setIsAtBottom(true);
          setShowScrollButton(false);
      }
  };

  const handleScroll = useMemo(
    () => throttle(() => {
      if (messagesContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
          const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
          setIsAtBottom(isBottom);
          setShowScrollButton(!isBottom);
      }
    }, 100),
    []
  );

  useEffect(() => {
      // Помечаем сообщения как прочитанные сразу при открытии чата
      console.log('ChatWindow: calling markAsRead for', chat.id);
      markAsRead(chat.id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]);

  // Скролл при первой загрузке чата - мгновенно вниз
  const initialChatIdRef = useRef<string | null>(null);
  
  useEffect(() => {
      // Скроллим вниз при смене чата
      if (initialChatIdRef.current !== chat.id) {
          initialChatIdRef.current = chat.id;
          // Принудительный скролл вниз сразу
          if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
      }
  }, [chat.id]);
  
  // Дополнительный скролл после загрузки сообщений
  useEffect(() => {
      if (messagesContainerRef.current && chat.messages.length > 0) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
  }, [chat.messages.length]);

  // Черновики: загрузка при открытии чата
  useEffect(() => {
      const draft = getDraft(chat.id);
      if (draft && !editingMessageId) {
          setInputText(draft);
      }
  }, [chat.id]);

  // Черновики: сохранение при изменении текста
  useEffect(() => {
      if (!editingMessageId) {
          const timeoutId = setTimeout(() => {
              if (inputText.trim()) {
                  saveDraft(chat.id, inputText);
              } else {
                  removeDraft(chat.id); // Удаляем черновик если текст пустой
              }
          }, 500); // Debounce 500ms
          return () => clearTimeout(timeoutId);
      }
  }, [inputText, chat.id, editingMessageId]);

  useEffect(() => {
    if (chat.user.isGroup) {
        const fetchMembers = async () => {
            const { data: members, error: membersError } = await supabase.from('group_members').select('*').eq('group_id', chat.id);
            
            if (members && members.length > 0) {
                const userIds = members.map(m => m.user_id);
                const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').in('id', userIds);
                
                if (profiles) {
                    const mappedMembers = members.map(m => {
                        const p = profiles.find(pr => pr.id === m.user_id);
                        return { 
                            ...m, 
                            user: { 
                                id: p?.id || m.user_id, 
                                name: p?.full_name || 'Unknown', 
                                avatar: p?.avatar_url || '', 
                                username: p?.username || '',
                                status: p?.status || 'offline',
                                isVerified: p?.is_verified, 
                                bio: p?.bio, 
                                email: p?.email, 
                                created_at: p?.created_at,
                                nameColor: p?.name_color, 
                                banner: p?.banner_url
                            } 
                        };
                    });
                    setGroupMembers(mappedMembers);
                }
            } else {
                setGroupMembers([]);
            }
        };
        fetchMembers();
    }
  }, [chat.id, chat.user.isGroup]);

  const handleViewMemberProfile = (userId: string) => {
      // Для групп - ищем в groupMembers
      if (chat.user.isGroup) {
          const member = groupMembers.find(m => m.user.id === userId);
          if (member) {
              setSelectedMemberProfile(member.user);
              return;
          }
      }
      
      // Для личных чатов - показываем профиль собеседника
      if (!chat.user.isGroup && userId === chat.user.id) {
          setSelectedMemberProfile(chat.user);
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
        removeDraft(chat.id);
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
        removeDraft(chat.id); // Удаляем черновик после отправки
        // Скроллим вниз после отправки своего сообщения
        requestAnimationFrame(() => {
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
        });
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
        // Скроллим вниз после отправки голосового
        requestAnimationFrame(() => {
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
        });
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

  // Поиск по сообщениям
  const handleSearch = useCallback((query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
          setSearchResults([]);
          setCurrentSearchIndex(0);
          return;
      }
      
      const results = chat.messages.filter(msg => 
          msg.text?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
      setCurrentSearchIndex(0);
      
      if (results.length > 0) {
          scrollToMessage(results[0].id);
      }
  }, [chat.messages]);

  const navigateSearch = useCallback((direction: 'next' | 'prev') => {
      if (searchResults.length === 0) return;
      
      let newIndex = currentSearchIndex;
      if (direction === 'next') {
          newIndex = (currentSearchIndex + 1) % searchResults.length;
      } else {
          newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
      }
      
      setCurrentSearchIndex(newIndex);
      scrollToMessage(searchResults[newIndex].id);
  }, [searchResults, currentSearchIndex]);

  // Пересылка сообщений
  const handleForwardMessage = useCallback((message: any) => {
      setForwardingMessage(message);
      setShowForwardModal(true);
  }, []);

  const forwardToChat = useCallback(async (targetChatId: string) => {
      if (!forwardingMessage) return;
      
      const forwardText = forwardingMessage.type === 'text' 
          ? forwardingMessage.text 
          : `[${forwardingMessage.type}]`;
      
      // Получаем информацию об оригинальном отправителе
      let originalSenderId = forwardingMessage.forwardedFrom || forwardingMessage.senderId;
      
      // Конвертируем "me" в реальный UUID
      if (originalSenderId === 'me') {
          originalSenderId = myId;
      }
      
      const originalSenderName = forwardingMessage.forwardedFromName || chat.user.name;
      
      onSendMessage(
          targetChatId, 
          forwardText, 
          forwardingMessage.type,
          forwardingMessage.mediaUrl,
          forwardingMessage.duration,
          forwardingMessage.fileName,
          forwardingMessage.fileSize,
          undefined, // replyToId
          originalSenderId, // forwardedFrom
          originalSenderName // forwardedFromName
      );
      
      setShowForwardModal(false);
      setForwardingMessage(null);
      showToast('Сообщение переслано', 'success');
  }, [forwardingMessage, onSendMessage, showToast, chat.user.name, myId]);

  // Упоминания (@username)
  const handleMentionSelect = useCallback((username: string) => {
      const cursorPos = inputText.lastIndexOf('@');
      if (cursorPos !== -1) {
          const before = inputText.substring(0, cursorPos);
          const after = inputText.substring(cursorPos).replace(/@\w*/, `@${username} `);
          setInputText(before + after);
      }
  }, [inputText]);

  const getMentionSuggestions = useCallback(() => {
      if (!chat.user.isGroup || !inputText.includes('@') || groupMembers.length === 0) return [];
      
      const lastAtIndex = inputText.lastIndexOf('@');
      const textAfterAt = inputText.substring(lastAtIndex + 1);
      
      // Проверяем что после @ нет пробела (иначе упоминание завершено)
      const spaceIndex = textAfterAt.indexOf(' ');
      if (spaceIndex === 0) return []; // Пробел сразу после @
      
      const searchTerm = spaceIndex === -1 ? textAfterAt : textAfterAt.substring(0, spaceIndex);
      
      // Показываем всех если ничего не введено после @
      if (searchTerm.length === 0) {
          return groupMembers.filter(m => m.user.username).slice(0, 5);
      }
      
      // Фильтруем по введенному тексту
      return groupMembers.filter(member => 
          member.user.username?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5);
  }, [inputText, groupMembers, chat.user.isGroup]);

  const mentionSuggestions = getMentionSuggestions();

  const statusColors = { online: 'bg-vellor-red', away: 'bg-yellow-500', dnd: 'bg-crimson', offline: 'bg-gray-600' };
  
  const realtimeStatus = onlineUsers.has(chat.user.id) ? (onlineUsers.get(chat.user.id) || 'online') : 'offline';
  
  const isSuperAdmin = chat.user.username?.toLowerCase() === 'arfstudoo';
  const isOwner = chat.ownerId === myId;

  // BANNER LOGIC
  const defaultBanner = `linear-gradient(135deg, #${chat.user.id.slice(0,6)} 0%, #000000 100%)`;
  const infoBanner = chat.user.banner 
      ? (chat.user.banner.startsWith('http') ? `url(${chat.user.banner}) center/cover no-repeat` : chat.user.banner)
      : defaultBanner;

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
          // PRIVACY CHECK FOR STATUS TEXT
          typingText = isStatusHidden ? 'был(а) недавно' : (realtimeStatus === 'online' ? 'в сети' : 'был(а) недавно');
      }
  }

  // Handle Call Attempt with Privacy Check
  const handleCallAttempt = (type: CallType) => {
      if (!isCallsAllowed) {
          showToast("Пользователь ограничил входящие звонки", "error");
          return;
      }
      onStartCall(chat.id, type);
  };

  // --- RENDER LOGIC WITH SEPARATORS ---
  let unreadSeparatorShown = false;

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

        <div className="h-16 flex items-center justify-between px-4 md:px-6 glass-panel z-30 border-b border-white/10 shrink-0 shadow-lg">
            {/* ... rest of the header ... */}
            <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                {isMobile && <button onClick={onBack} className="text-white p-2.5 -ml-2 glass-panel-light rounded-xl hover:bg-white/10 active:scale-95 transition-all"><ArrowLeft size={22}/></button>}
                <div className="relative cursor-pointer shrink-0 group" onClick={() => setShowUserInfo(true)}>
                    <div className="w-11 h-11 rounded-[1rem] glass-panel overflow-hidden border-2 border-white/10 shadow-lg group-hover:border-white/20 transition-all">
                      {isAvatarHidden ? (
                          <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center"><User size={22} className="text-white/30"/></div>
                      ) : (
                          <LazyImage 
                            src={chat.user.avatar || 'https://via.placeholder.com/44'} 
                            alt="Avatar"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                      )}
                    </div>
                    {!chat.user.isGroup && !isStatusHidden && (
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[3px] border-black shadow-lg ${statusColors[realtimeStatus] || statusColors.offline}`} />
                    )}
                </div>
                <div className="cursor-pointer min-w-0" onClick={() => setShowUserInfo(true)}>
                    <h3 className="font-black text-white text-[15px] tracking-tight leading-none mb-1 flex items-center gap-1.5 truncate">
                        {chat.user.name}
                        {isSuperAdmin && <Crown size={13} className="text-yellow-400 fill-yellow-400 drop-shadow-lg" />}
                        {chat.user.isVerified && <BadgeCheck size={13} className="text-blue-400 fill-blue-400/20" />}
                    </h3>
                    {typingUserNames.length > 0 ? (
                        <p className="text-[11px] text-vellor-red font-black animate-pulse truncate max-w-[150px] md:max-w-[200px] uppercase tracking-wide">{typingText}</p>
                    ) : (
                        <p className="text-[11px] font-bold text-white/50 truncate">{typingText}</p>
                    )}
                </div>
            </div>
            <div className="flex gap-1 shrink-0">
                <button onClick={() => setIsSearching(!isSearching)} className={`text-white/60 hover:text-white p-2.5 glass-panel-light rounded-xl transition-all active:scale-90 hover:bg-white/10 ${isSearching ? 'bg-vellor-red/20 text-vellor-red' : ''}`}><Search size={20} /></button>
                <button onClick={() => handleCallAttempt('audio')} className={`text-white/60 hover:text-white p-2.5 glass-panel-light rounded-xl transition-all active:scale-90 hover:bg-white/10 ${!isCallsAllowed ? 'opacity-30 cursor-not-allowed' : ''}`}><Phone size={20} /></button>
                <button onClick={() => handleCallAttempt('video')} className={`text-white/60 hover:text-white p-2.5 glass-panel-light rounded-xl transition-all active:scale-90 hover:bg-white/10 ${!isCallsAllowed ? 'opacity-30 cursor-not-allowed' : ''}`}><Video size={20} /></button>
                <button onClick={() => setShowUserInfo(!showUserInfo)} className="text-white/60 hover:text-white p-2.5 glass-panel-light rounded-xl transition-all active:scale-90 hover:bg-white/10"><Info size={20} /></button>
            </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
            {isSearching && (
                <MDiv initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="glass-panel border-b border-white/10 px-4 py-3 flex items-center gap-2 z-20">
                    <div className="flex-1 flex items-center gap-2 glass-panel-light border border-white/10 rounded-xl px-3 py-2">
                        <Search size={16} className="text-white/40" />
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Поиск в чате..."
                            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                            autoFocus
                        />
                        {searchResults.length > 0 && (
                            <span className="text-xs text-white/50 font-mono">{currentSearchIndex + 1}/{searchResults.length}</span>
                        )}
                    </div>
                    {searchResults.length > 0 && (
                        <div className="flex gap-1">
                            <button onClick={() => navigateSearch('prev')} className="p-2 glass-panel-light rounded-lg text-white/60 hover:text-white active:scale-90 transition-all">↑</button>
                            <button onClick={() => navigateSearch('next')} className="p-2 glass-panel-light rounded-lg text-white/60 hover:text-white active:scale-90 transition-all">↓</button>
                        </div>
                    )}
                    <button onClick={() => { setIsSearching(false); setSearchQuery(''); setSearchResults([]); }} className="p-2 glass-panel-light rounded-lg text-white/60 hover:text-white active:scale-90 transition-all"><X size={16} /></button>
                </MDiv>
            )}
        </AnimatePresence>

        {/* MESSAGES LIST */}
        <AnimatePresence>
            {pinnedMessage && (
                <MDiv onClick={() => scrollToMessage(pinnedMessage.id)} initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="glass-panel border-b border-vellor-red/30 flex items-center gap-3 px-4 py-2 cursor-pointer z-20 hover:bg-white/5 transition-all group">
                    <div className="w-1 h-8 bg-gradient-to-b from-vellor-red to-transparent rounded-full shadow-glow-red" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-vellor-red uppercase tracking-wider mb-0.5">📌 Закреплено</p>
                        <p className="text-[12px] text-white/90 truncate font-medium">{pinnedMessage.text || 'Медиа'}</p>
                    </div>
                    <div className="text-white/30 group-hover:text-white/60 transition-colors">→</div>
                </MDiv>
            )}
        </AnimatePresence>

        <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-2 md:p-6 space-y-1 custom-scrollbar relative z-10 touch-pan-y">
            {(() => {
                let unreadSeparatorShown = false;
                const unreadCount = chat.unreadCount || 0;
                
                // Find index of first unread message
                let firstUnreadIndex = -1;
                if (unreadCount > 0) {
                    let count = 0;
                    for (let i = chat.messages.length - 1; i >= 0; i--) {
                        const msg = chat.messages[i];
                        const isIncoming = msg.senderId !== myId && msg.senderId !== 'me';
                        if (isIncoming) {
                            count++;
                            if (count === unreadCount) {
                                firstUnreadIndex = i;
                                break;
                            }
                        }
                    }
                }
                
                return chat.messages.map((msg, index) => {
                    const prevMsg = chat.messages[index - 1];
                    const dateChanged = !prevMsg || !isSameDay(new Date(prevMsg.timestamp), new Date(msg.timestamp));
                    
                    // Show separator BEFORE first unread message
                    const showUnreadSeparator = !unreadSeparatorShown && firstUnreadIndex !== -1 && index === firstUnreadIndex;
                    if (showUnreadSeparator) unreadSeparatorShown = true;

                    return (
                        <React.Fragment key={msg.id}>
                            {dateChanged && (
                                <div className="flex justify-center my-4 relative z-10">
                                    <span className="text-[10px] font-bold text-white/50 bg-black/60 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                                       <CalendarDays size={10} className="opacity-70"/> {formatDateSeparator(new Date(msg.timestamp))}
                                    </span>
                                </div>
                            )}
                            
                            {showUnreadSeparator && (
                                <div className="flex items-center justify-center my-4 gap-3">
                                    <div className="h-px bg-vellor-red/30 flex-1" />
                                    <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">Непрочитанные сообщения</span>
                                    <div className="h-px bg-vellor-red/30 flex-1" />
                                </div>
                            )}

                            <MessageItem 
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
                        </React.Fragment>
                    );
                });
            })()}
        </div>
        
        {showScrollButton && (
            <button onClick={() => scrollToBottom('auto')} className="absolute bottom-24 right-6 z-50 p-3 glass-panel-light border border-white/20 rounded-2xl text-white shadow-2xl hover:bg-vellor-red hover:border-vellor-red transition-all hover:scale-110 active:scale-95">
                <ArrowDown size={22} />
            </button>
        )}

        {/* ... Context Menu, Zoom Image ... */}
        <AnimatePresence>
            {contextMenu && (
                <MDiv initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[100] w-60 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl origin-top-left overflow-hidden flex flex-col gap-1" onClick={(e: any) => e.stopPropagation()}>
                    {/* ... Same as before ... */}
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
                    <button onClick={() => { handleForwardMessage(contextMenu.message); setContextMenu(null); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors active:scale-95 text-white">
                        <Forward size={14} className="text-white/60" /> Переслать
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
                                {isAvatarHidden ? (
                                    <div className="w-full h-full bg-gray-900 flex items-center justify-center"><User size={40} className="text-white/30"/></div>
                                ) : (
                                    <LazyImage 
                                      src={chat.user.avatar || 'https://via.placeholder.com/400'} 
                                      alt={chat.user.name}
                                      className="w-full h-full object-cover"
                                    />
                                )}
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
                        
                        {/* Info Block with Privacy Checks for Phone */}
                        <div className="w-full space-y-3">
                            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl relative group/desc">
                                <h4 className="text-[10px] font-bold uppercase text-vellor-red tracking-wider mb-2 flex items-center gap-2"><Info size={12}/> О себе</h4>
                                {isEditingDesc ? (
                                    <div className="space-y-2">
                                        <textarea value={editDescText} onChange={(e) => setEditDescText(e.target.value)} className="w-full bg-black/40 p-2 rounded-lg text-sm text-white border border-white/10 outline-none focus:border-vellor-red/50" rows={3} />
                                        <div className="flex gap-2 justify-end"><button onClick={() => setIsEditingDesc(false)} className="px-3 py-1 bg-white/5 rounded-lg text-xs hover:bg-white/10 text-white">Отмена</button><button onClick={saveGroupDescription} className="px-3 py-1 bg-vellor-red rounded-lg text-xs font-bold text-white hover:bg-red-600 flex items-center gap-1"><Save size={12}/> Сохранить</button></div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-white/80 leading-relaxed whitespace-pre-wrap">{chat.user.bio || 'Информация не заполнена.'}</p>
                                        {isOwner && chat.user.isGroup && <button onClick={() => { setIsEditingDesc(true); setEditDescText(chat.user.bio || ""); }} className="absolute top-4 right-4 p-1.5 bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors opacity-0 group-hover/desc:opacity-100"><Edit2 size={12}/></button>}
                                    </>
                                )}
                            </div>

                            {/* Show Phone only if allowed */}
                            {!chat.user.isGroup && (chat.user.privacy_phone === 'everybody' || chat.user.privacy_phone === 'contacts' || !chat.user.privacy_phone) && (
                                 <div className="p-4 bg-black/30 border border-white/5 rounded-2xl flex items-center gap-3 opacity-70 text-white">
                                     <Phone size={16} />
                                     <span className="text-xs">{chat.user.phone || 'Скрыто'}</span>
                                 </div>
                            )}
                            
                            {/* Privacy warning if hidden */}
                            {!chat.user.isGroup && chat.user.privacy_phone === 'nobody' && (
                                <div className="p-4 bg-black/30 border border-white/5 rounded-2xl flex items-center gap-3 opacity-40 text-white">
                                    <Lock size={16} />
                                    <span className="text-xs italic">Номер скрыт настройками приватности</span>
                                </div>
                            )}

                            {/* Group Members List (Existing logic...) */}
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
                                                        <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden">
                                                          <LazyImage 
                                                            src={member.user.avatar || 'https://via.placeholder.com/40'} 
                                                            alt={member.user.name}
                                                            className="w-full h-full object-cover"
                                                          />
                                                        </div>
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
                            
                            {chat.user.isGroup && (
                                <>
                                    {onLeaveGroup && (
                                        <button onClick={() => onLeaveGroup(chat.id)} className="w-full py-4 mt-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 font-bold uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95">
                                            <LogOut size={16} /> Покинуть группу
                                        </button>
                                    )}
                                    {onDeleteGroup && chat.ownerId === myId && (
                                        <button onClick={() => onDeleteGroup(chat.id)} className="w-full py-4 bg-black/40 border border-red-500 rounded-2xl text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.15)] active:scale-95">
                                            <Trash2 size={16} /> Удалить группу
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </MDiv>
            )}
        </AnimatePresence>

        {/* ... Bottom Input ... */}
        <div className="p-3 md:p-4 glass-panel border-t border-white/5 z-30 relative pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-2xl bg-black/40">
             {(editingMessageId || replyingTo) && (
                 <div className="absolute -top-14 left-0 w-full glass-panel border-t border-white/10 p-3 px-4 flex items-center justify-between z-10 border-b border-white/5 shadow-lg">
                     <div className="flex items-center gap-3 overflow-hidden">
                         <div className="w-1 self-stretch bg-gradient-to-b from-vellor-red to-transparent rounded-full shadow-glow-red" />
                         <div className="flex flex-col min-w-0">
                             <div className="flex items-center gap-2">
                                 {editingMessageId ? <Edit2 size={13} className="text-vellor-red"/> : <Reply size={13} className="text-vellor-red"/>}
                                 <span className="text-[10px] font-black text-vellor-red uppercase tracking-wider">{editingMessageId ? 'Редактирование' : `Ответ ${replyingTo?.senderId === 'me' || replyingTo?.senderId === myId ? 'себе' : ''}`}</span>
                             </div>
                             <p className="text-xs text-white/80 truncate max-w-[200px] font-medium">{editingMessageId ? 'Исправьте сообщение' : replyingTo?.text || 'Медиа'}</p>
                         </div>
                     </div>
                     <button onClick={() => { setEditingMessageId(null); setReplyingTo(null); setInputText(''); }} className="p-2 hover:text-white text-white/40 active:scale-90 glass-panel-light rounded-lg transition-all"><X size={16}/></button>
                 </div>
             )}

             {pendingFile && (
                 <MDiv initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute -top-32 left-4 w-36 p-2 glass-panel border border-white/20 rounded-2xl shadow-2xl z-20">
                     <div className="relative aspect-square rounded-xl overflow-hidden glass-panel-light mb-2 group">
                         {pendingFile.type === 'image' ? <img src={pendingFile.url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-white/50"><FileText size={28} /></div>}
                         <button onClick={() => setPendingFile(null)} className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-white rounded-full p-1.5 active:scale-90 hover:bg-vellor-red transition-all"><X size={12} /></button>
                     </div>
                 </MDiv>
             )}

             <div className="flex items-end gap-2.5 max-w-5xl mx-auto relative">
                {!isRecording ? (
                  <>
                    <div className="relative">
                        <button onClick={() => setShowAttachments(!showAttachments)} className={`p-3.5 rounded-2xl transition-all active:scale-90 shadow-lg backdrop-blur-xl ${showAttachments ? 'bg-vellor-red text-white shadow-vellor-red/40' : 'text-white/70 hover:text-white glass-panel-light hover:bg-white/10'}`}><Paperclip size={22}/></button>
                        <AnimatePresence>
                            {showAttachments && (
                                <MDiv initial={{ y: 10, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 10, opacity: 0, scale: 0.95 }} className="absolute bottom-16 left-0 w-52 glass-panel border border-white/20 p-2 rounded-2xl shadow-2xl overflow-hidden z-[100]">
                                    <button onClick={() => { setUploadingType('image'); setTimeout(() => fileInputRef.current?.click(), 50); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-95 text-white"><ImageIcon size={18} className="text-vellor-red"/> Фото</button>
                                    <button onClick={() => { setUploadingType('file'); setTimeout(() => fileInputRef.current?.click(), 50); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-95 text-white"><FileText size={18} className="text-vellor-red"/> Файл</button>
                                    <button onClick={handleSendLocation} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-wide transition-all active:scale-95 text-white"><MapPin size={18} className="text-vellor-red"/> Локация</button>
                                </MDiv>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex-1 glass-panel border border-white/20 rounded-[1.6rem] focus-within:border-vellor-red/60 focus-within:shadow-glow-red transition-all flex items-end px-4 py-1 relative min-h-[52px] shadow-xl backdrop-blur-2xl bg-white/5">
                        <textarea 
                            value={inputText} 
                            onChange={handleInputChange} 
                            onPaste={handlePaste}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                            placeholder={pendingFile ? "Подпись..." : "Сообщение..."}
                            className="w-full bg-transparent text-white py-3.5 px-1 max-h-32 min-h-[52px] resize-none outline-none custom-scrollbar text-[15px] leading-relaxed font-medium placeholder:text-white/40" 
                        />
                        <button onClick={() => setShowEmojis(!showEmojis)} className={`p-2.5 mb-1.5 transition-all active:scale-90 rounded-xl ${showEmojis ? 'text-vellor-red bg-vellor-red/10' : 'text-white/60 hover:text-white hover:bg-white/10'}`}><Smile size={22}/></button>
                        
                        <AnimatePresence>
                            {showEmojis && (
                                <MDiv 
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute bottom-14 right-0 w-full max-w-[340px] h-[320px] glass-panel border border-white/20 rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden"
                                >
                                    <div className="p-3 border-b border-white/10 flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">😊 Emoji</span>
                                        <button onClick={() => setShowEmojis(false)} className="text-white/60 hover:text-white transition-colors"><X size={16}/></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 grid grid-cols-7 gap-1">
                                        {EMOJI_LIST.map((emoji, idx) => (
                                            <button key={idx} onClick={() => addEmoji(emoji)} className="text-2xl p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90">{emoji}</button>
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
                            className="p-3.5 bg-gradient-to-br from-vellor-red via-red-600 to-red-700 rounded-2xl text-white shadow-xl shadow-vellor-red/40 active:scale-90 transition-all disabled:opacity-50 disabled:scale-100 touch-manipulation hover:shadow-vellor-red/60 hover:scale-105"
                            type="button"
                        >
                            {isUploading ? <Loader2 className="animate-spin" size={23}/> : (editingMessageId ? <Check size={23}/> : <Send size={23}/>)}
                        </button>
                    ) : (
                        <button onClick={startRecording} className="p-3.5 rounded-2xl glass-panel-light text-white/70 hover:text-vellor-red hover:bg-white/10 transition-all active:scale-90 shadow-lg backdrop-blur-xl"><Mic size={23}/></button>
                    )}
                  </>
                ) : (
                  <MDiv initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex items-center justify-between glass-panel border border-vellor-red/30 rounded-[2rem] p-3 pr-4 h-[52px] shadow-glow-red">
                    <div className="flex items-center gap-4 pl-4"><MDiv animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-3 h-3 rounded-full bg-vellor-red shadow-glow-red" /><span className="text-sm font-black text-white font-mono">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span></div>
                    <div className="flex items-center gap-3"><button onClick={() => stopRecording(false)} className="p-2 text-white/50 hover:text-white transition-colors active:scale-90"><Trash2 size={20}/></button><button onClick={() => stopRecording(true)} className="p-2 bg-vellor-red rounded-full text-white active:scale-90 shadow-lg shadow-vellor-red/30"><StopCircle size={20}/></button></div>
                  </MDiv>
                )}
             </div>

             {/* Mention Suggestions */}
             <AnimatePresence>
                 {mentionSuggestions.length > 0 && inputText.includes('@') && (
                     <MDiv 
                         initial={{ opacity: 0, y: 10 }} 
                         animate={{ opacity: 1, y: 0 }} 
                         exit={{ opacity: 0, y: 10 }}
                         className="absolute bottom-full left-0 right-0 mb-2 mx-3 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-blue-500/30 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.15)] overflow-hidden"
                     >
                         <div className="p-3 border-b border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-transparent">
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-2">
                                 <AtSign size={12} className="animate-pulse" /> Упоминания
                             </span>
                         </div>
                         <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                             {mentionSuggestions.map((member, index) => (
                                 <button
                                     key={member.user.id}
                                     onClick={() => handleMentionSelect(member.user.username)}
                                     className="w-full p-3 flex items-center gap-3 hover:bg-blue-500/10 rounded-xl transition-all active:scale-95 group"
                                     style={{ animationDelay: `${index * 50}ms` }}
                                 >
                                     <div className="relative">
                                         <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 group-hover:border-blue-400/50 transition-all">
                                             <img src={member.user.avatar || 'https://via.placeholder.com/36'} className="w-full h-full object-cover" alt={member.user.name} />
                                         </div>
                                         <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-[#0a0a0a] shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                     </div>
                                     <div className="flex-1 text-left min-w-0">
                                         <p className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors">{member.user.name}</p>
                                         <p className="text-[11px] text-blue-400/80 font-medium truncate">@{member.user.username}</p>
                                     </div>
                                     <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                         <AtSign size={14} className="text-blue-400" />
                                     </div>
                                 </button>
                             ))}
                         </div>
                     </MDiv>
                 )}
             </AnimatePresence>
        </div>

        {/* Forward Modal */}
        <AnimatePresence>
            {showForwardModal && forwardingMessage && (
                <MDiv 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setShowForwardModal(false)}
                >
                    <MDiv 
                        initial={{ scale: 0.9, y: 20 }} 
                        animate={{ scale: 1, y: 0 }} 
                        exit={{ scale: 0.9, y: 20 }}
                        className="w-full max-w-md glass-panel border border-white/20 rounded-3xl shadow-2xl overflow-hidden"
                        onClick={(e: any) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-lg font-black text-white uppercase tracking-wider">Переслать сообщение</h3>
                            <button onClick={() => setShowForwardModal(false)} className="p-2 glass-panel-light rounded-lg text-white/60 hover:text-white active:scale-90 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
                            {allChats.filter(c => c.id !== chat.id).map((targetChat) => (
                                <button
                                    key={targetChat.id}
                                    onClick={() => forwardToChat(targetChat.id)}
                                    className="w-full p-4 flex items-center gap-3 hover:bg-white/10 rounded-xl transition-all active:scale-95 mb-2"
                                >
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
                                        <img src={targetChat.user.avatar || 'https://via.placeholder.com/48'} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-sm font-bold text-white truncate flex items-center gap-1">
                                            {targetChat.user.name}
                                            {targetChat.user.isVerified && <BadgeCheck size={12} className="text-blue-400" />}
                                        </p>
                                        <p className="text-xs text-white/50 truncate">
                                            {targetChat.lastMessage?.text || 'Нет сообщений'}
                                        </p>
                                    </div>
                                    <Forward size={18} className="text-white/40" />
                                </button>
                            ))}
                            
                            {allChats.filter(c => c.id !== chat.id).length === 0 && (
                                <div className="text-center py-8 text-white/40">
                                    <p className="text-sm">Нет доступных чатов</p>
                                </div>
                            )}
                        </div>
                    </MDiv>
                </MDiv>
            )}
        </AnimatePresence>
    </div>
  );
};
