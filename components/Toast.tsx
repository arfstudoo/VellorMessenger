
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
    hidden: { y: -20, opacity: 0, scale: 0.95, filter: 'blur(10px)' },
    visible: { y: 10, opacity: 1, scale: 1, filter: 'blur(0px)' }, // Reduced y offset
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
          className="fixed top-2 left-0 right-0 mx-auto z-[9999] w-[92%] max-w-[360px] pointer-events-none"
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className={`
            pointer-events-auto
            bg-[#050505]/95 backdrop-blur-2xl 
            border ${style.border} 
            rounded-2xl p-3
            ${style.glow}
            flex items-center gap-3 relative overflow-hidden shadow-2xl
          `}>
            {/* Texture */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            
            {/* Icon/Avatar */}
            <div className="relative shrink-0">
                {icon ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-inner">
                        <img src={icon} className="w-full h-full object-cover" alt="" />
                    </div>
                ) : (
                    <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 ${style.iconColor}`}>
                        <IconComponent size={20} />
                    </div>
                )}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-black flex items-center justify-center`}>
                    <div className={`w-2 h-2 rounded-full ${type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-vellor-red'}`} />
                </div>
            </div>
            
            <div className="flex-1 min-w-0 z-10">
              <h4 className="text-white text-[11px] font-black uppercase tracking-wide mb-0.5 drop-shadow-md">
                {type === 'success' ? 'Успешно' : type === 'error' ? 'Ошибка' : 'Сообщение'}
              </h4>
              <p className="text-white/80 text-[11px] font-medium leading-snug line-clamp-2">
                {message}
              </p>
            </div>

            <button 
                onClick={onClose} 
                className="p-1.5 -mr-1 text-white/30 hover:text-white transition-colors z-10 active:scale-90 bg-white/5 rounded-lg"
            >
              <X size={16} />
            </button>
          </div>
        </MDiv>
      )}
    </AnimatePresence>
  );
};
