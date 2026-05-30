import { motion } from 'framer-motion';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

export default function FloatingMicButton({
  isListening,
  onToggle,
  disabled,
  permissionDenied,
  status,
}) {
  const isProcessing = status === 'translating' || status === 'processing';

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings — only while actively listening */}
      {isListening && (
        <>
          <motion.div
            className="absolute rounded-full bg-primary"
            animate={{ scale: [1, 2.4], opacity: [0.25, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            style={{ width: 64, height: 64 }}
          />
          <motion.div
            className="absolute rounded-full bg-primary"
            animate={{ scale: [1, 2.4], opacity: [0.25, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.55 }}
            style={{ width: 64, height: 64 }}
          />
        </>
      )}

      {/* Main button */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: disabled ? 1 : 1.06 }}
        onClick={onToggle}
        disabled={disabled || isProcessing}
        title={
          permissionDenied
            ? 'Microphone access denied'
            : isListening
            ? 'Stop listening'
            : 'Start listening'
        }
        className={`
          relative z-10 w-16 h-16 rounded-full flex items-center justify-center
          shadow-xl transition-all duration-200 focus:outline-none
          ${permissionDenied
            ? 'bg-destructive/80 text-white shadow-destructive/20 cursor-not-allowed'
            : isListening
            ? 'bg-destructive text-white shadow-destructive/40'
            : isProcessing
            ? 'gradient-primary text-white opacity-60 cursor-not-allowed'
            : 'gradient-primary text-white shadow-primary/40'}
        `}
      >
        {/* Spinning border while processing */}
        {isProcessing && (
          <span
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/60 animate-spin"
          />
        )}
        {permissionDenied ? (
          <AlertCircle className="w-6 h-6" />
        ) : isListening ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </motion.button>

      {/* Label */}
      <motion.span
        key={isListening ? 'stop' : 'start'}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -bottom-5 text-[10px] font-medium text-muted-foreground whitespace-nowrap"
      >
        {isListening ? 'Tap to stop' : isProcessing ? '…' : 'Tap to speak'}
      </motion.span>
    </div>
  );
}