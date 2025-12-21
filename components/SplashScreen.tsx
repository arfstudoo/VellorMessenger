
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'nebula' | 'collapse' | 'flash' | 'reveal'>('nebula');

  useEffect(() => {
    // Cinematic Timeline
    const t1 = setTimeout(() => setStage('collapse'), 2500);
    const t2 = setTimeout(() => setStage('flash'), 4000);
    const t3 = setTimeout(() => setStage('reveal'), 4200);
    const t4 = setTimeout(() => onComplete(), 8000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)", transition: { duration: 1.5, ease: "easeInOut" } }}
    >
      {/* --- LAYER 1: STARFIELD --- */}
      <motion.div 
        className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40"
        animate={
            stage === 'flash' ? { scale: 4, opacity: 0 } : 
            stage === 'reveal' ? { scale: 1.1, opacity: 0.5 } : { scale: 1.2 }
        }
        transition={{ duration: stage === 'flash' ? 0.2 : 10, ease: "linear" }}
      />
      
      {/* Deep Space Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_80%)] z-0" />

      {/* --- LAYER 2: THE SINGULARITY --- */}
      <div className="relative flex items-center justify-center w-[800px] h-[800px]">
        
        <AnimatePresence>
            {(stage === 'nebula' || stage === 'collapse') && (
                <motion.div
                    key="blackhole"
                    className="absolute inset-0 flex items-center justify-center"
                    exit={{ scale: 0, opacity: 0, transition: { duration: 0.3, ease: "backIn" } }}
                >
                    {/* 1. Distant Red Glow (The Hawking Radiation) */}
                    <motion.div 
                        className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-[60px] mix-blend-screen"
                        style={{ background: 'radial-gradient(circle, #8a0000 0%, transparent 70%)' }}
                        animate={stage === 'collapse' ? { scale: 0, opacity: 0 } : { scale: [0.9, 1.1, 0.9], opacity: [0.2, 0.3, 0.2] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* 2. Outer Accretion Disk (Darker, slower swirl) */}
                    <motion.div 
                         className="absolute w-[500px] h-[500px] rounded-full blur-2xl mix-blend-screen opacity-50"
                         style={{ 
                             background: 'conic-gradient(from 0deg, transparent 0%, #4a0404 15%, #ff0033 45%, transparent 60%, #8a0000 85%, transparent 100%)',
                         }}
                         animate={{ rotate: 360, scale: stage === 'collapse' ? 0 : 1 }}
                         transition={{ rotate: { duration: 25, ease: "linear", repeat: Infinity }, scale: { duration: 1.5, ease: "circIn" } }}
                    />

                    {/* 3. Inner Accretion Disk (Bright, Hot Matter) */}
                    {/* Masked to look like a ring */}
                    <motion.div 
                         className="absolute w-[340px] h-[340px] rounded-full blur-md mix-blend-screen"
                         style={{ 
                             background: 'conic-gradient(from 180deg, transparent 0%, #ff4d00 10%, #ffcc00 25%, #ffffff 40%, #ffcc00 55%, #ff4d00 70%, transparent 90%)',
                             maskImage: 'radial-gradient(circle, transparent 58%, black 65%)',
                             WebkitMaskImage: 'radial-gradient(circle, transparent 58%, black 65%)'
                         }}
                         animate={{ rotate: -360, scale: stage === 'collapse' ? 0 : 1 }}
                         transition={{ rotate: { duration: 6, ease: "linear", repeat: Infinity }, scale: { duration: 1.4, ease: "circIn" } }}
                    />

                    {/* 4. Photon Sphere (The glowing edge) */}
                    <motion.div 
                        className="absolute w-[190px] h-[190px] rounded-full border-[2px] border-white/90 shadow-[0_0_30px_rgba(255,200,150,0.8),inset_0_0_20px_rgba(255,100,50,0.5)] z-10"
                        animate={stage === 'collapse' ? { scale: 0, opacity: 1 } : { scale: [1, 1.01, 1], opacity: [0.9, 1, 0.9] }}
                        transition={{ duration: 0.15, repeat: Infinity, repeatType: "reverse" }} 
                    />

                    {/* 5. Event Horizon (Absolute Black) */}
                    <motion.div 
                        className="absolute w-[186px] h-[186px] bg-black rounded-full z-20 shadow-[inset_0_0_60px_rgba(0,0,0,1)]"
                        animate={stage === 'collapse' ? { scale: 0 } : { scale: 1 }}
                        transition={{ duration: 1.5, ease: "circIn" }}
                    >
                         {/* Subtle rim light reflection */}
                         <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.03),transparent_40%)]" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* PHASE 3: BIG BANG */}
        {stage === 'flash' && (
            <motion.div 
                className="fixed inset-0 bg-white z-[100] mix-blend-normal"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
            />
        )}

        {/* PHASE 4: LOGO REVEAL */}
        {(stage === 'flash' || stage === 'reveal') && (
            <div className="absolute z-50 flex flex-col items-center justify-center">
                 
                 {/* Explosive Shockwave */}
                <motion.div 
                    className="absolute w-[1px] h-[1px] rounded-full border border-vellor-red/30 opacity-0"
                    animate={{ width: '150vmax', height: '150vmax', opacity: [0.8, 0], borderWidth: [100, 0] }}
                    transition={{ duration: 2, ease: "circOut" }}
                />

                {/* Core Glow */}
                <motion.div 
                    className="absolute w-60 h-60 bg-vellor-red/40 blur-[80px] rounded-full mix-blend-screen"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />

                {/* LOGO */}
                <div className="relative w-56 h-56">
                    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-[0_0_30px_rgba(255,50,50,0.6)]">
                        <defs>
                            <linearGradient id="coolingMagma" x1="0%" y1="100%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#800000" />
                                <stop offset="40%" stopColor="#ff0033" />
                                <stop offset="80%" stopColor="#ffaa00" />
                                <stop offset="100%" stopColor="#ffffff" />
                            </linearGradient>
                        </defs>

                        <motion.path
                            d="M 20 25 L 50 85 L 80 25"
                            fill="none"
                            stroke="url(#coolingMagma)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0, opacity: 0, strokeWidth: 15, filter: "blur(10px)" }}
                            animate={{ pathLength: 1, opacity: 1, strokeWidth: 6, filter: "blur(0px)" }}
                            transition={{ duration: 1.8, ease: "easeOut" }}
                        />
                        
                        <motion.path
                            d="M 50 95 L 50 85"
                            stroke="rgba(255,255,255,0.5)"
                            strokeWidth="1"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 1.5, duration: 0.5 }}
                        />
                    </svg>
                </div>

                {/* TEXT */}
                <motion.div 
                    className="mt-6 overflow-hidden relative"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                >
                    <motion.h1 
                        className="text-5xl font-black text-white tracking-[0.4em] pl-4 mix-blend-overlay"
                        initial={{ y: 40, filter: "blur(20px)" }}
                        animate={{ y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                    >
                        VELLOR
                    </motion.h1>
                    
                    <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{ duration: 1.5, delay: 1, ease: "easeInOut" }}
                    />
                </motion.div>
            </div>
        )}
      </div>
    </motion.div>
  );
};
