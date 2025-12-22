
import React from 'react';
import { Search, Users, Loader2, BadgeCheck } from 'lucide-react';
import { User as UserType } from '../../types';

interface NewChatModalProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectChat: (id: string, user: any) => void;
  onClose: () => void;
  onOpenCreateGroup: () => void;
  isSearchingGlobal: boolean;
  globalSearchResults: UserType[];
  recentContacts: any[];
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ 
    searchQuery, setSearchQuery, onSelectChat, onClose, onOpenCreateGroup, isSearchingGlobal, globalSearchResults, recentContacts 
}) => {
  return (
     <div className="space-y-6">
        <div className="relative group">
            <Search className="absolute left-3 top-3 text-white/30" size={16} />
            <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск людей..." className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:border-vellor-red/30 outline-none transition-all text-white" />
        </div>
        <button onClick={onOpenCreateGroup} className="w-full p-4 flex items-center gap-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95 group">
            <div className="w-10 h-10 rounded-full bg-vellor-red/20 text-vellor-red flex items-center justify-center group-hover:scale-110 transition-transform"><Users size={20}/></div>
            <div className="text-left"><p className="text-sm font-bold text-white">Создать группу</p><p className="text-[10px] text-white/40">До 200,000 участников</p></div>
        </button>
        <div className="space-y-2">
            <h4 className="text-[9px] font-bold uppercase tracking-widest opacity-40 sticky top-0 bg-[#0a0a0a] py-2 z-10">{searchQuery ? 'Глобальный поиск' : 'Недавние'}</h4>
            {(searchQuery ? globalSearchResults : recentContacts).map(user => (
                <button key={user.id} onClick={() => { onSelectChat(user.id, user); onClose(); setSearchQuery(''); }} className="w-full p-2 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-all text-left active:scale-98">
                   <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden shrink-0"><img src={user.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" /></div>
                   <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold truncate flex items-center gap-1 text-white">
                           {user.name}
                           {user.isVerified && <BadgeCheck size={10} className="text-blue-400 fill-blue-400/20" />}
                       </p>
                       <p className="text-[10px] opacity-40 truncate">@{user.username || 'user'}</p>
                   </div>
                </button>
            ))}
            {searchQuery && !isSearchingGlobal && globalSearchResults.length === 0 && (
                <div className="text-center py-8 opacity-30 text-xs">Никого не найдено</div>
            )}
            {isSearchingGlobal && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-white/30" /></div>}
        </div>
     </div>
  );
};
