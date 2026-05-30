/**
 * Core translation hook — wires speech recognition, free translation APIs,
 * TTS playback, message state, caching, and deduplication.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import useSpeechRecognition, { getBcp47 } from './useSpeechRecognition';
import { translateText, getCachedTranslation, cacheTranslation } from './translationService';
import { detectLanguage } from './languageDetection';
import { toast } from 'sonner';

const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect', flag: '🌐', native: 'Auto Detect' },
  { code: 'en',  name: 'English',    flag: '🇺🇸', native: 'English' },
  { code: 'tl',  name: 'Filipino',   flag: '🇵🇭', native: 'Filipino' },
  { code: 'es',  name: 'Spanish',    flag: '🇪🇸', native: 'Español' },
  { code: 'fr',  name: 'French',     flag: '🇫🇷', native: 'Français' },
  { code: 'de',  name: 'German',     flag: '🇩🇪', native: 'Deutsch' },
  { code: 'it',  name: 'Italian',    flag: '🇮🇹', native: 'Italiano' },
  { code: 'pt',  name: 'Portuguese', flag: '🇧🇷', native: 'Português' },
  { code: 'zh',  name: 'Chinese',    flag: '🇨🇳', native: '中文' },
  { code: 'ja',  name: 'Japanese',   flag: '🇯🇵', native: '日本語' },
  { code: 'ko',  name: 'Korean',     flag: '🇰🇷', native: '한국어' },
  { code: 'ar',  name: 'Arabic',     flag: '🇸🇦', native: 'العربية' },
  { code: 'hi',  name: 'Hindi',      flag: '🇮🇳', native: 'हिन्दी' },
  { code: 'ru',  name: 'Russian',    flag: '🇷🇺', native: 'Русский' },
  { code: 'tr',  name: 'Turkish',    flag: '🇹🇷', native: 'Türkçe' },
  { code: 'th',  name: 'Thai',       flag: '🇹🇭', native: 'ไทย' },
  { code: 'vi',  name: 'Vietnamese', flag: '🇻🇳', native: 'Tiếng Việt' },
  { code: 'nl',  name: 'Dutch',      flag: '🇳🇱', native: 'Nederlands' },
  { code: 'pl',  name: 'Polish',     flag: '🇵🇱', native: 'Polski' },
  { code: 'sv',  name: 'Swedish',    flag: '🇸🇪', native: 'Svenska' },
];

// ── History helpers ──────────────────────────────────────────────────────────
export function getHistory() {
  try { return JSON.parse(localStorage.getItem('vt_history_v1') || '[]'); }
  catch { return []; }
}

function saveToHistory(entry) {
  const history = getHistory();
  const newEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random()}`,
    created_date: new Date().toISOString(),
  };
  history.unshift(newEntry);
  localStorage.setItem('vt_history_v1', JSON.stringify(history.slice(0, 50)));
}

// ── Saved phrase helpers ──────────────────────────────────────────────────────
export function getSavedPhrases() {
  try { return JSON.parse(localStorage.getItem('vt_saved_v1') || '[]'); }
  catch { return []; }
}
export function savePhraseLocally(phrase) {
  const saved = getSavedPhrases();
  if (saved.some(s => s.text === phrase.text && s.lang === phrase.lang)) return;
  saved.unshift({ ...phrase, savedAt: Date.now() });
  localStorage.setItem('vt_saved_v1', JSON.stringify(saved.slice(0, 100)));
}
export function removeSavedPhrase(index) {
  const saved = getSavedPhrases();
  saved.splice(index, 1);
  localStorage.setItem('vt_saved_v1', JSON.stringify(saved));
}

export { LANGUAGES };

// ── Main hook ─────────────────────────────────────────────────────────────────
export default function useTranslation() {
  const [status, setStatus] = useState('idle'); // idle | listening | processing | translating | speaking
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [tone, setTone] = useState('natural');
  const [speechSpeed, setSpeechSpeed] = useState(1);
  const [messages, setMessages] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [interimDisplay, setInterimDisplay] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const synthRef              = useRef(window.speechSynthesis);
  const translationLockRef    = useRef(false);
  const sourceLangRef         = useRef(sourceLang);
  const targetLangRef         = useRef(targetLang);
  const toneRef               = useRef(tone);
  const speechSpeedRef        = useRef(speechSpeed);
  const messagesRef           = useRef(messages);
  const setTranslatingFnRef   = useRef(null);

  useEffect(() => { sourceLangRef.current = sourceLang; }, [sourceLang]);
  useEffect(() => { targetLangRef.current = targetLang; }, [targetLang]);
  useEffect(() => { toneRef.current = tone; }, [tone]);
  useEffect(() => { speechSpeedRef.current = speechSpeed; }, [speechSpeed]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const isDuplicateMessage = useCallback((text) => {
    const msgs = messagesRef.current;
    const recent = msgs.slice(-6);
    const norm = text.toLowerCase().trim();
    return recent.some(m => m.text?.toLowerCase().trim() === norm);
  }, []);

  const callTranslate = useCallback(async (text, src, tgt, toneVal) => {
    const cached = getCachedTranslation(text, src, tgt);
    if (cached) {
      console.log('[Translation] Using cached result');
      return cached;
    }

    if (!navigator.onLine) {
      console.warn('[Translation] Offline - no cache available');
      return { translated_text: text, romanized_text: '', offline: true };
    }

    try {
      console.log(`[Translation] Translating from ${src} to ${tgt}`);
      const result = await translateText(text, src, tgt);
      
      const entry = {
        translated_text: result.translated_text || text,
        romanized_text: result.romanized_text || '',
        source_text: text,
        source_lang: src,
        target_lang: tgt,
        tone: toneVal,
      };
      
      cacheTranslation(text, src, tgt, entry);
      return entry;
    } catch (err) {
      console.error('[Translation] Error:', err);
      return { translated_text: text, romanized_text: '', error: err.message };
    }
  }, []);

  const speakText = useCallback((text, lang) => {
    setStatus('speaking');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getBcp47(lang);
    utterance.rate = speechSpeedRef.current;
    utterance.onend = () => { setStatus('idle'); };
    synthRef.current.speak(utterance);
  }, []);

  const runTranslation = useCallback(async (text, fromVoice = false) => {
    const cleaned = text.trim();
    if (!cleaned || cleaned.length < 2) return null;
    if (translationLockRef.current) return null;
    if (isDuplicateMessage(cleaned)) return null;

    translationLockRef.current = true;
    setTranslatingFnRef.current?.(true);

    let src  = sourceLangRef.current;
    const tgt  = targetLangRef.current;
    const tn   = toneRef.current;
    const now  = new Date();

    if (src === 'auto') {
      src = detectLanguage(cleaned, LANGUAGES.filter(l => l.code !== 'auto').map(l => l.code));
      setSourceLang(src);
    }
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const srcMsgId   = `src-${Date.now()}-${Math.random()}`;
    const tgtMsgId   = `tgt-${Date.now()}-${Math.random()}`;

    setMessages(prev => [...prev, {
      id: srcMsgId,
      type: 'source',
      text: cleaned,
      lang: src,
      time,
      fromVoice,
    }]);

    setStatus('translating');

    try {
      const translation = await callTranslate(cleaned, src, tgt, tn);

      if (!translation || !translation.translated_text) {
        throw new Error(translation?.error || 'Translation failed');
      }

      setMessages(prev => [...prev, {
        id: tgtMsgId,
        type: 'target',
        text: translation.translated_text,
        romanized: translation.romanized_text,
        lang: tgt,
        time,
        source_text: cleaned,
        source_lang: src,
        target_lang: tgt,
        fromVoice,
      }]);

      saveToHistory({
        source_text: cleaned,
        translated_text: translation.translated_text,
        romanized_text: translation.romanized_text,
        source_lang: src,
        target_lang: tgt,
        tone: tn,
      });

      setStatus('idle');
      if (translation.translated_text) {
        speakText(translation.translated_text, tgt);
      }
    } catch (err) {
      console.error('Translation failed:', err);
      setMessages(prev => [...prev, {
        id: tgtMsgId,
        type: 'target',
        text: err?.message || 'Translation unavailable',
        lang: tgt,
        time,
        error: true,
      }]);
      setStatus('idle');
      toast.error(err?.message || 'Translation failed');
    } finally {
      translationLockRef.current = false;
      setTranslatingFnRef.current?.(false);
    }
  }, [callTranslate, isDuplicateMessage, speakText]);

  // ── SAKTONG PAG-KONEKTA SA SPEECH RECOGNITION ───────────────────────────
  const { 
    startListening, 
    stopListening, 
    isListening,
    hasSupport 
  } = useSpeechRecognition({
    onInterimTranscript: (text) => {
      setInterimDisplay(text);
    },
    onFinalTranscript: (transcript) => {
      setInterimDisplay('');
      runTranslation(transcript, true);
    },
    onStatusChange: (speechStatus) => {
      // Keep speech recognition status synced with translation UI
      if (speechStatus === 'listening') setStatus('listening');
      if (speechStatus === 'idle') {
        setStatus(current => (current === 'listening' ? 'idle' : current));
      }
    },
    onError: (type, message) => {
      console.error(`[Speech Error] ${type}: ${message}`);
      setStatus('idle');
      if (type === 'permission') setPermissionDenied(true);
    },
    lang: sourceLang, // Ipinapasa ang napiling wika sa mic recognition
  });

  // Swap source and target languages
  const swapLanguages = useCallback(() => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  }, [sourceLang, targetLang]);

  return {
    status,
    sourceLang,
    setSourceLang,
    targetLang,
    setTargetLang,
    tone,
    setTone,
    speechSpeed,
    setSpeechSpeed,
    messages,
    isOnline,
    interimDisplay,
    permissionDenied,
    permissionState: permissionDenied ? 'denied' : 'granted',
    isListening,
    hasSupport,
    isSpeechSupported: hasSupport,
    audioLevel: 0,
    
    // Actions
    runTranslation,
    speakText,
    speak: speakText,
    translateText: runTranslation,
    startListening,
    stopListening,
    swapLanguages,
    clearMessages: () => setMessages([]),
    
    // Helpers
    getSavedPhrases,
    savePhraseLocally,
    removeSavedPhrase,
  };
}