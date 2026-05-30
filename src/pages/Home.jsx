import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle } from 'lucide-react';
import useTranslation, { savePhraseLocally } from '@/lib/useTranslation';
import useDarkMode from '@/lib/useDarkMode';
import AppHeader from '@/components/translator/AppHeader';
import LanguageSelector from '@/components/translator/LanguageSelector';
import ControlBar from '@/components/translator/ControlBar';
import VoiceWaveform from '@/components/translator/VoiceWaveform';
import StateBadge from '@/components/translator/StateBadge'; // Gamit ang tamang pangalan mo
import MessageBubble from '@/components/translator/MessageBubble'; // Gamit ang tamang pangalan mo
import FloatingMicButton from '@/components/translator/FloatingMicButton';
import TextInputBar from '@/components/translator/TextInputBar';
import SubtitleMode from '@/components/translator/SubtitleMode';
import EmergencyPhrases from '@/components/translator/EmergencyPhrases';
import PhraseList from '@/components/translator/PhraseList'; // Gamit ang tamang pangalan mo
import HistoryPanel from '@/components/translator/HistoryPanel';
import { toast } from 'sonner';
import { preCacheEmergencyPhrases, getCacheSize } from '@/lib/offlineCache';

// 🔥 FIREBASE & FIRESTORE IMPORTS
import { auth, db } from '@/api/firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Home() {
  const {
    status,
    sourceLang,
    targetLang,
    tone,
    speechSpeed,
    messages,
    isOnline,
    interimDisplay,
    isListening,
    permissionState,
    isSpeechSupported,
    audioLevel,
    setSourceLang,
    setTargetLang,
    setTone,
    setSpeechSpeed,
    startListening,
    stopListening,
    speak,
    translateText,
    swapLanguages,
    clearMessages,
  } = useTranslation();

  const [isDark, setIsDark] = useDarkMode();
  const [savedOpen, setSavedOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [subtitleActive, setSubtitleActive] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const chatEndRef = useRef(null);

  // 1. Firebase Auth Security Guard (Babalik sa login kapag walang user session)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        window.location.href = '/login';
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. FIRESTORE SYNC: Auto-save ng history logs sa cloud database kapag may bagong chat
  useEffect(() => {
    const saveLastMessageToFirestore = async () => {
      if (!currentUser || messages.length === 0 || !isOnline) return;

      const lastTargetMsg = [...messages].reverse().find(msg => msg.type === 'target');
      const lastSourceMsg = [...messages].reverse().find(msg => msg.type === 'source');
      if (!lastTargetMsg || !lastSourceMsg) return;
      if (lastTargetMsg.isSavedToFirestore) return;

      try {
        await addDoc(collection(db, 'translation_history'), {
          userId: currentUser.uid,
          text: lastSourceMsg.text,
          translatedText: lastTargetMsg.text,
          sourceLang,
          targetLang,
          timestamp: serverTimestamp(),
        });
        lastTargetMsg.isSavedToFirestore = true;
      } catch (error) {
        console.error("Firestore history tracking block failure:", error);
      }
    };

    saveLastMessageToFirestore();
  }, [messages, currentUser, isOnline, sourceLang, targetLang]);

  // 3. FIRESTORE SYNC: Pag-save ng Bookmarked phrases sa account ng user sa cloud
  const handleSavePhrase = useCallback(async (message) => {
    if (!currentUser) return;

    // Pinapanatili ang local storage logic mo bilang offline backup
    savePhraseLocally(message);

    if (isOnline) {
      try {
        await addDoc(collection(db, 'saved_phrases'), {
          userId: currentUser.uid,
          text: message.text,
          translatedText: message.type === 'target' ? message.text : '',
          sourceLang,
          targetLang,
          timestamp: serverTimestamp(),
        });
        toast.success('Phrase saved securely to cloud database!');
      } catch (error) {
        console.error("Firestore document write failure:", error);
        toast.error('Failed to sync to cloud database.');
      }
    } else {
      toast.success('Saved locally! Will sync once back online.');
    }
  }, [currentUser, isOnline, sourceLang, targetLang]);

  // Global speech errors watcher
  useEffect(() => {
    window.__vtShowError = (msg) => toast.error(msg, { duration: 4000 });
    return () => { delete window.__vtShowError; };
  }, []);

  // Offline caching para sa emergency phrases
  useEffect(() => {
    if (isOnline) {
      preCacheEmergencyPhrases(targetLang);
    }
  }, [isOnline, targetLang]);

  // Net stats indicator alert toast
  useEffect(() => {
    if (!isOnline) {
      toast.warning('You\'re offline. Cached translations are still available.', { duration: 4000 });
    } else {
      const size = getCacheSize();
      if (size > 0) {
        toast.success(`Back online! ${size} translations cached for offline use.`, { duration: 3000 });
      }
    }
  }, [isOnline]);

  // Auto-scroll anchor animation kapag may bagong bubble
  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      if (!isSpeechSupported) {
        toast.error('Speech recognition is not supported in this browser. Please use Chrome or Edge.', { duration: 5000 });
        return;
      }
      startListening();
    }
  }, [isListening, stopListening, startListening, isSpeechSupported]);

  const handleSubtitleTranslate = useCallback(async (text) => {
    return translateText(text);
  }, [translateText]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
      toast.error('Failed to logout');
    }
  }, []);

  // Auth processing barrier
  if (authLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Loading user profile environment...</p>
        </div>
      </div>
    );
  }

  const isProcessingOrSpeaking = status === 'translating' || status === 'processing' || status === 'speaking';
  const showWaveform = isListening || isProcessingOrSpeaking;

  return (
    <div className="min-h-screen gradient-bg flex flex-col w-full overflow-x-hidden">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-primary/8 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/8 rounded-full blur-3xl"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-screen max-w-2xl mx-auto w-full px-2 sm:px-4">
        {/* Header */}
        <AppHeader
          isDark={isDark}
          onToggleDark={() => setIsDark(!isDark)}
          isOnline={isOnline}
          onOpenSaved={() => setSavedOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
          onLogout={handleLogout}
          user={currentUser}
        />

        {/* Language Selector */}
        <div className="w-full pb-2">
          <LanguageSelector
            sourceLang={sourceLang}
            targetLang={targetLang}
            onSourceChange={setSourceLang}
            onTargetChange={setTargetLang}
            onSwap={swapLanguages}
          />
        </div>

        {/* Control Bar */}
        <div className="w-full pb-2">
          <ControlBar
            tone={tone}
            onToneChange={setTone}
            speed={speechSpeed}
            onSpeedChange={setSpeechSpeed}
          />
        </div>

        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="w-full mb-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-400/20 flex items-center gap-2">
            <span className="text-base">📵</span>
            <div>
              <p className="text-xs font-semibold text-orange-500">Offline Mode</p>
              <p className="text-xs text-orange-400/80">Cached data active. Cloud synchronization paused.</p>
            </div>
          </div>
        )}

        {/* Browser Voice Recognition Warning */}
        {!isSpeechSupported && (
          <div className="w-full mb-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-400/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <p className="text-xs text-orange-400">
              Voice input requires Chrome or Edge. Text input is still available.
            </p>
          </div>
        )}

        {/* Mic Permission Warning */}
        {permissionState === 'denied' && (
          <div className="w-full mb-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">
              Microphone access denied. Enable it in your browser settings.
            </p>
          </div>
        )}

        {/* Main Chat / Feed Area */}
        <div className="flex-1 overflow-y-auto w-full py-2 space-y-3 scrollbar-hide">
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full text-center px-4 min-h-[250px]"
              >
                <div className="space-y-4 w-full max-w-md">
                  <motion.div 
                    className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto shadow-xl shadow-primary/20"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <span className="text-white font-black text-4xl">V</span>
                  </motion.div>
                  
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">VoiceTranslate</h2>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Cloud Protected Database</p>
                    <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto">
                      Tap the mic to speak or type below. Translations appear instantly and sync securely.
                    </p>
                  </div>
                  <EmergencyPhrases onTranslate={translateText} onSpeak={speak} />
                </div>
              </motion.div>
            ) : (
              <>
                {messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onSpeak={speak}
                    onSave={handleSavePhrase}
                  />
                ))}
                <div ref={chatEndRef} className="h-1" />
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Audio Waveform Feedback Indicator */}
        <div className="w-full min-h-[70px] flex flex-col items-center justify-center bg-transparent">
          <AnimatePresence>
            {showWaveform && (
              <motion.div
                key="waveform"
                initial={{ opacity: 0, scaleY: 0.4 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0.4 }}
                className="w-full"
              >
                <VoiceWaveform isActive={isListening} status={status} audioLevel={audioLevel} />
              </motion.div>
            )}
          </AnimatePresence>
          <StateBadge status={status} interimText={interimDisplay} />
        </div>

        {/* Operational Footer Controls */}
        <div className="w-full pb-6 pt-1 space-y-3 bg-transparent">
          <TextInputBar
            onSend={translateText}
            disabled={isListening || status === 'translating' || status === 'processing'}
          />

          <div className="flex items-center justify-center gap-6 pt-1">
            <SubtitleMode
              sourceLang={sourceLang}
              onTranslate={handleSubtitleTranslate}
              isActive={subtitleActive}
              onToggle={() => setSubtitleActive(p => !p)}
            />

            <FloatingMicButton
              isListening={isListening}
              onToggle={handleMicToggle}
              disabled={!isSpeechSupported}
              permissionDenied={permissionState === 'denied'}
              status={status}
              audioLevel={audioLevel}
            />

            <div className="w-10 h-10 flex items-center justify-center">
              <AnimatePresence>
                {messages.length > 0 && (
                  <motion.button
                    key="clear"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    onClick={clearMessages}
                    className="p-2.5 rounded-lg glass hover:bg-secondary/80 transition-colors flex items-center justify-center"
                    title="Clear chat"
                  >
                    <Trash2 className="w-5 h-5 text-muted-foreground" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Application Modals */}
      <PhraseList
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        onSpeak={speak}
        userId={currentUser?.uid} 
      />
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSpeak={speak}
        userId={currentUser?.uid}
      />
    </div>
  );
}