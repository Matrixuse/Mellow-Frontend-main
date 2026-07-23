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

const shuffleArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return [...arr].sort(() => 0.5 - Math.random());
};

/**
 * Get cached quick picks or generate new ones
 */
export const getCachedQuickPicks = (allSongs, count = 24) => {
    try {
        const history = getListeningHistory();
        const noHistory = !Array.isArray(history) || history.length === 0;

        // If there's no listening history yet, still use a cached daily shuffle
        if (noHistory) {
            const cached = localStorage.getItem(QUICK_PICKS_CACHE_KEY);
            if (cached && !shouldRefreshQuickPicks()) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.slice(0, Math.min(count, parsed.length));
                }
            }
            const shuffled = Array.isArray(allSongs) ? shuffleArray(allSongs) : [];
            const picks = shuffled.slice(0, Math.min(count, shuffled.length));
            localStorage.setItem(QUICK_PICKS_CACHE_KEY, JSON.stringify(picks));
            localStorage.setItem(QUICK_PICKS_TIMESTAMP_KEY, Date.now().toString());
            return picks;
        }

        if (shouldRefreshQuickPicks()) {
            const newPicks = generateQuickPicksInternal(allSongs, count);
            if (Array.isArray(newPicks)) {
                // Save generated picks (preserve order) so they remain the same for the day
                localStorage.setItem(QUICK_PICKS_CACHE_KEY, JSON.stringify(newPicks));
                localStorage.setItem(QUICK_PICKS_TIMESTAMP_KEY, Date.now().toString());
                return newPicks.slice(0, Math.min(count, newPicks.length));
            }
            return [];
        }

        const cached = localStorage.getItem(QUICK_PICKS_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // return cached picks as-is (daily stable)
                return parsed.slice(0, Math.min(count, parsed.length));
            }
        }

        const newPicks = generateQuickPicksInternal(allSongs, count);
        if (Array.isArray(newPicks)) {
            localStorage.setItem(QUICK_PICKS_CACHE_KEY, JSON.stringify(newPicks));
            localStorage.setItem(QUICK_PICKS_TIMESTAMP_KEY, Date.now().toString());
            return newPicks.slice(0, Math.min(count, newPicks.length));
        }
        return [];
    } catch {
        return Array.isArray(allSongs) ? allSongs.slice(0, count) : [];
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
    const historySongIds = new Set(history.map(h => String(h.songId)));

    // Rank songs by how well they match listening history.
    const frequentArtists = getFrequentArtists(5);
    const frequentMoods = getFrequentMoods(3);

    const scored = allSongs.map((song) => {
        const artists = Array.isArray(song.artist) ? song.artist : [song.artist];
        const moods = song.moods || [];

        const artistScore = artists.reduce((sum, artist) => sum + (frequentArtists.includes(artist) ? 1 : 0), 0);
        const moodScore = moods.reduce((sum, mood) => sum + (frequentMoods.includes(mood) ? 1 : 0), 0);
        const historyScore = historySongIds.has(String(song.id)) ? -1 : 0;

        return {
            song,
            score: artistScore * 2 + moodScore + historyScore,
        };
    });

    const prioritized = scored
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return Math.random() - 0.5;
        })
        .map(entry => entry.song);

    return prioritized.slice(0, Math.min(count, prioritized.length));
};

/**
 * Wrapper function for caching with 3:00 AM daily refresh
 */
export const getQuickPicks = (allSongs, count = 24) => {
    return getCachedQuickPicks(allSongs, count);
};
