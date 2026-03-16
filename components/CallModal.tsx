
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, User, Monitor, MonitorOff, Headphones, VolumeX, Volume2, MoreVertical } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { CallState, CallType } from '../types';

const MDiv = motion.div as any;
const MImg = motion.img as any;
const MH2 = motion.h2 as any;
const MP = motion.p as any;

interface CallModalProps {
  callState: CallState;
  callType: CallType;
  partnerName: string;
  partnerAvatar: string;
  partnerId: string;
  myId: string;
  isCaller: boolean;
  onAnswer: () => void;
  onEnd: (duration?: number) => void;
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

  // Duration Tracking
  const [duration, setDuration] = useState(0);
  const durationRef = useRef(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const candidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  
  const signalingChannelId = `signaling:${[myId, partnerId].sort().join('_')}`;
  const isMobile = window.innerWidth < 768; // Check for mobile

  // Close context menu on click elsewhere
  useEffect(() => {
      const handleClick = () => setContextMenu(null);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, []);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (callState === 'connected') {
        interval = setInterval(() => {
            setDuration(prev => {
                const newVal = prev + 1;
                durationRef.current = newVal;
                return newVal;
            });
        }, 1000);
    } else {
        setDuration(0);
        durationRef.current = 0;
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // 1. Initial Media Setup (Audio Only first, or Audio+Video if requested)
  useEffect(() => {
    const startMedia = async () => {
      try {
        // Only start media when call is connected
        if (callState !== 'connected') return;
        
        const constraints = {
            audio: true,
            video: callType === 'video' ? { facingMode: 'user' } : false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        console.log('Media started after call connected');
      } catch (e) {
        console.error("Media Error:", e);
      }
    };
    
    if (callState === 'connected' && !localStream) {
        startMedia();
    }
  }, [callType, callState]);

  // Cleanup on unmount or call end
  useEffect(() => {
      return () => {
          console.log('Component unmounting - cleaning up media and peer connection');
          // Stop all tracks
          localStream?.getTracks().forEach(t => {
              t.stop();
              console.log('Stopped local track:', t.kind);
          });
          remoteStream?.getTracks().forEach(t => {
              t.stop();
              console.log('Stopped remote track:', t.kind);
          });
          
          // Close peer connection only on unmount
          if (peerConnection.current) {
              peerConnection.current.close();
              console.log('Peer connection closed');
              peerConnection.current = null;
          }
      };
  }, []);

  // Attach Local Stream to Video Element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.muted = true; // IMPORTANT: Always mute local video to prevent echo
        localVideoRef.current.playsInline = true; // iOS Requirement
        localVideoRef.current.play().catch(e => console.warn("Local video play error", e));
    }
  }, [localStream]);

  // Separate effect for audio track control
  useEffect(() => {
    if (localStream) {
        localStream.getAudioTracks().forEach(t => {
            t.enabled = isMicOn && !isDeafened;
            console.log('Audio track enabled:', t.enabled, 'isMicOn:', isMicOn, 'isDeafened:', isDeafened);
        });
    }
  }, [localStream, isMicOn, isDeafened]);

  // Separate effect for video track control
  useEffect(() => {
    if (localStream && !isScreenSharing) {
        localStream.getVideoTracks().forEach(t => {
            t.enabled = isVideoOn;
            console.log('Video track enabled:', t.enabled, 'isVideoOn:', isVideoOn);
        });
    }
  }, [localStream, isVideoOn, isScreenSharing]);

  // Attach Remote Stream (Video & Audio)
  useEffect(() => {
    if (remoteStream) {
        console.log('Remote stream received:', remoteStream.getTracks().map(t => `${t.kind}: ${t.id}`));
        
        // Video
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.playsInline = true;
            
            // Try to play, handle autoplay restrictions
            const playVideo = async () => {
                try {
                    await remoteVideoRef.current!.play();
                    console.log('Remote video playing');
                } catch (e) {
                    console.warn("Remote video autoplay prevented", e);
                }
            };
            playVideo();
        }
        
        // Audio - CRITICAL FIX: ensure audio plays
        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.volume = isDeafened ? 0 : remoteVolume;
            remoteAudioRef.current.muted = false; // Never mute, control via volume
            
            // Force play with user interaction fallback
            const playAudio = async () => {
                try {
                    await remoteAudioRef.current!.play();
                    console.log('Remote audio playing successfully');
                } catch (error) {
                    console.warn("Auto-play prevented, will retry on user interaction", error);
                    // Retry on any user interaction
                    const retryPlay = async () => {
                        try {
                            await remoteAudioRef.current?.play();
                            console.log('Remote audio started after user interaction');
                            document.removeEventListener('click', retryPlay);
                            document.removeEventListener('touchstart', retryPlay);
                        } catch (e) {
                            console.error('Failed to play audio even after interaction', e);
                        }
                    };
                    document.addEventListener('click', retryPlay, { once: true });
                    document.addEventListener('touchstart', retryPlay, { once: true });
                }
            };
            playAudio();
        }
    }
  }, [remoteStream]);

  // Separate effect for deafen control
  useEffect(() => {
    if (remoteAudioRef.current) {
        remoteAudioRef.current.volume = isDeafened ? 0 : remoteVolume;
        console.log('Remote audio volume:', remoteAudioRef.current.volume);
    }
  }, [isDeafened, remoteVolume]); 

  // 2. Call Signaling (Accept/End) - Always active
  useEffect(() => {
    const channel = supabase.channel(signalingChannelId);

    channel
      .on('broadcast', { event: 'call-accept' }, ({ payload }) => {
        console.log('Received call-accept event:', payload);
        if (!payload || payload.from === myId) {
          console.log('Ignoring own call-accept');
          return;
        }
        console.log('Call accepted by peer');
        onAnswer();
      })
      .on('broadcast', { event: 'call-end' }, ({ payload }) => {
        console.log('Received call-end event:', payload);
        if (!payload || payload.from === myId) {
          console.log('Ignoring own call-end');
          return;
        }
        console.log('Call ended by peer');
        onEnd(durationRef.current);
      })
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [signalingChannelId, myId, onAnswer, onEnd]);

  // 3. WebRTC Connection - Only when connected
  useEffect(() => {
    if (callState !== 'connected') return;
    if (!localStream) {
        console.log('Waiting for local stream before creating peer connection...');
        return;
    }
    
    const channel = supabase.channel(signalingChannelId);
    let pc: RTCPeerConnection | null = null;
    let isCleaningUp = false;

    const createPeerConnection = () => {
        if (pc) {
            console.log('Peer connection already exists');
            return pc;
        }
        
        if (peerConnection.current && peerConnection.current.connectionState !== 'closed') {
            console.log('Using existing peer connection from ref');
            pc = peerConnection.current;
            return pc;
        }
        
        console.log('Creating new peer connection');
        pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnection.current = pc;

        pc.onnegotiationneeded = async () => {
            if (isCleaningUp) return;
            if (pc!.signalingState !== 'stable') {
                console.log('Skipping negotiation - not stable:', pc!.signalingState);
                return;
            }
            try {
                console.log('Negotiation needed, creating offer');
                const offer = await pc!.createOffer();
                if (isCleaningUp) return;
                await pc!.setLocalDescription(offer);
                channel.send({ type: 'broadcast', event: 'webrtc-offer', payload: { offer: serializeSdp(offer), from: myId } });
            } catch(e) { console.error("Renegotiation Error", e); }
        };

        // Add local tracks if available
        if (localStream) {
            console.log('Adding local tracks to peer connection:', localStream.getTracks().map(t => t.kind));
            localStream.getTracks().forEach(track => {
                 if (!pc!.getSenders().some(s => s.track?.id === track.id)) {
                     pc!.addTrack(track, localStream);
                     console.log('Added track:', track.kind, track.id);
                 }
            });
        }

        pc.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind, event.track.id, 'readyState:', event.track.readyState);
            
            if (event.streams && event.streams[0]) {
                console.log('Using stream from event:', event.streams[0].id, 'tracks:', event.streams[0].getTracks().length);
                setRemoteStream(event.streams[0]);
            } else {
                console.log('No stream in event, creating new stream');
                setRemoteStream(prev => {
                    if (prev) {
                        const existingTrack = prev.getTracks().find(t => t.id === event.track.id);
                        if (!existingTrack) {
                            prev.addTrack(event.track);
                            console.log('Added track to existing stream');
                        }
                        return new MediaStream(prev.getTracks());
                    } else {
                        const newStream = new MediaStream([event.track]);
                        console.log('Created new stream with track');
                        return newStream;
                    }
                });
            }
        };

        pc.onicecandidate = (event) => {
            if (isCleaningUp) return;
            if (event.candidate) {
                console.log('Sending ICE candidate:', event.candidate.candidate.substring(0, 50) + '...');
                channel.send({ type: 'broadcast', event: 'webrtc-ice', payload: { candidate: serializeCandidate(event.candidate), from: myId } });
            } else {
                console.log('ICE gathering complete');
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', pc!.iceConnectionState);
        };

        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc!.connectionState);
        };
        
        return pc;
    };

    channel
      .on('broadcast', { event: 'call-metadata' }, ({ payload }) => {
         if (payload.from !== myId) {
             if (payload.deafened !== undefined) setPartnerIsDeafened(payload.deafened);
             if (payload.isScreenSharing !== undefined) setRemoteIsScreenSharing(payload.isScreenSharing);
         }
      })
      .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
        if (payload.from === myId) return;
        if (isCleaningUp) return;
        console.log('Received offer from peer');
        
        const currentPc = pc || createPeerConnection();
        if (!currentPc || currentPc.signalingState === 'closed') {
            console.error('Cannot process offer - peer connection closed');
            return;
        }

        try {
          if (currentPc.signalingState !== 'stable') {
             console.log('Not stable, rolling back');
             await Promise.all([
                 currentPc.setLocalDescription({type: 'rollback'} as any),
                 currentPc.setRemoteDescription(new RTCSessionDescription(payload.offer))
             ]);
          } else {
             await currentPc.setRemoteDescription(new RTCSessionDescription(payload.offer));
          }

          console.log('Processing queued ICE candidates:', candidatesQueue.current.length);
          while (candidatesQueue.current.length && !isCleaningUp) {
            await currentPc.addIceCandidate(new RTCIceCandidate(candidatesQueue.current.shift()!));
          }
          
          if (isCleaningUp) return;
          const answer = await currentPc.createAnswer();
          await currentPc.setLocalDescription(answer);
          console.log('Sending answer');
          channel.send({ type: 'broadcast', event: 'webrtc-answer', payload: { answer: serializeSdp(answer), from: myId } });
        } catch (e) { console.error("Offer Error", e); }
      })
      .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
        if (payload.from === myId) return;
        if (isCleaningUp) return;
        console.log('Received answer from peer');
        const currentPc = pc || peerConnection.current;
        if (currentPc && currentPc.signalingState !== 'closed') {
          try { 
            await currentPc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            console.log('Answer set successfully');
          } catch (e) { console.error("Answer Error", e); }
        }
      })
      .on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
        if (payload.from === myId) return;
        if (isCleaningUp) return;
        console.log('Received ICE candidate from peer');
        const currentPc = pc || peerConnection.current;
        if (currentPc && currentPc.signalingState !== 'closed') {
            try {
                if (currentPc.remoteDescription) {
                    await currentPc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    console.log('ICE candidate added successfully');
                } else {
                    candidatesQueue.current.push(payload.candidate);
                    console.log('ICE candidate queued (no remote description yet)');
                }
            } catch (e) { 
                console.error("ICE Error", e);
            }
        } else {
            if (!currentPc) {
                candidatesQueue.current.push(payload.candidate);
                console.log('ICE candidate queued (no peer connection yet)');
            } else {
                console.warn('Cannot add ICE candidate - connection closed');
            }
        }
      })
      .subscribe();

    // Initialize connection
    console.log('Local stream ready, initializing connection');
    createPeerConnection();
    
    if (isCaller) {
        console.log('Caller: creating initial offer');
        setTimeout(async () => {
            if (isCleaningUp) return;
            const currentPc = pc || peerConnection.current;
            if (!currentPc || currentPc.signalingState === 'closed') return;
            try {
                const offer = await currentPc.createOffer();
                if (isCleaningUp) return;
                await currentPc.setLocalDescription(offer);
                channel.send({ type: 'broadcast', event: 'webrtc-offer', payload: { offer: serializeSdp(offer), from: myId } });
            } catch(e) { console.error("Offer Create Error", e); }
        }, 500);
    }

    return () => {
        console.log('WebRTC cleanup triggered');
        isCleaningUp = true;
        // Don't close peer connection here - it should stay alive until call ends
        supabase.removeChannel(channel);
    };
  }, [callState, localStream, signalingChannelId, isCaller, myId]);

  const handleManualAnswer = () => {
      console.log('Answering call, sending call-accept event');
      onAnswer();
      supabase.channel(signalingChannelId).send({ 
          type: 'broadcast', 
          event: 'call-accept', 
          payload: { from: myId } 
      }).then(() => {
          console.log('call-accept event sent successfully');
      }).catch(err => {
          console.error('Failed to send call-accept:', err);
      });
  };

  const handleManualEnd = () => {
      console.log('Ending call, sending call-end event');
      onEnd(durationRef.current);
      supabase.channel(signalingChannelId).send({ 
          type: 'broadcast', 
          event: 'call-end', 
          payload: { from: myId } 
      }).then(() => {
          console.log('call-end event sent successfully');
      }).catch(err => {
          console.error('Failed to send call-end:', err);
      });
  };

  const toggleMic = () => {
    if (isDeafened) return;
    const newState = !isMicOn;
    setIsMicOn(newState);
    if (localStream) {
      localStream.getAudioTracks().forEach(t => {
        t.enabled = newState;
        console.log('Toggled mic:', newState, 'track enabled:', t.enabled);
      });
    }
  };

  const toggleVideo = async () => {
     if (isScreenSharing) {
       await stopScreenShare(true); 
       return;
     }

     if (!isVideoOn) {
         try {
             const existingVideoTrack = localStream?.getVideoTracks()[0];
             if (existingVideoTrack) {
                 existingVideoTrack.enabled = true;
             } else {
                 const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                 const newVideoTrack = cameraStream.getVideoTracks()[0];
                 
                 if (localStream) {
                     localStream.addTrack(newVideoTrack);
                     if (peerConnection.current) {
                         peerConnection.current.addTrack(newVideoTrack, localStream);
                     }
                 }
             }
             setIsVideoOn(true);
         } catch(e) { console.error("Camera Error", e); }
     } else {
         if (localStream) {
             localStream.getVideoTracks().forEach(t => t.enabled = false);
         }
         setIsVideoOn(false);
     }
  };

  const startScreenShare = async () => {
      if (isMobile) return;
      try {
          console.log('Starting screen share...');
          
          // Request screen with audio if available
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
              video: true, 
              audio: true // Try to capture system audio
          });
          const screenTrack = displayStream.getVideoTracks()[0];
          const systemAudioTrack = displayStream.getAudioTracks()[0]; // May be undefined
          
          // Keep microphone audio track
          let micAudioTrack = localStream?.getAudioTracks()[0];
          if (!micAudioTrack || micAudioTrack.readyState === 'ended') {
              try {
                  const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  micAudioTrack = micStream.getAudioTracks()[0];
                  console.log('Captured new microphone track');
              } catch (e) {
                  console.error("Microphone capture failed", e);
              }
          }
          
          // Stop old video track
          localStream?.getVideoTracks().forEach(t => {
              t.stop();
              console.log('Stopped old video track');
          });
          
          const newStream = new MediaStream();
          newStream.addTrack(screenTrack);
          
          // Add microphone audio (always keep mic working)
          if (micAudioTrack) {
              newStream.addTrack(micAudioTrack);
              micAudioTrack.enabled = isMicOn && !isDeafened;
              console.log('Added microphone track to stream');
          }
          
          // Add system audio if captured
          if (systemAudioTrack) {
              console.log('System audio captured (will be mixed with mic)');
              // Note: Browser will mix system audio automatically
          }

          screenTrack.onended = () => {
              console.log('Screen share ended by user');
              stopScreenShare(false); 
          };

          // Replace video track in peer connection
          if (peerConnection.current) {
              const videoSender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
              if (videoSender) {
                  await videoSender.replaceTrack(screenTrack);
                  console.log('Screen track replaced in peer connection');
              } else {
                  peerConnection.current.addTrack(screenTrack, newStream);
                  console.log('Screen track added to peer connection');
              }
              
              // Ensure audio sender has mic track
              if (micAudioTrack) {
                  const audioSender = peerConnection.current.getSenders().find(s => s.track?.kind === 'audio');
                  if (audioSender && audioSender.track?.id !== micAudioTrack.id) {
                      await audioSender.replaceTrack(micAudioTrack);
                      console.log('Microphone track updated in peer connection');
                  }
              }
          }

          setLocalStream(newStream);
          setIsScreenSharing(true);
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

  const stopScreenShare = async (switchToCamera: boolean = false) => {
      try {
          console.log('Stopping screen share, switchToCamera:', switchToCamera);
          
          // Stop screen tracks
          localStream?.getVideoTracks().forEach(track => {
              track.stop();
              console.log('Stopped video track:', track.label);
          });

          // Keep audio track
          let audioTrack = localStream?.getAudioTracks()[0];
          if (!audioTrack || audioTrack.readyState === 'ended') {
              try {
                  const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  audioTrack = audioStream.getAudioTracks()[0];
                  console.log('Recovered audio track');
              } catch (e) { console.error("Audio recovery failed", e); }
          }

          const newStream = new MediaStream();
          if (audioTrack) {
              newStream.addTrack(audioTrack);
              audioTrack.enabled = isMicOn && !isDeafened;
          }

          if (switchToCamera) {
              try {
                  const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                  const camTrack = cameraStream.getVideoTracks()[0];
                  newStream.addTrack(camTrack);
                  camTrack.enabled = true;
                  
                  if (peerConnection.current) {
                      const videoSender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
                      if (videoSender) {
                          await videoSender.replaceTrack(camTrack);
                          console.log('Switched to camera in peer connection');
                      } else {
                          peerConnection.current.addTrack(camTrack, newStream);
                      }
                  }
                  setIsVideoOn(true);
              } catch (e) {
                  console.error("Camera start failed", e);
                  setIsVideoOn(false);
              }
          } else {
              // Remove video track from peer connection
              if (peerConnection.current) {
                  const videoSender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
                  if (videoSender) {
                      await videoSender.replaceTrack(null);
                      console.log('Removed video track from peer connection');
                  }
              }
              setIsVideoOn(false);
          }

          setLocalStream(newStream);
          setIsScreenSharing(false);

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
      if (isScreenSharing) stopScreenShare(false);
      else startScreenShare();
  };

  const toggleDeafen = async () => {
      const newState = !isDeafened;
      setIsDeafened(newState);
      
      if (localStream) {
          if (newState) {
              // Deafen: disable mic
              localStream.getAudioTracks().forEach(t => t.enabled = false);
              setIsMicOn(false);
          } else {
              // Undeafen: enable mic
              localStream.getAudioTracks().forEach(t => t.enabled = true);
              setIsMicOn(true);
          }
          console.log('Deafen toggled:', newState);
      }

      // Update remote audio volume
      if (remoteAudioRef.current) {
          remoteAudioRef.current.volume = newState ? 0 : remoteVolume;
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
    <MDiv 
      initial={{ opacity: 0, scale: 1.1 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
      transition={{ duration: 0.5, ease: "circOut" }}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* 1. CINEMATIC BACKGROUND */}
      <div className="absolute inset-0 z-0 bg-[#0f0f0f]">
          {!remoteIsScreenSharing && (
              <MImg 
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
              <MH2 
                 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                 className="text-2xl font-black text-white tracking-tight drop-shadow-xl"
              >
                  {partnerName}
              </MH2>
              <MP 
                 initial={{ opacity: 0 }} animate={{ opacity: 0.7 }}
                 className="text-vellor-red uppercase tracking-[0.3em] font-bold text-[10px] mt-2 animate-pulse"
              >
                  {callState === 'calling' ? 'Исходящий вызов...' : 
                   callState === 'incoming' ? 'Входящий вызов...' : 
                   callState === 'connected' ? (partnerIsDeafened ? 'Собеседник заглушен' : (remoteIsScreenSharing ? 'Демонстрация экрана' : formatDuration(duration))) : 'Завершение...'}
              </MP>
          </div>

          {/* CENTRAL VISUAL */}
          <div className="flex-1 flex items-center justify-center relative w-full h-full overflow-hidden p-4">
               
               {/* REMOTE VIDEO / SCREEN */}
               {callState === 'connected' && (
                   <MDiv 
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
                          style={{ 
                              display: remoteStream?.getVideoTracks().length ? 'block' : 'none',
                              backgroundColor: remoteIsScreenSharing ? '#000' : 'transparent'
                          }}
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
                   </MDiv>
               )}

               {/* PULSING AVATAR (Calling/Incoming) */}
               {(callState === 'calling' || callState === 'incoming') && (
                  <div className="relative">
                      {[1, 2, 3].map(i => (
                          <MDiv 
                            key={i}
                            className="absolute inset-0 rounded-full border border-vellor-red/30"
                            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                            transition={{ repeat: Infinity, duration: 2, delay: i * 0.4, ease: "easeOut" }}
                          />
                      ))}
                      <MDiv 
                         animate={{ scale: [1, 1.05, 1] }}
                         transition={{ repeat: Infinity, duration: 2 }}
                         className="w-40 h-40 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_50px_rgba(255,0,51,0.4)] relative z-10 bg-black"
                      >
                         <img src={partnerAvatar} className="w-full h-full object-cover" />
                      </MDiv>
                  </div>
               )}

               {/* LOCAL VIDEO (PIP) */}
               {callState === 'connected' && (
                   <MDiv 
                      drag
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className={`absolute top-6 right-6 w-32 h-44 bg-black/80 rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-30 cursor-grab active:cursor-grabbing ${isScreenSharing ? '' : 'mirror-mode'}`}
                   >
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
                   </MDiv>
               )}
          </div>

          {/* CONTROL BAR */}
          <div className="pb-8 pt-4 flex justify-center z-30 px-6">
              <MDiv 
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

                  {/* CONNECTED CONTROLS */}
                  {callState === 'connected' && (
                      <>
                        <button onClick={toggleMic} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${!isMicOn ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                            {isMicOn ? <Mic size={24}/> : <MicOff size={24}/>}
                        </button>
                        <button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${!isVideoOn ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                            {isVideoOn ? <Video size={24}/> : <VideoOff size={24}/>}
                        </button>
                        <button onClick={toggleDeafen} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${isDeafened ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                            {isDeafened ? <VolumeX size={24}/> : <Headphones size={24}/>}
                        </button>
                        {!isMobile && (
                            <button onClick={toggleScreenShare} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${isScreenSharing ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                                {isScreenSharing ? <MonitorOff size={24}/> : <Monitor size={24}/>}
                            </button>
                        )}
                        <div className="w-px h-8 bg-white/10 mx-2" />
                        <button onClick={handleManualEnd} className="w-16 h-16 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-[0_5px_20px_rgba(220,38,38,0.4)] flex items-center justify-center transition-all active:scale-95">
                            <PhoneOff size={28} />
                        </button>
                      </>
                  )}

                  {/* OUTGOING CONTROLS */}
                  {callState === 'calling' && (
                      <button onClick={handleManualEnd} className="w-16 h-16 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-[0_5px_20px_rgba(220,38,38,0.4)] flex items-center justify-center transition-all active:scale-95">
                          <PhoneOff size={28} />
                      </button>
                  )}
              </MDiv>
          </div>
      </div>
    </MDiv>
  );
};
