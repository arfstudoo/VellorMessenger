
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

export const AudioPlayer: React.FC<{ url: string, duration?: string }> = React.memo(({ url, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate fake waveform bars (since we can't easily analyze remote audio bytes without CORS/WebAudio complexity)
  // We use useMemo so the pattern stays consistent for this component instance
  const bars = useMemo(() => {
      return Array.from({ length: 32 }, () => Math.floor(Math.random() * 70) + 30);
  }, []);

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
    <div className="flex items-center gap-3 py-2 px-1 min-w-[200px]">
      <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all shrink-0 active:scale-95 text-white">
        {isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor" className="ml-0.5"/>}
      </button>
      
      <div className="flex-1 flex flex-col justify-center gap-1.5">
          {/* WAVEFORM VISUALIZER */}
          <div className="flex items-center gap-[2px] h-6 w-full">
              {bars.map((height, index) => {
                  const barProgress = (index / bars.length) * 100;
                  const isPlayed = barProgress < progress;
                  
                  return (
                      <div 
                        key={index}
                        className={`w-1 rounded-full transition-all duration-100 ${isPlayed ? 'bg-vellor-red' : 'bg-white/20'}`}
                        style={{ 
                            height: `${height}%`,
                            opacity: isPlayed ? 1 : 0.5
                        }}
                      />
                  );
              })}
          </div>
          
          <div className="flex justify-between items-center opacity-50 text-[9px] font-bold text-white font-mono leading-none">
             <span>{isPlaying && audioRef.current ? formatTime(audioRef.current.currentTime) : (duration || '0:00')}</span>
          </div>
      </div>
      <audio ref={audioRef} src={url} className="hidden" />
    </div>
  );
});

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
