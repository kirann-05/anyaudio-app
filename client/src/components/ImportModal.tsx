import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Link2, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (url: string) => Promise<void>;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus('loading');
    setError('');

    try {
      await onImport(url.trim());
      setStatus('success');
      setTimeout(() => {
        onClose();
        setUrl('');
        setStatus('idle');
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to extract audio from this URL.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg glass-panel p-8 rounded-[32px] shadow-2xl border border-white/10 overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                  <Sparkles size={20} />
                </div>
                <h2 className="font-display text-2xl font-bold text-white uppercase tracking-tight">Import Audio</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-on-surface-variant hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <p className="font-body text-on-surface-variant mb-8 leading-relaxed">
              Paste a URL from YouTube, SoundCloud, or any supported platform to extract and add to your library.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface-variant">
                  <Link2 size={18} />
                </div>
                <input 
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-mono text-sm"
                />
              </div>

              {status === 'error' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3"
                >
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p className="text-xs font-medium">{error}</p>
                </motion.div>
              )}

              {status === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-tertiary/10 border border-tertiary/20 text-tertiary flex items-start gap-3"
                >
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  <p className="text-xs font-medium">Successfully added to your library!</p>
                </motion.div>
              )}

              <button 
                type="submit"
                disabled={!url.trim() || status === 'loading' || status === 'success'}
                className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Extracting Audio...
                  </>
                ) : status === 'success' ? (
                  <>
                    <CheckCircle2 size={20} />
                    Done
                  </>
                ) : (
                  'Start Extraction'
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2 opacity-40">
                 <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center grayscale">
                    <img src="https://www.google.com/s2/favicons?domain=youtube.com&sz=32" alt="YT" className="w-4 h-4" />
                 </div>
                 <span className="font-mono text-[8px] uppercase tracking-widest">YouTube</span>
              </div>
              <div className="flex flex-col items-center gap-2 opacity-40">
                 <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center grayscale">
                    <img src="https://www.google.com/s2/favicons?domain=soundcloud.com&sz=32" alt="SC" className="w-4 h-4" />
                 </div>
                 <span className="font-mono text-[8px] uppercase tracking-widest">SoundCloud</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
