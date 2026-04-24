import { useState } from 'react';
import { Download, Play, WifiOff } from 'lucide-react';
import { Collection } from '../types';
import { MOCK_COLLECTIONS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface LibraryProps {
  collections?: Collection[];
  onCollectionSelect: (collection: Collection) => void;
}

export function LibraryScreen({ collections = MOCK_COLLECTIONS, onCollectionSelect }: LibraryProps) {
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const filteredCollections = isOfflineMode 
    ? collections.filter(c => 
        // For demo: if any track is downloaded, show the collection
        c.tracks?.some(t => t.isDownloaded) || c.id === 'c3' // c3 is specifically unreleased local
      )
    : collections;

  return (
    <div className="flex-1 px-6 lg:px-12 pt-28 pb-32 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="font-display text-5xl text-on-surface mb-2 font-extrabold tracking-tight">Library</h1>
          <p className="font-body text-on-surface-variant">Your saved collections, mixes, and deep dives.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className={`font-mono text-[10px] uppercase font-bold tracking-widest transition-colors ${isOfflineMode ? 'text-primary' : 'text-on-surface-variant'}`}>
              Offline Mode
            </span>
            <button 
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              className={`relative w-12 h-6 flex items-center rounded-full transition-all duration-300 p-1 border ${
                isOfflineMode 
                  ? 'bg-primary/20 border-primary block shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <motion.div 
                animate={{ x: isOfflineMode ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`w-4 h-4 rounded-full shadow-lg ${
                  isOfflineMode ? 'bg-primary' : 'bg-on-surface-variant'
                }`}
              />
            </button>
            {isOfflineMode && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-primary"
              >
                <WifiOff size={16} />
              </motion.div>
            )}
          </div>
          
          <button className="flex items-center gap-2 px-6 py-3 rounded-full glass-panel hover:bg-white/10 hover:scale-105 transition-all text-on-surface font-mono text-sm uppercase tracking-widest border border-white/10">
            <Download size={18} />
            Import
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredCollections.map((collection, index) => (
            <motion.article
              key={collection.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onCollectionSelect(collection)}
              className="group relative flex flex-col p-4 rounded-xl glass-card hover:bg-white/5 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4 border border-white/5 shadow-2xl">
                <img 
                  src={collection.coverArt} 
                  alt={collection.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                
                {collection.tracks.some(t => t.isDownloaded) && (
                   <div className="absolute top-3 right-3 bg-tertiary/20 backdrop-blur-md p-1.5 rounded-full text-tertiary border border-tertiary/30">
                    <Download size={14} />
                  </div>
                )}

                {collection.isNew && (
                  <div className="absolute top-3 left-3 bg-primary py-1 px-3 rounded-full text-black text-[10px] font-bold uppercase tracking-wider shadow-lg">
                    New
                  </div>
                )}
                
                {/* Fake progress bar seen in screenshots */}
                {collection.id === 'c1' && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
                    <div className="h-full bg-primary w-[45%] rounded-r-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                  </div>
                )}
                {collection.id === 'c4' && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
                    <div className="h-full bg-primary w-[15%] rounded-r-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                  </div>
                )}
              </div>

              <div className="relative z-20 flex flex-col flex-1">
                <h3 className="font-display text-lg text-on-surface truncate mb-1 font-bold tracking-tight">
                  {collection.title}
                </h3>
                <p className="font-mono text-[11px] text-on-surface-variant truncate uppercase tracking-wider">
                  {collection.subtitle}
                </p>
              </div>

              <button className="absolute top-6 right-6 z-30 w-12 h-12 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-[0_10px_20px_rgba(245,158,11,0.4)]">
                <Play size={24} fill="black" className="text-black ml-1" />
              </button>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
      
      {filteredCollections.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-on-surface-variant"
        >
          <WifiOff size={48} className="mb-4 opacity-20" />
          <p className="font-mono uppercase tracking-[0.2em]">No offline content found</p>
        </motion.div>
      )}
    </div>
  );
}
