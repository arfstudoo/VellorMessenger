
import React, { memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Reply, Pin, ZoomIn, FileText, Download, MapPin } from 'lucide-react';
import { Message } from '../../types';
import { AudioPlayer } from '../ui/AudioPlayer';
import { LazyImage } from '../ui/LazyImage';

const MDiv = motion.div as any;
const MImg = motion.img as any;
const MButton = motion.button as any;
const MSvg = motion.svg as any;
const MPath = motion.path as any;

// Функция для рендеринга текста с упоминаниями
const renderTextWithMentions = (text: string, groupMembers: any[], onShowProfile?: (userId: string) => void) => {
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        // Добавляем текст до упоминания
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        
        const username = match[1];
        // Ищем пользователя по username
        const user = groupMembers.find((m: any) => m.user?.username === username);
        
        // Добавляем упоминание с подсветкой и кликом
        parts.push(
            <button
                key={match.index}
                className="text-blue-400 font-bold bg-blue-500/10 px-1 rounded hover:bg-blue-500/20 transition-colors cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    if (user && onShowProfile) {
                        console.log('Mention clicked:', username, user.user.id);
                        onShowProfile(user.user.id);
                    }
                }}
            >
                @{username}
            </button>
        );
        
        lastIndex = match.index + match[0].length;
    }
    
    // Добавляем оставшийся текст
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
};

// Status component that always shows double ticks if read, or single if sent
const MessageStatus: React.FC<{ isRead: boolean; isOwn: boolean }> = React.memo(({ isRead, isOwn }) => {
  if (!isOwn) return null;
  return (
    <div className="flex items-center justify-center w-4 h-4 relative ml-1">
       {/* First Tick (Always visible if sent) */}
       <MSvg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full">
         <path d="M20 6L9 17l-5-5" fill="none" stroke={isRead ? "#4a9eff" : "#8b9bb4"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
       </MSvg>
       {/* Second Tick (Visible if delivered/read) */}
       <MSvg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full left-[5px]">
         <path d="M20 6L9 17l-5-5" fill="none" stroke={isRead ? "#4a9eff" : "#8b9bb4"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
       </MSvg>
    </div>
  );
});

const SwipeableMessage = ({ children, onReply, isMe }: { children?: React.ReactNode, onReply: () => void, isMe: boolean }) => {
    const x = useMotionValue(0);
    const opacity = useTransform(x, [-50, 0], [1, 0]);
    const scale = useTransform(x, [-50, 0], [1, 0.5]);

    return (
        <div className="relative w-full" onDoubleClick={onReply}>
            <MDiv style={{ opacity, scale }} className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white z-0">
                <Reply size={16} />
            </MDiv>
            <MDiv 
                drag="x" 
                dragConstraints={{ left: 0, right: 0 }} 
                dragElastic={{ left: 0.3, right: 0.05 }} 
                onDragEnd={(e: any, info: any) => { if (info.offset.x < -60) onReply(); }}
                dragListener={true}
                onPointerDown={(e: any) => {
                    // Не начинаем drag если кликнули на кнопку или интерактивный элемент
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'BUTTON' || target.closest('button')) {
                        e.stopPropagation();
                    }
                }}
                className={`relative z-10 w-full flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
                {children}
            </MDiv>
        </div>
    );
};

export const MessageItem = React.memo(({ msg, isMe, chatUser, groupMembers, myId, onContextMenu, onReply, scrollToMessage, setZoomedImage, chatMessages, handleToggleReaction, onShowProfile }: any) => {
    const getSenderInfo = (senderId: string) => {
        if (senderId === 'me' || senderId === myId) return { name: 'Вы', avatar: '', id: myId };
        if (chatUser.isGroup && groupMembers.length > 0) {
            const member = groupMembers.find((m: any) => m.user.id === senderId)?.user;
            if (member) return member;
        }
        if (!chatUser.isGroup && senderId === chatUser.id) return chatUser;
        return { name: 'Unknown', avatar: '', id: senderId };
    };

    const senderInfo = getSenderInfo(msg.senderId);
    const replyParent = msg.replyToId ? chatMessages.find((m: any) => m.id === msg.replyToId) : null;
    const replySender = replyParent ? getSenderInfo(replyParent.senderId) : null;

    const reactionsGrouped = (msg.reactions || []).reduce((acc: any, r: any) => {
        if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasReacted: false };
        acc[r.emoji].count += 1;
        if (r.senderId === myId) acc[r.emoji].hasReacted = true;
        return acc;
    }, {} as Record<string, { count: number, hasReacted: boolean }>);

    if (msg.type === 'system') {
        return (
            <div className="flex justify-center my-4">
                <span className="text-[10px] bg-white/5 border border-white/5 px-3 py-1 rounded-full text-white/50 font-medium">
                    {msg.text}
                </span>
            </div>
        );
    }

    let locationData = null;
    if (msg.type === 'location' && msg.text) {
        try {
            const [lat, lon] = msg.text.split(',');
            if (lat && lon) locationData = { lat, lon };
        } catch (e) {}
    }

    // Determine custom color if available, default to vellor-red for sender names in groups
    const senderNameColor = senderInfo.nameColor || 'var(--vellor-red)'; // Fallback

    return (
        <div id={`msg-${msg.id}`} className="w-full">
            {/* Имя пользователя ВНЕ SwipeableMessage для групп */}
            {!isMe && chatUser.isGroup && (
                <div className="flex items-center gap-2 mb-1 ml-9">
                    <button 
                        className="text-[11px] font-black hover:underline tracking-wide cursor-pointer"
                        style={{ color: senderNameColor === 'var(--vellor-red)' ? '#ff0033' : senderNameColor }}
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            onShowProfile && onShowProfile(senderInfo.id); 
                        }}
                    >
                        {senderInfo?.name}
                    </button>
                </div>
            )}
            
            <SwipeableMessage isMe={isMe} onReply={() => onReply(msg)}>
                <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                    {!isMe && chatUser.isGroup && (
                        <div 
                            className="w-7 h-7 rounded-xl overflow-hidden glass-panel shrink-0 mb-1 mr-2 self-end border border-white/10 cursor-pointer hover:scale-110 transition-transform shadow-lg"
                            onClick={() => onShowProfile && onShowProfile(senderInfo.id)}
                        >
                            {senderInfo && senderInfo.avatar ? (
                              <LazyImage 
                                src={senderInfo.avatar} 
                                alt={senderInfo.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-700" />
                            )}
                        </div>
                    )}
                    <div 
                        onContextMenu={(e) => onContextMenu(e, msg)}
                        className={`max-w-[85%] md:max-w-[70%] p-3 rounded-[1.2rem] relative shadow-lg cursor-pointer group transition-all hover:scale-[1.02] ${isMe ? 'bg-gradient-to-br from-gray-700/90 to-gray-800/95 text-white rounded-br-md shadow-gray-700/20' : 'glass-panel-light text-gray-100 rounded-bl-md'} ${msg.isPinned ? 'ring-2 ring-blue-500/60 shadow-glow-blue' : ''}`}
                    >
                        {replyParent && (
                            <div onClick={(e) => { e.stopPropagation(); scrollToMessage(replyParent.id); }} className="mb-2 rounded-xl glass-panel p-2 flex gap-2 items-center border-l-4 border-vellor-red overflow-hidden cursor-pointer hover:bg-white/10 transition-all">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-vellor-red truncate uppercase tracking-wide">{replySender?.name || 'Unknown'}</p>
                                    <p className="text-[11px] text-white/70 truncate font-medium">{replyParent.type === 'image' ? '📷 Фото' : replyParent.type === 'audio' ? '🎤 Голосовое' : replyParent.text}</p>
                                </div>
                            </div>
                        )}

                        {msg.forwardedFromName && (
                            <div className="mb-2 px-2 py-1 rounded-lg bg-blue-500/10 border-l-4 border-blue-500">
                                <p className="text-[10px] font-bold text-blue-400 flex items-center gap-1">
                                    <Reply size={10} className="rotate-180" />
                                    Переслано от {msg.forwardedFromName}
                                </p>
                            </div>
                        )}

                        {msg.isPinned && <div className="absolute -top-3 right-2 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg shadow-blue-600/30 font-bold"><Pin size={8} fill="currentColor"/> PINNED</div>}
                        
                        {msg.type === 'audio' && <AudioPlayer url={msg.mediaUrl || ''} duration={msg.duration} />}
                        {msg.type === 'image' && (
                            <div className="relative group/img">
                                <LazyImage 
                                  src={msg.mediaUrl || ''} 
                                  alt="Image"
                                  className="max-w-full max-h-[300px] w-auto h-auto rounded-lg border border-white/10 object-cover"
                                />
                                <button onClick={(e) => { e.stopPropagation(); setZoomedImage(msg.mediaUrl || ''); }} className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity"><ZoomIn size={24} className="text-white"/></button>
                            </div>
                        )}
                        {msg.type === 'file' && (
                            <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                                <div className="p-2 bg-vellor-red/20 text-vellor-red rounded-lg"><FileText size={24}/></div>
                                <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate max-w-[150px]">{msg.fileName}</p><p className="text-[9px] opacity-50 uppercase font-black">{msg.fileSize || 'FILE'}</p></div>
                                <a href={msg.mediaUrl} download onClick={(e) => e.stopPropagation()} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white"><Download size={16}/></a>
                            </div>
                        )}
                        {msg.type === 'location' && locationData && (
                            <div className="flex flex-col gap-2 p-1">
                                <a href={`https://yandex.ru/maps/?pt=${locationData.lon},${locationData.lat}&z=16&l=map`} target="_blank" rel="noreferrer" className="block relative rounded-xl overflow-hidden border border-white/10 shadow-lg group/map">
                                    <LazyImage 
                                        src={`https://static-maps.yandex.ru/1.x/?ll=${locationData.lon},${locationData.lat}&z=15&l=map&pt=${locationData.lon},${locationData.lat},pm2rdm&size=450,250&theme=dark`}
                                        alt="Location"
                                        className="w-full h-auto min-h-[150px] object-cover bg-gray-800"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover/map:bg-transparent transition-colors pointer-events-none" />
                                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white flex items-center gap-1">
                                        <MapPin size={10} className="text-vellor-red" /> Геопозиция
                                    </div>
                                </a>
                            </div>
                        )}
                        {msg.type === 'text' && <p className="whitespace-pre-wrap leading-relaxed px-1 py-0.5 text-[15px] font-medium break-words overflow-wrap-anywhere">{renderTextWithMentions(msg.text, groupMembers, onShowProfile)}</p>}
                        
                        <div className="flex items-center justify-end gap-1 mt-0.5 px-1 opacity-40 select-none">
                            {msg.isEdited && <span className="text-[9px] mr-1">изм.</span>}
                            <span className="text-[10px]">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            {/* Always show ticks for own messages, regardless of group/DM */}
                            {isMe && <MessageStatus isRead={msg.isRead} isOwn={true} />}
                        </div>

                        <div className="absolute -bottom-3 left-0 flex gap-1 z-10 px-1">
                            <AnimatePresence>
                                {Object.entries(reactionsGrouped).map(([emoji, data]: any) => (
                                    <MButton key={emoji} initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={(e: any) => { e.stopPropagation(); handleToggleReaction(msg.id, emoji); }} className={`px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-md border border-white/10 text-[10px] ${data.hasReacted ? 'bg-blue-600/20 border-blue-500/50 text-white' : 'bg-black/60 text-white/80'}`}>
                                        <span>{emoji}</span>{data.count > 1 && <span className="font-bold">{data.count}</span>}
                                    </MButton>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </SwipeableMessage>
        </div>
    );
}, (prev, next) => {
    // Optimized comparison - only re-render if these specific props change
    return (
        prev.msg.id === next.msg.id &&
        prev.msg.isRead === next.msg.isRead &&
        prev.msg.reactions?.length === next.msg.reactions?.length &&
        prev.msg.isPinned === next.msg.isPinned &&
        prev.msg.isEdited === next.msg.isEdited &&
        prev.msg.text === next.msg.text &&
        prev.groupMembers.length === next.groupMembers.length &&
        prev.isMe === next.isMe
    );
});
