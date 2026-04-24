export type Track = {
  id: string;
  title: string;
  artist: string;
  collectionId: string;
  duration: string;
  coverArt: string;
  isDownloaded?: boolean;
  progress?: number; // 0 to 1
  timeLeft?: string;
  status?: 'played' | 'playing' | 'paused' | 'new';
  lyrics?: string[];
  genre?: string;
  mood?: string;
};

export type Collection = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  type: 'playlist' | 'album' | 'masterclass' | 'podcast';
  coverArt: string;
  tracks: Track[];
  isNew?: boolean;
};

export type AppTab = 'listen' | 'explore' | 'library' | 'search';
