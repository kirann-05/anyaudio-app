import { Menu, Headphones, Search, Library, Crown, User, Settings } from 'lucide-react';
import { AppTab } from '../types';
import { motion } from 'motion/react';

interface NavigationProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  userName?: string;
}

export function Sidebar({ activeTab, onTabChange, userName = 'Audiophile Member' }: NavigationProps) {
  const items = [
    { id: 'listen', icon: Headphones, label: 'Discovery' },
    { id: 'explore', icon: Search, label: 'Explore' },
    { id: 'library', icon: Library, label: 'Library' },
  ];

  return (
    <aside className="hidden lg:flex flex-col h-full p-8 fixed top-0 left-0 bg-background text-primary font-display text-base w-80 rounded-r-3xl divide-y divide-white/5 shadow-2xl z-40 border-r border-white/5">
      <div className="flex items-center gap-4 pb-8">
        <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20">
           <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80" 
            alt="User" 
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <div className="text-primary font-bold truncate max-w-[150px]">{userName}</div>
          <div className="text-sm text-on-surface-variant">Premium Plan</div>
        </div>
      </div>

      <nav className="py-6 flex flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as AppTab)}
            className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 ${
              activeTab === item.id 
                ? 'text-primary bg-primary/5 border-l-4 border-primary' 
                : 'text-on-surface-variant hover:bg-white/5 hover:pl-6'
            }`}
          >
            <item.icon size={24} />
            <span>{item.label}</span>
          </button>
        ))}
        <button className="flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-white/5 hover:pl-6 transition-all duration-300">
          <Settings size={24} />
          <span>Settings</span>
        </button>
      </nav>
    </aside>
  );
}

interface TopBarProps {
  onProfileClick?: () => void;
  onImport?: () => void;
}

export function TopBar({ onProfileClick, onImport }: TopBarProps) {
  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center lg:left-80 lg:w-[calc(100%-20rem)]">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-primary tracking-tighter font-display text-glow uppercase">AnyAudio</h1>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={onImport}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-on-surface hover:text-primary hover:border-primary/50 transition-all group active:scale-95"
        >
          <Search size={18} className="group-hover:rotate-12 transition-transform" />
          <span className="font-mono text-[10px] uppercase font-bold tracking-[0.2em]">Import</span>
        </button>
        <button 
          onClick={onProfileClick}
          className="p-2 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 group"
        >
           <User size={24} className="group-hover:scale-110 transition-transform" />
           <span className="hidden sm:inline font-mono text-[10px] uppercase font-bold tracking-widest">Profile</span>
        </button>
      </div>
    </header>
  );
}

export function BottomNav({ activeTab, onTabChange }: NavigationProps) {
  const items = [
    { id: 'listen', icon: Headphones, label: 'Listen' },
    { id: 'explore', icon: Search, label: 'Explore' },
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'search', icon: Crown, label: 'Premium' },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 lg:hidden rounded-t-2xl border-t border-white/10 bg-background/80 backdrop-blur-2xl flex justify-around items-center px-4 pb-6 pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id as AppTab)}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-90 ${
            activeTab === item.id 
              ? 'text-primary bg-primary/10 scale-110' 
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
          <span className="font-display text-[10px] font-medium uppercase tracking-widest mt-1">
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
