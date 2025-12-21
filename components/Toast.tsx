

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Info, CheckCircle, AlertTriangle, MessageCircle } from 'lucide-react';

const MDiv = motion.div as any;

export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  icon?: string;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', isVisible, onClose, icon }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 5000); // Чуть дольше висит, чтобы успеть прочитать
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const variants = {
    hidden: { y: -20, opacity: 0, scale: 0.95, filter: 'blur(10px)' },
    visible: { y: 20, opacity: 1, scale: 1, filter: 'blur(0px)' },
    exit: { y: -20, opacity: 0, scale: 0.95, filter: 'blur(10px)' }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success': return { border: 'border-green-500/30', glow: 'shadow-[0_0_30px_-10px_rgba(34,197,94,0.3)]', iconColor: 'text-green-400', Icon: CheckCircle };
      case 'warning': return { border: 'border-yellow-500/30', glow: 'shadow-[0_0_30px_-10px_rgba(234,179,8,0.3)]', iconColor: 'text-yellow-400', Icon: AlertTriangle };
      case 'error': return { border: 'border-red-500/30', glow: 'shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]', iconColor: 'text-red-500', Icon: AlertTriangle };
      default: return { border: 'border-vellor-red/30', glow: 'shadow-[0_0_30px_-10px_rgba(255,0,51,0.3)]', iconColor: 'text-vellor-red', Icon: MessageCircle };
    }
  };

  const style = getTypeStyles();
  const IconComponent = style.Icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <MDiv
          className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm pointer-events-none"
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className={`
            pointer-events-auto
            bg-[#050505]/80 backdrop-blur-2xl 
            border ${style.border} 
            rounded-[1.5rem] p-4 
            ${style.glow}
            flex items-center gap-4 relative overflow-hidden
          `}>
            {/* Декоративный шум/текстура */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            
            {/* Аватар или Иконка */}
            <div className="relative shrink-0">
                {icon ? (
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                        <img src={icon} className="w-full h-full object-cover" alt="" />
                    </div>
                ) : (
                    <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 ${style.iconColor}`}>
                        <IconComponent size={24} />
                    </div>
                )}
                {/* Индикатор типа (точка) */}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black flex items-center justify-center`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-vellor-red'}`} />
                </div>
            </div>
            
            <div className="flex-1 min-w-0 z-10">
              <h4 className="text-white text-[13px] font-black uppercase tracking-wide mb-0.5 drop-shadow-md">
                {type === 'success' ? 'Успешно' : type === 'error' ? 'Ошибка' : 'Новое сообщение'}
              </h4>
              <p className="text-white/70 text-xs font-medium leading-snug line-clamp-2">
                {message}
              </p>
            </div>

            <button 
                onClick={onClose} 
                className="p-2 -mr-2 text-white/20 hover:text-white transition-colors z-10 active:scale-90"
            >
              <X size={18} />
            </button>
          </div>
        </MDiv>
      )}
    </AnimatePresence>
  );
};