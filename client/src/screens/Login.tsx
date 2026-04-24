import { useState } from 'react';
import { motion } from 'motion/react';
import { Headphones, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (name: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden bg-noise">
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-primary/20 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-secondary/10 rounded-full blur-[100px]"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md glass-panel p-10 rounded-[32px] shadow-2xl border border-white/10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.4)] mb-6">
            <Headphones size={32} className="text-on-primary" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-4xl font-bold text-white tracking-tighter mb-2 uppercase">AnyAudio</h1>
          <p className="font-mono text-[10px] text-primary tracking-[0.3em] uppercase font-bold text-glow">Immersive Soundscapes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mb-3 ml-4 font-bold">
              What should we call you?
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-body text-lg"
              autoFocus
            />
          </div>

          <button 
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
          >
            Enter the Void
            <ArrowRight size={20} />
          </button>
        </form>

        <p className="mt-10 text-center text-[10px] font-mono text-on-surface-variant/40 uppercase tracking-widest leading-relaxed">
          Experience high-fidelity audio exploration<br />designed for the depth of the architecture of silence.
        </p>
      </motion.div>
    </div>
  );
}
