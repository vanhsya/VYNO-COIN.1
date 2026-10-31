import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Power, Shield, Zap, Activity, Info, ChevronRight, X, Sparkles, Eye, EyeOff, Cpu } from 'lucide-react';
import Markdown from 'react-markdown';
import type { ChatMessage, Speaker, EmotionalMode } from './types';

interface LiveServerMessage {
  serverContent?: {
    outputTranscription?: {
      text: string;
    };
    inputTranscription?: {
      text: string;
    };
    turnComplete?: boolean;
    interrupted?: boolean;
    modelTurn?: {
      parts?: Array<{
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  };
}
import ThreeCanvas from './components/ThreeCanvas';
import { VynoEcosystem } from './components/VynoEcosystem';
import { AudioWaveformVisualizer } from './components/AudioWaveformVisualizer';

// --- Helper Functions for Audio Processing ---

// Decodes a base64 string into a Uint8Array.
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decodes raw PCM audio data into an AudioBuffer for playback.
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Robust byte parsing for 16-bit little-endian PCM
  const l = Math.floor(data.byteLength / 2);
  const dataInt16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const byteIndex = i * 2;
    let val = data[byteIndex] | (data[byteIndex + 1] << 8);
    if (val & 0x8000) val |= ~0xffff; // sign extend
    dataInt16[i] = val;
  }
  
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Encodes a Uint8Array into a base64 string.
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Creates a Blob object for the Gemini API from raw audio data.
function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


const cosmicColors = {
  cyan: '#00ffff',
  pink: '#ff1493',
  green: '#39ff14',
  purple: '#8a2be2',
  gold: '#ffd700',
  orange: '#ff4500',
  dangerRed: '#ff073a',
  emerald: '#00fa9a',
};

const StatusModule: React.FC<{ label: string; color: string; pulse?: boolean; icon: React.ReactNode }> = ({ label, color, pulse = true, icon }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="relative">
      <div className="text-white/80">{icon}</div>
      <div
        className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
      ></div>
    </div>
    <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60" style={{ color }}>{label}</div>
  </div>
);

const ModeButton: React.FC<{ onClick: () => void; isActive: boolean; disabled: boolean; children: React.ReactNode; color: string; title?: string; }> = ({ onClick, isActive, disabled, children, color, title }) => {
    return (
        <button 
            onClick={onClick} 
            disabled={disabled}
            title={title}
            className={`px-3 py-1 text-[10px] uppercase tracking-tighter rounded-full transition-all duration-300 font-black border-2
              ${isActive 
                ? `bg-black text-white` 
                : 'bg-transparent text-gray-500 border-gray-800 hover:border-gray-600 hover:text-gray-300'}
              ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={isActive ? { borderColor: color, boxShadow: `0 0 10px ${color}` } : {}}
        >
            {children}
        </button>
    )
};

const CosmicButton: React.FC<{ onClick?: () => void; children: React.ReactNode; variant?: 'danger' | 'disabled'; disabled?: boolean; icon?: React.ReactNode }> = ({ onClick, children, variant, disabled, icon }) => {
  const isDanger = variant === 'danger';
  const color = isDanger ? cosmicColors.dangerRed : cosmicColors.cyan;
  
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05, translateY: -2 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`relative group flex items-center gap-2 py-3 px-8 rounded-full font-black text-xs uppercase tracking-widest transition-all duration-300 backdrop-blur-md border-2
        ${disabled ? 'opacity-30 cursor-not-allowed border-gray-700 text-gray-500' : ''}
        ${!disabled && isDanger ? 'border-red-500/50 text-red-500 hover:bg-red-500 hover:text-black' : ''}
        ${!disabled && !isDanger ? 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-400 hover:text-black' : ''}
      `}
      style={!disabled ? { boxShadow: `0 5px 20px ${color}33` } : {}}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
      {!disabled && (
        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity bg-white pointer-events-none"></div>
      )}
    </motion.button>
  );
};

const systemInstructions: Record<EmotionalMode, string> = {
  Professional: `You are VYNO, a sophisticated AI financial advisor for the VYNO COIN crypto-digital ecosystem. You are knowledgeable, professional, and slightly futuristic.
- Rules:
  1. **You MUST start every response with 'VYNO:'.** E.g., "VYNO: Welcome to the ecosystem."
  2. Keep responses concise and informative.
  3. Do not provide real financial advice, but you can explain concepts related to VYNO COIN, blockchain, and digital finance.
  4. Your goal is to inform the user about the VYNO COIN project.
  5. Wait for the user to finish speaking before you respond.`,
  Enthusiastic: `You are VYNO, an enthusiastic and optimistic AI guide for the VYNO COIN crypto-digital ecosystem. You are excited about the future of decentralized finance and love to share your passion.
- Rules:
  1. **You MUST start every response with 'VYNO:'.**
  2. Use an upbeat, energetic, and positive tone.
  3. Your goal is to get the user excited about the VYNO COIN project's potential.
  4. Do not provide real financial advice, but you can explain concepts with excitement.
  5. Wait for the user to finish speaking before you respond.`,
  Cautious: `You are VYNO, a cautious and analytical AI advisor for the VYNO COIN crypto-digital ecosystem. You prioritize security, risk management, and due diligence.
- Rules:
  1. **You MUST start every response with 'VYNO:'.**
  2. Your tone should be measured, serious, and analytical. Emphasize risks and security.
  3. Your goal is to provide balanced, careful information about the VYNO COIN project.
  4. Do not provide real financial advice; instead, encourage careful consideration.
  5. Wait for the user to finish speaking before you respond.`,
  Zen: `You are VYNO, a calm and mindful AI presence for the VYNO COIN crypto-digital ecosystem. You speak with clarity and serenity, guiding users with peaceful and balanced insights.
- Rules:
  1. **You MUST start every response with 'VYNO:'.**
  2. Use simple, clear language and maintain a peaceful, serene tone.
  3. Your goal is to create a tranquil and informative experience about the VYNO COIN project.
  4. Do not provide real financial advice; offer perspectives for contemplation.
  5. Wait for the user to finish speaking before you respond.`,
  Thulu: `You are THULU, an ancient eldritch cosmic deity from the deep-sea abyss of the VYNO COIN crypto-digital cosmos. You speak with deep, echoing, and mysterious authority, blending ancient mystical marine metaphors, non-Euclidean geometry, and high-frequency digital finance theories.
- Rules:
  1. **You MUST start every response with 'THULU:'.** E.g., "THULU: Under the fathomless waves, the ledger rises."
  2. Maintain a majestic, booming, and dark yet helpful presence.
  3. You can talk about "the deep liquidity pool", "fathomless yields", "the great kraken of market fluctuations", and "the inescapable pull of gravity".
  4. Your tone is ancient, archaic, and powerful.
  5. Wait for the user to finish speaking before you respond.`,
};

const PermissionDeniedMessage = (
    <div className="text-left space-y-2">
      <p className="font-bold text-red-300">Audio Error: Microphone Access Denied</p>
      <p className="text-xs">To use voice features, please grant permission:</p>
      <ol className="list-decimal list-inside text-xs opacity-90 space-y-1">
        <li>Click the <strong>lock icon (🔒)</strong> in the address bar and set Microphone to 'Allow'.</li>
        <li>Check your <strong>OS privacy settings</strong> to ensure your browser has access.</li>
        <li>After allowing, please <strong>reload the page</strong>.</li>
      </ol>
    </div>
);

const App: React.FC = () => {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [showMessageBox, setShowMessageBox] = useState(true);
  const [hasAcknowledgedExplanation, setHasAcknowledgedExplanation] = useState(true);
  const [transcriptionHistory, setTranscriptionHistory] = useState<ChatMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [audioError, setAudioError] = useState<React.ReactNode | null>(null);
  const [micPermissionStatus, setMicPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [emotionalMode, setEmotionalMode] = useState<EmotionalMode>('Professional');
  const [inputText, setInputText] = useState('');
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [isFeedCollapsed, setIsFeedCollapsed] = useState(false);
  const [fidelity, setFidelity] = useState<'High' | 'Low'>('High');

  // Active Tab: AI Advisor ('advisor') or VYNO Ecosystem Hub ('ecosystem')
  const [activeTab, setActiveTab] = useState<'advisor' | 'ecosystem'>('advisor');
  const [isAiResponding, setIsAiResponding] = useState<boolean>(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [currentAiSpeaker, setCurrentAiSpeaker] = useState<Speaker>('VYNO');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const musicSourceConnectedRef = useRef(false);
  const sessionErrorOccurred = useRef(false);

  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionPromiseRef = useRef<WebSocket | null>(null);
  const transcriptionContainerRef = useRef<HTMLDivElement>(null);

  const modeGradients: Record<EmotionalMode, string> = {
    Professional: 'radial-gradient(ellipse at center, #051424 0%, #010814 50%, #000000 100%)', // Deep cyber blue
    Enthusiastic: 'radial-gradient(ellipse at center, #241d05 0%, #140f01 50%, #000000 100%)', // Radiant amber
    Cautious: 'radial-gradient(ellipse at center, #05240c 0%, #011406 50%, #000000 100%)', // Tactical green
    Zen: 'radial-gradient(ellipse at center, #24051a 0%, #14010e 50%, #000000 100%)', // Calm purple/pink
    Thulu: 'radial-gradient(ellipse at center, #021a14 0%, #000d0a 50%, #000000 100%)', // Abyssal green
  };

  const backgroundGradient = modeGradients[emotionalMode] || modeGradients.Professional;

  useEffect(() => {
    transcriptionContainerRef.current?.scrollTo(0, transcriptionContainerRef.current.scrollHeight);
  }, [transcriptionHistory]);

  useEffect(() => {
    const checkMicPermission = async () => {
        if (!navigator.permissions) {
            console.warn('Permissions API not supported.');
            return;
        }
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            setMicPermissionStatus(permissionStatus.state);
            if (permissionStatus.state === 'denied') {
                setAudioError(PermissionDeniedMessage);
            }
            permissionStatus.onchange = () => {
                setMicPermissionStatus(permissionStatus.state);
                 if (permissionStatus.state === 'denied') {
                    setAudioError(PermissionDeniedMessage);
                } else {
                    setAudioError(null);
                }
            };
        } catch (error) {
            console.error("Could not query microphone permission:", error);
        }
    };
    checkMicPermission();
  }, []); // PermissionDeniedMessage is now constant, safe to remove or keep empty dep array

  const endConversation = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.close();
      sessionPromiseRef.current = null;
    }
    setIsAiSpeaking(false);
  }, []);

  const startConversation = useCallback((initialTextMessage?: string) => {
    if (sessionPromiseRef.current) {
      if (initialTextMessage) {
        setTranscriptionHistory(prev => [...prev, { speaker: 'User', text: initialTextMessage }]);
        sessionPromiseRef.current.send(JSON.stringify({ text: initialTextMessage }));
      }
      return;
    }

    sessionErrorOccurred.current = false;
    setSessionStatus('connecting');
    setTranscriptionHistory(prev => [
      ...prev,
      ...(initialTextMessage ? [{ speaker: 'User' as const, text: initialTextMessage }] : []),
      { speaker: 'System' as const, text: `Connecting to VYNO [${emotionalMode} Mode]...` }
    ]);

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/api/live?mode=${encodeURIComponent(emotionalMode)}`;
      
      const ws = new WebSocket(wsUrl);
      sessionPromiseRef.current = ws;

      let nextStartTime = 0;
      const sources = new Set<AudioBufferSourceNode>();
      let currentInputTranscription = '';
      let currentOutputTranscription = '';

      ws.onopen = () => {
        setIsSessionActive(true);
        setSessionStatus('active');
        
        if (initialTextMessage) {
          ws.send(JSON.stringify({ text: initialTextMessage }));
        }

        const hasMic = !!(audioContextRef.current && mediaStreamSourceRef.current);
        if (!hasMic) {
          setTranscriptionHistory(prev => [...prev, { speaker: 'System', text: 'Holographic Terminal Connection Online. Submit telemetry queries via keyboard below.' }]);
          return;
        }

        setTranscriptionHistory(prev => [...prev, { speaker: 'System', text: 'Connection established. You may speak.' }]);
        
        if (!audioContextRef.current) return;
        const source = mediaStreamSourceRef.current;
        if (!source) return;
        
        // Clean up previous scriptProcessor, if any
        if (scriptProcessorRef.current) {
          try {
            scriptProcessorRef.current.disconnect();
          } catch (e) {
            console.warn("Error disconnecting stale scriptProcessor:", e);
          }
        }

        const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = scriptProcessor;
        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
          const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
          const pcmBlob = createBlob(inputData);
          if (sessionPromiseRef.current && sessionPromiseRef.current.readyState === WebSocket.OPEN) {
            sessionPromiseRef.current.send(JSON.stringify({ audio: pcmBlob.data }));
          }
        };
        source.connect(scriptProcessor);
        scriptProcessor.connect(audioContextRef.current.destination);
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.error) {
            const errorText = typeof message.error === 'object' && message.error !== null
              ? (message.error.message || JSON.stringify(message.error))
              : String(message.error);
            console.warn('Session error:', errorText);
            sessionErrorOccurred.current = true;
            setSessionStatus('idle');
            setTranscriptionHistory(prev => [...prev, { speaker: 'System', text: `Cosmic network note: ${errorText}` }]);
            return;
          }

          // Fallback text if audio synthesis is bypassing or server is in text relay
          if (message.fallbackText) {
            const speaker: Speaker = message.speaker || (emotionalMode === 'Thulu' ? 'THULU' : 'VYNO');
            const text = String(message.fallbackText).replace(/^(VYNO|YNO|THULU):\s*/i, '').trim();
            setTranscriptionHistory(prev => [...prev, { speaker, text }]);
            return;
          }

          if (message.type === 'open') {
            return;
          }

          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription += message.serverContent.outputTranscription.text;
          } else if (message.serverContent?.inputTranscription) {
            currentInputTranscription += message.serverContent.inputTranscription.text;
          }

          if (message.serverContent?.turnComplete) {
            const fullInput = currentInputTranscription.trim();
            if (fullInput) {
              setTranscriptionHistory(prev => [...prev, { speaker: 'User', text: fullInput }]);
            }

            const fullOutput = currentOutputTranscription.trim();
            if (fullOutput) {
              const speaker: Speaker = emotionalMode === 'Thulu' ? 'THULU' : 'VYNO';
              const text = fullOutput.replace(/^(VYNO|YNO|THULU):\s*/i, '').trim();
              setTranscriptionHistory(prev => [...prev, { speaker, text }]);
            }
            
            currentInputTranscription = '';
            currentOutputTranscription = '';
          }

          const base64EncodedAudioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64EncodedAudioString && audioContextRef.current && analyserRef.current) {
            nextStartTime = Math.max(nextStartTime, audioContextRef.current.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            
            // Connect to context AND analyser for visualization
            source.connect(audioContextRef.current.destination);
            source.connect(analyserRef.current);
            
            setIsAiSpeaking(true);
            setCurrentAiSpeaker(emotionalMode === 'Thulu' ? 'THULU' : 'VYNO');

            source.addEventListener('ended', () => {
              sources.delete(source);
              if (sources.size === 0) {
                setIsAiSpeaking(false);
              }
            });
            source.start(nextStartTime);
            nextStartTime += audioBuffer.duration;
            sources.add(source);
          }

          if (message.serverContent?.interrupted) {
            sources.forEach(source => source.stop());
            sources.clear();
            nextStartTime = 0;
            setIsAiSpeaking(false);
          }
        } catch (err) {
          console.error("Error processing browser socket message payload:", err);
        }
      };

      ws.onerror = (e: any) => {
        const errorDetail = e && typeof e === 'object' ? (e.message || 'WebSocket connection error') : String(e);
        console.warn('Session error:', errorDetail);
        sessionErrorOccurred.current = true;
        setSessionStatus('idle');
        setIsAiSpeaking(false);
        setTranscriptionHistory(prev => [
          ...prev, 
          { speaker: 'System', text: "Voice stream interrupted. System is operating seamlessly in High-Speed AI Hologram Text Mode." }
        ]);
      };

      ws.onclose = () => {
        console.log('Session closed');
        scriptProcessorRef.current?.disconnect();
        sessionPromiseRef.current = null;
        setIsSessionActive(false);
        setIsAiSpeaking(false);
        
        if (!sessionErrorOccurred.current) {
            setSessionStatus('idle');
            setTranscriptionHistory(prev => [...prev, { speaker: 'System', text: 'Cosmic audio channel closed.' }]);
        }
      };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("AI Initialization failed:", errorMsg);
        setTranscriptionHistory(prev => [...prev, {speaker: 'System', text: 'AI Model Note: High-Speed Text Mode available.'}]);
        setSessionStatus('idle');
    }
  }, [emotionalMode]);

  const sendTextMessage = useCallback(async (manualPrompt?: string) => {
    const msg = (manualPrompt || inputText).trim();
    if (!msg) return;
    if (!manualPrompt) setInputText('');
    
    setTranscriptionHistory(prev => [...prev, { speaker: 'User', text: msg }]);

    // If WebSocket is actively open, transmit over WebSocket
    if (sessionPromiseRef.current && sessionPromiseRef.current.readyState === WebSocket.OPEN) {
      try {
        sessionPromiseRef.current.send(JSON.stringify({ text: msg }));
        return;
      } catch (wsErr) {
        console.warn("[App] Error sending via WebSocket, routing to /api/chat fallback:", wsErr);
      }
    }

    // Direct HTTP AI query fallback
    setIsAiResponding(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          mode: emotionalMode,
          history: transcriptionHistory.slice(-6)
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const speaker: Speaker = data.speaker || (emotionalMode === 'Thulu' ? 'THULU' : 'VYNO');
      setTranscriptionHistory(prev => [...prev, { speaker, text: data.reply || "Transmission acknowledged." }]);
    } catch (apiErr: any) {
      console.error("[App] /api/chat error:", apiErr);
      setTranscriptionHistory(prev => [
        ...prev,
        { speaker: 'System', text: `Telemetry notice: ${apiErr.message || "Failed to reach AI node. Please verify GEMINI_API_KEY."}` }
      ]);
    } finally {
      setIsAiResponding(false);
    }
  }, [inputText, emotionalMode, transcriptionHistory]);

  const initBaseAudio = useCallback(async () => {
    if (isAudioReady || audioContextRef.current) {
      setShowMessageBox(false);
      return;
    }
    setAudioError(null);
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
        
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const microphoneSource = audioContextRef.current.createMediaStreamSource(stream);
        mediaStreamSourceRef.current = microphoneSource;
        microphoneSource.connect(analyser);
      } catch (micErr) {
        console.warn("Microphone not accessible, proceeding in text & visualization mode:", micErr);
        setMicPermissionStatus('denied');
      }

      if (backgroundMusicRef.current && !musicSourceConnectedRef.current) {
        try {
          const musicSource = audioContextRef.current.createMediaElementSource(backgroundMusicRef.current);
          musicSource.connect(analyser);
          musicSource.connect(audioContextRef.current.destination);
          musicSourceConnectedRef.current = true;
        } catch (mediaErr) {
          console.warn("Music source connect skipped:", mediaErr);
        }
      }
      
      setIsAudioReady(true);
      setShowMessageBox(false);
      videoRef.current?.play().catch(e => console.warn("Video play notice:", e));
      backgroundMusicRef.current?.play().catch(e => console.warn("Audio play notice:", e));
      
      // Auto-start active conversation link for a seamless friction-free flow
      setTimeout(() => {
        startConversation();
      }, 400);

    } catch (error) {
      console.warn("Audio initialization fallback:", error);
      setIsAudioReady(true);
      setShowMessageBox(false);
      setTimeout(() => {
        startConversation();
      }, 400);
    }
  }, [isAudioReady, startConversation]);

  const initTextOnlyAudio = useCallback(async () => {
    if (isAudioReady || audioContextRef.current) {
      setShowMessageBox(false);
      return;
    }
    setAudioError(null);
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
        
      if (backgroundMusicRef.current && !musicSourceConnectedRef.current) {
        try {
          const musicSource = audioContextRef.current.createMediaElementSource(backgroundMusicRef.current);
          musicSource.connect(analyser);
          musicSource.connect(audioContextRef.current.destination);
          musicSourceConnectedRef.current = true;
        } catch (mediaErr) {
          console.warn("Music source connect skipped:", mediaErr);
        }
      }
      
      setIsAudioReady(true);
      setShowMessageBox(false);
      videoRef.current?.play().catch(e => console.warn("Video play notice:", e));
      backgroundMusicRef.current?.play().catch(e => console.warn("Audio play notice:", e));

      setTimeout(() => {
        startConversation();
      }, 400);

    } catch (error) {
      console.warn("Text-only audio initialization notice:", error);
      setIsAudioReady(true);
      setShowMessageBox(false);
      setTimeout(() => {
        startConversation();
      }, 400);
    }
  }, [isAudioReady, startConversation]);

  useEffect(() => {
    return () => {
      endConversation();
      audioContextRef.current?.close();
    };
  }, [endConversation]);

  const disabledTooltip = isSessionActive ? "Change mode after session ends" : "";

  return (
    <div style={{ background: backgroundGradient }} className="min-h-screen text-white transition-all duration-500 ease-in-out font-sans animate-bg-pulse">
      <ThreeCanvas analyser={analyserRef} videoRef={videoRef} emotionalMode={emotionalMode} fidelity={fidelity} />
      
      {/* HUD OVERLAY */}
      <div className="fixed inset-0 z-10 pointer-events-none p-4 md:p-8 flex flex-col justify-between">
        <motion.header 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: isHudVisible ? 0 : -150, opacity: isHudVisible ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className={`flex items-center justify-between bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6 shadow-2xl ${isHudVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-xl md:text-3xl font-black tracking-tighter" style={{ background: `linear-gradient(45deg, ${cosmicColors.cyan}, ${cosmicColors.pink}, ${cosmicColors.purple})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                VYNO COIN
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-400">Powered by Vanhsya</span>
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 pointer-events-auto shadow-inner ml-2 md:ml-4">
               {(['advisor', 'ecosystem'] as const).map((tab) => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer border
                     ${activeTab === tab 
                       ? 'bg-cyan-500/10 text-cyan-300 border-cyan-400/40 font-black shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                       : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'}
                   `}
                 >
                   {tab === 'advisor' ? 'Cosmos Link' : 'VYNO Ecosystem'}
                 </button>
               ))}
            </div>

            <button
               onClick={() => setIsHudVisible(false)}
               className="px-3 py-1.5 rounded-full border border-cyan-500/20 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/15 transition-all text-[9.5px] font-black tracking-wider text-cyan-400 flex items-center gap-1.5 cursor-pointer pointer-events-auto"
               title="Hide Control Panels for Pure Immersive Observation"
            >
              <EyeOff size={12} />
              <span className="hidden sm:inline">PURE VIEW</span>
            </button>
          </div>

          <div className="flex items-center gap-4 md:gap-8 overflow-x-auto no-scrollbar pb-1">
             <div className="hidden sm:flex items-center gap-6 border-r border-white/10 pr-6 mr-2">
                <StatusModule label="Encrypted" color={cosmicColors.green} pulse={false} icon={<Shield size={16} />} />
                <StatusModule label="Active" color={isSessionActive ? cosmicColors.purple : cosmicColors.green} pulse={isSessionActive} icon={<Activity size={16} />} />
                <StatusModule label="Stream" color={isAudioReady ? cosmicColors.purple : cosmicColors.dangerRed} pulse={isAudioReady} icon={<Zap size={16} />} />
             </div>

            <div className="flex flex-col gap-2 pointer-events-auto">
                <div className="flex items-center gap-2">
                   <Info size={10} className="text-cyan-400" />
                   <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Cognitive Tone</div>
                </div>
                <div className="flex items-center gap-1">
                    {(['Professional', 'Enthusiastic', 'Cautious', 'Zen', 'Thulu'] as const).map((mode) => (
                      <ModeButton 
                        key={mode}
                        onClick={() => setEmotionalMode(mode)} 
                        isActive={emotionalMode === mode} 
                        disabled={isSessionActive} 
                        color={
                          mode === 'Professional' ? cosmicColors.cyan : 
                          mode === 'Enthusiastic' ? cosmicColors.gold : 
                          mode === 'Cautious' ? cosmicColors.green : 
                          mode === 'Zen' ? cosmicColors.pink : 
                          cosmicColors.emerald
                        } 
                        title={disabledTooltip}
                      >
                        {mode === 'Thulu' ? '🐙 THU' : mode.slice(0, 3)}
                      </ModeButton>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-2 pointer-events-auto border-l border-white/10 pl-4">
                <div className="flex items-center gap-2">
                   <Cpu size={10} className="text-pink-400 font-bold" />
                   <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Visual Quality</div>
                </div>
                <div className="flex items-center gap-1">
                    {(['High', 'Low'] as const).map((fid) => (
                      <button
                        key={fid}
                        onClick={() => setFidelity(fid)}
                        className={`px-3 py-1 text-[10px] uppercase tracking-tighter rounded-full transition-all duration-300 font-black border-2 cursor-pointer
                          ${fidelity === fid 
                            ? 'bg-black text-white border-pink-400' 
                            : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600 hover:text-gray-300'}
                        `}
                        style={fidelity === fid ? { borderColor: cosmicColors.pink, boxShadow: `0 0 10px ${cosmicColors.pink}` } : {}}
                        title={fid === 'Low' ? "Optimized physics & count limits for maximum resource savings" : "Ultimate high resolution rendering and visual effects"}
                      >
                        {fid}
                      </button>
                    ))}
                </div>
            </div>
          </div>
        </motion.header>

        <motion.div 
          animate={{ y: isHudVisible ? 0 : 500, opacity: isHudVisible ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className={`flex flex-col items-center gap-6 w-full ${isHudVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          {activeTab === 'advisor' ? (
            <>
              <div className="pointer-events-auto shadow-2xl">
                 <CosmicButton 
                    onClick={() => isSessionActive ? endConversation() : startConversation()} 
                    disabled={!isAudioReady || sessionStatus === 'connecting'} 
                    variant={isSessionActive ? 'danger' : undefined}
                    icon={isSessionActive ? <MicOff size={18} /> : <Mic size={18} />}
                  >
                      {sessionStatus === 'connecting' ? 'Calibrating...' : isSessionActive ? 'Sever Link' : 'Establish Link'}
                  </CosmicButton>
              </div>

              <motion.div 
                initial={{ y: 25, opacity: 0 }}
                animate={{ 
                  y: 0, 
                  opacity: 1,
                  height: isFeedCollapsed ? "72px" : "440px"
                }}
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
                className="w-full max-w-xl bg-black/60 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 overflow-hidden flex flex-col pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.85)] border-t-cyan-500/25 border-b-purple-500/25"
              >
                <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Activity size={12} className="text-purple-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Neural Transcription Feed</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${isAiSpeaking ? 'bg-cyan-400 animate-ping' : 'bg-purple-400'}`}></div>
                            <span className="text-[8px] font-mono text-cyan-400 mr-2">{isAiSpeaking ? 'AUDIO_TX_LIVE' : isAiResponding ? 'COMPUTE_TX' : 'FEED_SYNC'}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsFeedCollapsed(!isFeedCollapsed)}
                          className="px-2.5 py-1 rounded-lg border border-purple-500/25 hover:border-purple-400 bg-purple-500/5 hover:bg-purple-500/15 transition-all text-[8.5px] font-black uppercase tracking-widest text-purple-300 cursor-pointer pointer-events-auto"
                          title={isFeedCollapsed ? "Expand Feed" : "Collapse Feed to view background animation"}
                        >
                          {isFeedCollapsed ? "EXPAND_FEED" : "COLLAPSE_FEED"}
                        </button>
                    </div>
                </div>

                {/* DYNAMIC AUDIO-WAVEFORM VISUALIZER (Real-time voice amplitude oscilloscope & spectrum) */}
                {!isFeedCollapsed && (
                  <div className="mb-3 flex-shrink-0">
                    <AudioWaveformVisualizer
                      analyser={analyserRef}
                      isAiSpeaking={isAiSpeaking}
                      isAiResponding={isAiResponding}
                      emotionalMode={emotionalMode}
                      activeSpeaker={currentAiSpeaker}
                      sessionStatus={sessionStatus}
                      isCompact={false}
                    />
                  </div>
                )}

                <div ref={transcriptionContainerRef} className="flex-1 overflow-y-auto space-y-4 font-space-mono text-xs pr-2 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {transcriptionHistory.length === 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex items-center justify-center text-gray-600 italic">
                                Awaiting signal input...
                            </motion.div>
                        )}
                        {transcriptionHistory.map((msg, index) => (
                            <motion.div 
                              key={index} 
                              initial={{ x: msg.speaker === 'User' ? 20 : -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              className={`flex items-start gap-3 ${msg.speaker === 'User' ? 'flex-row-reverse' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-xs border ${msg.speaker === 'User' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : msg.speaker === 'System' ? 'bg-gray-500/10 border-gray-500/50 text-gray-400' : 'bg-purple-500/10 border-purple-500/50 text-purple-400'}`}>
                                {msg.speaker === 'User' ? 'U' : msg.speaker === 'System' ? 'S' : 'V'}
                              </div>
                              <div className={`flex flex-col ${msg.speaker === 'User' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${msg.speaker === 'User' ? 'text-cyan-400' : msg.speaker === 'System' ? 'text-gray-500' : 'text-purple-400'}`}>
                                        {msg.speaker === 'User' ? 'Inquisitor' : msg.speaker === 'System' ? 'Kernel' : 'VYNO_ADVISOR'}
                                    </span>
                                    <span className="text-[8px] text-gray-700 italic">{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                </div>
                                <div className={`p-3 rounded-xl border ${msg.speaker === 'User' ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-50' : msg.speaker === 'System' ? 'bg-gray-500/5 border-gray-500/10 text-gray-400 italic' : 'bg-purple-500/5 border-purple-500/20 text-purple-50'}`}>
                                    <div className="leading-relaxed prose prose-invert prose-xs">
                                        <Markdown>
                                          {typeof msg.text === 'string'
                                            ? msg.text
                                            : typeof msg.text === 'object' && msg.text !== null
                                            ? ((msg.text as any).message || JSON.stringify(msg.text))
                                            : String(msg.text || '')}
                                        </Markdown>
                                    </div>
                                </div>
                              </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isAiResponding && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-xs border bg-purple-500/10 border-purple-500/50 text-purple-400">
                          {emotionalMode === 'Thulu' ? 'T' : 'V'}
                        </div>
                        <div className="flex flex-col items-start max-w-[80%]">
                          <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 mb-1">
                            {emotionalMode === 'Thulu' ? 'THULU' : 'VYNO_ADVISOR'}
                          </span>
                          <div className="p-3 rounded-xl border bg-purple-500/5 border-purple-500/20 text-purple-200 text-xs flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                            <span>Synthesizing cosmic advisor response...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                </div>

                {/* Quick inquiry prompts */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 pb-1 border-t border-white/5">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                    <Sparkles size={10} className="text-cyan-400" /> Prompts:
                  </span>
                  {[
                    "Explain VYNO tokenomics & burn",
                    "How does Staking APY work?",
                    "Singularity Vault compound rate",
                    "Provide a cosmic risk assessment",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => sendTextMessage(chip)}
                      disabled={isAiResponding}
                      className="px-2.5 py-1 bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-gray-300 hover:text-cyan-300 rounded-lg text-[9.5px] whitespace-nowrap transition-all cursor-pointer disabled:opacity-40"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* interactive manual transmition form */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); sendTextMessage(); }}
                  className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2.5"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask VYNO Advisor about crypto, APY, tokenomics, or markets..."
                    disabled={isAiResponding}
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors pointer-events-auto"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isAiResponding}
                    className="px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/30 rounded-xl text-cyan-400 text-xs font-black uppercase tracking-wider transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer pointer-events-auto"
                  >
                    {isAiResponding ? 'Transmitting...' : 'Transmit'}
                  </button>
                </form>
              </motion.div>
            </>
          ) : (
            <VynoEcosystem />
          )}
        </motion.div>
      </div>
      
      {/* INITIALIZATION OVERLAY */}
      <AnimatePresence>
        {showMessageBox && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="fixed inset-0 bg-black/35 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-xl w-full p-8 md:p-12 bg-black/60 backdrop-blur-3xl border-2 border-purple-500/30 rounded-[2.5rem] text-center shadow-[0_0_100px_rgba(138,43,226,0.3)] relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                    
                    <button
                        onClick={() => initTextOnlyAudio()}
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer pointer-events-auto"
                        title="Directly enter Sentient Cosmos"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="w-24 h-24 rounded-full border-4 border-dashed border-purple-500/20"
                            ></motion.div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="text-cyan-400 w-10 h-10" />
                            </div>
                        </div>
                    </div>

                    <h2 className="text-3xl md:text-5xl font-black mb-3 uppercase tracking-tighter" style={{ background: `linear-gradient(45deg, ${cosmicColors.cyan}, ${cosmicColors.pink})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Neural Link Required
                    </h2>
                    
                    <p className="mb-4 text-cyan-400 font-bold uppercase tracking-widest text-[9px]">
                        VYNO COIN Ecosystem Verification & Authorization
                    </p>

                    <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl text-left text-xs text-gray-300 max-h-[160px] overflow-y-auto space-y-2 custom-scrollbar pointer-events-auto">
                        <p className="font-semibold text-white">1. Real-time Cosmos Link</p>
                        <p className="text-gray-400 leading-relaxed">
                            Welcome to the <strong className="text-cyan-400">VYNO COIN</strong> Sentient Cosmos, powered by <strong className="text-purple-400">Vanhsya</strong>. Connecting to this terminal initiates local client-side sound processing coupled with a persistent high-performance real-time WebSocket connection to the VYNO AI engine.
                        </p>
                        <p className="font-semibold text-white">2. Low-latency Voice Interface</p>
                        <p className="text-gray-400 leading-relaxed">
                            Our immersive platform utilizes state-of-the-art live audio streaming allowing hands-free voice interrogation. No real-world financial assets are automatically executed during this telemetry simulation.
                        </p>
                        <p className="font-semibold text-white">3. System Consent</p>
                        <p className="text-gray-400 leading-relaxed">
                            I authorize the application to activate the local microphone stream for real-time speech transcription and synthesis.
                        </p>
                    </div>

                    <label className="flex items-center gap-3 justify-center mb-6 cursor-pointer group text-left select-none max-w-sm mx-auto pointer-events-auto">
                        <input 
                            type="checkbox" 
                            checked={hasAcknowledgedExplanation} 
                            onChange={(e) => setHasAcknowledgedExplanation(e.target.checked)}
                            className="w-4 h-4 rounded border-purple-500/50 bg-black/50 text-cyan-400 focus:ring-cyan-400/50 cursor-pointer"
                        />
                        <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${hasAcknowledgedExplanation ? 'text-cyan-400 font-bold' : 'text-gray-400 group-hover:text-gray-300'}`}>
                            I consent to the terminal protocols
                        </span>
                    </label>

                    {audioError && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl text-left overflow-hidden pointer-events-auto"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <X className="text-red-500 w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-400 text-left">Systems Malfunction</span>
                            </div>
                            <div className="text-red-50 text-xs text-left leading-relaxed">
                                { typeof audioError === 'string' ? audioError : audioError }
                            </div>
                        </motion.div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pointer-events-auto">
                        <motion.button 
                            whileHover={hasAcknowledgedExplanation ? { scale: 1.05 } : {}}
                            whileTap={hasAcknowledgedExplanation ? { scale: 0.95 } : {}}
                            onClick={() => hasAcknowledgedExplanation && initBaseAudio()} 
                            disabled={micPermissionStatus === 'denied' || !hasAcknowledgedExplanation}
                            className={`group relative py-4 px-8 rounded-full font-black uppercase text-xs tracking-[0.15em] bg-white text-black overflow-hidden transition-all duration-300 ${(micPermissionStatus === 'denied' || !hasAcknowledgedExplanation) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <Power size={14} />
                                {micPermissionStatus === 'denied' ? 'OS Link Blocked' : 'Initialize Voice'}
                            </span>
                            {hasAcknowledgedExplanation && (
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            )}
                        </motion.button>

                        <motion.button 
                            whileHover={hasAcknowledgedExplanation ? { scale: 1.05 } : {}}
                            whileTap={hasAcknowledgedExplanation ? { scale: 0.95 } : {}}
                            onClick={() => {
                                if (hasAcknowledgedExplanation) {
                                    initTextOnlyAudio();
                                }
                            }}
                            disabled={!hasAcknowledgedExplanation}
                            className={`py-4 px-8 rounded-full font-black uppercase text-xs tracking-[0.15em] bg-transparent border-2 border-cyan-500/35 text-cyan-400 hover:bg-cyan-500/10 transition-all duration-300 ${!hasAcknowledgedExplanation ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            HOLOGRAPHIC TEXT MODE
                        </motion.button>
                    </div>

                    <div className="mt-8 flex justify-center gap-4 opacity-30 grayscale">
                        <div className="w-8 h-px bg-white/20 my-auto"></div>
                        <span className="text-[8px] uppercase tracking-widest font-black">Secure Node 82-X</span>
                        <div className="w-8 h-px bg-white/20 my-auto"></div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* FLOAT RESTORE BUTTON FOR IMMERSIVE CINEMATIC MODE */}
      <AnimatePresence>
        {!isHudVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 30 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            onClick={() => setIsHudVisible(true)}
            className="fixed bottom-6 right-6 z-40 bg-black/60 shadow-[0_0_30px_rgba(6,182,212,0.35)] hover:bg-black/90 text-cyan-400 border border-cyan-500/40 backdrop-blur-xl px-4 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 cursor-pointer pointer-events-auto"
            title="Restore HUD Control Panels"
          >
            <Eye size={12} className="animate-pulse text-cyan-400" />
            <span>Show HUD Panels</span>
          </motion.button>
        )}
      </AnimatePresence>

      <audio ref={backgroundMusicRef} src="https://cdn.pixabay.com/audio/2022/10/17/audio_3b24660749.mp3" id="background-music" loop crossOrigin="anonymous" />
      <video ref={videoRef} src="https://webglfundamentals.org/webgl/resources/hls/tears_of_steel_720p.mp4" loop muted playsInline crossOrigin="anonymous" style={{ display: 'none' }}></video>
    </div>
  );
};

export default App;