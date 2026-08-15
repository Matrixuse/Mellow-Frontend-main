// Backend base URL: prefer Vite runtime env, then runtime-injected window.__API_URL, then the live Render URL as final fallback.
const BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL)
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : (typeof window !== 'undefined' && window.__API_URL) ? String(window.__API_URL).replace(/\/$/, '') : 'https://mellow-backend-main.onrender.com';
const API_URL = `${BASE_URL}/api/songs`;

export const getSongs = async (token) => {
    // Browser ki memory se user ka data nikaalna
    // Ab token ko sidhe argument se le rahe hain
    // const user = JSON.parse(localStorage.getItem('user'));
    // let token = null;

    // User ke data se token nikaalna
    // if (user && user.token) {
    //     token = user.token;
    // }

    // Agar token nahi hai, toh ek khaali list bhej do taaki app crash na ho
    if (!token) {
        console.warn('Authentication token not found, cannot fetch songs.');
        return []; 
    }

    // Backend server ko request bhejna
    const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
            // Hum request ke saath security token bhej rahe hain
            'Authorization': `Bearer ${token}`
        }
    });

    // Agar server se koi error aaye, toh use handle karna
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch songs');
    }

    // Agar sab theek hai, toh gaano ki list bhej do
    const data = await response.json();
    // Normalize song objects so frontend can rely on `id` and `coverUrl`
    if (Array.isArray(data)) {
        const normalizeId = (value) => {
            if (value === undefined || value === null || value === '') return '';
            if (typeof value === 'string') return value;
            if (typeof value === 'number') return String(value);
            if (value && typeof value === 'object' && value.$oid) return String(value.$oid);
            if (value && typeof value === 'object' && typeof value.toString === 'function') {
                const str = String(value);
                return str === '[object Object]' ? '' : str;
            }
            return String(value);
        };
        const parseDurationToSeconds = (dur) => {
            if (dur === undefined || dur === null || dur === '') return 0;
            if (typeof dur === 'string') {
                const normalized = dur.trim();
                if (normalized.includes(':')) {
                    const parts = normalized.split(':').map(p => Number(p));
                    if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2];
                    if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1];
                    return Number(parts[0]) || 0;
                }
                const numeric = Number(normalized);
                if (Number.isFinite(numeric)) {
                    return numeric > 10000 ? Math.round(numeric / 1000) : numeric;
                }
                return 0;
            }
            if (typeof dur === 'number' && Number.isFinite(dur)) {
                return dur > 10000 ? Math.round(dur / 1000) : dur;
            }
            return 0;
        };
        const resolveDuration = (song) => {
            if (!song) return 0;
            const candidates = [
                song.duration,
                song.durationSeconds,
                song.duration_seconds,
                song.durationMs,
                song.duration_ms,
                song.durationMillis,
                song.duration_millis,
                song.length,
                song.audioDuration,
                song.metadata?.duration,
                song.metadata?.durationSeconds,
                song.metadata?.duration_seconds,
                song.metadata?.durationMs,
                song.metadata?.duration_ms
            ];
            for (const value of candidates) {
                const parsed = parseDurationToSeconds(value);
                if (parsed > 0) return parsed;
            }
            return 0;
        };
        const isLegacyCloudinaryUrl = (value) => {
            return typeof value === 'string' && /cloudinary\.com/i.test(value);
        };
        const resolveSongUrl = (song) => {
            if (!song || typeof song !== 'object') return '';
            const candidates = [
                song.songUrl,
                song.url,
                song.song_url,
                song.audioUrl,
                song.audio_url,
                song.fileUrl,
                song.file_url,
                song.file?.url,
                song.audio?.url,
                song.asset?.url,
            ];
            for (const item of candidates) {
                if (item && typeof item === 'string' && !isLegacyCloudinaryUrl(item)) {
                    return item;
                }
            }
            return '';
        };
        return data.map(s => ({
            ...s,
            id: normalizeId(s.id || s._id || (s._id && s._id.$oid)) || String(s.id || s._id || (s._id && s._id.$oid) || ''),
            coverUrl: s.coverUrl || s.cover_url || s.cover || '',
            songUrl: resolveSongUrl(s),
            vibeTags: Array.isArray(s.vibeTags) ? s.vibeTags : (Array.isArray(s.vibes) ? s.vibes : []),
            moods: Array.isArray(s.moods) ? s.moods : [],
            duration: resolveDuration(s)
        }));
    }
    return data;
};

