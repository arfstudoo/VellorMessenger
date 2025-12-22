
import React from 'react';
import { motion } from 'framer-motion';
import { Pin, BellOff, Check, CheckCheck, PenLine, Mic, MapPin, Crown, BadgeCheck } from 'lucide-react';
import { Chat, UserStatus } from '../../types';
import { StatusIndicator } from '../ui/StatusIndicator';

const MDiv = motion.div as any;

interface ChatItemProps {
  chat: Chat;
  activeChatId: string | null;
  onSelectChat: (id: string, user: any) => void;
  onContextMenu: (e: any, chat: Chat) => void;
  onlineUsers: Map<string, UserStatus>;
  typingUsers: Record<string, string[]>;
  settings: { liteMode?: boolean };
}

export const ChatItem: React.FC<ChatItemProps> = ({ chat, activeChatId, onSelectChat, onContextMenu, onlineUsers, typingUsers, settings }) => {
  const realtimeStatus = onlineUsers.get(chat.user.id) || chat.user.status || 'offline';
  const typers = typingUsers[chat.id] || [];
  const isMobile = window.innerWidth < 768;

  return (
    <MDiv 
      layout={!settings.liteMode && !isMobile} 
      onContextMenu={(e: any) => onContextMenu(e, chat)}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelectChat(chat.id, chat.user)}
      className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all mb-1 relative group ${activeChatId === chat.id ? 'bg-white/10 shadow-lg border border-white/5' : 'hover:bg-white/[0.03]'}`}
    >
      {chat.isPinned && <div className="absolute top-2 right-2 text-vellor-red/80"><Pin size={10} fill="currentColor"/></div>}
      
      <div className="relative shrink-0">
          <div className="w-[50px] h-[50px] rounded-2xl border border-[var(--border)] overflow-hidden bg-black">
            <img src={chat.user.avatar || 'https://via.placeholder.com/56'} className="w-full h-full object-cover" alt={chat.user.name} />
          </div>
          {!chat.user.isGroup && (
              <div className="absolute -bottom-1 -right-1">
                  <StatusIndicator status={realtimeStatus} />
              </div>
          )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className="text-[15px] font-bold truncate flex items-center gap-1.5 text-white/90">
              {chat.user.name} 
              {chat.user.username?.toLowerCase() === 'arfstudoo' && <Crown size={12} className="text-yellow-400 fill-yellow-400" />}
              {chat.user.isVerified && <BadgeCheck size={12} className="text-blue-400 fill-blue-400/20" />}
              {chat.isMuted && <BellOff size={10} className="text-white/30" />}
          </h3>
          <span className="text-[10px] opacity-30 font-medium">
            {chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}) : ''}
          </span>
        </div>
        <div className="flex items-center justify-between">
            <div className="text-[13px] opacity-50 truncate font-medium max-w-[85%]">
              {typers.length > 0 ? (
                <span className="text-vellor-red flex items-center gap-1 animate-pulse">
                    <PenLine size={12} /> 
                    {typers.length === 1 ? `${typers[0]}: печатает...` : `${typers.length} чел. печатают...`}
                </span>
              ) : (
                chat.lastMessage?.type === 'audio' ? <span className="flex items-center gap-1"><Mic size={12}/> Голосовое</span> : 
                chat.lastMessage?.type === 'image' ? <span className="flex items-center gap-1"><div className="w-3 h-3 bg-white/20 rounded-sm"/> Фотография</span> : 
                chat.lastMessage?.type === 'location' ? <span className="flex items-center gap-1"><MapPin size={12} className="text-vellor-red"/> Локация</span> :
                chat.lastMessage?.text || (chat.user.isGroup ? 'Нет сообщений' : 'Начать общение')
              )}
            </div>
            {chat.lastMessage?.senderId === 'me' && typers.length === 0 && (
                chat.lastMessage.isRead ? <CheckCheck size={14} className="text-vellor-red"/> : <Check size={14} className="text-white/30"/>
            )}
        </div>
      </div>
      {chat.unreadCount > 0 && (
          <div className="absolute right-3 bottom-3 bg-vellor-red text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full shadow-lg shadow-vellor-red/20">
              {chat.unreadCount}
          </div>
      )}
    </MDiv>
  );
};
