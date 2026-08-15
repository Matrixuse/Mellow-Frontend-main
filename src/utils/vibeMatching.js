const MAX_VIBE_SONGS = 40;

const VIBE_DEFINITIONS = [
  {
    key: 'Relaxing',
    labels: ['relaxing', 'chill', 'calm', 'peaceful', 'mellow', 'slow', 'soft', 'ambient'],
    matches: ['relaxing', 'chill', 'calm', 'peaceful', 'soft', 'ambient', 'slow']
  },
  {
    key: 'Driving',
    labels: ['driving', 'road trip', 'night drive', 'travel', 'commute', 'ride'],
    matches: ['driving', 'road trip', 'night drive', 'travel', 'commute', 'ride']
  },
  {
    key: 'Focus & Work',
    labels: ['focus', 'work', 'study', 'deep work', 'productivity', 'concentration'],
    matches: ['focus', 'work', 'study', 'productivity', 'concentration', 'deep work']
  },
  {
    key: 'Cooking / Dining',
    labels: ['cooking', 'dining', 'food', 'kitchen', 'dinner', 'cafe'],
    matches: ['cooking', 'dining', 'food', 'kitchen', 'dinner', 'cafe']
  },
  {
    key: 'Deep Sleep',
    labels: ['deep sleep', 'sleep', 'sleepy', 'bedtime', 'night', 'relaxing'],
    matches: ['deep sleep', 'sleep', 'sleepy', 'bedtime', 'night']
  },
  {
    key: 'Workout & Gym',
    labels: ['workout', 'gym', 'fitness', 'training', 'exercise', 'cardio'],
    matches: ['workout', 'gym', 'fitness', 'training', 'exercise', 'cardio']
  },
  {
    key: 'Romance or Date Night',
    labels: ['romance', 'date night', 'love', 'romantic', 'couple', 'intimate'],
    matches: ['romance', 'date night', 'love', 'romantic', 'couple', 'intimate']
  }
];

const normalizeString = (value) => String(value || '').trim().toLowerCase();

const normalizeVibeName = (value) => {
  const str = normalizeString(value);
  if (!str) return '';
  const map = {
    'focus work': 'Focus & Work',
    'focus & work': 'Focus & Work',
    'focus': 'Focus & Work',
    'cooking / dining': 'Cooking / Dining',
    'cooking/dining': 'Cooking / Dining',
    'cooking': 'Cooking / Dining',
    'deep sleep': 'Deep Sleep',
    'romance or date night': 'Romance or Date Night',
    'date night': 'Romance or Date Night',
    'workout & gym': 'Workout & Gym',
    'workout/gym': 'Workout & Gym',
    'relaxing': 'Relaxing',
    'driving': 'Driving'
  };
  return map[str] || str
    .split(/[_-]+/).join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
};

const toStringList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map(item => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[,/|;&]+/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const getVibeDefinitions = () => VIBE_DEFINITIONS.map(v => ({ ...v, key: normalizeVibeName(v.key) }));

export const songMatchesVibe = (song, vibeName) => {
  if (!song || !vibeName) return false;

  const target = normalizeVibeName(vibeName);
  const definition = VIBE_DEFINITIONS.find(v => normalizeVibeName(v.key) === target);
  if (!definition) return false;

  const metadataValues = [
    song.title,
    song.artist,
    song.moods,
    song.vibeTags,
    song.vibes,
    song.tags,
    song.genre,
    song.description,
    song.vibe,
    song.vibeTag,
    song.mood
  ];

  const songText = metadataValues
    .flatMap(value => toStringList(value))
    .join(' ')
    .toLowerCase();

  const explicitValues = metadataValues.flatMap(value => toStringList(value));
  const normalizedTarget = normalizeString(target);

  const explicitMatch = explicitValues.some(item => {
    const normalizedItem = normalizeString(item);
    return normalizeVibeName(item) === target || normalizedItem.includes(normalizedTarget) || definition.labels.some(label => normalizeString(label) === normalizedItem || normalizedItem.includes(normalizeString(label)));
  });

  if (explicitMatch) return true;

  const normalizedPatterns = definition.matches.map(pattern => normalizeString(pattern));
  if (normalizedPatterns.some(pattern => songText.includes(pattern))) return true;

  const matchPattern = new RegExp(definition.matches.map(pattern => pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
  return matchPattern.test(songText);
};

export const getVibeSuggestions = (allSongs = [], vibeName, limit = 40) => {
  if (!Array.isArray(allSongs) || !vibeName) return [];

  const matches = allSongs.filter(song => songMatchesVibe(song, vibeName));
  const shuffled = [...matches].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(limit, MAX_VIBE_SONGS));
};

export const getDailyVibePlaylist = (allSongs = [], vibeName, dateKey = new Date().toISOString().slice(0, 10), limit = MAX_VIBE_SONGS) => {
  if (!Array.isArray(allSongs) || !vibeName) {
    return [];
  }
  const normalized = allSongs.filter(song => songMatchesVibe(song, vibeName));

  if (!normalized.length) {
    return [];
  }

  const seed = Array.from(String(dateKey || '')).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const seededSort = (a, b) => {
    const aHash = `${a.id || a.title || ''}${seed}`.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const bHash = `${b.id || b.title || ''}${seed}`.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return aHash % 97 - bHash % 97 || aHash - bHash;
  };

  const shuffled = [...normalized].sort(seededSort);
  const finalList = shuffled.slice(0, Math.min(limit, MAX_VIBE_SONGS));
  return finalList.length > 0 ? finalList : normalized.slice(0, Math.min(limit, MAX_VIBE_SONGS));
};

const vibeImageMap = {
  'Relaxing': '/vibes/relaxing.jpg',
  'Driving': '/vibes/driving.jpg',
  'Focus & Work': '/vibes/focus.jpg',
  'Cooking / Dining': '/vibes/cooking.jpg',
  'Deep Sleep': '/vibes/deepsleep.jpg',
  'Workout & Gym': '/vibes/workout.jpg',
  'Romance or Date Night': '/vibes/datenight.jpg'
};

export const getAllVibeCards = () => VIBE_DEFINITIONS.map(v => ({
  id: v.key,
  name: v.key,
  imageUrl: vibeImageMap[v.key] || `/vibes/${v.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`,
  color: '#1d4ed8'
}));
