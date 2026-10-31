import React, { useRef, useEffect, useState } from 'react';
import type { EmotionalMode, Speaker } from '../types';
import { Volume2, VolumeX, Activity, Radio, Sparkles } from 'lucide-react';

interface AudioWaveformVisualizerProps {
  analyser: React.MutableRefObject<AnalyserNode | null>;
  isAiSpeaking: boolean;
  isAiResponding?: boolean;
  emotionalMode: EmotionalMode;
  activeSpeaker?: Speaker | null;
  sessionStatus: 'idle' | 'connecting' | 'active' | 'error';
  isCompact?: boolean;
}

const modeVisualThemes: Record<EmotionalMode, {
  primary: string;
  secondary: string;
  glow: string;
  speakerName: string;
}> = {
  Professional: {
    primary: '#00ffff',
    secondary: '#0088ff',
    glow: 'rgba(0, 255, 255, 0.6)',
    speakerName: 'VYNO // PROTOCOL CORE'
  },
  Enthusiastic: {
    primary: '#ffd700',
    secondary: '#ff4500',
    glow: 'rgba(255, 215, 0, 0.6)',
    speakerName: 'VYNO // HYPERDRIVE'
  },
  Cautious: {
    primary: '#39ff14',
    secondary: '#00fa9a',
    glow: 'rgba(57, 255, 20, 0.6)',
    speakerName: 'VYNO // SECURITY SENTINEL'
  },
  Zen: {
    primary: '#ff69b4',
    secondary: '#e6e6fa',
    glow: 'rgba(255, 105, 180, 0.6)',
    speakerName: 'VYNO // HARMONIC TRANSCENDENCE'
  },
  Thulu: {
    primary: '#00ffaa',
    secondary: '#8a2be2',
    glow: 'rgba(0, 255, 170, 0.7)',
    speakerName: 'THULU // ABYSSAL DEEP DEITY'
  }
};

export const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  analyser,
  isAiSpeaking,
  isAiResponding = false,
  emotionalMode,
  activeSpeaker = 'VYNO',
  sessionStatus,
  isCompact = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentDb, setCurrentDb] = useState<number>(-48);
  const [amplitudePct, setAmplitudePct] = useState<number>(0);
  const [displayMode, setDisplayMode] = useState<'wave' | 'bars' | 'dual'>('dual');
  
  const theme = modeVisualThemes[emotionalMode] || modeVisualThemes.Professional;
  const targetSpeaker = activeSpeaker === 'THULU' ? 'THULU' : 'VYNO';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bufferLength = 128;
    const timeDomainData = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);
    
    // Smooth peak & momentum tracking
    let smoothAmp = 0;
    const peakBars = new Array(32).fill(0);
    const peakDecays = new Array(32).fill(0);

    const render = () => {
      animationId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;

      let hasRealAudio = false;
      let rawVolume = 0;

      if (analyser && analyser.current) {
        try {
          analyser.current.getByteTimeDomainData(timeDomainData);
          analyser.current.getByteFrequencyData(frequencyData);

          // Calculate RMS amplitude
          let sumSquares = 0;
          let freqSum = 0;
          for (let i = 0; i < bufferLength; i++) {
            const normalized = (timeDomainData[i] - 128) / 128;
            sumSquares += normalized * normalized;
            freqSum += frequencyData[i];
          }
          const rms = Math.sqrt(sumSquares / bufferLength);
          const avgFreq = freqSum / bufferLength;

          if (rms > 0.015 || avgFreq > 6) {
            hasRealAudio = true;
            rawVolume = Math.min(1.0, Math.max(rms * 2.2, avgFreq / 140));
          }
        } catch (e) {
          // Context not ready
        }
      }

      // If AI is speaking or responding, inject neural wave if live mic/audio is subtle
      const time = performance.now() * 0.003;
      let targetAmp = rawVolume;

      if (isAiSpeaking && targetAmp < 0.25) {
        // Boosted rhythmic speaking modulation
        const voiceMod = Math.abs(Math.sin(time * 6.5)) * 0.55 + Math.abs(Math.cos(time * 12.0)) * 0.35;
        targetAmp = Math.max(targetAmp, voiceMod);
        hasRealAudio = true;
      } else if (isAiResponding) {
        // High-frequency cognitive pulse wave
        const thinkingMod = 0.25 + 0.15 * Math.sin(time * 15.0) + 0.08 * Math.cos(time * 30.0);
        targetAmp = Math.max(targetAmp, thinkingMod);
      } else if (!hasRealAudio) {
        // Subtle ambient idle breathing
        targetAmp = 0.05 + 0.03 * Math.sin(time * 2.0);
      }

      // Spring momentum damping
      smoothAmp += (targetAmp - smoothAmp) * 0.18;

      // Update state for numerical HUD displays throttled
      if (Math.random() < 0.15) {
        const calculatedDb = Math.round(-48 + smoothAmp * 46);
        setCurrentDb(calculatedDb);
        setAmplitudePct(Math.round(smoothAmp * 100));
      }

      // Clear with dark cyber trailing fade
      ctx.fillStyle = 'rgba(5, 7, 15, 0.45)';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle gridlines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(0, height * 0.25);
      ctx.lineTo(width, height * 0.25);
      ctx.moveTo(0, height * 0.75);
      ctx.lineTo(width, height * 0.75);
      ctx.stroke();

      // Render Modes
      const isDual = displayMode === 'dual';
      const isBars = displayMode === 'bars' || isDual;
      const isWave = displayMode === 'wave' || isDual;

      // 1. EQUALIZER SPECTRUM BARS (Centered / Mirrored)
      if (isBars) {
        const barCount = isCompact ? 24 : 36;
        const totalPadding = (barCount - 1) * 2;
        const barWidth = Math.max(2, (width - totalPadding) / barCount);
        const centerY = height / 2;

        for (let i = 0; i < barCount; i++) {
          const freqIndex = Math.floor((i / barCount) * (bufferLength / 2));
          let barHeightFactor = (frequencyData[freqIndex] || 0) / 255;
          
          if (!hasRealAudio) {
            // Harmonic synthetic curve
            const harmonic = Math.sin(time * 4 + i * 0.3) * 0.5 + 0.5;
            barHeightFactor = harmonic * smoothAmp;
          } else {
            barHeightFactor = Math.max(barHeightFactor, smoothAmp * (0.4 + 0.6 * Math.sin(i * 0.4)));
          }

          const barMaxHeight = (height * 0.42) * Math.min(1.2, barHeightFactor * (1.1 + smoothAmp * 0.6));
          const x = i * (barWidth + 2);

          // Update peak holds with gravity momentum
          if (barMaxHeight > peakBars[i]) {
            peakBars[i] = barMaxHeight;
            peakDecays[i] = 0;
          } else {
            peakDecays[i] += 0.25;
            peakBars[i] = Math.max(0, peakBars[i] - peakDecays[i]);
          }

          // Top and Bottom gradient fill
          const grad = ctx.createLinearGradient(0, centerY - barMaxHeight, 0, centerY + barMaxHeight);
          grad.addColorStop(0, theme.primary);
          grad.addColorStop(0.5, theme.secondary);
          grad.addColorStop(1, theme.primary);

          ctx.fillStyle = grad;
          ctx.shadowColor = theme.glow;
          ctx.shadowBlur = smoothAmp > 0.4 ? 10 : 3;

          // Draw mirrored bar rounded
          const topY = centerY - barMaxHeight;
          const totalH = Math.max(2, barMaxHeight * 2);
          ctx.fillRect(x, topY, barWidth, totalH);

          // Draw Peak Caps
          if (peakBars[i] > 3) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 4;
            ctx.fillRect(x, centerY - peakBars[i] - 1.5, barWidth, 1.5);
            ctx.fillRect(x, centerY + peakBars[i], barWidth, 1.5);
          }
        }
      }

      // 2. OSCILLOSCOPE TIME-DOMAIN WAVEFORM
      if (isWave) {
        ctx.shadowColor = theme.primary;
        ctx.shadowBlur = isAiSpeaking ? 14 : 6;
        ctx.lineWidth = isAiSpeaking ? 2.2 : 1.5;
        ctx.strokeStyle = theme.primary;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          let v: number;
          if (hasRealAudio) {
            v = timeDomainData[i] / 128.0;
          } else {
            // Simulated living neural carrier wave with dynamic harmonic frequency
            const freqMult = isAiSpeaking ? 14 : isAiResponding ? 24 : 8;
            v = 1.0 + Math.sin(i * 0.2 + time * freqMult) * (smoothAmp * 0.8) + Math.cos(i * 0.08 - time * 5) * (smoothAmp * 0.3);
          }

          // Height centered
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            // Quadratic smooth interpolation
            const prevX = (i - 1) * sliceWidth;
            const midX = (prevX + x) / 2;
            ctx.lineTo(midX, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Secondary subtle counter-wave for rich holographic layering
        ctx.strokeStyle = theme.secondary;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 2;
        ctx.beginPath();
        x = 0;
        for (let i = 0; i < bufferLength; i += 2) {
          const v = 1.0 + Math.cos(i * 0.25 - time * 8) * (smoothAmp * 0.5);
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth * 2;
        }
        ctx.stroke();
      }

      // Reset shadows
      ctx.shadowBlur = 0;
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, emotionalMode, isAiSpeaking, isAiResponding, displayMode, theme, isCompact]);

  return (
    <div className="w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col gap-2 shadow-inner relative overflow-hidden group">
      {/* Background ambient glow pulse matching active mode */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10 transition-opacity duration-500 blur-2xl"
        style={{
          background: `radial-gradient(ellipse at center, ${theme.primary} 0%, transparent 70%)`
        }}
      />

      {/* TOP STATUS BAR */}
      <div className="flex items-center justify-between z-10 text-[9px] font-mono">
        {/* Active Speaker Info */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2 h-2 rounded-full ${isAiSpeaking ? 'animate-ping' : ''}`}
              style={{ backgroundColor: isAiSpeaking ? theme.primary : '#4b5563' }}
            />
            <span
              className="absolute w-2 h-2 rounded-full"
              style={{ backgroundColor: isAiSpeaking ? theme.primary : isAiResponding ? '#a855f7' : '#6b7280' }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-black uppercase tracking-wider text-white">
              {isAiSpeaking ? (
                <span className="flex items-center gap-1" style={{ color: theme.primary }}>
                  <Volume2 size={11} className="animate-pulse" />
                  AUDIO TX: {theme.speakerName}
                </span>
              ) : isAiResponding ? (
                <span className="text-purple-400 flex items-center gap-1">
                  <Sparkles size={11} className="animate-spin" />
                  NEURAL SYNTHESIS...
                </span>
              ) : sessionStatus === 'active' ? (
                <span className="text-gray-400 flex items-center gap-1">
                  <Radio size={11} className="text-cyan-400" />
                  LISTENING // LIVE LINK ACTIVE
                </span>
              ) : (
                <span className="text-gray-500">CARRIER LINK STANDBY</span>
              )}
            </span>
          </div>
        </div>

        {/* Real-time Telemetry Readout & Controls */}
        <div className="flex items-center gap-3">
          {/* Amplitude VU display */}
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
            <Activity size={10} style={{ color: theme.primary }} />
            <span className="text-[8.5px] font-bold text-gray-400">
              AMP: <strong className="text-white">{amplitudePct}%</strong>
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-[8.5px] font-mono text-cyan-300">
              {currentDb} dB
            </span>
          </div>

          {/* Display Mode Switcher */}
          <button
            type="button"
            onClick={() => {
              setDisplayMode(prev => prev === 'dual' ? 'wave' : prev === 'wave' ? 'bars' : 'dual');
            }}
            className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border border-white/10 hover:border-cyan-400/40 bg-white/5 hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-300 transition-all cursor-pointer"
            title="Cycle waveform visual mode (Dual / Oscilloscope / Spectrum)"
          >
            {displayMode.toUpperCase()}
          </button>
        </div>
      </div>

      {/* WAVEFORM CANVAS */}
      <div className="w-full h-14 relative z-10 rounded-xl overflow-hidden bg-black/50 border border-white/5 shadow-inner">
        <canvas
          ref={canvasRef}
          width={540}
          height={56}
          className="w-full h-full block"
        />

        {/* Real-time VU meter segment strip along the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/70 flex gap-0.5 px-1 py-0.2">
          {Array.from({ length: 24 }).map((_, idx) => {
            const threshold = (idx / 24) * 100;
            const isLit = amplitudePct >= threshold;
            return (
              <div
                key={idx}
                className="flex-1 h-full rounded-sm transition-all duration-75"
                style={{
                  backgroundColor: isLit
                    ? idx > 20
                      ? '#ef4444' // red peak
                      : idx > 15
                      ? '#f59e0b' // amber
                      : theme.primary // theme color
                    : 'rgba(255, 255, 255, 0.05)'
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
