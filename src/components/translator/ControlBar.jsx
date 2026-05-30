import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Gauge, Sparkles } from 'lucide-react';

const TONES = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'natural', label: 'Natural' },
];

export default function ControlBar({ tone, onToneChange, speed, onSpeedChange }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-xl glass">
      {/* Tone */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">Tone</span>
        <div className="flex gap-1">
          {TONES.map(t => (
            <button
              key={t.value}
              onClick={() => onToneChange(t.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                tone === t.value
                  ? 'gradient-primary text-white shadow-sm'
                  : 'bg-secondary/80 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Speed */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Gauge className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground font-medium flex-shrink-0">Speed</span>
        <Slider
          value={[speed]}
          onValueChange={([v]) => onSpeedChange(v)}
          min={0.5}
          max={2}
          step={0.25}
          className="flex-1 min-w-[80px]"
        />
        <Badge variant="secondary" className="text-xs font-mono">{speed}x</Badge>
      </div>
    </div>
  );
}