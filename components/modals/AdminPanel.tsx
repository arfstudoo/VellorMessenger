
import React, { useState, useEffect } from 'react';
import { X, LayoutDashboard, Users, Radio, Server, Activity, Search, Loader2, Ban, Crown, BadgeCheck, UserX, Skull, Send, AlertTriangle, Globe, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { ToastType } from '../Toast';

interface AdminPanelProps {
  onClose: () => void;
  showToast: (msg: string, type: ToastType) => void;
  onlineUsers: Map<string, string>;
  onBroadcast?: (message: string) => Promise<boolean>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, showToast, onlineUsers, onBroadcast }) => {
  const [adminTab, setAdminTab] = useState<'dashboard' | 'users' | 'broadcast' | 'system'>('dashboard');
  const [dashboardStats, setDashboardStats] = useState({ users: 0, messages: 0 });
  
  // Users Tab State
  const [adminUserSearch, setAdminUserSearch] = useState("");
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isAdminActionLoading, setIsAdminActionLoading] = useState(false);

  // Broadcast Tab State
  const [adminBroadcastMsg, setAdminBroadcastMsg] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Load Stats
  useEffect(() => {
      if (adminTab === 'dashboard') {
          const loadStats = async () => {
              const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
              const { count: msgsCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });
              setDashboardStats({ users: usersCount || 0, messages: msgsCount || 0 });
          };
          loadStats();
      }
  }, [adminTab]);

  // Search Users
  useEffect(() => {
      if (adminTab !== 'users') return;
      const searchUsers = async () => {
          let query = supabase.from('profiles').select('*').limit(20);
          if (adminUserSearch.trim()) {
              query = query.or(`username.ilike.%${adminUserSearch}%,full_name.ilike.%${adminUserSearch}%`);
          }
          const { data, error } = await query;
          if (!error && data) {
              setAdminUsers(data.map(p => ({
                  id: p.id,
                  name: p.full_name,
                  username: p.username,
                  avatar: p.avatar_url,
                  status: p.status || 'offline',
                  bio: p.bio,
                  isVerified: p.is_verified,
                  isAdmin: p.is_admin,
                  isBanned: p.is_banned
              })));
          }
      };
      const timeout = setTimeout(searchUsers, 500);
      return () => clearTimeout(timeout);
  }, [adminUserSearch, adminTab]);

  const handleAdminUserAction = async (userId: string, action: 'verify' | 'admin' | 'ban' | 'reset_avatar' | 'reset_name' | 'wipe_messages', value?: boolean) => {
    setIsAdminActionLoading(true);
    try {
        if (action === 'verify') {
            await supabase.from('profiles').update({ is_verified: value }).eq('id', userId);
            setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, isVerified: value } : u));
            showToast(value ? "Пользователь верифицирован" : "Верификация снята", "success");
        }
        else if (action === 'admin') {
            await supabase.from('profiles').update({ is_admin: value }).eq('id', userId);
            setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, isAdmin: value } : u));
            showToast(value ? "Права выданы" : "Права сняты", "success");
        }
        else if (action === 'ban') {
            await supabase.from('profiles').update({ is_banned: value }).eq('id', userId);
            setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: value } : u));
            showToast(value ? "Пользователь заблокирован" : "Пользователь разблокирован", "warning");
        }
        else if (action === 'reset_avatar') {
            await supabase.from('profiles').update({ avatar_url: '' }).eq('id', userId);
            setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, avatar: '' } : u));
            showToast("Аватар сброшен", "info");
        }
        else if (action === 'reset_name') {
            await supabase.from('profiles').update({ full_name: 'Renamed User' }).eq('id', userId);
            setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, name: 'Renamed User' } : u));
            showToast("Имя сброшено", "info");
        }
        else if (action === 'wipe_messages') {
            if(!confirm("Удалить ВСЕ сообщения этого пользователя?")) return;
            await supabase.from('messages').delete().eq('sender_id', userId);
            showToast("Сообщения удалены", "error");
        }
    } catch(e) { showToast("Ошибка обновления", "error"); } finally { setIsAdminActionLoading(false); }
  };

  const handleSendBroadcast = async () => {
    if (!adminBroadcastMsg.trim()) {
        showToast("Введите текст сообщения", "warning");
        return;
    }
    
    setIsBroadcasting(true);
    
    // Use the prop passed from App.tsx which contains the correct channel logic
    if (onBroadcast) {
        const success = await onBroadcast(adminBroadcastMsg);
        if (success) {
            setAdminBroadcastMsg("");
            showToast("Рассылка успешно отправлена всем онлайн пользователям", "success");
        } else {
            showToast("Ошибка отправки рассылки (Channel Error)", "error");
        }
    } else {
        showToast("Функция рассылки недоступна", "error");
    }
    
    setIsBroadcasting(false);
  };

  const handlePurgeOldMessages = async () => {
      if(!confirm("Вы уверены? Это удалит старые сообщения из базы навсегда.")) return;
      setIsAdminActionLoading(true);
      
      try {
          // Attempt to delete messages older than 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const { error, count } = await supabase
            .from('messages')
            .delete({ count: 'exact' })
            .lt('created_at', thirtyDaysAgo.toISOString());

          if (error) throw error;
          
          showToast(`Удалено сообщений: ${count || 0}`, "success");
      } catch (e: any) {
          console.error(e);
          showToast("Ошибка очистки базы: " + e.message, "error");
      } finally {
          setIsAdminActionLoading(false);
      }
  };

  const handleSystemAction = async (action: 'maintenance' | 'ghost') => {
      if (!onBroadcast) return;
      setIsAdminActionLoading(true);
      
      const msg = action === 'maintenance' 
        ? "⚠️ Внимание: Включен режим технических работ. Возможны перебои в работе сервиса."
        : "👁️ Ghost Protocol Activated. All logging suspended.";
        
      const success = await onBroadcast(msg);
      
      if (success) {
          showToast(action === 'maintenance' ? "Режим техработ включен" : "Протокол активирован", "success");
      } else {
          showToast("Ошибка активации режима", "error");
      }
      setIsAdminActionLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center animate-pulse">
                    <Crown size={20} className="text-yellow-500" />
                </div>
                <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">GOD MODE</h2>
                    <p className="text-[9px] text-white/40">Vellor Administration</p>
                </div>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-white/10 hover:text-white transition-all"><X size={20}/></button>
        </div>
        
        {/* Tabs */}
        <div className="flex p-2 gap-2 bg-black/20 border-b border-white/5">
            <button onClick={() => setAdminTab('dashboard')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all ${adminTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}><LayoutDashboard size={14}/> Dash</button>
            <button onClick={() => setAdminTab('users')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all ${adminTab === 'users' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}><Users size={14}/> Users</button>
            <button onClick={() => setAdminTab('broadcast')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all ${adminTab === 'broadcast' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}><Radio size={14}/> Broadcast</button>
            <button onClick={() => setAdminTab('system')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all ${adminTab === 'system' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}><Server size={14}/> System</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {adminTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                            <p className="text-[10px] text-white/40 font-bold uppercase">Total Users</p>
                            <h3 className="text-2xl font-black text-white mt-1">{dashboardStats.users}</h3>
                        </div>
                        <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                            <p className="text-[10px] text-white/40 font-bold uppercase">Messages</p>
                            <h3 className="text-2xl font-black text-green-400 mt-1">{dashboardStats.messages}</h3>
                        </div>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-yellow-900/20 to-black border border-yellow-500/20 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <Activity size={20} className="text-yellow-500" />
                            <h4 className="text-xs font-bold uppercase text-white">System Status</h4>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs"><span className="text-white/60">Database</span><span className="text-green-400 font-bold">Connected</span></div>
                            <div className="flex justify-between text-xs"><span className="text-white/60">Realtime</span><span className="text-green-400 font-bold">Active</span></div>
                            <div className="flex justify-between text-xs"><span className="text-white/60">Online Now</span><span className="text-white font-bold">{onlineUsers.size}</span></div>
                        </div>
                    </div>
                </div>
            )}

            {adminTab === 'users' && (
                <div className="space-y-4">
                    <div className="relative group">
                    <Search className="absolute left-3 top-3 text-white/30" size={16} />
                    <input autoFocus value={adminUserSearch} onChange={(e) => setAdminUserSearch(e.target.value)} placeholder="Search user..." className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-yellow-500/30 outline-none transition-all" />
                </div>
                {isAdminActionLoading && <div className="flex justify-center"><Loader2 className="animate-spin text-yellow-500"/></div>}
                {adminUsers.map(u => (
                    <div key={u.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3 group hover:border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-black overflow-hidden relative">
                                <img src={u.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" />
                                {u.isBanned && <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center"><Ban size={16} className="text-white"/></div>}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white flex items-center gap-1">
                                    {u.name} 
                                    {u.isAdmin && <Crown size={10} className="text-yellow-500 fill-yellow-500"/>} 
                                    {u.isVerified && <BadgeCheck size={10} className="text-blue-400 fill-blue-400/20"/>}
                                </p>
                                <p className="text-[10px] text-white/40">@{u.username}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                            <button onClick={() => handleAdminUserAction(u.id, 'verify', !u.isVerified)} title="Toggle Verify" className={`p-2 rounded-lg flex items-center justify-center transition-all ${u.isVerified ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/30 hover:bg-blue-500/20 hover:text-blue-400'}`}><BadgeCheck size={16}/></button>
                            <button onClick={() => handleAdminUserAction(u.id, 'admin', !u.isAdmin)} title="Toggle Admin" className={`p-2 rounded-lg flex items-center justify-center transition-all ${u.isAdmin ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white/30 hover:bg-yellow-500/20 hover:text-yellow-400'}`}><Crown size={16}/></button>
                            <button onClick={() => handleAdminUserAction(u.id, 'ban', !u.isBanned)} title="Ban User" className={`p-2 rounded-lg flex items-center justify-center transition-all ${u.isBanned ? 'bg-red-500 text-white' : 'bg-white/5 text-white/30 hover:bg-red-500/20 hover:text-red-500'}`}><Ban size={16}/></button>
                            <button onClick={() => handleAdminUserAction(u.id, 'reset_name')} title="Reset Name" className="p-2 rounded-lg bg-white/5 text-white/30 hover:bg-orange-500/20 hover:text-orange-500 flex items-center justify-center"><UserX size={16}/></button>
                            <button onClick={() => handleAdminUserAction(u.id, 'wipe_messages')} title="Delete All Messages" className="p-2 rounded-lg bg-white/5 text-white/30 hover:bg-red-900/40 hover:text-red-500 flex items-center justify-center"><Skull size={16}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <button onClick={() => handleAdminUserAction(u.id, 'reset_avatar')} className="text-[9px] bg-white/5 hover:bg-white/10 p-1.5 rounded-lg text-white/50 hover:text-white transition-colors">Reset Avatar</button>
                        </div>
                    </div>
                ))}
                </div>
            )}

            {adminTab === 'broadcast' && (
                <div className="space-y-6">
                    <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Radio size={20} className="text-blue-400" />
                            <h4 className="text-xs font-bold uppercase text-white">System Broadcast</h4>
                        </div>
                        <p className="text-[10px] text-white/60 mb-4">Send a message to ALL active chats from "System".</p>
                        <textarea value={adminBroadcastMsg} onChange={(e) => setAdminBroadcastMsg(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white h-32 resize-none focus:border-blue-500/50 outline-none mb-3" placeholder="Message content..." />
                        <button onClick={handleSendBroadcast} disabled={isBroadcasting || !adminBroadcastMsg} className="w-full py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95">
                            {isBroadcasting ? <Loader2 className="animate-spin" /> : <Send size={16}/>} Send Broadcast
                        </button>
                    </div>
                </div>
            )}

            {adminTab === 'system' && (
                <div className="space-y-4">
                <div className="p-5 bg-red-900/10 border border-red-500/20 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle size={20} className="text-red-500" />
                            <h4 className="text-xs font-bold uppercase text-white">Danger Zone</h4>
                        </div>
                        <div className="space-y-3">
                            <button onClick={handlePurgeOldMessages} disabled={isAdminActionLoading} className="w-full py-3 bg-red-500/20 hover:bg-red-500/40 rounded-xl text-red-300 font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95">
                                {isAdminActionLoading ? <Loader2 className="animate-spin" /> : <Trash2 size={14}/>} Purge Old Messages (&gt;30 days)
                            </button>
                        </div>
                </div>
                <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <Globe size={20} className="text-yellow-500" />
                            <h4 className="text-xs font-bold uppercase text-white">Global Actions</h4>
                        </div>
                        <div className="space-y-3">
                            <button onClick={() => handleSystemAction('maintenance')} disabled={isAdminActionLoading} className="w-full py-3 bg-yellow-500/20 hover:bg-yellow-500/40 rounded-xl text-yellow-300 font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95">
                                <Server size={14}/> Maintenance Mode
                            </button>
                            <button onClick={() => handleSystemAction('ghost')} disabled={isAdminActionLoading} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95">
                                <Eye size={14}/> Ghost Protocol
                            </button>
                        </div>
                </div>
                </div>
            )}
        </div>
    </div>
  );
};
