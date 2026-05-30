import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Shield, Plane, MessageCircle, UtensilsCrossed, ChevronRight, Volume2, Zap } from 'lucide-react';
import { EMERGENCY_CATEGORIES } from '@/lib/emergencyPhrases';

const iconMap = { Heart, Shield, Plane, MessageCircle, UtensilsCrossed };

export default function EmergencyPhrases({ onTranslate, onSpeak }) {
  const [activeCategory, setActiveCategory] = useState(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Zap className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Quick Phrases</h3>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {EMERGENCY_CATEGORIES.map(cat => {
          const Icon = iconMap[cat.icon];
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'gradient-primary text-white shadow-sm'
                  : 'glass hover:bg-secondary/80'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Phrases */}
      <AnimatePresence mode="wait">
        {activeCategory && (
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1 overflow-hidden"
          >
            {EMERGENCY_CATEGORIES.find(c => c.id === activeCategory)?.phrases.map((phrase, i) => (
              <motion.button
                key={phrase}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onTranslate(phrase)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg glass hover:bg-secondary/80 transition-all group"
              >
                <span className="text-sm text-left">{phrase}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}