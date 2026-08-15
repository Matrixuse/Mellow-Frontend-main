import apiClient from './apiClient';

export const getSongs = async (token) => {
    if (!token) {
        console.warn('Authentication token not found, cannot fetch songs.');
        return [];
    }

    const data = await apiClient.fetchWithFallback('GET', '/songs', { token });

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
            artist: Array.isArray(s.artist) ? s.artist : (typeof s.artist === 'string' ? s.artist.split(',').map(item => item.trim()).filter(Boolean) : []),
            coverUrl: s.coverUrl || s.cover_url || s.cover || '',
            songUrl: resolveSongUrl(s),
            vibeTags: Array.isArray(s.vibeTags) ? s.vibeTags : (Array.isArray(s.vibes) ? s.vibes : (typeof s.vibeTags === 'string' ? s.vibeTags.split(',').map(item => item.trim()).filter(Boolean) : [])),
            moods: Array.isArray(s.moods) ? s.moods : (typeof s.moods === 'string' ? s.moods.split(',').map(item => item.trim()).filter(Boolean) : []),
            duration: resolveDuration(s)
        }));
    }
    return data;
};

