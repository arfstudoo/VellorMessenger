
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MDiv = motion.div as any;
const MPath = motion.path as any;
const MH1 = motion.h1 as any;

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'ignite' | 'explode'>('ignite');

  useEffect(() => {
    // Ultra-fast timeline: Total ~2.2s
    const t1 = setTimeout(() => setStage('explode'), 700);
    const t2 = setTimeout(() => onComplete(), 2200);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <MDiv
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)", transition: { duration: 0.6, ease: "easeInOut" } }}
    >
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a0505_0%,#000000_100%)] z-0">
          <MDiv 
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,51,0.15)_0%,transparent_70%)]"
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />
      </div>

      {/* Particles/Stars */}
      {[...Array(20)].map((_, i) => (
          <MDiv
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
              }}
              animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
              }}
              transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
              }}
          />
      ))}

      {/* STAGE 1: IGNITION (Gathers energy) */}
      {stage === 'ignite' && (
          <MDiv 
            className="absolute w-6 h-6 bg-white rounded-full shadow-[0_0_80px_30px_rgba(255,50,50,0.8)] z-10"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 20, 15], opacity: [0, 1, 1] }}
            transition={{ duration: 0.7, ease: "easeIn" }}
          />
      )}

      {/* STAGE 2: EXPLOSION & REVEAL */}
      {stage === 'explode' && (
          <div className="relative z-20 flex flex-col items-center">
              {/* Multiple Shockwaves */}
              {[0, 0.15, 0.3].map((delay, i) => (
                  <MDiv 
                      key={i}
                      className="absolute inset-0 border-2 border-white/30 rounded-full"
                      initial={{ width: 0, height: 0, opacity: 1 }}
                      animate={{ width: '200vmax', height: '200vmax', opacity: 0 }}
                      transition={{ duration: 1.5, ease: "easeOut", delay }}
                  />
              ))}

              {/* Logo SVG with enhanced animation */}
              <motion.svg 
                  viewBox="0 0 100 100" 
                  className="w-48 h-48 drop-shadow-[0_0_60px_rgba(255,0,51,0.9)] relative z-10"
                  initial={{ scale: 0.3, opacity: 0, rotate: -180 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
              >
                  {/* Glow effect behind logo */}
                  <defs>
                      <filter id="glow">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                      </filter>
                  </defs>
                  
                  <MPath
                      d="M 20 25 L 50 85 L 80 25"
                      fill="none"
                      stroke="#ff0033"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glow)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  />
                  
                  {/* Accent lines */}
                  <MPath
                      d="M 50 95 L 50 85"
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ opacity: 0, y: -15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7, duration: 0.4 }}
                  />
              </motion.svg>

              {/* Text with stagger effect */}
              <MH1 
                  className="text-7xl font-black text-white tracking-[0.25em] mt-8 relative"
                  initial={{ y: 30, opacity: 0, letterSpacing: '0.6em', filter: 'blur(10px)' }}
                  animate={{ y: 0, opacity: 1, letterSpacing: '0.25em', filter: 'blur(0px)' }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
              >
                  <span className="relative z-10">VELLOR</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-vellor-red/20 to-transparent blur-xl" />
              </MH1>
              
              {/* Subtitle */}
              <MDiv
                  className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
              >
                  Premium Messenger
              </MDiv>
          </div>
      )}
    </MDiv>
  );
};
