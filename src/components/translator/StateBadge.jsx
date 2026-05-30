import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Globe, Volume2, Loader2, Cpu } from 'lucide-react';

const STATUS_CONFIG = {
  listening: {
    icon: Mic,
    text: 'Listening…',
    color: 'from-primary to-accent',
    dot: 'bg-red-400',
  },
  processing: {
    icon: Cpu,
    text: 'Processing…',
    color: 'from-accent to-violet-500',
    dot: 'bg-violet-400',
  },
  translating: {
    icon: Globe,
    text: 'Translating…',
    color: 'from-accent to-primary',
    dot: 'bg-accent',
  },
  speaking: {
    icon: Volume2,
    text: 'Speaking…',
    color: 'from-green-500 to-emerald-400',
    dot: 'bg-green-400',
  },
};

export default function StatusIndicator({ status, interimText }) {
  const config = STATUS_CONFIG[status];

  return (
    <AnimatePresence mode="wait">
      {config && (
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col items-center gap-1.5"
        >
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${config.color} shadow-lg`}>
            {/* Live dot */}
            <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />

            {status === 'translating' || status === 'processing' ? (
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            ) : (
              <config.icon className="w-3.5 h-3.5 text-white" />
            )}

            <span className="text-xs font-semibold text-white tracking-wide">
              {config.text}
            </span>
          </div>

          {/* Live interim transcript preview */}
          <AnimatePresence>
            {status === 'listening' && interimText && (
              <motion.p
                key={interimText}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-muted-foreground italic max-w-xs text-center truncate px-2"
              >
                "{interimText}"
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}