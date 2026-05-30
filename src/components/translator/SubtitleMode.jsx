import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subtitles, X, Mic } from 'lucide-react';
import { getBcp47 } from '@/lib/useSpeechRecognition';

export default function SubtitleMode({ sourceLang, onTranslate, isActive, onToggle }) {
  const [transcript, setTranscript] = useState('');
  const [translated, setTranslated]   = useState('');
  const recognitionRef  = useRef(null);
  const activeRef       = useRef(isActive);
  const sessionIdRef    = useRef(0);
  const translatingRef  = useRef(false);

  useEffect(() => { activeRef.current = isActive; }, [isActive]);

  const buildSession = useCallback((sessionId) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const r = new SR();
    r.lang = getBcp47(sourceLang);
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = async (event) => {
      if (sessionId !== sessionIdRef.current) return;
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        event.results[i].isFinal ? (finalText += t) : (interim += t);
      }
      if (interim) setTranscript(interim.trim());
      if (finalText.trim() && !translatingRef.current) {
        setTranscript(finalText.trim());
        translatingRef.current = true;
        const result = await onTranslate(finalText.trim()).catch(() => null);
        if (result?.translated_text) setTranslated(result.translated_text);
        translatingRef.current = false;
      }
    };

    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
    };

    r.onend = () => {
      if (sessionId === sessionIdRef.current && activeRef.current) {
        // Auto-restart subtitle mode
        setTimeout(() => {
          if (activeRef.current) {
            try { r.start(); } catch {}
          }
        }, 200);
      }
    };

    return r;
  }, [sourceLang, onTranslate]);

  useEffect(() => {
    if (!isActive) {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
      setTranscript('');
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const newId = ++sessionIdRef.current;
    const r = buildSession(newId);
    if (!r) return;
    recognitionRef.current = r;
    try { r.start(); } catch {}

    return () => {
      if (recognitionRef.current === r) {
        r.onend = null;
        try { r.abort(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, [isActive, buildSession]);

  return (
    <>
      <button
        onClick={onToggle}
        className={`p-2.5 rounded-lg transition-all ${
          isActive ? 'gradient-primary text-white shadow-md shadow-primary/30' : 'glass hover:bg-secondary/80'
        }`}
        title="Live Captions"
      >
        <Subtitles className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4"
          >
            <div className="max-w-2xl mx-auto rounded-2xl glass-strong p-4 shadow-2xl border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                    Live Captions
                  </span>
                </div>
                <button
                  onClick={onToggle}
                  className="p-1 hover:bg-secondary/80 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {!transcript && !translated ? (
                <div className="flex items-center gap-2 text-muted-foreground/50 py-1">
                  <Mic className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">Speak to see live captions…</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {transcript && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{transcript}</p>
                  )}
                  {translated && (
                    <p className="text-base font-semibold text-foreground leading-relaxed">
                      {translated}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
