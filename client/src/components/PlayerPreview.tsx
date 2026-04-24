import { Play, Pause, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Track } from '../types';

interface PlayerPreviewProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClick: () => void;
}

export function PlayerPreview({ currentTrack, isPlaying, onTogglePlay, onClick }: PlayerPreviewProps) {
  if (!currentTrack) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      onClick={onClick}
      className="fixed bottom-[84px] lg:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-3xl glass-panel rounded-xl p-3 flex items-center gap-3 z-40 shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden cursor-pointer group lg:left-[calc(50%+10rem)] lg:-translate-x-1/2"
    >
      {/* Progress Bar Background */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/5"></div>
      
      {/* Progress Bar Active */}
      <motion.div 
        className="absolute bottom-0 left-0 h-[2px] bg-primary group-hover:h-[4px] transition-all"
        style={{ width: `${(currentTrack.progress || 0) * 100}%` }}
      />

      <img 
        src={currentTrack.coverArt} 
        alt={currentTrack.title} 
        className="w-12 h-12 rounded-md object-cover border border-white/10"
      />
      
      <div className="flex-1 min-w-0">
        <h4 className="font-body text-on-surface font-semibold truncate text-sm">
          {currentTrack.title}
        </h4>
        <p className="font-mono text-[10px] text-on-surface-variant truncate uppercase tracking-widest">
          {currentTrack.artist}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0 pr-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          className="w-10 h-10 flex items-center justify-center text-on-surface hover:text-primary transition-colors active:scale-90"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        <button 
          onClick={(e) => e.stopPropagation()}
          className="w-10 h-10 flex items-center justify-center text-on-surface hover:text-primary transition-colors hidden sm:flex active:scale-90"
        >
          <SkipForward size={20} fill="currentColor" />
        </button>
      </div>
    </motion.div>
  );
}
