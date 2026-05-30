import { useState, useRef, useCallback, useEffect } from 'react';

const LANG_MAP = {
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
  pt: 'pt-BR', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', ar: 'ar-SA',
  hi: 'hi-IN', ru: 'ru-RU', tr: 'tr-TR', th: 'th-TH', vi: 'vi-VN',
  nl: 'nl-NL', pl: 'pl-PL', sv: 'sv-SE', tl: 'fil-PH', fil: 'fil-PH',
};

export function getBcp47(langCode) {
  if (langCode === 'auto') return 'en-US';
  if (LANG_MAP[langCode]) return LANG_MAP[langCode];
  if (typeof langCode === 'string' && langCode.length === 2) {
    return `${langCode}-${langCode.toUpperCase()}`;
  }
  return langCode;
}

function normalize(text) {
  return text.trim().toLowerCase().replace(/[.,!?¿¡]/g, '').replace(/\s+/g, ' ');
}

function isTooSimilar(a, b) {
  if (!a || !b) return false;
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.startsWith(nb) || nb.startsWith(na)) return true;
  if (na.length < 60 && nb.length < 60) {
    const distance = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length);
    if (maxLen > 0 && distance / maxLen < 0.15) return true;
  }
  return false;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function isSpeechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Check microphone permission status
 */
export async function checkMicrophonePermission() {
  try {
    const permission = await navigator.permissions.query({ name: 'microphone' });
    return permission.state; // 'granted', 'denied', 'prompt'
  } catch (err) {
    console.warn('[SR] Permission check failed:', err);
    return 'unknown';
  }
}

export default function useSpeechRecognition({
  onFinalTranscript,
  onInterimTranscript,
  onError,
  onStatusChange,
  silenceMs = 1800,
  lang = 'en',
}) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [permissionState, setPermissionState] = useState('unknown');

  const recognitionRef    = useRef(null);
  const isListeningRef    = useRef(false);
  const silenceTimerRef   = useRef(null);
  const isTranslatingRef  = useRef(false);
  const lastFinalRef      = useRef('');
  const lastFinalTimeRef  = useRef(0);
  const sessionIdRef      = useRef(0);
  const shouldRestartRef  = useRef(false);
  const restartAttemptsRef = useRef(0);
  const MAX_RESTART = 3;
  const langRef      = useRef(lang);
  const onFinalRef   = useRef(onFinalTranscript);
  const onInterimRef = useRef(onInterimTranscript);
  const onErrorRef   = useRef(onError);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { onFinalRef.current = onFinalTranscript; }, [onFinalTranscript]);
  useEffect(() => { onInterimRef.current = onInterimTranscript; }, [onInterimTranscript]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (isListeningRef.current && recognitionRef.current) {
        shouldRestartRef.current = false;
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    }, silenceMs);
  }, [silenceMs]);

  const destroyRecognition = useCallback(() => {
    clearSilenceTimer();
    const r = recognitionRef.current;
    if (!r) return;
    r.onstart = null; 
    r.onresult = null; 
    r.onerror = null; 
    r.onend = null;
    r.onspeechstart = null; 
    r.onspeechend = null;
    try { r.abort(); } catch {}
    recognitionRef.current = null;
  }, []);

  const startSession = useCallback((sessionId) => {
    if (!isSpeechSupported()) {
      onErrorRef.current?.('unsupported', 'Speech recognition not supported');
      return null;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = getBcp47(langRef.current);
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (sessionId !== sessionIdRef.current) return;
        restartAttemptsRef.current = 0;
        setPermissionState('granted');
        setIsListening(true);
        isListeningRef.current = true;
        onStatusChangeRef.current?.('listening');
        setInterimText('');
        resetSilenceTimer();
      };

      recognition.onspeechstart = () => {
        if (sessionId !== sessionIdRef.current) return;
        resetSilenceTimer();
      };

      recognition.onspeechend = () => {
        if (sessionId !== sessionIdRef.current) return;
        resetSilenceTimer();
      };

      recognition.onresult = (event) => {
        if (sessionId !== sessionIdRef.current) return;
        resetSilenceTimer();

        let interimAccum = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += (finalText ? ' ' : '') + t;
          } else {
            interimAccum += t;
          }
        }

        if (interimAccum) {
          const display = interimAccum.trim();
          setInterimText(display);
          onInterimRef.current?.(display);
        }

        if (finalText.trim()) {
          const cleaned = finalText.trim();
          const now = Date.now();
          const timeSinceLast = now - lastFinalTimeRef.current;
          const tooSimilar = isTooSimilar(cleaned, lastFinalRef.current);

          if (tooSimilar && timeSinceLast < 3000) return;
          if (cleaned.length < 2) return;

          lastFinalRef.current = cleaned;
          lastFinalTimeRef.current = now;
          setInterimText('');
          onFinalRef.current?.(cleaned);
        }
      };

      recognition.onerror = (event) => {
        if (sessionId !== sessionIdRef.current) return;
        clearSilenceTimer();
        const { error } = event;
        
        if (error === 'no-speech') { 
          shouldRestartRef.current = false; 
          return; 
        }
        if (error === 'aborted') return;
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          setPermissionState('denied');
          shouldRestartRef.current = false;
          onErrorRef.current?.('permission', 'Microphone access denied. Please enable microphone permissions.');
          return;
        }
        if (error === 'network') {
          onErrorRef.current?.('network', 'Network error. Please check your connection.');
          shouldRestartRef.current = false;
          return;
        }
        if (error === 'audio-capture') {
          onErrorRef.current?.('hardware', 'No microphone detected. Please check your audio hardware.');
          shouldRestartRef.current = false;
          return;
        }
        console.warn('[SR] error:', error);
      };

      recognition.onend = () => {
        if (sessionId !== sessionIdRef.current) return;
        clearSilenceTimer();
        const wasListening = isListeningRef.current;
        isListeningRef.current = false;
        setIsListening(false);
        setInterimText('');
        recognitionRef.current = null;
        
        if (!shouldRestartRef.current) {
          onStatusChangeRef.current?.('idle');
        }

        if (shouldRestartRef.current && wasListening && restartAttemptsRef.current < MAX_RESTART) {
          restartAttemptsRef.current += 1;
          const delay = Math.min(150 * restartAttemptsRef.current, 600);
          setTimeout(() => {
            if (shouldRestartRef.current && !isTranslatingRef.current) {
              const newId = ++sessionIdRef.current;
              const newR = startSession(newId);
              if (newR) {
                recognitionRef.current = newR;
                try { newR.start(); } catch {}
              }
            }
          }, delay);
        }
      };

      return recognition;
    } catch (err) {
      console.error('[SR] Session creation failed:', err);
      onErrorRef.current?.('error', 'Failed to initialize speech recognition');
      return null;
    }
  }, [resetSilenceTimer]);

  const startListening = useCallback(async () => {
    if (!isSpeechSupported()) {
      onErrorRef.current?.('unsupported', 'Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return false;
    }

    try {
      const permission = await checkMicrophonePermission();
      if (permission === 'denied') {
        setPermissionState('denied');
        onErrorRef.current?.('permission', 'Microphone access denied. Please enable microphone permission in your browser settings.');
        return false;
      }

      destroyRecognition();
      const nextId = ++sessionIdRef.current;
      shouldRestartRef.current = true;
      const r = startSession(nextId);
      if (!r) return false;
      recognitionRef.current = r;
      r.start();
      return true;
    } catch (err) {
      console.error('[SR] Start failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        setPermissionState('denied');
        onErrorRef.current?.('permission', 'Microphone access denied. Please allow microphone access.');
      } else {
        onErrorRef.current?.('error', 'Failed to start speech recognition');
      }
      return false;
    }
  }, [destroyRecognition, startSession]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
    isListeningRef.current = false;
    setInterimText('');
    clearSilenceTimer();
    onStatusChangeRef.current?.('idle');
  }, []);

  useEffect(() => {
    return () => { destroyRecognition(); };
  }, [destroyRecognition]);

  return {
    isListening,
    interimText,
    permissionState,
    startListening,
    stopListening,
    hasSupport: isSpeechSupported()
  };
}