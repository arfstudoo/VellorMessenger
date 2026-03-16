
import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.indexOf(' electron/') > -1) {
      setIsElectron(true);
    }
  }, []);

  const handleMinimize = () => {
    if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('minimize-window');
    }
  };

  const handleMaximize = () => {
    if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        const { ipcRenderer: ipc } = (window as any).require('electron');
        ipc.invoke('toggle-maximize').then((maximized: boolean) => {
            setIsMaximized(maximized);
        });
    }
  };

  const handleClose = () => {
    if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('close-window');
    }
  };

  if (!isElectron) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-[32px] z-[99999] flex justify-between items-center select-none pointer-events-none">
      {/* Drag Region */}
      <div className="absolute inset-0 app-drag-region" />

      <div className="flex-1" />

      {/* Window Controls */}
      <div className="flex items-center h-full mr-1 pointer-events-auto z-[100000]">
        <button 
            onClick={handleMinimize}
            className="h-full w-10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors focus:outline-none no-drag"
        >
            <Minus size={14} />
        </button>
        <button 
            onClick={handleMaximize}
            className="h-full w-10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors focus:outline-none no-drag"
        >
            {isMaximized ? <Copy size={12} className="rotate-180" /> : <Square size={12} />}
        </button>
        <button 
            onClick={handleClose}
            className="h-full w-10 flex items-center justify-center text-white/50 hover:bg-red-500 hover:text-white transition-colors focus:outline-none no-drag rounded-tr-lg"
        >
            <X size={14} />
        </button>
      </div>
    </div>
  );
};
