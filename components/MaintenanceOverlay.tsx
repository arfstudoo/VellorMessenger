
import React from 'react';
import { motion } from 'framer-motion';
import { Server, ShieldAlert, Construction } from 'lucide-react';

const MDiv = motion.div as any;

export const MaintenanceOverlay: React.FC = () => {
  return (
    <MDiv 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-8 text-center select-none"
    >
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#1a1a00_10px,#1a1a00_20px)] opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      
      <div className="relative z-10 flex flex-col items-center">
        <MDiv 
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-32 h-32 bg-yellow-500/10 border-2 border-yellow-500/50 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(234,179,8,0.2)]"
        >
            <Construction size={64} className="text-yellow-500" />
        </MDiv>

        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4 flex flex-col gap-2">
            <span>System</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600">Maintenance</span>
        </h1>

        <p className="text-white/50 text-sm md:text-base max-w-md font-mono uppercase tracking-widest leading-relaxed mb-12">
            Ведутся технические работы на сервере.<br/>
            Доступ временно ограничен.<br/>
            Пожалуйста, ожидайте.
        </p>

        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-lg border border-white/5">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Server Status: Locked</span>
        </div>
      </div>
    </MDiv>
  );
};
