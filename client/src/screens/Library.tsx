import { useState, useMemo } from 'react';
import { Download, Play, WifiOff, AlertCircle, RefreshCw, SortAsc, Filter as FilterIcon } from 'lucide-react';
import { Collection } from '../types';
import { MOCK_COLLECTIONS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface LibraryProps {
  collections?: Collection[];
  onCollectionSelect: (collection: Collection) => void;
}

type SortOption = 'title' | 'artist' | 'date';

export function LibraryScreen({ collections = MOCK_COLLECTIONS, onCollectionSelect }: LibraryProps) {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [filterQuery, setFilterQuery] = useState('');
  const [downloadErrors, setDownloadErrors] = useState<Record<string, boolean>>({
    'c2': true // Mock an error for demo
  });

  const processedCollections = useMemo(() => {
    let result = isOfflineMode 
      ? collections.filter(c => 
          c.tracks?.some(t => t.isDownloaded) || c.id === 'c3'
        )
      : collections;

    if (filterQuery) {
      const query = filterQuery.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(query) || 
        c.subtitle.toLowerCase().includes(query)
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'artist') return a.subtitle.localeCompare(b.subtitle);
      // Mock date sort since collections don't have dates, using ID as proxy for demo
      return b.id.localeCompare(a.id);
    });
  }, [collections, isOfflineMode, sortBy, filterQuery]);

  const handleRetryDownload = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDownloadErrors(prev => ({ ...prev, [id]: false }));
    // Mock successful retry after a delay
    setTimeout(() => {
      // In a real app, this would trigger the actual download
    }, 1500);
  };

  return (
    <div className="flex-1 px-6 lg:px-12 pt-28 pb-32 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="font-display text-5xl text-on-surface mb-2 font-extrabold tracking-tight">Library</h1>
          <p className="font-body text-on-surface-variant">Your saved collections, mixes, and deep dives.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
          {/* Offline Toggle */}
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
          </div>
          
          <button className="flex items-center gap-2 px-6 py-3 rounded-full glass-panel hover:bg-white/10 hover:scale-105 transition-all text-on-surface font-mono text-sm uppercase tracking-widest border border-white/10">
            <Download size={18} />
            Import
          </button>
        </div>
      </div>

      {/* Sort & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 glass-panel rounded-2xl border border-white/5">
        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-xs">
            <FilterIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text"
              placeholder="Filter library..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs font-mono focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SortAsc size={14} className="text-on-surface-variant" />
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-transparent text-on-surface font-mono text-[10px] uppercase tracking-widest focus:outline-none cursor-pointer hover:text-primary transition-colors pr-2"
          >
            <option value="title" className="bg-background">Sort by Title</option>
            <option value="artist" className="bg-background">Sort by Artist</option>
            <option value="date" className="bg-background">Sort by Date</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {processedCollections.map((collection, index) => (
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
                
                {collection.tracks?.some(t => t.isDownloaded) && !downloadErrors[collection.id] && (
                   <div className="absolute top-3 right-3 bg-tertiary/20 backdrop-blur-md p-1.5 rounded-full text-tertiary border border-tertiary/30">
                    <Download size={14} />
                  </div>
                )}

                {downloadErrors[collection.id] && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                    <AlertCircle size={32} className="text-red-400 mb-2" />
                    <span className="text-[10px] font-mono text-red-100 uppercase tracking-widest mb-4 font-bold">Download Failed</span>
                    <button 
                      onClick={(e) => handleRetryDownload(e, collection.id)}
                      className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-mono text-[9px] uppercase tracking-[0.2em] flex items-center gap-2 transition-all"
                    >
                      <RefreshCw size={12} />
                      Retry
                    </button>
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

              {!downloadErrors[collection.id] && (
                <button className="absolute top-6 right-6 z-30 w-12 h-12 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-[0_10px_20px_rgba(245,158,11,0.4)]">
                  <Play size={24} fill="black" className="text-black ml-1" />
                </button>
              )}
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
      
      {processedCollections.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-on-surface-variant"
        >
          <WifiOff size={48} className="mb-4 opacity-20" />
          <p className="font-mono uppercase tracking-[0.2em]">No matches found in library</p>
        </motion.div>
      )}
    </div>
  );
}
