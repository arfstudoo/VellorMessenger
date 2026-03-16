
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, MessageCircle } from 'lucide-react';

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
      const timer = setTimeout(onClose, 5000); 
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const variants = {
    hidden: { y: -30, opacity: 0, scale: 0.9, filter: 'blur(10px)' },
    visible: { y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' },
    exit: { y: -30, opacity: 0, scale: 0.9, filter: 'blur(10px)' }
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
          className="fixed top-4 left-0 right-0 mx-auto z-[9999] w-[92%] max-w-[380px] pointer-events-none"
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className={`
            pointer-events-auto
            glass-panel
            border ${style.border} 
            rounded-3xl p-4
            ${style.glow}
            flex items-center gap-4 relative overflow-hidden shadow-2xl
            hover:scale-[1.02] transition-transform duration-300
          `}>
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
            
            {/* Texture */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            
            {/* Icon/Avatar */}
            <div className="relative shrink-0">
                {icon ? (
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/10 shadow-lg">
                        <img src={icon} className="w-full h-full object-cover" alt="" />
                    </div>
                ) : (
                    <div className={`w-12 h-12 rounded-2xl glass-panel-light flex items-center justify-center border border-white/10 ${style.iconColor} shadow-inner`}>
                        <IconComponent size={22} />
                    </div>
                )}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black flex items-center justify-center border border-black`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-vellor-red'} animate-pulse`} />
                </div>
            </div>
            
            <div className="flex-1 min-w-0 z-10">
              <h4 className="text-white text-[11px] font-black uppercase tracking-wider mb-1 drop-shadow-md">
                {type === 'success' ? 'Успешно' : type === 'error' ? 'Ошибка' : type === 'warning' ? 'Внимание' : 'Сообщение'}
              </h4>
              <p className="text-white/80 text-[12px] font-medium leading-snug line-clamp-2">
                {message}
              </p>
            </div>

            <button 
                onClick={onClose} 
                className="p-2 -mr-1 text-white/30 hover:text-white transition-all z-10 active:scale-90 glass-panel-light rounded-xl hover:bg-white/10 group"
            >
              <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </MDiv>
      )}
    </AnimatePresence>
  );
};
