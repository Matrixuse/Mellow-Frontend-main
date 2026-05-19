/**
 * Smart Quick Picks Algorithm
 * Recommends songs based on recently/frequently listened artists and moods
 */

const STORAGE_KEY = 'mellow_listening_history';
const MAX_HISTORY = 100;
const QUICK_PICKS_CACHE_KEY = 'mellow_quick_picks_cache';
const QUICK_PICKS_TIMESTAMP_KEY = 'mellow_quick_picks_timestamp';

/**
 * Check if we should refresh quick picks (only at 3:00 AM)
 */
const shouldRefreshQuickPicks = () => {
    try {
        const lastTimestamp = localStorage.getItem(QUICK_PICKS_TIMESTAMP_KEY);
        if (!lastTimestamp) return true;
        
        const lastDate = new Date(parseInt(lastTimestamp));
        const now = new Date();
        
        // Get today at 3:00 AM
        const today3AM = new Date(now);
        today3AM.setHours(3, 0, 0, 0);
        
        // If current time is past 3:00 AM and last refresh was before today's 3:00 AM, refresh
        return now >= today3AM && lastDate < today3AM;
    } catch {
        return true;
    }
};

/**
 * Get cached quick picks or generate new ones
 */
export const getCachedQuickPicks = (allSongs, count = 24) => {
    try {
        // Check if we need to refresh
        if (shouldRefreshQuickPicks()) {
            // Generate new picks
            const newPicks = generateQuickPicksInternal(allSongs, count);
            
            // Cache them
            localStorage.setItem(QUICK_PICKS_CACHE_KEY, JSON.stringify(newPicks));
            localStorage.setItem(QUICK_PICKS_TIMESTAMP_KEY, Date.now().toString());
            
            return newPicks;
        }
        
        // Return cached picks
        const cached = localStorage.getItem(QUICK_PICKS_CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
        
        // Fallback: generate new picks if cache is empty
        const newPicks = generateQuickPicksInternal(allSongs, count);
        localStorage.setItem(QUICK_PICKS_CACHE_KEY, JSON.stringify(newPicks));
        localStorage.setItem(QUICK_PICKS_TIMESTAMP_KEY, Date.now().toString());
        
        return newPicks;
    } catch {
        // If caching fails, just generate picks
        return generateQuickPicksInternal(allSongs, count);
    }
};

export const getListeningHistory = () => {
    try {
        const history = localStorage.getItem(STORAGE_KEY);
        return history ? JSON.parse(history) : [];
    } catch {
        return [];
    }
};

export const addToListeningHistory = (song) => {
    try {
        const history = getListeningHistory();
        const entry = {
            songId: song.id,
            title: song.title,
            artist: Array.isArray(song.artist) ? song.artist : [song.artist],
            moods: song.moods || [],
            timestamp: Date.now()
        };
        
        // Add new entry and keep only recent entries
        const updated = [entry, ...history].slice(0, MAX_HISTORY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    } catch {
        return [];
    }
};

/**
 * Get frequently listened artists
 */
export const getFrequentArtists = (limit = 5) => {
    const history = getListeningHistory();
    const artistCounts = {};
    
    history.forEach(entry => {
        const artists = Array.isArray(entry.artist) ? entry.artist : [entry.artist];
        artists.forEach(artist => {
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
        });
    });
    
    return Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([artist]) => artist);
};

/**
 * Get frequently listened moods
 */
export const getFrequentMoods = (limit = 3) => {
    const history = getListeningHistory();
    const moodCounts = {};
    
    history.forEach(entry => {
        const moods = entry.moods || [];
        moods.forEach(mood => {
            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });
    });
    
    return Object.entries(moodCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([mood]) => mood);
};

/**
 * Get Quick Picks - smart recommendation algorithm
 * Always returns songs - either based on user taste or random
 */
const generateQuickPicksInternal = (allSongs, count = 9) => {
    if (!allSongs || allSongs.length === 0) return [];
    
    const history = getListeningHistory();
    const recentSongIds = new Set(history.slice(0, 20).map(h => h.songId));
    
    // If user has listening history, try to recommend based on taste
    if (history.length > 0) {
        const frequentArtists = getFrequentArtists(5);
        const frequentMoods = getFrequentMoods(3);
        
        // Filter songs: match artists or moods, exclude recently played
        const candidates = allSongs.filter(song => {
            if (recentSongIds.has(song.id)) return false;
            
            const artists = Array.isArray(song.artist) ? song.artist : [song.artist];
            const moods = song.moods || [];
            
            const matchesArtist = artists.some(a => frequentArtists.includes(a));
            const matchesMood = moods.some(m => frequentMoods.includes(m));
            
            return matchesArtist || matchesMood;
        });
        
        if (candidates.length >= count) {
            return candidates.sort(() => 0.5 - Math.random()).slice(0, count);
        }
    }
    
    // Default: return random songs
    const available = allSongs.filter(song => !recentSongIds.has(song.id));
    return available.sort(() => 0.5 - Math.random()).slice(0, count);
};

/**
 * Wrapper function for caching with 3:00 AM daily refresh
 */
export const getQuickPicks = (allSongs, count = 9) => {
    return getCachedQuickPicks(allSongs, count);
};
