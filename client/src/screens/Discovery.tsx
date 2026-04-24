import { useState, useEffect } from 'react';
import { Search, Play, Filter, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface DiscoveryProps {
  onImport: () => void;
  onPlayTrack?: (track: any) => void;
  initialArtists?: any[];
  initialRecommendations?: any[];
  isLoading?: boolean;
}

export function DiscoveryScreen({ onImport, onPlayTrack, initialArtists = [], initialRecommendations = [], isLoading = false }: DiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingArtists, setTrendingArtists] = useState<any[]>(initialArtists);
  const [recommendations, setRecommendations] = useState<any[]>(initialRecommendations);
  const [activeFilters, setActiveFilters] = useState<string[]>(['Trending']);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'results'>('idle');

  useEffect(() => {
    if (initialArtists.length > 0) setTrendingArtists(initialArtists);
    if (initialRecommendations.length > 0) setRecommendations(initialRecommendations);
  }, [initialArtists, initialRecommendations]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchStatus('searching');
    try {
      const { search } = await import('../services/api');
      const results = await search(searchQuery);
      if (results) {
        setRecommendations(results.map((r: any, idx: number) => ({
          title: r.title,
          tag: 'RESULT',
          description: r.artist || r.uploader || 'Found on Web',
          image: r.thumbnail || `https://images.unsplash.com/photo-${1600000000000 + idx * 1000000}?auto=format&fit=crop&w=800&q=80`,
          url: r.url,
          audioUrl: r.audioUrl || r.url
        })));
        setSearchStatus('results');
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto pt-24 pb-32 md:pb-16 px-4 md:px-12 w-full">
      {/* Universal Search Bar */}
      <section className="mb-10 flex flex-col items-center">
        <form onSubmit={handleSearch} className="relative w-full max-w-2xl group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
          <input 
            id="discovery-search"
            type="text"
            placeholder="Search artists, tracks, or podcasts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-24 text-sm font-body focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all shadow-2xl"
          />
          <button 
            type="submit"
            disabled={isLoading || searchStatus === 'searching'}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-on-primary px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading || searchStatus === 'searching' ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
          </button>
        </form>
        
        {/* Quick Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          {['Trending', 'Deep Focus', 'Energy', 'Relax', 'Podcasts'].map((filter) => (
            <button 
              key={filter}
              onClick={() => toggleFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest transition-all border ${
                activeFilters.includes(filter) 
                  ? 'bg-primary text-on-primary border-primary shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                  : 'bg-white/5 text-on-surface-variant border-white/10 hover:bg-white/10'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {/* Trending Artists */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg md:text-2xl text-on-surface font-bold tracking-[0.2em] uppercase">Trending Artists</h2>
          <button className="text-primary font-mono text-[10px] uppercase tracking-widest hover:underline">View All</button>
        </div>
        <div className="flex overflow-x-auto gap-6 pb-4 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {trendingArtists.map((artist, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5 }}
              onClick={() => onPlayTrack?.({ title: artist.name, artist: 'Artist Mix', image: artist.image, audioUrl: artist.url })}
              className="flex flex-col items-center gap-3 shrink-0 cursor-pointer group"
            >
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-white/5 group-hover:border-primary/50 transition-all shadow-xl">
                <img src={artist.image} alt={artist.name} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" />
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play size={24} fill="white" className="text-white" />
                </div>
              </div>
              <span className="font-body text-xs md:text-sm text-on-surface font-medium group-hover:text-primary transition-colors text-center w-24 truncate">{artist.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Curated for You / Search Results */}
      <section className="pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg md:text-2xl text-on-surface font-bold tracking-[0.2em] uppercase">
            {searchStatus === 'results' ? 'Results' : 'Curated for You'}
          </h2>
          {(isLoading || searchStatus === 'searching') && <Loader2 size={18} className="animate-spin text-primary opacity-50" />}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {recommendations.map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onPlayTrack?.({ title: item.title, artist: item.description, image: item.image, audioUrl: item.url })}
              className="glass-card group p-3 md:p-5 rounded-2xl cursor-pointer hover:bg-white/5 transition-all border border-white/5"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-4 shadow-lg">
                <img referrerPolicy="no-referrer" src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play size={32} fill="white" className="text-white" />
                </div>
                <div className="absolute top-2 left-2 bg-primary/90 text-on-primary text-[8px] md:text-[10px] px-2 py-1 rounded-md font-bold tracking-widest uppercase">
                  {item.tag}
                </div>
              </div>
              <h3 className="font-display text-sm md:text-lg text-on-surface font-bold line-clamp-1 mb-1 group-hover:text-primary transition-colors">{item.title}</h3>
              <p className="font-body text-[10px] md:text-xs text-on-surface-variant line-clamp-1 uppercase tracking-wider">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
