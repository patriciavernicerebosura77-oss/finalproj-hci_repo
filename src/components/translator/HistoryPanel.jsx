import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, Volume2, Copy, Trash2, Loader2 } from 'lucide-react';
import { LANGUAGES, getHistory } from '@/lib/useTranslation';
import { toast } from 'sonner';

const HISTORY_STORAGE_KEY = 'vt_history_v1';

function getHistoryFromStorage() {
  try { return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveHistoryToStorage(items) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
}

export default function HistoryPanel({ open, onClose, onSpeak }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setTimeout(() => {
      setHistory(getHistoryFromStorage());
      setLoading(false);
    }, 100);
  }, [open]);

  const handleDelete = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    saveHistoryToStorage(updated);
    toast.success('Deleted');
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
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-semibold text-lg">Translation History</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-secondary/80 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No translations yet</p>
                </div>
              ) : (
                history.map((item, i) => {
                  const srcLang = LANGUAGES.find(l => l.code === item.source_lang);
                  const tgtLang = LANGUAGES.find(l => l.code === item.target_lang);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-3 rounded-xl glass hover:bg-secondary/60 transition-all group"
                    >
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className="text-xs">{srcLang?.flag}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-xs">{tgtLang?.flag}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(item.created_date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.source_text}</p>
                      <p className="text-sm font-medium mt-1">{item.translated_text}</p>
                      {item.romanized_text && (
                        <p className="text-xs text-primary/70 italic mt-0.5">{item.romanized_text}</p>
                      )}
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onSpeak(item.translated_text, item.target_lang)}
                          className="p-1.5 hover:bg-secondary rounded-lg"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => { navigator.clipboard.writeText(item.translated_text); toast.success('Copied'); }}
                          className="p-1.5 hover:bg-secondary rounded-lg"
                        >
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 hover:bg-destructive/10 rounded-lg ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
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
