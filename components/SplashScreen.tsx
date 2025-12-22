
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
    // Ultra-fast timeline: Total ~2.5s
    const t1 = setTimeout(() => setStage('explode'), 800);
    const t2 = setTimeout(() => onComplete(), 2500);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <MDiv
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
      exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)", transition: { duration: 0.5 } }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a0505_0%,#000000_100%)] z-0" />

      {/* STAGE 1: IGNITION (Gathers energy) */}
      {stage === 'ignite' && (
          <MDiv 
            className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_50px_20px_rgba(255,50,50,0.8)] z-10"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 15, opacity: 1 }}
            transition={{ duration: 0.8, ease: "circIn" }}
          />
      )}

      {/* STAGE 2: EXPLOSION & REVEAL */}
      {stage === 'explode' && (
          <div className="relative z-20 flex flex-col items-center">
              {/* Shockwave */}
              <MDiv 
                  className="absolute inset-0 border border-white/50 rounded-full"
                  initial={{ width: 0, height: 0, opacity: 1, borderWidth: 50 }}
                  animate={{ width: '200vmax', height: '200vmax', opacity: 0, borderWidth: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
              />

              {/* Logo SVG */}
              <motion.svg 
                  viewBox="0 0 100 100" 
                  className="w-40 h-40 drop-shadow-[0_0_40px_rgba(255,0,51,0.8)]"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                  <MPath
                      d="M 20 25 L 50 85 L 80 25"
                      fill="none"
                      stroke="#ff0033"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                  <MPath
                      d="M 50 95 L 50 85"
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                  />
              </motion.svg>

              {/* Text */}
              <MH1 
                  className="text-6xl font-black text-white tracking-[0.2em] mt-6 mix-blend-overlay"
                  initial={{ y: 20, opacity: 0, letterSpacing: '0.5em' }}
                  animate={{ y: 0, opacity: 1, letterSpacing: '0.2em' }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
              >
                  VELLOR
              </MH1>
          </div>
      )}
    </MDiv>
  );
};
