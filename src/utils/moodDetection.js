/**
 * Mood Auto-Detection Algorithm
 * Automatically categorizes songs as "Old is Gold" or "Hollywood Mix"
 */

// Keywords for detecting Old is Gold songs
const OLD_GOLD_KEYWORDS = {
    artists: ['rafi', 'lata mangeshkar', 'lata', 'kishore kumar', 'kishore', 'mukesh', 'asha parekh', 'shammi kapoor', 'dilip kumar', 'md rafi', 'raj', 'geeta dutt', 'noor jahan', 'suraiya', 'shamshad begum', 'rajendra kumar', 'ashok kumar', 'dev anand', 'meena kumari'],
    titles: ['old', 'classic', 'vintage', 'golden', 'evergreen', 'retro', 'timeless', 'nostalgia', 'classic hindi', 'old song', 'vintage song', 'golden era'],
    composers: ['md', 'a.r. rahman', 'ar rahman', 'naushad', 'rafi', 'jaidev', 'kalyanji-anandji', 'shankar-jaikishan', 'salil chowdhury', 'madan mohan', 'laxmikant-pyarelal']
};

// Keywords for detecting Hollywood Mix songs
const HOLLYWOOD_KEYWORDS = {
    artists: ['ed sheeran', 'taylor swift', 'beyonce', 'drake', 'bruno mars', 'the weeknd', 'dua lipa', 'ariana grande', 'billie eilish', 'post malone', 'travis scott', 'weeknd', 'sia', 'katy perry', 'rihanna', 'adele', 'eminem', 'jay-z', 'coldplay', 'one direction', 'bts', 'selena gomez', 'justin timberlake', 'usher', 'chris brown', 'pitbull', 'lil wayne', '50 cent', 'kanye west', 'nicki minaj'],
    titles: ['hollywood', 'english', 'western', 'pop', 'rock', 'foreign', 'international', 'english song', 'western music', 'hollywood music', 'american', 'british', 'bollywood english', 'bollywood mix', 'english bollywood', 'hindi english'],
    keywords: ['english', 'hollywood', 'western', 'bollywood english', 'pop music', 'rock music']
};

/**
 * Detect mood for a song based on metadata
 * @param {Object} song - Song object with title, artist, etc.
 * @returns {Array} - Array of detected moods
 */
export const detectSongMood = (song) => {
    const detectedMoods = [];
    
    if (!song) return detectedMoods;
    
    const title = (song.title || '').toLowerCase();
    const artist = Array.isArray(song.artist) 
        ? song.artist.map(a => (a || '').toLowerCase()).join(' ')
        : (song.artist || '').toLowerCase();
    const moods = (song.moods || []).map(m => (m || '').toLowerCase());
    
    // Check for Old is Gold
    const matchesOldGold = 
        OLD_GOLD_KEYWORDS.artists.some(a => artist.includes(a.toLowerCase())) ||
        OLD_GOLD_KEYWORDS.titles.some(t => title.includes(t.toLowerCase())) ||
        OLD_GOLD_KEYWORDS.composers.some(c => artist.includes(c.toLowerCase())) ||
        moods.includes('old is gold') ||
        moods.includes('classic') ||
        moods.includes('vintage');
    
    if (matchesOldGold) {
        detectedMoods.push('Old is Gold');
    }
    
    // Check for Hollywood Mix
    const matchesHollywood = 
        HOLLYWOOD_KEYWORDS.artists.some(a => artist.includes(a.toLowerCase())) ||
        HOLLYWOOD_KEYWORDS.titles.some(t => title.includes(t.toLowerCase())) ||
        HOLLYWOOD_KEYWORDS.keywords.some(k => title.includes(k.toLowerCase()) || artist.includes(k.toLowerCase())) ||
        moods.includes('hollywood mix') ||
        moods.includes('hollywood') ||
        moods.includes('english');
    
    if (matchesHollywood) {
        detectedMoods.push('Hollywood Mix');
    }

    // Check for Spiritual / Bhakti (devotional) mood
    const BHAKTI_KEYWORDS = ['bhajan', 'bhakti', 'devotional', 'kirtan', 'mantra', 'satsang'];
    const matchesBhakti = 
        BHAKTI_KEYWORDS.some(k => title.includes(k) || artist.includes(k)) ||
        moods.includes('bhakti') || moods.includes('bhajan') || moods.includes('devotional');

    if (matchesBhakti) {
        detectedMoods.push('Spiritual / Bhakti');
    }
    
    return detectedMoods;
};

/**
 * Batch auto-tag songs for Old is Gold and Hollywood Mix
 * @param {Array} allSongs - All songs to analyze
 * @returns {Array} - Songs with updated moods
 */
export const autoTagMoods = (allSongs) => {
    if (!allSongs || !Array.isArray(allSongs)) return allSongs;
    
    return allSongs.map(song => {
        const detectedMoods = detectSongMood(song);
        
        if (detectedMoods.length === 0) {
            return song;
        }
        
        // Merge with existing moods
        const existingMoods = (song.moods || []).map(m => (m || '').toLowerCase());
        const newMoods = new Set([
            ...existingMoods,
            ...detectedMoods.map(m => m.toLowerCase())
        ]);
        
        return {
            ...song,
            moods: Array.from(newMoods)
        };
    });
};

/**
 * Get songs matching specific mood criteria
 */
export const getSongsForMood = (allSongs, moodName) => {
    if (!allSongs) return [];
    
    const normalizedMood = (moodName || '').toLowerCase();
    
    return allSongs.filter(song => {
        const moods = (song.moods || []).map(m => (m || '').toLowerCase());
        
        // Direct mood match
        if (moods.includes(normalizedMood)) {
            return true;
        }
        
        // For Old is Gold
        if (normalizedMood === 'old is gold') {
            return detectSongMood(song).some(m => m.toLowerCase() === 'old is gold');
        }
        
        // For Hollywood Mix
        if (normalizedMood === 'hollywood mix') {
            return detectSongMood(song).some(m => m.toLowerCase() === 'hollywood mix');
        }
        
        return false;
    });
};
