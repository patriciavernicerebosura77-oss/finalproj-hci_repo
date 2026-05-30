/**
 * Real-time waveform — uses Web Audio API AudioAnalyser when available
 * so bar heights actually reflect microphone volume, not random animation.
 * Falls back to CSS animation if AudioContext is unavailable.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const BARS = 28;

// Static bar heights for translating/speaking states (no mic access needed)
function generateStaticPattern(state) {
  return Array.from({ length: BARS }, (_, i) => {
    if (state === 'translating') {
      // Gentle wave
      return 4 + 12 * Math.abs(Math.sin((i / BARS) * Math.PI * 2));
    }
    if (state === 'speaking') {
      return 4 + 16 * Math.abs(Math.sin((i / BARS) * Math.PI * 3));
    }
    return 4;
  });
}

export default function VoiceWaveform({ isActive, status }) {
  const [heights, setHeights] = useState(Array(BARS).fill(4));
  const animFrameRef  = useRef(null);
  const analyserRef   = useRef(null);
  const streamRef     = useRef(null);
  const audioCtxRef   = useRef(null);
  const staticAnimRef = useRef(null);
  const phaseRef      = useRef(0);

  // ── Live mic → AudioAnalyser ──────────────────────────────────
  useEffect(() => {
    if (!isActive) {
      // Stop mic stream
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      streamRef.current   = null;
      return;
    }

    let cancelled = false;

    async function setupAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const ctx      = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const source   = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize           = 64;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const barCount  = BARS;

        function draw() {
          if (cancelled) return;
          animFrameRef.current = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(dataArray);

          const newHeights = Array.from({ length: barCount }, (_, i) => {
            // Map bar index to frequency bin, weighted toward lower freqs (voice)
            const binIndex = Math.floor((i / barCount) * (dataArray.length * 0.6));
            const raw      = dataArray[binIndex] / 255;
            // Scale: min 4px, max 40px, with slight center boost
            const center   = Math.abs(i / barCount - 0.5);
            const shaped   = raw * (1 - center * 0.3);
            return Math.max(4, Math.round(shaped * 40));
          });

          setHeights(newHeights);
        }
        draw();
      } catch {
        // Mic already in use or denied — fall through to CSS fallback
      }
    }

    setupAudio();
    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [isActive]);

  // ── Animated pattern for translating / speaking ───────────────
  useEffect(() => {
    if (isActive) return; // live waveform handles it
    if (status === 'idle') {
      if (staticAnimRef.current) clearInterval(staticAnimRef.current);
      setHeights(Array(BARS).fill(4));
      return;
    }

    staticAnimRef.current = setInterval(() => {
      phaseRef.current += 0.18;
      const ph = phaseRef.current;
      setHeights(Array.from({ length: BARS }, (_, i) => {
        const base = status === 'speaking' ? 10 : 6;
        const amp  = status === 'speaking' ? 20 : 14;
        return base + amp * Math.abs(Math.sin(ph + (i / BARS) * Math.PI * 2.5));
      }));
    }, 60);

    return () => {
      if (staticAnimRef.current) clearInterval(staticAnimRef.current);
    };
  }, [isActive, status]);

  const isVisible = isActive || status === 'translating' || status === 'processing' || status === 'speaking';

  const barColor = {
    listening:   'bg-primary',
    processing:  'bg-accent',
    translating: 'bg-accent',
    speaking:    'bg-green-500',
  }[status] || 'bg-primary';

  return (
    <div
      className={`flex items-center justify-center gap-[3px] h-12 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className={`w-[3px] rounded-full ${barColor} transition-colors duration-300`}
          animate={{ height: h }}
          transition={{ duration: 0.08, ease: 'easeOut' }}
          style={{ minHeight: 4 }}
        />
      ))}
    </div>
  );
}