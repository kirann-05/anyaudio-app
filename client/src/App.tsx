import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar, TopBar, BottomNav } from './components/Navigation';
import { PlayerPreview } from './components/PlayerPreview';
import { LibraryScreen } from './screens/Library';
import { DiscoveryScreen } from './screens/Discovery';
import { CollectionDetailScreen } from './screens/CollectionDetail';
import { PlayerScreen } from './screens/Player';
import { LoginScreen } from './screens/Login';
import { ProfileScreen } from './screens/Profile';
import { ImportModal } from './components/ImportModal';
import { AppTab, Collection, Track, UserStats } from './types';
import { MOCK_COLLECTIONS } from './constants';

const MOCK_USER_STATS: UserStats = {
  minutesListened: 14520,
  tracksPlayed: 842,
  topGenre: 'Ambient',
  joinDate: 'Oct 2025'
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('listen');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [collections, setCollections] = useState<Collection[]>(MOCK_COLLECTIONS);
  
  const fetchCollections = useCallback(() => {
    if (!isLoggedIn || !userId) return;
    import('./services/api').then(({ getCollections }) => {
      getCollections(userId).then((data: any) => {
        if (data && data.length > 0) setCollections(data);
      }).catch(console.error);
    });
  }, [isLoggedIn, userId]);

  // Link to backend
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleLogin = async (name: string) => {
    try {
      const { login } = await import('./services/api');
      const user = await login(name);
      setUserId(user.id);
      setUserName(user.username);
      setIsLoggedIn(true);
    } catch (err) {
      console.error('Login failed:', err);
      // Fallback for demo if backend fails
      setUserName(name);
      setUserId('demo-user');
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserId(null);
    setUserName('');
    setIsPlayerOpen(false);
  };

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    setSelectedCollection(null);
  };

  const handleCollectionSelect = (collection: Collection) => {
    setSelectedCollection(collection);
  };

  const handleTrackSelect = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    if (selectedCollection) {
      const index = selectedCollection.tracks?.findIndex(t => t.id === track.id) || 0;
      import('./services/audioEngine').then(({ audioEngine }) => {
        audioEngine.loadCollection(selectedCollection.id, selectedCollection.title, selectedCollection.tracks || [], index);
      });
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    import('./services/audioEngine').then(({ audioEngine }) => {
      audioEngine.togglePlay();
    });
  };

  const handlePlayDirect = (trackData: any) => {
    if (!trackData.audioUrl) return;

    import('./services/api').then(({ getStreamUrl }) => {
      const streamUrl = getStreamUrl(trackData.audioUrl);
      const tempTrack: Track = {
        id: `direct-${Date.now()}`,
        title: trackData.title,
        artist: trackData.artist || 'Streaming',
        coverArt: trackData.image,
        audioUrl: streamUrl,
        duration: 0,
        downloadStatus: 'none'
      };

      setCurrentTrack(tempTrack);
      setIsPlaying(true);
      setIsPlayerOpen(true);

      import('./services/audioEngine').then(({ audioEngine }) => {
        // Load as a single-track collection for immediate playback
        audioEngine.loadCollection(`stream-${Date.now()}`, 'Streaming', [tempTrack], 0);
      });
      
      // Background: Also trigger an import if you want it saved, 
      // but for now let's just stream as requested.
    });
  };

  const handleImport = async (url: string) => {
    if (!userId) throw new Error('You must be logged in to import.');
    const { scrape } = await import('./services/api');
    await scrape(url, userId);
    fetchCollections(); // Refresh list after import
  };

  // Sync state with audio engine
  useEffect(() => {
    import('./services/audioEngine').then(({ audioEngine }) => {
      const handleState = (detail: any) => setIsPlaying(detail.isPlaying);
      const handleTrack = (detail: any) => setCurrentTrack(detail.track);
      
      audioEngine.on('statechange', handleState);
      audioEngine.on('trackchange', handleTrack);
      
      return () => {
        audioEngine.off('statechange', handleState);
        audioEngine.off('trackchange', handleTrack);
      };
    });
  }, []);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background bg-noise">
      <TopBar onProfileClick={() => handleTabChange('profile')} />
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} userName={userName} />
      
      <main className="lg:pl-80 transition-all duration-300 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {selectedCollection ? (
            <motion.div
              key="collection-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <CollectionDetailScreen 
                collection={selectedCollection} 
                onBack={() => setSelectedCollection(null)}
                onTrackSelect={handleTrackSelect}
                currentTrackId={currentTrack?.id}
              />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex-1"
            >
              {activeTab === 'library' && (
                <LibraryScreen 
                  collections={collections} 
                  onCollectionSelect={handleCollectionSelect} 
                  onImport={() => setIsImportModalOpen(true)}
                />
              )}
              {activeTab === 'listen' && (
                <DiscoveryScreen 
                  onImport={() => setIsImportModalOpen(true)} 
                  onPlayTrack={handlePlayDirect}
                />
              )}
              {activeTab === 'explore' && (
                <DiscoveryScreen 
                  onImport={() => setIsImportModalOpen(true)} 
                  onPlayTrack={handlePlayDirect}
                />
              )}
              {activeTab === 'search' && (
                <div className="flex-1 flex items-center justify-center p-12 text-on-surface-variant font-mono uppercase tracking-[0.3em]">
                  Premium Features Coming Soon
                </div>
              )}
              {activeTab === 'profile' && (
                <ProfileScreen 
                  userName={userName} 
                  stats={MOCK_USER_STATS} 
                  onLogout={handleLogout}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <PlayerPreview 
        currentTrack={currentTrack} 
        isPlaying={isPlaying} 
        onTogglePlay={togglePlay}
        onClick={() => setIsPlayerOpen(true)}
      />

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImport}
      />

      <AnimatePresence>
        {isPlayerOpen && currentTrack && (
          <PlayerScreen 
            track={currentTrack} 
            isPlaying={isPlaying} 
            onTogglePlay={togglePlay} 
            onClose={() => setIsPlayerOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
