
import React, { useRef } from 'react';
import { Camera, Plus, Search, Loader2, X } from 'lucide-react';
import { User as UserType } from '../../types';

interface CreateGroupModalProps {
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  newGroupAvatarPreview: string;
  setNewGroupAvatar: (file: File | null) => void;
  setNewGroupAvatarPreview: (url: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedUsersForGroup: UserType[];
  setSelectedUsersForGroup: React.Dispatch<React.SetStateAction<UserType[]>>;
  globalSearchResults: UserType[];
  recentContacts: any[];
  isCreatingGroup: boolean;
  handleCreateGroup: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
    newGroupName, setNewGroupName, newGroupAvatarPreview, setNewGroupAvatar, setNewGroupAvatarPreview,
    searchQuery, setSearchQuery, selectedUsersForGroup, setSelectedUsersForGroup, globalSearchResults, recentContacts,
    isCreatingGroup, handleCreateGroup
}) => {
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  return (
      <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
               <div className="relative group cursor-pointer" onClick={() => groupAvatarInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                         {newGroupAvatarPreview ? <img src={newGroupAvatarPreview} className="w-full h-full object-cover" /> : <Camera size={32} className="text-white/20" />}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-vellor-red p-2 rounded-full text-white shadow-lg"><Plus size={16}/></div>
                    <input type="file" ref={groupAvatarInputRef} onChange={(e) => { const file = e.target.files?.[0]; if(file) { setNewGroupAvatar(file); setNewGroupAvatarPreview(URL.createObjectURL(file)); } }} accept="image/*" className="hidden" />
               </div>
               <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Название группы" className="bg-transparent border-b border-white/20 text-center py-2 text-lg font-bold outline-none focus:border-vellor-red w-full text-white" />
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-3 text-white/30" size={18} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Добавить участников..." className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:border-vellor-red/30 outline-none transition-all text-white" />
          </div>
          {selectedUsersForGroup.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/5">
                  {selectedUsersForGroup.map(u => (
                      <div key={u.id} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={() => setSelectedUsersForGroup(prev => prev.filter(p => p.id !== u.id))}>
                          <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden relative border border-vellor-red">
                               <img src={u.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><X size={16}/></div>
                          </div>
                          <span className="text-[9px] max-w-[50px] truncate">{u.name.split(' ')[0]}</span>
                      </div>
                  ))}
              </div>
          )}
          <div className="space-y-2 h-64 overflow-y-auto custom-scrollbar">
               <h4 className="text-[9px] font-bold uppercase tracking-widest opacity-40 sticky top-0 bg-[#0a0a0a] py-2 z-10">{searchQuery ? 'Результаты поиска' : 'Ваши контакты'}</h4>
               {(searchQuery ? globalSearchResults : recentContacts).filter(u => !selectedUsersForGroup.some(s => s.id === u.id)).map(user => (
                   <button key={user.id} onClick={() => setSelectedUsersForGroup(prev => [...prev, user])} className="w-full p-2 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-all text-left active:scale-98">
                       <div className="w-9 h-9 rounded-full bg-gray-800 overflow-hidden shrink-0"><img src={user.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" /></div>
                       <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate text-white">{user.name}</p><p className="text-[10px] opacity-40 truncate">@{user.username || 'user'}</p></div>
                       <div className="w-5 h-5 rounded-full border border-white/20" />
                   </button>
               ))}
          </div>
          <button onClick={handleCreateGroup} disabled={isCreatingGroup} className="w-full py-4 bg-vellor-red text-white font-black uppercase text-[11px] tracking-[0.3em] rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95">
              {isCreatingGroup ? <Loader2 className="animate-spin" /> : 'Создать'}
          </button>
      </div>
  );
};
