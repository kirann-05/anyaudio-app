import { Play, Shuffle, Download, ArrowLeft, MoreVertical, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Collection, Track } from '../types';

interface CollectionDetailProps {
  collection: Collection;
  onBack: () => void;
  onTrackSelect: (track: Track) => void;
  currentTrackId?: string;
}

export function CollectionDetailScreen({ collection, onBack, onTrackSelect, currentTrackId }: CollectionDetailProps) {
  return (
    <div className="flex-1 pt-24 pb-32 px-6 lg:px-12 max-w-7xl mx-auto w-full overflow-y-auto">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden mb-12 p-8 md:p-12 min-h-[400px] flex flex-col justify-end">
        {/* Background Layer with gradients and noise */}
        <div className="absolute inset-0 bg-gradient-to-tr from-surface-container-lowest via-surface-container-low to-primary/20 bg-noise opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
        
        {/* Navigation buttons inside hero */}
        <button 
          onClick={onBack}
          className="absolute top-8 left-8 p-3 rounded-full glass-panel text-primary hover:bg-white/10 transition-all z-20"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="relative z-10 flex flex-col md:flex-row items-end gap-10">
          <motion.div 
            layoutId={`image-${collection.id}`}
            className="w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl shrink-0 border border-white/10"
          >
            <img src={collection.coverArt} alt={collection.title} className="w-full h-full object-cover" />
          </motion.div>
          
          <div className="flex-1 w-full">
            <span className="font-mono text-xs text-primary tracking-[0.2em] uppercase mb-4 block font-bold">
              Curated {collection.type}
            </span>
            <h2 className="font-display text-5xl md:text-6xl text-white mb-6 font-bold tracking-tight">
              {collection.title}
            </h2>
            <p className="font-body text-on-surface-variant max-w-2xl mb-10 text-lg leading-relaxed">
              {collection.description}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button className="bg-primary hover:shadow-[0_0_24px_rgba(245,158,11,0.5)] text-on-primary font-bold py-4 px-10 rounded-full flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95">
                <Play size={20} fill="currentColor" />
                Play All
              </button>
              <button className="glass-panel hover:bg-white/10 text-primary py-4 px-8 rounded-full flex items-center gap-3 transition-all border border-white/10 active:scale-95">
                <Shuffle size={20} />
                Shuffle
              </button>
              <button className="glass-panel hover:bg-white/10 text-primary py-4 px-6 rounded-full flex items-center gap-3 transition-all border border-white/10 ml-auto md:ml-0 active:scale-95">
                <Download size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Track List Header */}
      <div className="sticky top-20 z-30 bg-background/90 backdrop-blur-xl py-6 border-b border-white/5 flex items-center px-6 mb-4">
        <div className="w-12 text-center text-on-surface-variant font-mono text-[10px] uppercase tracking-widest">#</div>
        <div className="flex-1 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Title</div>
        <div className="w-32 flex justify-end items-center gap-10 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
          <span>Duration</span>
          <CheckCircle2 size={16} />
        </div>
      </div>

      {/* Track List */}
      <div className="flex flex-col gap-2 pb-20">
        {collection.tracks.map((track, idx) => (
          <motion.div 
            key={track.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onTrackSelect(track)}
            className={`flex items-center p-4 rounded-2xl transition-all group cursor-pointer border border-transparent ${
              currentTrackId === track.id 
                ? 'bg-primary/5 border-primary/20' 
                : 'hover:bg-white/5 hover:border-white/10'
            }`}
          >
            <div className={`w-12 text-center font-mono text-sm ${currentTrackId === track.id ? 'text-primary' : 'text-on-surface-variant'}`}>
              {idx + 1}
            </div>
            
            <div className="w-14 h-14 rounded-lg bg-surface-container shrink-0 mr-6 overflow-hidden relative border border-white/5 shadow-lg">
              <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play size={20} fill="white" className="text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className={`font-body text-lg font-semibold truncate ${currentTrackId === track.id ? 'text-primary' : 'text-white'}`}>
                {track.title}
              </h3>
              <p className="font-mono text-xs text-on-surface-variant truncate uppercase tracking-widest">
                {track.artist}
              </p>
            </div>

            <div className="w-32 flex justify-end items-center gap-10">
              <span className="font-mono text-xs text-on-surface-variant whitespace-nowrap">
                {track.duration}
              </span>
              {track.status === 'played' ? (
                <CheckCircle2 size={20} className="text-tertiary" />
              ) : (
                <Download size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
