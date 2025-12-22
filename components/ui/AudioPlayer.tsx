
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

export const AudioPlayer: React.FC<{ url: string, duration?: string }> = React.memo(({ url, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100);
    const handleEnded = () => { setIsPlaying(false); setProgress(0); };
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    return () => { audio.removeEventListener('timeupdate', updateProgress); audio.removeEventListener('ended', handleEnded); };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) audioRef.current?.pause(); else audioRef.current?.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-3 py-1.5 px-1 min-w-[180px]">
      <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all shrink-0 active:scale-95">
        {isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor" className="ml-0.5"/>}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden w-full"><div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} /></div>
        <div className="flex justify-between items-center opacity-50 text-[9px] font-bold">
           <span>{isPlaying ? `${Math.floor(audioRef.current?.currentTime || 0)}s` : (duration || '0:00')}</span>
           <span>Voice</span>
        </div>
      </div>
      <audio ref={audioRef} src={url} className="hidden" />
    </div>
  );
});
