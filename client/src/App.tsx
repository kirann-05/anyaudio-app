/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar, TopBar, BottomNav } from './components/Navigation';
import { PlayerPreview } from './components/PlayerPreview';
import { LibraryScreen } from './screens/Library';
import { DiscoveryScreen } from './screens/Discovery';
import { CollectionDetailScreen } from './screens/CollectionDetail';
import { PlayerScreen } from './screens/Player';
import { AppTab, Collection, Track } from './types';
import { MOCK_COLLECTIONS, MOCK_TRACKS } from './constants';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('library');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  
  const [collections, setCollections] = useState<Collection[]>(MOCK_COLLECTIONS);
  
  // Link to backend
  useEffect(() => {
    import('./services/api').then(({ getCollections }) => {
      getCollections('user123').then((data: any) => {
        if (data && data.length > 0) setCollections(data);
      }).catch(console.error);
    });
  }, []);

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

  return (
    <div className="min-h-screen bg-background bg-noise">
      <TopBar />
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      
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
