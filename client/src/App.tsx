/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar, TopBar, BottomNav } from './components/Navigation';
import { PlayerPreview } from './components/PlayerPreview';
import { LibraryScreen } from './screens/Library';
import { DiscoveryScreen } from './screens/Discovery';
import { CollectionDetailScreen } from './screens/CollectionDetail';
import { PlayerScreen } from './screens/Player';
import { LoginScreen } from './screens/Login';
import { ProfileScreen } from './screens/Profile';
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
  const [activeTab, setActiveTab] = useState<AppTab>('library');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  
  const [collections, setCollections] = useState<Collection[]>(MOCK_COLLECTIONS);
  
  // Link to backend
  useEffect(() => {
    if (!isLoggedIn) return;
    import('./services/api').then(({ getCollections }) => {
      getCollections('user123').then((data: any) => {
        if (data && data.length > 0) setCollections(data);
      }).catch(console.error);
    });
  }, [isLoggedIn]);

  const handleLogin = (name: string) => {
    setUserName(name);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
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
              {activeTab === 'library' && <LibraryScreen collections={collections} onCollectionSelect={handleCollectionSelect} />}
              {activeTab === 'listen' && <DiscoveryScreen />}
              {activeTab === 'explore' && <DiscoveryScreen />} {/* Reusing discovery for demo */}
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
