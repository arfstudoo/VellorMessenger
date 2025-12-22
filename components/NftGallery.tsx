
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, X, Info, ExternalLink, Share2, Sparkles, Flame, Zap, Trophy, ArrowRight, Lock, Clock, Ticket, ChevronLeft } from 'lucide-react';
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
    utility: 'Мой личный фаворит. Включает "Ghost Trail" — твои сообщения оставляют за собой фиолетовый шлейф при скролле у собеседника. Выглядит дорого, работает безупречно.'
  },
  {
    id: 'prime-chronos-001',
    name: 'Prime',
    collection: 'Chronos Elite',
    rarity: 'Epic',
    component: <PrimeWatch />,
    utility: 'Дает доступ к механике "Time Capsule". Ты сможешь отправлять сообщения, которые исчезнут ровно через 24 часа. Идеально для инсайдов, которые не должны остаться в истории.'
  },
  {
    id: 'cipher-blade-001',
    name: 'Cipher',
    collection: 'Neon Vanguard',
    rarity: 'Legendary',
    component: <CipherBlade />,
    utility: 'Активирует "Stealth Mode". Полная маскировка: скрывает статус "печатает" и время твоего последнего визита. Никто не узнает, что ты был онлайн.'
  }
];

const RarityBadge: React.FC<{ rarity: NftItem['rarity'] }> = ({ rarity }) => {
  const colors = {
    Common: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
    Rare: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    Epic: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
    Legendary: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
    Unique: 'bg-rose-500/20 text-rose-300 border-rose-500/50'
  };

  const labels: Record<string, string> = {
    Common: 'Обычный',
    Rare: 'Редкий',
    Epic: 'Эпический',
    Legendary: 'Легендарный',
    Unique: 'Уникальный'
  };

  return (
    <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border backdrop-blur-md ${colors[rarity]}`}>
      {labels[rarity]}
    </span>
  );
};

interface NftGalleryProps {
  onClose: () => void;
}

export const NftGallery: React.FC<NftGalleryProps> = ({ onClose }) => {
  const [selectedNft, setSelectedNft] = useState<NftItem | null>(null);

  return (
    <div className="flex flex-col h-full bg-[#030303] relative z-50 overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-800 flex items-center justify-center shadow-[0_0_20px_rgba(192,38,211,0.3)]">
                <Gem size={20} className="text-white" />
            </div>
            <div>
                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white">COLLECTION</h2>
                <p className="text-[9px] text-white/30 font-medium">Digital Artifacts</p>
            </div>
        </div>
        <button 
            onClick={onClose} 
            className="p-3 bg-white/5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-90"
        >
            <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-24">
        {/* Cinematic Banner */}
        <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 h-64 group shadow-2xl shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-black via-[#1a0b2e] to-black" />
            <MDiv 
               className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" 
               animate={{ opacity: [0.2, 0.4, 0.2] }}
               transition={{ duration: 5, repeat: Infinity }}
            />
            
            {/* Animated Background Elements */}
            <MDiv 
                animate={{ scale: [1, 1.5, 1], rotate: [0, 90, 0], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-fuchsia-600/30 to-blue-600/30 blur-[100px] rounded-full mix-blend-screen pointer-events-none"
            />

            <div className="absolute inset-0 flex flex-col justify-end p-8 z-10">
                <MDiv 
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                className="flex items-center gap-3 mb-4"
                >
                    <div className="px-3 py-1 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-[9px] font-bold text-fuchsia-300 uppercase tracking-[0.2em] backdrop-blur-md">
                        ПРОЛОГ
                    </div>
                    <div className="h-px w-10 bg-fuchsia-500/30" />
                </MDiv>
                
                <MH2 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-4xl font-black uppercase tracking-widest text-white leading-[0.9] mb-4 drop-shadow-lg"
                >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">Genesis</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-600">Origins</span>
                </MH2>
                
                <MP 
                initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.3 }}
                className="text-white/60 text-xs max-w-md font-medium leading-relaxed"
                >
                    Я создал эти артефакты не просто для красоты. Это ключи к скрытым возможностям системы, доступные только избранным.
                </MP>
            </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {NFT_COLLECTION.map((nft, index) => (
                <MDiv
                key={nft.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (index * 0.1), type: 'spring', damping: 20 }}
                onClick={() => setSelectedNft(nft)}
                whileHover={{ y: -10, rotateX: 5, rotateY: 5 }}
                className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden hover:border-fuchsia-500/40 hover:shadow-[0_20px_50px_-20px_rgba(192,38,211,0.4)] transition-all cursor-pointer group relative aspect-[3/4] flex flex-col transform perspective-1000"
                >
                    {/* Image Container */}
                    <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-b from-transparent to-black/20">
                        <div className="absolute inset-0 bg-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-110 drop-shadow-2xl">
                            {nft.component}
                        </div>
                        
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                            <div className="bg-white text-black p-2 rounded-full shadow-lg">
                                <ArrowRight size={14} />
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="p-5 bg-black/40 backdrop-blur-md border-t border-white/5 z-10 relative">
                        <h3 className="text-sm font-black text-white truncate mb-1 group-hover:text-fuchsia-400 transition-colors">{nft.name}</h3>
                        <p className="text-[9px] text-white/40 uppercase tracking-wider font-bold mb-2">{nft.collection}</p>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${nft.rarity === 'Legendary' ? 'bg-orange-500' : 'bg-blue-500'} shadow-[0_0_8px_currentColor]`} />
                            <span className="text-[9px] text-white/60">{nft.rarity}</span>
                        </div>
                    </div>
                </MDiv>
            ))}

            {/* Voting Card */}
            <MA 
                href="https://vellorawards.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="col-span-2 md:col-span-1 border border-white/10 bg-[#080808] rounded-[2rem] flex flex-col items-center justify-center p-6 transition-all hover:border-amber-500/40 hover:bg-[#0f0f0f] group relative overflow-hidden text-center cursor-pointer min-h-[220px]"
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#451a03_0%,#000000_70%)] opacity-40 group-hover:opacity-60 transition-opacity" />
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                        <Ticket size={24} className="text-amber-500" />
                    </div>
                    
                    <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-1">VELLOR</h3>
                    <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600 uppercase tracking-widest leading-none mb-4">AWARDS</h3>
                    
                    <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md">
                        <p className="text-[9px] font-bold uppercase text-white/40 tracking-wider">Голосование закрыто</p>
                    </div>
                </div>
            </MA>
        </div>
      </div>

      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedNft && (
            <MDiv 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 md:p-8"
                onClick={() => setSelectedNft(null)}
            >
                <MDiv 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                    animate={{ scale: 1, opacity: 1, y: 0 }} 
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    onClick={(e: any) => e.stopPropagation()}
                    className="w-full h-full md:w-[420px] md:h-auto md:max-h-[85vh] bg-[#050505] border-0 md:border border-white/10 rounded-none md:rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col"
                >
                    {/* VISUAL (TOP) */}
                    <div className="w-full aspect-square md:aspect-[4/3] bg-[#0a0a0a] relative flex items-center justify-center border-b border-white/10 overflow-hidden group shrink-0">
                         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#000000_100%)]" />
                         <MDiv 
                            className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"
                            animate={{ opacity: [0.1, 0.3, 0.1] }}
                            transition={{ duration: 4, repeat: Infinity }}
                         />
                         
                         <MDiv 
                            initial={{ scale: 0.8, rotate: -5, opacity: 0 }} 
                            animate={{ scale: 1, rotate: 0, opacity: 1 }} 
                            transition={{ delay: 0.2, duration: 0.8, type: 'spring' }}
                            className="w-[60%] h-[60%] filter drop-shadow-[0_0_80px_rgba(168,85,247,0.15)] z-10"
                         >
                            {selectedNft.component}
                         </MDiv>

                         <button 
                            onClick={() => setSelectedNft(null)} 
                            className="absolute top-6 right-6 p-3 bg-black/50 rounded-full text-white hover:bg-white/20 transition-colors z-30 border border-white/10 backdrop-blur-md active:scale-90"
                         >
                             <X size={20}/>
                         </button>
                    </div>

                    {/* DETAILS (BOTTOM) */}
                    <div className="w-full flex-1 flex flex-col bg-[#050505] relative overflow-hidden">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                            <div className="mb-6 flex items-center justify-between">
                                <RarityBadge rarity={selectedNft.rarity} />
                            </div>
                            
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 leading-[0.9] tracking-tight">{selectedNft.name}</h2>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-6">{selectedNft.collection}</p>
                            
                            <div className="space-y-4">
                                <div className="p-5 bg-gradient-to-br from-fuchsia-900/10 to-transparent border border-fuchsia-500/20 rounded-2xl relative overflow-hidden w-full group/card hover:border-fuchsia-500/40 transition-colors">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-600/10 blur-[50px] rounded-full pointer-events-none group-hover/card:bg-fuchsia-600/20 transition-colors" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400 mb-2 flex items-center gap-2">
                                        <Zap size={14} /> Utility
                                    </h4>
                                    <p className="text-sm text-white/90 leading-relaxed font-medium min-w-0">
                                        {selectedNft.utility}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider mb-1">Type</p>
                                        <p className="text-xs font-bold text-white">Access Key</p>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider mb-1">Edition</p>
                                        <p className="text-xs font-bold text-white">1st Edition</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 pt-0 shrink-0">
                            <button className="w-full py-4 bg-white text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-white/5 active:scale-95">
                                Acquire Asset <ArrowRight size={16}/>
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
