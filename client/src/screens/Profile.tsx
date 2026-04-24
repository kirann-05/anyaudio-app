import { motion } from 'motion/react';
import { User, Activity, Music2, Clock, Calendar, ShieldCheck, LogOut, Settings } from 'lucide-react';
import { UserStats } from '../types';

interface ProfileScreenProps {
  userName: string;
  stats: UserStats;
  onLogout: () => void;
}

export function ProfileScreen({ userName, stats, onLogout }: ProfileScreenProps) {
  return (
    <div className="flex-1 px-6 lg:px-12 pt-28 pb-32 max-w-5xl mx-auto w-full">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-8 mb-16 p-8 glass-panel rounded-[32px] border border-white/10">
        <div className="relative">
          <div className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center border-4 border-primary shadow-[0_0_40px_rgba(245,158,11,0.2)]">
            <User size={64} className="text-primary" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-background border border-white/10 p-2 rounded-full text-primary shadow-lg">
            <ShieldCheck size={20} fill="currentColor" className="text-primary" />
          </div>
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h1 className="font-display text-4xl font-bold text-white mb-2">{userName}</h1>
          <p className="font-mono text-xs text-primary uppercase tracking-[0.2em] mb-4">Premium Audiophile Member</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <button className="flex items-center gap-2 px-6 py-2 rounded-full glass-panel hover:bg-white/10 transition-all font-mono text-[10px] uppercase tracking-widest text-on-surface">
              <Settings size={14} />
              Edit Profile
            </button>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-6 py-2 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all font-mono text-[10px] uppercase tracking-widest text-red-400"
            >
              <LogOut size={14} />
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {[
          { label: 'Listening Time', value: `${(stats.minutesListened / 60).toFixed(1)}h`, icon: Clock, color: 'text-primary' },
          { label: 'Tracks Played', value: stats.tracksPlayed, icon: Activity, color: 'text-blue-400' },
          { label: 'Top Genre', value: stats.topGenre, icon: Music2, color: 'text-purple-400' },
          { label: 'Member Since', value: stats.joinDate, icon: Calendar, color: 'text-green-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center group hover:border-primary/30 transition-all"
          >
            <div className={`p-3 rounded-xl bg-white/5 mb-4 group-hover:scale-110 transition-transform ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 italic opacity-60">
              {stat.label}
            </span>
            <span className="font-display text-2xl font-bold text-white tracking-tight">
              {stat.value}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Achievement Section (Visual only) */}
      <div className="glass-panel p-10 rounded-[32px] border border-white/5">
        <h2 className="font-display text-2xl font-bold text-white mb-8 flex items-center gap-3">
          <Activity size={24} className="text-primary" />
          Listening Activity
        </h2>
        
        <div className="space-y-6">
          {[
            { label: 'Atmospheric Depth', progress: 85 },
            { label: 'Rhythmic Precision', progress: 45 },
            { label: 'Harmonic Texture', progress: 62 },
          ].map((bar) => (
            <div key={bar.label}>
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest mb-2 text-on-surface-variant font-bold">
                <span>{bar.label}</span>
                <span>{bar.progress}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${bar.progress}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-primary shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
