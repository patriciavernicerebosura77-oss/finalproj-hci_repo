import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { LANGUAGES } from '@/lib/useTranslation';

// Languages that use non-Latin scripts and benefit from romanization
const NEEDS_ROMANIZATION = new Set(['ja', 'zh', 'ko', 'ar', 'hi', 'ru', 'th', 'el', 'he']);

export default function PronunciationCard({ message, onSpeak }) {
  const [expanded, setExpanded] = useState(false);

  // Only show for translated (non-source) messages that are resolved
  if (message.type !== 'translated' || message.pending || message.error || !message.text) {
    return null;
  }

  const lang = LANGUAGES.find(l => l.code === message.lang);
  const hasRomanized = !!message.romanized && message.romanized.trim().length > 0;
  const showRomanization = hasRomanized && NEEDS_ROMANIZATION.has(message.lang);

  // Syllable-split helper: simple visual aid, split on vowel groups for display
  const syllables = message.text.length < 60
    ? message.text.split(' ').map((w, i) => (
        <span key={i} className="inline-block mr-1.5 mb-1">
          <span className="text-sm font-semibold text-foreground">{w}</span>
        </span>
      ))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, delay: 0.08 }}
      className="max-w-[86%] ml-0"
    >
      <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-primary/10">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{lang?.flag}</span>
            <span className="text-xs font-semibold text-primary/80 uppercase tracking-wide">
              Pronunciation
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSpeak(message.text, message.lang)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all"
              title="Listen"
            >
              <Volume2 className="w-3 h-3 text-primary" />
              <span className="text-xs text-primary font-medium">Listen</span>
            </button>
            {(showRomanization || message.text.length > 30) && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="p-1 rounded-lg hover:bg-secondary/60 transition-all"
              >
                {expanded
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                }
              </button>
            )}
          </div>
        </div>

        {/* Main content: word breakdown */}
        <div className="px-3 py-2.5">
          {syllables ? (
            <div className="flex flex-wrap items-baseline gap-0.5">
              {message.text.split(' ').map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.18 }}
                  className="inline-flex flex-col items-center mr-1.5 mb-0.5"
                >
                  <span className="text-sm font-semibold text-foreground leading-snug">{word}</span>
                  {showRomanization && (() => {
                    // Try to map romanized word by index
                    const romWords = message.romanized.trim().split(' ');
                    const romWord = romWords[i];
                    return romWord ? (
                      <span className="text-[10px] text-primary/60 italic leading-none mt-0.5">{romWord}</span>
                    ) : null;
                  })()}
                </motion.span>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-foreground">{message.text}</p>
          )}
        </div>

        {/* Expanded: full romanized line + language note */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-2.5 pt-0 border-t border-primary/10 mt-0 space-y-2">
                {showRomanization && (
                  <div className="pt-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-medium">Romanization</p>
                    <p className="text-sm italic text-primary/70 leading-relaxed">{message.romanized}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-medium">Full text</p>
                  <p className="text-sm text-foreground leading-relaxed">{message.text}</p>
                </div>
                {message.tone && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Tone</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize font-medium">
                      {message.tone}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}