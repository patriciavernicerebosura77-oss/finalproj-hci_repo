import { motion } from 'framer-motion';
import { Volume2, Copy, Bookmark, Share2, Loader2, WifiOff, AlertCircle } from 'lucide-react';
import { LANGUAGES } from '@/lib/useTranslation';
import { toast } from 'sonner';
import PronunciationCard from './SpeechCard';

function QuickBtn({ icon: Ico, title, onClick }) {
  return (
    <button onClick={onClick} title={title} className="p-1.5 rounded-lg hover:bg-secondary/80 active:scale-90 transition-all">
      <Ico className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
  );
}

export default function ChatBubble({ message, onSpeak, onSave }) {
  const isSource = message.type === 'source';
  const lang = LANGUAGES.find(l => l.code === message.lang);

  const handleCopy = () => {
    if (!message.text || message.pending) return;
    navigator.clipboard.writeText(message.text);
    toast.success('Copied to clipboard');
  };

  const handleShare = async () => {
    if (!message.text || message.pending) return;
    if (navigator.share) {
      try { await navigator.share({ text: message.text }); } catch {}
    } else {
      navigator.clipboard.writeText(message.text);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex ${isSource ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[86%] space-y-1 flex flex-col ${isSource ? 'items-end' : 'items-start'}`}>

        {/* Language + time tag */}
        <div className={`flex items-center gap-1.5 px-1 ${isSource ? 'flex-row-reverse' : ''}`}>
          <span className="text-sm">{lang?.flag}</span>
          <span className="text-xs text-muted-foreground font-medium">{lang?.name}</span>
          <span className="text-xs text-muted-foreground/50">{message.time}</span>
          {message.fromVoice && (
            <span className="text-xs text-muted-foreground/50">🎙</span>
          )}
          {message.offline && (
            <WifiOff className="w-3 h-3 text-orange-400" title="Offline translation" />
          )}
        </div>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isSource
              ? 'gradient-primary rounded-tr-sm'
              : message.error
              ? 'bg-destructive/10 border border-destructive/20 rounded-tl-sm'
              : 'glass-strong rounded-tl-sm'
          }`}
        >
          {/* Pending — translating spinner */}
          {message.pending ? (
            <div className="flex items-center gap-2 py-0.5">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Translating…</span>
            </div>
          ) : message.error ? (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{message.text}</p>
            </div>
          ) : (
            <>
              <p className={`text-sm leading-relaxed ${isSource ? 'text-white' : 'text-foreground'}`}>
                {message.text}
              </p>
              {message.romanized && (
                <p className={`text-xs mt-1.5 italic ${isSource ? 'text-white/65' : 'text-primary/60'}`}>
                  {message.romanized}
                </p>
              )}
            </>
          )}
        </div>

        {/* Quick actions — only on resolved bubbles */}
        {!message.pending && !message.error && message.text && (
          <div className={`flex items-center gap-0.5 px-1 ${isSource ? 'flex-row-reverse' : ''}`}>
            <QuickBtn icon={Volume2} title="Replay" onClick={() => onSpeak(message.text, message.lang)} />
            <QuickBtn icon={Copy} title="Copy" onClick={handleCopy} />
            {!isSource && <QuickBtn icon={Bookmark} title="Save phrase" onClick={() => onSave(message)} />}
            <QuickBtn icon={Share2} title="Share" onClick={handleShare} />
          </div>
        )}

        {/* Pronunciation Card — shown below every translated bubble */}
        <PronunciationCard message={message} onSpeak={onSpeak} />
      </div>
    </motion.div>
  );
}