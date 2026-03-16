
import React from 'react';
import { motion } from 'framer-motion';
import { X, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from 'lucide-react';
import { CallLogItem } from '../../types';

interface CallHistoryModalProps {
  onClose: () => void;
  history: CallLogItem[];
}

export const CallHistoryModal: React.FC<CallHistoryModalProps> = ({ onClose, history }) => {
  return (
    <div className="flex flex-col h-full bg-[#050505] relative">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg"><Phone size={18} className="text-green-500"/></div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">ИСТОРИЯ ЗВОНКОВ</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all text-white/50 hover:text-white active:scale-90"><X size={20}/></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
          {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-30 text-white gap-4">
                  <Clock size={48} strokeWidth={1} />
                  <p className="text-xs">История пуста</p>
              </div>
          ) : (
              history.map(call => (
                  <div key={call.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4">
                      <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-black overflow-hidden border border-white/10">
                              <img src={call.partnerAvatar || 'https://via.placeholder.com/48'} className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-white/10">
                              {call.direction === 'missed' ? <PhoneMissed size={12} className="text-red-500"/> : 
                               call.direction === 'incoming' ? <PhoneIncoming size={12} className="text-green-500"/> :
                               <PhoneOutgoing size={12} className="text-blue-500"/>}
                          </div>
                      </div>
                      <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{call.partnerName}</h4>
                          <p className="text-[10px] text-white/40 flex items-center gap-2">
                              {new Date(call.date).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                              <span className="w-1 h-1 rounded-full bg-white/20"/>
                              {call.type === 'audio' ? 'Аудио' : 'Видео'}
                          </p>
                      </div>
                      <div className="text-right">
                          <p className="text-xs font-mono font-bold text-white/80">{call.duration}</p>
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
};
