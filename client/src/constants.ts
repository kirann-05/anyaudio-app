import { Collection, Track } from './types';

export const MOCK_TRACKS: Track[] = [
  {
    id: 't1',
    title: 'Void Acoustics',
    artist: 'Dr. Elias Vance',
    collectionId: 'c1',
    duration: '42:15',
    genre: 'Ambient',
    mood: 'Focus',
    coverArt: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&h=400&q=80',
    isDownloaded: true,
    status: 'new',
    lyrics: [
      "The silence speaks in frequencies",
      "Beneath the waves of memory",
      "A resonance is born in void",
      "The architecture of the mind unveiled"
    ]
  },
  {
    id: 't2',
    title: 'Negative Space Harmonics',
    artist: 'Dr. Elias Vance',
    collectionId: 'c1',
    duration: '38:40',
    genre: 'Electronic',
    mood: 'Mood',
    coverArt: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&w=400&h=400&q=80',
    isDownloaded: true,
    status: 'played'
  },
  {
    id: 't3',
    title: 'Resonance Filtering',
    artist: 'Dr. Elias Vance',
    collectionId: 'c1',
    duration: '51:05',
    genre: 'Modern Classical',
    mood: 'Calm',
    coverArt: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=400&h=400&q=80',
    isDownloaded: false,
    status: 'new'
  },
  {
    id: 't4',
    title: 'The Future of Sound Design',
    artist: 'Sonic Landscapes',
    collectionId: 'c2',
    duration: '58:00',
    genre: 'Sci-Fi',
    mood: 'High Energy',
    coverArt: 'https://images.unsplash.com/photo-1619983081563-430f63602796?auto=format&fit=crop&w=400&h=400&q=80',
    progress: 0.75,
    timeLeft: '15m left',
    status: 'playing',
    lyrics: ["Synthetic pulses", "Artificial breath", "The future is digital", "The sound of light"]
  }
];

export const MOCK_COLLECTIONS: Collection[] = [
  {
    id: 'c1',
    title: 'The Architecture of Silence',
    subtitle: 'Dr. Aris Thorne • Episode 4',
    description: 'An immersive exploration of minimal composition and acoustic spaces. Designed for deep focus and spatial awareness.',
    type: 'masterclass',
    coverArt: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&h=800&q=80',
    tracks: MOCK_TRACKS.filter(t => t.collectionId === 'c1')
  },
  {
    id: 'c2',
    title: 'Deep Focus Sessions',
    subtitle: 'Ambient & Drone • 4h 12m left',
    description: 'Pure focus through synthetic textures and organic field recordings.',
    type: 'playlist',
    coverArt: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&w=800&h=800&q=80',
    tracks: [],
    isNew: true
  },
  {
    id: 'c3',
    title: 'Local Files: Unreleased',
    subtitle: 'Imported • 12 Tracks',
    description: 'Your private collection of unreleased tracks and demos.',
    type: 'album',
    coverArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&h=800&q=80',
    tracks: []
  },
  {
    id: 'c4',
    title: 'The Synthesis Audio Doc',
    subtitle: 'Episode 4 • 1h 20m left',
    description: 'A deep dive into the history of analog synthesis.',
    type: 'podcast',
    coverArt: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&h=800&q=80',
    tracks: []
  }
];

export const EXPLORE_MOCKED_MIXES: any[] = [
  {
    title: 'Ethereal Voices',
    tag: 'DAILY MIX 1',
    description: 'Immerse yourself in floating melodies and hauntingly beautiful vocal arrangements.',
    image: 'https://images.unsplash.com/photo-1619983081563-430f63602796?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'Analog Warmth',
    tag: 'NEW RELEASE',
    description: 'Rich textures and imperfect grooves for the ultimate lo-fi listening session.',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'The Sound of Space',
    tag: 'PODCAST',
    description: 'A sonic journey through acoustic spaces, architecture, and silence.',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80'
  }
];
