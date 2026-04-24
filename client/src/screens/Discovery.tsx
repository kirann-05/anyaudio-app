import { useState } from 'react';
import { Search, Mic, Play, Filter, Hash, Sparkles, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { EXPLORE_MOCKED_MIXES } from '../constants';

export function DiscoveryScreen() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const filters_demo = [
    { label: 'Ambient', icon: Hash },
    { label: 'Focus', icon: Sparkles },
    { label: 'Long Form', icon: Clock },
    { label: 'Electronic', icon: Hash },
    { label: 'Chill', icon: Sparkles },
    { label: 'Podcast', icon: Mic }
  ];

  return (
    <div className="flex-1 max-w-7xl mx-auto pt-28 pb-32 md:pb-16 px-6 lg:px-12 w-full">
      {/* Universal Search Bar */}
      <div className="flex flex-col items-center mb-16 gap-6">
        <div className="relative w-full max-w-3xl group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">
            <Search size={24} />
          </div>
          <input 
            type="text" 
            placeholder="Search artists, podcasts, or moods..."
            className="w-full glass-panel rounded-full py-5 pl-16 pr-14 text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] font-body text-lg"
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <button className="p-2 text-on-surface-variant hover:text-white transition-colors">
              <Mic size={24} />
            </button>
          </div>
        </div>

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

      {/* Jump Back In */}
      <section className="mb-20">
        <h2 className="font-display text-2xl text-on-surface mb-8 font-bold tracking-tight">Jump Back In</h2>
        <div className="flex overflow-x-auto no-scrollbar gap-8 pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div 
              key={i}
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center gap-4 cursor-pointer group shrink-0"
            >
              <div className="relative w-28 h-28 rounded-full p-[1px] bg-gradient-to-b from-white/20 to-transparent group-hover:from-primary/60 transition-all duration-500">
                <div className="w-full h-full rounded-full overflow-hidden relative border border-white/5 bg-surface-container">
                  <img 
                    src={`https://images.unsplash.com/photo-${1600000000000 + i * 1000000}?auto=format&fit=crop&w=120&h=120&q=80`} 
                    alt="Category" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors"></div>
                </div>
                <div className="absolute bottom-0 right-0 w-10 h-10 bg-primary-container rounded-full flex items-center justify-center text-on-primary shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                   <Play size={18} fill="black" />
                </div>
              </div>
              <span className="font-mono text-xs text-on-surface-variant group-hover:text-white uppercase tracking-widest text-center max-w-[120px] truncate">
                {['Neon Nights', 'Focus Flow', 'Midnight Drive', 'Live Sets', 'Deep Focus'][i-1]}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Curated for You */}
      <section>
        <h2 className="font-display text-2xl text-on-surface mb-8 font-bold tracking-tight">Curated for You</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {EXPLORE_MOCKED_MIXES.map((mix, idx) => (
            <motion.a 
              key={idx}
              href="#"
              whileHover={{ y: -8 }}
              className={`group relative block rounded-3xl overflow-hidden glass-panel transition-all duration-500 ${
                idx === 2 ? 'md:col-span-2 lg:col-span-1' : ''
              } aspect-[4/5]`}
            >
              <img 
                src={mix.image} 
                alt={mix.title} 
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000 mix-blend-overlay"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
              
              <div className="absolute inset-0 z-10 flex flex-col justify-end p-8">
                <span className="inline-block px-3 py-1 mb-4 rounded-full bg-white/10 backdrop-blur-md border border-white/10 font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
                  {mix.tag}
                </span>
                <h3 className="font-display text-3xl text-white mb-3 group-hover:text-primary transition-colors font-bold">
                  {mix.title}
                </h3>
                <p className="font-body text-white/60 line-clamp-2">
                  {mix.description}
                </p>
              </div>
            </motion.a>
          ))}
        </div>
      </section>
    </div>
  );
}
