

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, X, Info, ExternalLink, Share2, Sparkles, Flame, Zap, Trophy, ArrowRight, Lock, Clock, Ticket } from 'lucide-react';
import { CosmicPot } from './nfts/CosmicPot';
import { PrimeWatch } from './nfts/PrimeWatch';
import { CipherBlade } from './nfts/CipherBlade';

const MDiv = motion.div as any;
const MH2 = motion.h2 as any;
const MP = motion.p as any;
const MA = motion.a as any;

interface NftItem {
  id: string;
  name: string;
  collection: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Unique';
  component: React.ReactNode;
  utility: string;
}

const NFT_COLLECTION: NftItem[] = [
  {
    id: 'oculus-void-001',
    name: 'The Eye',
    collection: 'Genesis Origins',
    rarity: 'Legendary',
    component: <CosmicPot />,
    utility: 'Активирует визуальный эффект "Ghost Trail". Твои сообщения оставляют фиолетовый шлейф при скролле у собеседника. Выглядит дорого.'
  },
  {
    id: 'prime-chronos-001',
    name: 'Prime',
    collection: 'Chronos Elite',
    rarity: 'Epic',
    component: <PrimeWatch />,
    utility: 'Разблокирует механику "Time Capsule". Позволяет отправлять сообщения, которые автоматически исчезают из чата ровно через 24 часа.'
  },
  {
    id: 'cipher-blade-001',
    name: 'Cipher',
    collection: 'Neon Vanguard',
    rarity: 'Legendary',
    component: <CipherBlade />,
    utility: 'Включает режим "Stealth Mode". Полная анонимность в сети и скрытие статуса набора текста. Работает безупречно.'
  }
];

const RarityBadge: React.FC<{ rarity: NftItem['rarity'] }> = ({ rarity }) => {
  const colors = {
    Common: 'bg-gray-500 shadow-gray-500/20',
    Rare: 'bg-blue-500 shadow-blue-500/20',
    Epic: 'bg-purple-500 shadow-purple-500/20',
    Legendary: 'bg-orange-500 shadow-orange-500/20',
    Unique: 'bg-gradient-to-r from-pink-500 to-rose-500 shadow-rose-500/20'
  };

  const labels: Record<string, string> = {
    Common: 'Обычный',
    Rare: 'Редкий',
    Epic: 'Эпический',
    Legendary: 'Легендарный',
    Unique: 'Уникальный'
  };

  return (
    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md text-white shadow-lg ${colors[rarity]}`}>
      {labels[rarity]}
    </span>
  );
};

export const NftGallery: React.FC = () => {
  const [selectedNft, setSelectedNft] = useState<NftItem | null>(null);

  return (
    <div className="space-y-8 pb-20">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 h-52 group shadow-2xl">
         <div className="absolute inset-0 bg-gradient-to-br from-[#1a0b2e] via-[#0f0518] to-black" />
         <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
         
         {/* Animated Background Elements */}
         <MDiv 
            animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-fuchsia-600/20 blur-[100px] rounded-full mix-blend-screen"
         />

         <div className="absolute inset-0 flex flex-col justify-end p-8 z-10">
            <MDiv 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-2"
            >
                <div className="p-2 bg-white/5 rounded-xl backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(192,38,211,0.2)]">
                    <Gem className="text-fuchsia-400" size={20} />
                </div>
                <span className="text-[10px] font-bold text-fuchsia-400/80 uppercase tracking-[0.3em]">Season 1: PROLOGUE</span>
            </MDiv>
            
            <MH2 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="text-3xl font-black uppercase tracking-widest text-white leading-none mb-2"
            >
              NFT Collection
            </MH2>
            
            <MP 
              initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.3 }}
              className="text-white/60 text-xs max-w-[300px] font-medium leading-relaxed"
            >
                Собирайте цифровые NFT.
            </MP>
         </div>
         
         {/* Decorative Sparkles */}
         <Sparkles className="absolute top-6 right-6 text-white/20 w-12 h-12 animate-pulse" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
         
         {/* Real NFTs */}
         {NFT_COLLECTION.map((nft, index) => (
             <MDiv
               key={nft.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 + (index * 0.1) }}
               onClick={() => setSelectedNft(nft)}
               className="bg-[#0f0f0f] border border-white/5 rounded-[2rem] overflow-hidden hover:border-fuchsia-500/50 hover:shadow-[0_0_30px_rgba(192,38,211,0.1)] transition-all cursor-pointer group relative aspect-[4/5] flex flex-col"
             >
                {/* Image Container */}
                <div className="flex-1 relative flex items-center justify-center bg-black/40 p-0 overflow-hidden">
                    <div className="w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out filter drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                        {nft.component}
                    </div>
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60" />
                    
                    <div className="absolute top-4 right-4">
                        <RarityBadge rarity={nft.rarity} />
                    </div>
                </div>

                {/* Info */}
                <div className="p-5 bg-black/60 backdrop-blur-xl border-t border-white/5 z-10 relative">
                    <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-black/60 to-transparent" />
                    <h3 className="text-sm font-black text-white truncate mb-1.5">{nft.name}</h3>
                    <div className="flex items-center justify-between">
                        {nft.collection && <p className="text-[9px] text-fuchsia-400/80 font-bold uppercase tracking-wider truncate">{nft.collection}</p>}
                        <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-pulse shadow-[0_0_5px_currentColor]" />
                    </div>
                </div>
             </MDiv>
         ))}

         {/* Vellor Awards Reference Card (Easter Egg) - NOW AT THE END & REDESIGNED */}
         <MA 
            href="https://vellorawards.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="col-span-2 md:col-span-1 border border-white/10 bg-[#050505] rounded-[2rem] flex flex-col items-center justify-center p-6 transition-all hover:border-amber-500/50 hover:shadow-[0_10px_40px_rgba(245,158,11,0.1)] group relative overflow-hidden text-center cursor-pointer min-h-[220px]"
         >
            {/* Dark Premium Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,#1a1205_0%,#000000_70%)] opacity-80" />
            
            {/* Metallic Sheen Animation */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out z-20 pointer-events-none skew-x-12" />

            <div className="relative z-10 flex flex-col items-center">
                {/* Icon Container */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-black border border-amber-500/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
                    <Ticket size={28} className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                </div>
                
                <div className="space-y-1 mb-6">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none">VELLOR</h3>
                    <h3 className="text-xl font-black text-amber-500 uppercase tracking-widest leading-none">AWARDS</h3>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em] pt-2">2025 ACCESS</p>
                </div>
                
                {/* Status Badge */}
                <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 relative z-10 backdrop-blur-md flex items-center gap-2 group-hover:bg-amber-950/30 group-hover:border-amber-500/20 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <p className="text-[9px] font-black uppercase text-white/60 tracking-wider group-hover:text-amber-500 transition-colors">Voting Closed</p>
                </div>
            </div>

            {/* Corner Accents */}
            <div className="absolute top-4 left-4 w-2 h-2 border-t border-l border-white/20" />
            <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-white/20" />
            <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-white/20" />
            <div className="absolute bottom-4 right-4 w-2 h-2 border-b border-r border-white/20" />
            
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-1 group-hover:translate-y-0">
                <ExternalLink size={14} className="text-amber-200" />
            </div>
         </MA>
      </div>

      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedNft && (
            <MDiv 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
                onClick={() => setSelectedNft(null)}
            >
                <MDiv 
                    initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e: any) => e.stopPropagation()}
                    className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
                >
                    {/* Full View Area */}
                    <div className="aspect-square bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#000000_100%)] relative flex items-center justify-center p-0 border-b border-white/10 overflow-hidden">
                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
                         <MDiv 
                            initial={{ scale: 0.8, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
                            className="w-full h-full filter drop-shadow-[0_0_60px_rgba(168,85,247,0.25)] z-10"
                         >
                            {selectedNft.component}
                         </MDiv>
                         <button onClick={() => setSelectedNft(null)} className="absolute top-4 right-4 p-3 bg-black/50 rounded-full text-white hover:bg-white/20 transition-colors z-20 border border-white/10 backdrop-blur-md"><X size={20}/></button>
                         <div className="absolute bottom-6 left-6 z-20">
                             <RarityBadge rarity={selectedNft.rarity} />
                         </div>
                    </div>

                    {/* Details */}
                    <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar bg-[#050505]">
                        <div>
                            <h2 className="text-3xl font-black text-white mb-3 leading-none tracking-tight">{selectedNft.name}</h2>
                            {selectedNft.collection && (
                                <div className="flex items-center gap-2">
                                    <Sparkles size={14} className="text-fuchsia-400" />
                                    <p className="text-fuchsia-400 text-xs font-bold uppercase tracking-[0.2em]">{selectedNft.collection}</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-5 bg-gradient-to-br from-fuchsia-500/5 to-purple-500/5 rounded-3xl border border-fuchsia-500/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-fuchsia-500/10 blur-[40px] rounded-full pointer-events-none" />
                            <div className="flex items-center gap-2 mb-3">
                                <Zap size={16} className="text-fuchsia-400" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400">Свойства артефакта</h4>
                            </div>
                            <p className="text-sm text-white/80 leading-relaxed font-medium">
                                {selectedNft.utility}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button className="p-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-[0.98]">
                                <Flame size={16} /> Крафт
                            </button>
                            <button className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border border-white/10 hover:scale-[1.02] active:scale-[0.98]">
                                <Share2 size={16} /> Поделиться
                            </button>
                        </div>
                    </div>
                </MDiv>
            </MDiv>
        )}
      </AnimatePresence>
    </div>
  );
};