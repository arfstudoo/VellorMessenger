
import React from 'react';
import { motion } from 'framer-motion';
import { UserStatus } from '../../types';

const MDiv = motion.div as any;

export const StatusIndicator: React.FC<{ status: UserStatus; size?: string }> = ({ status, size = "w-3 h-3" }) => {
  const colors = {
    online: 'bg-vellor-red shadow-[0_0_10px_#ff0033]',
    away: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]',
    dnd: 'bg-crimson shadow-[0_0_10px_rgba(220,20,60,0.5)]',
    offline: 'bg-gray-600'
  };

  return (
    <div className="relative">
        <div 
          className={`${size} rounded-full border-2 border-black ${colors[status] || colors.offline} relative z-10 transition-colors duration-300`}
        />
        {status === 'online' && (
            <MDiv 
                animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                className={`absolute inset-0 rounded-full bg-vellor-red -z-0`}
            />
        )}
    </div>
  );
};
