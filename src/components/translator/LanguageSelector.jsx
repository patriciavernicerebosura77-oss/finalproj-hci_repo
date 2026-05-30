import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, ArrowLeftRight } from 'lucide-react';
import { LANGUAGES } from '@/lib/useTranslation';

function LanguageDropdown({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = LANGUAGES.find(l => l.code === value);
  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.native.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative flex-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl glass hover:bg-white/90 dark:hover:bg-white/15 transition-all"
      >
        <span className="text-xl">{selected?.flag}</span>
        <div className="text-left flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold text-sm truncate">{selected?.name}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl glass-strong shadow-xl max-h-64 overflow-hidden"
            >
              <div className="p-2 border-b border-border/50">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search languages…"
                    className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>
              </div>
              <div className="overflow-y-auto max-h-48 p-1">
                {filtered.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { onChange(lang.code); setOpen(false); setSearch(''); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                      value === lang.code ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/80'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lang.name}</p>
                      <p className="text-xs text-muted-foreground">{lang.native}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LanguageSelector({ sourceLang, targetLang, onSourceChange, onTargetChange, onSwap }) {
  return (
    <div className="flex items-center gap-2">
      <LanguageDropdown value={sourceLang} onChange={onSourceChange} label="From" />
      <motion.button
        whileTap={{ scale: 0.85, rotate: 180 }}
        onClick={onSwap}
        className="p-2.5 rounded-full gradient-primary text-white shadow-lg shadow-primary/25 flex-shrink-0"
      >
        <ArrowLeftRight className="w-4 h-4" />
      </motion.button>
      <LanguageDropdown value={targetLang} onChange={onTargetChange} label="To" />
    </div>
  );
}