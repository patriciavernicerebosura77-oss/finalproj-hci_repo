import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Volume2, Copy, Trash2, X } from 'lucide-react';
import { getSavedPhrases, removeSavedPhrase } from '@/lib/useTranslation';
import { LANGUAGES } from '@/lib/useTranslation';
import { toast } from 'sonner';

export default function SavedPhrases({ open, onClose, onSpeak }) {
  const [phrases, setPhrases] = useState([]);

  useEffect(() => {
    if (open) setPhrases(getSavedPhrases());
  }, [open]);

  const handleRemove = (index) => {
    removeSavedPhrase(index);
    setPhrases(getSavedPhrases());
    toast.success('Phrase removed');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg max-h-[80vh] rounded-2xl glass-strong shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-semibold text-lg">Saved Phrases</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-secondary/80 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
              {phrases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No saved phrases yet</p>
                </div>
              ) : (
                phrases.map((phrase, i) => {
                  const srcLang = LANGUAGES.find(l => l.code === phrase.lang);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-3 rounded-xl glass hover:bg-secondary/60 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{phrase.text}</p>
                          {phrase.originalText && (
                            <p className="text-xs text-muted-foreground mt-0.5">{phrase.originalText}</p>
                          )}
                          {phrase.romanized && (
                            <p className="text-xs text-primary/70 italic mt-0.5">{phrase.romanized}</p>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs">{srcLang?.flag}</span>
                            <span className="text-xs text-muted-foreground">{srcLang?.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onSpeak(phrase.text, phrase.lang)}
                            className="p-1.5 hover:bg-secondary rounded-lg"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => { navigator.clipboard.writeText(phrase.text); toast.success('Copied'); }}
                            className="p-1.5 hover:bg-secondary rounded-lg"
                          >
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleRemove(i)}
                            className="p-1.5 hover:bg-destructive/10 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
