import { useState, useEffect } from 'react';
import { Search, Mic, Play, Filter, Hash, Sparkles, Clock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { EXPLORE_MOCKED_MIXES } from '../constants';

interface DiscoveryProps {
  onImport?: () => void;
}

export function DiscoveryScreen({ onImport }: DiscoveryProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingArtists, setTrendingArtists] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    console.log('Searching for:', searchQuery);
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      setIsLoading(true);
      try {
        // Fetch Trending Artists (for the circles)
        const artistRes = await fetch('/api/search?q=popular%20artists%20mix');
        const artistsData = await artistRes.json();
        if (artistsData && artistsData.length > 0) {
          setTrendingArtists(artistsData.slice(0, 6).map((a: any) => ({
            name: a.artist || a.title.split(' - ')[0],
            image: a.thumbnail || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000000)}?auto=format&fit=crop&w=120&h=120&q=80`,
            url: a.url
          })));
        }

        // Fetch Recommendations (for the cards)
        const musicRes = await fetch('/api/search?q=trending%20music%20podcasts');
        const musicData = await musicRes.json();
        if (musicData && musicData.length > 0) {
          setRecommendations(musicData.slice(0, 6).map((m: any, idx: number) => ({
            title: m.title,
            tag: idx < 3 ? 'TRENDING' : 'PODCAST',
            description: m.uploader || 'Experience the latest trending sounds.',
            image: m.thumbnail || `https://images.unsplash.com/photo-${1600000000000 + idx * 1000000}?auto=format&fit=crop&w=800&q=80`,
            url: m.url
          })));
        }
      } catch (err) {
        console.error('Failed to fetch home data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  return (
    <div className="flex-1 max-w-7xl mx-auto pt-28 pb-32 md:pb-16 px-6 lg:px-12 w-full">
      {/* Universal Search Bar */}
      <div className="flex flex-col items-center mb-16 gap-6">
        <form onSubmit={handleSearch} className="relative w-full max-w-3xl group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">
            <Search size={24} />
          </div>
          <input 
            type="text" 
            placeholder="Search artists, podcasts, or moods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-panel rounded-full py-5 pl-16 pr-40 text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] font-body text-lg"
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-2">
            <button 
              type="submit"
              className="px-4 py-2 rounded-full bg-primary text-on-primary hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all font-mono text-[10px] uppercase tracking-widest font-bold"
            >
              Search
            </button>
            <button 
              type="button"
              onClick={onImport}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all font-mono text-[10px] uppercase tracking-widest font-bold"
            >
              <Play size={14} fill="currentColor" />
              Import
            </button>
          </div>
        </form>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar max-w-full px-4">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-on-surface-variant hover:text-primary transition-colors">
            <Filter size={14} />
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Filters</span>
          </button>
          
          {['Ambient', 'Focus', 'Electronic', 'Long Form', 'Calm', 'Podcast'].map((filter) => (
            <button 
              key={filter}
              onClick={() => toggleFilter(filter)}
              className={`flex-shrink-0 px-5 py-2 rounded-full border transition-all font-mono text-[10px] uppercase tracking-widest font-bold ${
                activeFilters.includes(filter)
                  ? 'bg-primary text-on-primary border-primary shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'glass-panel text-on-surface-variant hover:text-primary border-white/10'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Trending Artists */}
      <section className="mb-20">
        <h2 className="font-display text-2xl text-on-surface mb-8 font-bold tracking-tight uppercase tracking-[0.2em]">Trending Artists</h2>
        <div className="flex overflow-x-auto no-scrollbar gap-8 pb-4">
          {trendingArtists.length > 0 ? trendingArtists.map((artist, i) => (
            <motion.div 
              key={i}
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center gap-4 cursor-pointer group shrink-0"
              onClick={() => artist.url && onImport?.()}
            >
              <div className="relative w-28 h-28 rounded-full p-[1px] bg-gradient-to-b from-white/20 to-transparent group-hover:from-primary/60 transition-all duration-500">
                <div className="w-full h-full rounded-full overflow-hidden relative border border-white/5 bg-surface-container shadow-xl">
                  <img 
                    src={artist.image} 
                    alt={artist.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                </div>
                <div className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                   <Play size={18} fill="black" />
                </div>
              </div>
              <span className="font-mono text-[10px] text-on-surface-variant group-hover:text-white uppercase tracking-widest text-center max-w-[120px] truncate font-bold">
                {artist.name}
              </span>
            </motion.div>
          )) : (
            [1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="w-28 h-28 rounded-full bg-white/5 animate-pulse shrink-0" />
            ))
          )}
        </div>
      </section>

      {/* Curated for You */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-2xl text-on-surface font-bold tracking-tight uppercase tracking-[0.2em]">Curated for You</h2>
          {isLoading && <Loader2 size={20} className="animate-spin text-primary opacity-50" />}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {recommendations.length > 0 ? recommendations.map((mix, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -8 }}
              className={`group relative block rounded-[32px] overflow-hidden glass-panel transition-all duration-500 ${
                idx === 2 ? 'md:col-span-2 lg:col-span-1' : ''
              } aspect-[4/5] cursor-pointer shadow-2xl border border-white/5`}
              onClick={() => mix.url && onImport?.()}
            >
              <img 
                src={mix.image} 
                alt={mix.title} 
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000 mix-blend-overlay"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
              
              <div className="absolute inset-0 z-10 flex flex-col justify-end p-8">
                <span className="inline-block px-3 py-1 mb-4 rounded-full bg-white/10 backdrop-blur-md border border-white/10 font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
                  {mix.tag}
                </span>
                <h3 className="font-display text-3xl text-white mb-3 group-hover:text-primary transition-colors font-bold line-clamp-2 leading-tight">
                  {mix.title}
                </h3>
                <p className="font-body text-white/60 line-clamp-2 text-sm">
                  {mix.description}
                </p>
              </div>
            </motion.div>
          )) : (
            [1, 2, 3].map(i => (
              <div key={i} className="aspect-[4/5] rounded-[32px] bg-white/5 animate-pulse" />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
