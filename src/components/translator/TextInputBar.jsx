import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Keyboard } from 'lucide-react';

export default function TextInputBar({ onSend, disabled }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-xl glass">
      <Keyboard className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        placeholder="Type to translate…"
        disabled={disabled}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className="p-2.5 rounded-lg gradient-primary text-white disabled:opacity-40 transition-opacity"
      >
        <Send className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
