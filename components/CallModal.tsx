import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, User, Monitor, MonitorOff, Headphones, VolumeX, Volume2, MoreVertical } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { CallState, CallType } from '../types';

interface CallModalProps {
  callState: CallState;
  callType: CallType;
  partnerName: string;
  partnerAvatar: string;
  partnerId: string;
  myId: string;
  isCaller: boolean;
  onAnswer: () => void;
  onEnd: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
};

const serializeSdp = (sdp: RTCSessionDescription | RTCSessionDescriptionInit) => ({
  type: sdp.type,
  sdp: sdp.sdp
});

const serializeCandidate = (candidate: RTCIceCandidate) => ({
  candidate: candidate.candidate,
  sdpMid: candidate.sdpMid,
  sdpMLineIndex: candidate.sdpMLineIndex
});

export const CallModal: React.FC<CallModalProps> = ({ 
  callState, callType, partnerName, partnerAvatar, partnerId, myId, isCaller, onAnswer, onEnd 
}) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false); 
  const [partnerIsDeafened, setPartnerIsDeafened] = useState(false);
  
  const [remoteIsScreenSharing, setRemoteIsScreenSharing] = useState(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Volume Control State
  const [remoteVolume, setRemoteVolume] = useState(1);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const candidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  
  const signalingChannelId = `signaling:${[myId, partnerId].sort().join('_')}`;

  // Close context menu on click elsewhere
  useEffect(() => {
      const handleClick = () => setContextMenu(null);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, []);

  // 1. Initial Media Setup (Audio Only first, or Audio+Video if requested)
  // CRITICAL: We get the audio track ONCE and keep it alive.
  useEffect(() => {
    const startMedia = async () => {
      try {
        const constraints = {
            audio: true,
            video: callType === 'video' ? { facingMode: 'user' } : false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
      } catch (e) {
        console.error("Media Error:", e);
      }
    };
    
    if (callState !== 'ended' && !localStream) {
        startMedia();
    }
  }, [callType, callState]); // Run once on mount/call start

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          localStream?.getTracks().forEach(t => t.stop());
      };
  }, []);

  // Attach Local Stream to Video Element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
        
        // Mic Logic
        localStream.getAudioTracks().forEach(t => t.enabled = isMicOn && !isDeafened);
        
        // Video Logic (Only if screen share is OFF, we control camera via isVideoOn)
        if (!isScreenSharing) {
            localStream.getVideoTracks().forEach(t => {
                if (t.kind === 'video') t.enabled = isVideoOn;
            });
        }
    }
  }, [localStream, isMicOn, isDeafened, isVideoOn, isScreenSharing]);

  // Attach Remote Stream (Video)
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(e => console.warn("Remote video play error", e));
    }
  }, [remoteStream]); 

  // Attach Remote Stream (Audio) & Volume Sync
  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.volume = isDeafened ? 0 : remoteVolume;
        remoteAudioRef.current.muted = isDeafened;
        
        const playPromise = remoteAudioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Auto-play prevented (Audio)", error);
            });
        }
    }
  }, [remoteStream, isDeafened]); 

  useEffect(() => {
      if (remoteAudioRef.current) {
          remoteAudioRef.current.volume = isDeafened ? 0 : remoteVolume;
      }
  }, [remoteVolume, isDeafened]);

  // 2. Signaling & WebRTC Logic
  useEffect(() => {
    const channel = supabase.channel(signalingChannelId);

    channel
      .on('broadcast', { event: 'call-accept' }, () => {
        onAnswer(); 
      })
      .on('broadcast', { event: 'call-end' }, () => {
        onEnd();
      })
      .on('broadcast', { event: 'call-metadata' }, ({ payload }) => {
         if (payload.from !== myId) {
             if (payload.deafened !== undefined) setPartnerIsDeafened(payload.deafened);
             if (payload.isScreenSharing !== undefined) setRemoteIsScreenSharing(payload.isScreenSharing);
         }
      })
      .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
        if (payload.from === myId) return;
        
        if (!peerConnection.current) createPeerConnection();
        const pc = peerConnection.current!;

        try {
          if (pc.signalingState !== 'stable') {
             await Promise.all([
                 pc.setLocalDescription({type: 'rollback'} as any),
                 pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
             ]);
          } else {
             await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
          }

          while (candidatesQueue.current.length) {
            await pc.addIceCandidate(new RTCIceCandidate(candidatesQueue.current.shift()!));
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({ type: 'broadcast', event: 'webrtc-answer', payload: { answer: serializeSdp(answer), from: myId } });
        } catch (e) { console.error("Offer Error", e); }
      })
      .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
        if (payload.from === myId) return;
        const pc = peerConnection.current;
        if (pc) {
          try { await pc.setRemoteDescription(new RTCSessionDescription(payload.answer)); } catch (e) { console.error("Answer Error", e); }
        }
      })
      .on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
        if (payload.from === myId) return;
        const pc = peerConnection.current;
        if (pc) {
            try {
                if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                else candidatesQueue.current.push(payload.candidate);
            } catch (e) { console.error("ICE Error", e); }
        } else {
            candidatesQueue.current.push(payload.candidate);
        }
      })
      .subscribe();

    const createPeerConnection = () => {
        if (peerConnection.current) return;
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnection.current = pc;

        pc.onnegotiationneeded = async () => {
            if (pc.signalingState !== 'stable') return;
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                channel.send({ type: 'broadcast', event: 'webrtc-offer', payload: { offer: serializeSdp(offer), from: myId } });
            } catch(e) { console.error("Renegotiation Error", e); }
        };

        // CRITICAL: Add tracks immediately. 
        // This ensures audio is sent even if video isn't ready or changes later.
        if (localStream) {
            localStream.getTracks().forEach(track => {
                 // Check if track already exists to avoid duplicates
                 if (!pc.getSenders().some(s => s.track?.id === track.id)) {
                     pc.addTrack(track, localStream);
                 }
            });
        }

        pc.ontrack = (event) => {
            console.log("Track received:", event.track.kind);
            setRemoteStream(new MediaStream(event.streams[0].getTracks()));
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                channel.send({ type: 'broadcast', event: 'webrtc-ice', payload: { candidate: serializeCandidate(event.candidate), from: myId } });
            }
        };
    };

    if (callState === 'connected' && localStream) {
        createPeerConnection();
        if (isCaller) {
            // Small delay to ensure tracks are added
            setTimeout(async () => {
                const pc = peerConnection.current!;
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    channel.send({ type: 'broadcast', event: 'webrtc-offer', payload: { offer: serializeSdp(offer), from: myId } });
                } catch(e) { console.error("Offer Create Error", e); }
            }, 1000);
        }
    }

    return () => {
        if (peerConnection.current) peerConnection.current.close();
        peerConnection.current = null;
        supabase.removeChannel(channel);
    };
  }, [callState, localStream, signalingChannelId]);

  const handleManualAnswer = () => {
      onAnswer();
      supabase.channel(signalingChannelId).send({ type: 'broadcast', event: 'call-accept', payload: { from: myId } });
  };

  const handleManualEnd = () => {
      onEnd();
      supabase.channel(signalingChannelId).send({ type: 'broadcast', event: 'call-end', payload: { from: myId } });
  };

  const toggleMic = () => {
    if (isDeafened) return;
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  // --- MANUAL VIDEO TOGGLE (WEBCAM) ---
  const toggleVideo = async () => {
     if (isScreenSharing) {
       // If screen sharing is ON, clicking camera button stops screen share and attempts to start camera?
       // User said "Separate function".
       // Let's assume clicking video button while screen sharing stops screen sharing AND enables camera.
       await stopScreenShare(true); // Stop screen, start camera
       return;
     }

     // Normal toggling
     if (!isVideoOn) {
         // Enable Camera
         try {
             // If we already have a video track in localStream (but disabled), enable it
             const existingVideoTrack = localStream?.getVideoTracks()[0];
             if (existingVideoTrack) {
                 existingVideoTrack.enabled = true;
             } else {
                 // Request new camera track
                 const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                 const newVideoTrack = cameraStream.getVideoTracks()[0];
                 
                 if (localStream) {
                     localStream.addTrack(newVideoTrack);
                     // Add to PC
                     if (peerConnection.current) {
                         peerConnection.current.addTrack(newVideoTrack, localStream);
                     }
                 }
             }
             setIsVideoOn(true);
         } catch(e) { console.error("Camera Error", e); }
     } else {
         // Disable Camera
         if (localStream) {
             localStream.getVideoTracks().forEach(t => t.enabled = false);
             // Optionally stop track to release hardware light
             // localStream.getVideoTracks().forEach(t => t.stop()); 
             // But for fast toggling, just disabling is better.
         }
         setIsVideoOn(false);
     }
  };

  // --- SCREEN SHARE LOGIC ---
  const startScreenShare = async () => {
      try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          const screenTrack = displayStream.getVideoTracks()[0];
          
          // CRITICAL: Reuse existing audio track from localStream
          const currentAudioTrack = localStream?.getAudioTracks()[0];
          
          // Create new visual stream state
          const newStream = new MediaStream([screenTrack]);
          if (currentAudioTrack) newStream.addTrack(currentAudioTrack);

          screenTrack.onended = () => {
              stopScreenShare(false); // On native stop, do NOT auto-enable camera
          };

          // Update WebRTC Sender
          if (peerConnection.current) {
              const senders = peerConnection.current.getSenders();
              const videoSender = senders.find(s => s.track?.kind === 'video');
              if (videoSender) {
                  await videoSender.replaceTrack(screenTrack);
              } else {
                  peerConnection.current.addTrack(screenTrack, newStream);
              }
          }

          setLocalStream(newStream);
          setIsScreenSharing(true);
          // Visual indication that video (screen) is active
          setIsVideoOn(true); 

          await supabase.channel(signalingChannelId).send({ 
              type: 'broadcast', 
              event: 'call-metadata', 
              payload: { isScreenSharing: true, from: myId } 
          });

      } catch (e: any) {
          console.error("Screen Share Error", e);
          setIsScreenSharing(false);
      }
  };

  // switchToCamera: If true, we turn on webcam. If false, we go to audio-only.
  const stopScreenShare = async (switchToCamera: boolean = false) => {
      try {
          // 1. Reuse existing audio
          let audioTrack = localStream?.getAudioTracks()[0];
          // Recover audio if missing
          if (!audioTrack || audioTrack.readyState === 'ended') {
              try {
                  const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  audioTrack = audioStream.getAudioTracks()[0];
                  if (peerConnection.current) {
                      const audioSender = peerConnection.current.getSenders().find(s => s.track?.kind === 'audio');
                      if (audioSender && audioTrack) await audioSender.replaceTrack(audioTrack);
                  }
              } catch (e) { console.error("Audio recovery failed", e); }
          }
          
          // 2. Stop Screen Track
          localStream?.getVideoTracks().forEach(track => {
              if (track.label.includes('screen') || track.kind === 'video') track.stop();
          });

          // 3. Handle Video Transition
          let newStream = new MediaStream();
          if (audioTrack) newStream.addTrack(audioTrack);

          if (switchToCamera) {
              // User explicitly requested camera (e.g. clicked camera button while screen sharing)
              const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
              const camTrack = cameraStream.getVideoTracks()[0];
              newStream.addTrack(camTrack);
              
              if (peerConnection.current) {
                  const videoSender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
                  if (videoSender) await videoSender.replaceTrack(camTrack);
                  else peerConnection.current.addTrack(camTrack, newStream);
              }
              setIsVideoOn(true);
          } else {
              // DEFAULT: Go to Audio Only (User said "Don't touch webcam")
              // We stop sending video
              if (peerConnection.current) {
                  const videoSender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
                  // We can't easily "remove" a track without renegotiation, 
                  // but we can replace it with null or disable the sender.
                  // Or just leave the sender but with no track? 
                  // replaceTrack(null) stops sending video.
                  if (videoSender) await videoSender.replaceTrack(null);
              }
              setIsVideoOn(false);
          }

          // 4. Update Local State
          setLocalStream(newStream);
          setIsScreenSharing(false);
          
          if (localVideoRef.current) {
              localVideoRef.current.srcObject = newStream;
          }

          // Ensure mute state preserved
          if (audioTrack) audioTrack.enabled = isMicOn && !isDeafened;

          await supabase.channel(signalingChannelId).send({ 
              type: 'broadcast', 
              event: 'call-metadata', 
              payload: { isScreenSharing: false, from: myId } 
          });

      } catch (e) {
          console.error("Stop Screen Share Error", e);
          setIsScreenSharing(false); 
      }
  };

  const toggleScreenShare = () => {
      if (isScreenSharing) stopScreenShare(false); // Default: Stop to audio only
      else startScreenShare();
  };

  const toggleDeafen = async () => {
      const newState = !isDeafened;
      setIsDeafened(newState);
      
      if (localStream) {
          if (newState) {
              localStream.getAudioTracks().forEach(t => t.enabled = false);
              setIsMicOn(false);
          } else {
              localStream.getAudioTracks().forEach(t => t.enabled = true);
              setIsMicOn(true);
          }
      }

      await supabase.channel(signalingChannelId).send({ 
          type: 'broadcast', 
          event: 'call-metadata', 
          payload: { deafened: newState, from: myId } 
      });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 1.1 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
      transition={{ duration: 0.5, ease: "circOut" }}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* 1. CINEMATIC BACKGROUND */}
      <div className="absolute inset-0 z-0 bg-[#0f0f0f]">
          {!remoteIsScreenSharing && (
              <motion.img 
                src={partnerAvatar || 'https://via.placeholder.com/500'} 
                className="w-full h-full object-cover blur-[50px] opacity-60 scale-110"
                animate={{ scale: [1.1, 1.2, 1.1] }}
                transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              />
          )}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="relative z-10 w-full h-full flex flex-col">
          
          {/* HEADER INFO */}
          <div className="pt-8 pb-4 text-center z-20 pointer-events-none">
              <motion.h2 
                 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                 className="text-2xl font-black text-white tracking-tight drop-shadow-xl"
              >
                  {partnerName}
              </motion.h2>
              <motion.p 
                 initial={{ opacity: 0 }} animate={{ opacity: 0.7 }}
                 className="text-vellor-red uppercase tracking-[0.3em] font-bold text-[10px] mt-2 animate-pulse"
              >
                  {callState === 'calling' ? 'Исходящий вызов...' : 
                   callState === 'incoming' ? 'Входящий вызов...' : 
                   callState === 'connected' ? (partnerIsDeafened ? 'Собеседник заглушен' : (remoteIsScreenSharing ? 'Демонстрация экрана' : 'Соединение установлено')) : 'Завершение...'}
              </motion.p>
          </div>

          {/* CENTRAL VISUAL */}
          <div className="flex-1 flex items-center justify-center relative w-full h-full overflow-hidden p-4">
               
               {/* REMOTE VIDEO / SCREEN */}
               {callState === 'connected' && (
                   <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                      className={`relative w-full h-full flex items-center justify-center rounded-2xl overflow-hidden ${remoteIsScreenSharing ? 'bg-[#1a1a1a] shadow-2xl border border-white/10' : ''}`}
                      onContextMenu={handleContextMenu}
                   >
                       {/* Audio Element for Remote Sound */}
                       <audio 
                          key={`remote-audio-${remoteStream?.id}`} 
                          ref={remoteAudioRef} 
                          autoPlay 
                          playsInline 
                       />
                       
                       <video 
                          ref={remoteVideoRef} 
                          autoPlay 
                          playsInline 
                          className={`w-full h-full ${remoteIsScreenSharing ? 'object-contain' : 'object-cover'}`} 
                          style={{ display: remoteStream?.getVideoTracks().length ? 'block' : 'none' }}
                       />

                       {(!remoteStream?.getVideoTracks().length || !remoteStream) && !remoteIsScreenSharing && (
                          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white/10 shadow-[0_0_100px_rgba(255,255,255,0.1)] relative z-10 bg-black">
                              <img src={partnerAvatar} className={`w-full h-full object-cover ${partnerIsDeafened ? 'grayscale opacity-50' : ''}`} />
                              {partnerIsDeafened && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                      <div className="p-4 bg-red-500 rounded-full shadow-lg">
                                          <VolumeX size={32} className="text-white"/>
                                      </div>
                                  </div>
                              )}
                          </div>
                       )}
                   </motion.div>
               )}

               {/* PULSING AVATAR (Calling/Incoming) */}
               {(callState === 'calling' || callState === 'incoming') && (
                  <div className="relative">
                      {[1, 2, 3].map(i => (
                          <motion.div 
                            key={i}
                            className="absolute inset-0 rounded-full border border-vellor-red/30"
                            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                            transition={{ repeat: Infinity, duration: 2, delay: i * 0.4, ease: "easeOut" }}
                          />
                      ))}
                      <motion.div 
                         animate={{ scale: [1, 1.05, 1] }}
                         transition={{ repeat: Infinity, duration: 2 }}
                         className="w-40 h-40 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_50px_rgba(255,0,51,0.4)] relative z-10 bg-black"
                      >
                         <img src={partnerAvatar} className="w-full h-full object-cover" />
                      </motion.div>
                  </div>
               )}

               {/* LOCAL VIDEO (PIP) */}
               {callState === 'connected' && (
                   <motion.div 
                      drag
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className={`absolute top-6 right-6 w-32 h-44 bg-black/80 rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-30 cursor-grab active:cursor-grabbing ${isScreenSharing ? '' : 'mirror-mode'}`}
                   >
                       {/* muted prop prevents self-echo from local stream playback */}
                       <video 
                          key={isScreenSharing ? 'local-screen' : 'local-cam'}
                          ref={localVideoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover" 
                       />
                       
                       {(!isVideoOn && !isScreenSharing) && <div className="absolute inset-0 flex items-center justify-center bg-gray-900"><User className="text-white/30" size={24}/></div>}
                       {isDeafened && (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                               <VolumeX size={24} className="text-red-500" />
                           </div>
                       )}
                   </motion.div>
               )}
          </div>

          {/* CONTROL BAR */}
          <div className="pb-8 pt-4 flex justify-center z-30 px-6">
              <motion.div 
                 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                 className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-3 flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
              >
                  {/* INCOMING CONTROLS */}
                  {callState === 'incoming' && (
                      <>
                        <button onClick={handleManualEnd} className="w-16 h-16 rounded-full bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 flex items-center justify-center transition-all active:scale-95">
                            <PhoneOff size={28} />
                        </button>
                        <div className="w-px h-8 bg-white/10" />
                        <button onClick={handleManualAnswer} className="w-20 h-20 rounded-full bg-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.4)] flex items-center justify-center transition-all active:scale-95 animate-pulse">
                            <Phone size={36} />
                        </button>
                      </>
                  )}

                  {/* ACTIVE CALL CONTROLS */}
                  {callState !== 'incoming' && (
                      <>
                         {/* Mic Toggle */}
                         <button onClick={toggleMic} disabled={isDeafened} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isMicOn && !isDeafened ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-red-500 text-white'}`}>
                            {isMicOn && !isDeafened ? <Mic size={20} /> : <MicOff size={20} />}
                         </button>
                         
                         {/* Video Toggle */}
                         <button onClick={toggleVideo} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isVideoOn ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white/5 text-red-500 relative overflow-hidden'}`}>
                            {isVideoOn ? <Video size={20} /> : (
                                <>
                                  <div className="absolute inset-0 bg-red-500/10"/>
                                  <VideoOff size={20} />
                                </>
                            )}
                         </button>

                         {/* Deafen Toggle */}
                         <button onClick={toggleDeafen} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDeafened ? 'bg-red-500 text-white' : 'bg-white/5 hover:bg-white/10 text-white'}`}>
                            {isDeafened ? <VolumeX size={20} /> : <Headphones size={20} />}
                         </button>

                         {/* Screen Share */}
                         <button onClick={toggleScreenShare} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isScreenSharing ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-white/5 hover:bg-white/10 text-white'}`}>
                            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
                         </button>

                         <div className="w-px h-8 bg-white/10 mx-2" />

                         {/* End Call */}
                         <button onClick={handleManualEnd} className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center transition-all active:scale-95">
                            <PhoneOff size={24} />
                         </button>
                      </>
                  )}
              </motion.div>
          </div>

          {/* CONTEXT MENU FOR VOLUME */}
          <AnimatePresence>
            {contextMenu && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    className="fixed z-[300] bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl origin-top-left w-48"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest text-white/50 px-1">
                        <Volume2 size={12} /> Громкость пользователя
                    </div>
                    <div className="flex items-center gap-3">
                        <input 
                           type="range" 
                           min="0" 
                           max="1" 
                           step="0.05" 
                           value={remoteVolume}
                           onChange={(e) => setRemoteVolume(parseFloat(e.target.value))}
                           className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-vellor-red"
                        />
                        <span className="text-xs font-mono w-8 text-right">{Math.round(remoteVolume * 100)}%</span>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>

      </div>
    </motion.div>
  );
};