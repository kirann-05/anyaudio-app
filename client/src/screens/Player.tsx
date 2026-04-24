import { useState } from 'react';
import { ChevronDown, MoreVertical, Heart, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Subtitles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Track } from '../types';

interface PlayerScreenProps {
  track: Track;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}

export function PlayerScreen({ track, isPlaying, onTogglePlay, onClose }: PlayerScreenProps) {
  const [showLyrics, setShowLyrics] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const speeds = [1, 1.5, 2];

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[60] bg-background flex flex-col overflow-hidden noise-overlay"
    >
      {/* Ambient Glow Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: isPlaying ? [0.2, 0.4, 0.2] : 0.15
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-container/20 rounded-full blur-[120px]"
        />
      </div>

      {/* Top Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-8 py-6">
        <button onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-white/5">
          <ChevronDown size={32} />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-mono text-[10px] text-primary tracking-[0.3em] uppercase font-bold text-glow">Now Playing</span>
          <span className="font-mono text-xs text-on-surface-variant mt-1">Masterclass Series</span>
        </div>
        <button className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-white/5">
          <MoreVertical size={24} />
        </button>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center px-8 lg:px-24 gap-12 lg:gap-24 overflow-y-auto pb-12">
        {/* Artwork / Lyrics Side */}
        <div className="w-full max-w-[500px] flex flex-col items-center lg:items-start shrink-0 relative">
          <div className="relative w-full aspect-square [perspective:1000px]">
            <AnimatePresence mode="wait">
              {!showLyrics ? (
                <motion.div 
                  key="artwork"
                  initial={{ opacity: 0, rotateY: -180, scale: 0.8 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, rotateY: 180, scale: 0.8 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                  layoutId={`image-${track.id}`}
                  className="w-full h-full rounded-3xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.7)] group border border-white/5"
                >
                  <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </motion.div>
              ) : (
                <motion.div 
                  key="lyrics"
                  initial={{ opacity: 0, rotateY: 180, scale: 0.8 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, rotateY: -180, scale: 0.8 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                  className="w-full h-full rounded-3xl glass-panel p-8 md:p-12 overflow-y-auto hide-scrollbar text-center lg:text-left shadow-2xl border border-white/10"
                >
                  <h3 className="font-mono text-[10px] text-primary uppercase tracking-[0.3em] mb-8 border-b border-primary/20 pb-4 sticky top-0 bg-transparent backdrop-blur-md z-10">Lyrics</h3>
                  <div className="space-y-8 pb-12">
                    {track.lyrics ? track.lyrics.map((line, i) => (
                      <motion.p 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="text-2xl md:text-3xl font-body text-white/80 leading-relaxed font-semibold tracking-tight hover:text-primary transition-colors cursor-default"
                      >
                        {line}
                      </motion.p>
                    )) : (
                      <p className="text-on-surface-variant text-lg font-mono uppercase tracking-widest pt-12">Lyrics not available for this track.</p>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-10 text-center lg:text-left w-full">
            <h1 className="font-display text-4xl md:text-5xl text-on-surface mb-3 font-bold tracking-tight">
              {track.title}
            </h1>
            <p className="font-body text-xl text-on-surface-variant">
              {track.artist} • Masterclass Series
            </p>
          </div>
        </div>

        {/* Controls Side */}
        <div className="w-full max-w-xl flex flex-col justify-center">
          <div className="glass-panel rounded-3xl p-8 md:p-12 shadow-2xl border border-white/5 relative overflow-hidden">
            {/* Scrubber */}
            <div className="mb-10 group cursor-pointer">
              <div className="flex justify-between font-mono text-xs text-on-surface-variant mb-4 font-medium uppercase tracking-tighter">
                <span className={isPlaying ? 'text-white' : ''}>24:15</span>
                <span className="text-primary font-bold">-{track.duration}</span>
              </div>
              <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden flex items-center">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-primary rounded-full"
                  initial={{ width: '35%' }}
                  animate={{ width: isPlaying ? '38%' : '35%' }}
                  transition={{ duration: 10, repeat: isPlaying ? Infinity : 0 }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(245,158,11,0.8)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </div>
            </div>

            {/* Primary Controls */}
            <div className="flex items-center justify-between mb-12">
              <button 
                onClick={() => setIsShuffle(!isShuffle)}
                className={`transition-all p-3 rounded-xl hover:bg-white/5 active:scale-90 ${isShuffle ? 'text-primary drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'text-on-surface-variant'}`}
              >
                <Shuffle size={24} strokeWidth={isShuffle ? 3 : 2} />
              </button>
              
              <button className="text-on-surface-variant hover:text-white transition-colors p-2 active:scale-95"><SkipBack size={36} fill="currentColor" /></button>
              
              <button 
                onClick={onTogglePlay}
                className="w-24 h-24 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.2)] hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause size={48} fill="currentColor" /> : <Play size={48} fill="currentColor" className="ml-2" />}
              </button>

              <button className="text-on-surface-variant hover:text-white transition-colors p-2 active:scale-95"><SkipForward size={36} fill="currentColor" /></button>
              
              <button 
                onClick={() => setIsRepeat(!isRepeat)}
                className={`transition-all p-3 rounded-xl hover:bg-white/5 active:scale-90 ${isRepeat ? 'text-primary drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'text-on-surface-variant'}`}
              >
                <Repeat size={24} strokeWidth={isRepeat ? 3 : 2} />
              </button>
            </div>

            {/* Secondary Controls */}
            <div className="flex items-center justify-center gap-4 border-t border-white/5 pt-8">
               <div className="flex items-center gap-2 glass-panel p-1 rounded-full border border-white/10">
                 {speeds.map((speed) => (
                   <button 
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`font-mono text-[10px] px-3 py-1.5 rounded-full transition-all font-bold ${
                      playbackSpeed === speed 
                        ? 'bg-primary text-on-primary shadow-lg scale-105' 
                        : 'text-primary/60 hover:text-primary hover:bg-white/5'
                    }`}
                   >
                     {speed}x
                   </button>
                 ))}
               </div>
               <div className="w-px h-6 bg-white/10" />
               <button 
                onClick={() => setShowLyrics(!showLyrics)}
                className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] px-6 py-3 rounded-full border transition-all font-bold ${
                  showLyrics 
                    ? 'bg-primary text-on-primary border-primary shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105' 
                    : 'text-primary border-primary/30 bg-primary/5 hover:bg-primary/10'
                }`}
               >
                {showLyrics ? <Heart size={18} fill="currentColor" /> : <Subtitles size={18} />}
                {showLyrics ? 'Track Info' : 'Lyrics'}
              </button>
            </div>
          </div>

          {/* Enhanced Visualizer */}
          <div className="flex items-end justify-center gap-2 h-16 mt-12 px-4">
            {[...Array(16)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  height: isPlaying 
                    ? [
                        `${20 + Math.random() * 20}%`, 
                        `${60 + Math.random() * 40}%`, 
                        `${30 + Math.random() * 30}%`, 
                        `${70 + Math.random() * 30}%`,
                        `${20 + Math.random() * 20}%`
                      ] 
                    : '10%' 
                }}
                transition={{ 
                  duration: 0.4 + (i % 3) * 0.1, 
                  repeat: Infinity, 
                  ease: 'easeInOut',
                  delay: i * 0.02
                }}
                className={`w-2.5 rounded-t-full transition-colors duration-500 ${
                  isPlaying ? 'bg-primary shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-primary/20'
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    </motion.div>
  );
}
