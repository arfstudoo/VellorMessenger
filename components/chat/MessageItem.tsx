
import React from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Reply, Pin, ZoomIn, FileText, Download, MapPin } from 'lucide-react';
import { Message } from '../../types';
import { AudioPlayer } from '../ui/AudioPlayer';

const MDiv = motion.div as any;
const MImg = motion.img as any;
const MButton = motion.button as any;
const MSvg = motion.svg as any;
const MPath = motion.path as any;

const MessageStatus: React.FC<{ isRead: boolean; isOwn: boolean }> = React.memo(({ isRead, isOwn }) => {
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
});

const SwipeableMessage = ({ children, onReply, isMe }: { children?: React.ReactNode, onReply: () => void, isMe: boolean }) => {
    const x = useMotionValue(0);
    const opacity = useTransform(x, [-50, 0], [1, 0]);
    const scale = useTransform(x, [-50, 0], [1, 0.5]);

    return (
        <div className="relative w-full">
            <MDiv style={{ opacity, scale }} className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white z-0">
                <Reply size={16} />
            </MDiv>
            <MDiv drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.3, right: 0.05 }} onDragEnd={(e: any, info: any) => { if (info.offset.x < -60) onReply(); }} className={`relative z-10 w-full flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                {children}
            </MDiv>
        </div>
    );
};

export const MessageItem = React.memo(({ msg, isMe, chatUser, groupMembers, myId, onContextMenu, onReply, scrollToMessage, setZoomedImage, chatMessages, handleToggleReaction }: any) => {
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

    return (
        <div id={`msg-${msg.id}`} className="w-full">
            <SwipeableMessage isMe={isMe} onReply={() => onReply(msg)}>
                <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                    {!isMe && chatUser.isGroup && (
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 shrink-0 mb-1 mr-2 self-end border border-white/10">
                            {senderInfo && senderInfo.avatar ? <img src={senderInfo.avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gray-700" />}
                        </div>
                    )}
                    <div 
                        onContextMenu={(e) => onContextMenu(e, msg)}
                        className={`max-w-[85%] md:max-w-[70%] p-2 rounded-2xl relative shadow-sm border border-white/5 cursor-pointer group ${isMe ? 'bg-[var(--msg-me)] text-white rounded-br-none' : 'bg-white/5 backdrop-blur-md text-gray-200 rounded-bl-none'} ${msg.isPinned ? 'ring-1 ring-vellor-red/50' : ''}`}
                    >
                        {replyParent && (
                            <div onClick={(e) => { e.stopPropagation(); scrollToMessage(replyParent.id); }} className="mb-1.5 rounded-lg bg-black/20 p-1.5 flex gap-2 items-center border-l-2 border-vellor-red/70 overflow-hidden cursor-pointer hover:bg-black/30 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-vellor-red truncate">{replySender?.name || 'Unknown'}</p>
                                    <p className="text-[10px] text-white/60 truncate">{replyParent.type === 'image' ? 'Фото' : replyParent.type === 'audio' ? 'Голосовое' : replyParent.text}</p>
                                </div>
                            </div>
                        )}

                        {!isMe && chatUser.isGroup && (
                            <div className="flex items-center gap-1 mb-1 ml-1"><p className="text-[10px] font-bold text-vellor-red">{senderInfo?.name}</p></div>
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
                                <a href={msg.mediaUrl} download onClick={(e) => e.stopPropagation()} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white"><Download size={16}/></a>
                            </div>
                        )}
                        {msg.type === 'location' && locationData && (
                            <div className="flex flex-col gap-2 p-1">
                                <a href={`https://yandex.ru/maps/?pt=${locationData.lon},${locationData.lat}&z=16&l=map`} target="_blank" rel="noreferrer" className="block relative rounded-xl overflow-hidden border border-white/10 shadow-lg group/map">
                                    <img 
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
                        {msg.type === 'text' && <p className="whitespace-pre-wrap leading-snug px-2 py-1 text-[15px]">{msg.text}</p>}
                        
                        <div className="flex items-center justify-end gap-1 mt-0.5 px-1 opacity-40 select-none">
                            {msg.isEdited && <span className="text-[9px] mr-1">изм.</span>}
                            <span className="text-[10px]">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            {isMe && <MessageStatus isRead={msg.isRead} isOwn={true} />}
                        </div>

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
        </div>
    );
}, (prev, next) => {
    return (
        prev.msg.id === next.msg.id &&
        prev.msg.isRead === next.msg.isRead &&
        prev.msg.reactions?.length === next.msg.reactions?.length &&
        prev.msg.isPinned === next.msg.isPinned &&
        prev.msg.isEdited === next.msg.isEdited &&
        prev.msg.text === next.msg.text &&
        prev.groupMembers.length === next.groupMembers.length
    );
});
