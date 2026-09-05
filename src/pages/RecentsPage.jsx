import React, { useEffect, useState, useRef, useContext } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import ImageWithFallback from '../components/ImageWithFallback';
import { getListenHistory } from '../api/userService';
import { MoreHorizontal, MoreVertical, Play, ArrowLeft } from 'lucide-react';
import { Pause } from 'lucide-react';
import { FavoritesContext } from '../contexts/FavoritesContext';
import queueService from '../services/queueService';

const RecentsPage = ({}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [songs, setSongs] = useState([]);
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { onSelectSong, onAddToQueue, onAddToPlaylist, onShowArtist, currentSongId, isPlaying } = outlet;
  const { toggleSongFavorite } = useContext(FavoritesContext);
  // ref kept for potential future use; menu open/close handled via doc clicks
  const menuRef = useRef(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    let mounted = true;
    const token = (() => { try { const u=JSON.parse(localStorage.getItem('user')||'{}'); return u.token; } catch { return null; } })();

    const loadLocalRecents = () => {
      try {
        const raw = JSON.parse(localStorage.getItem('recents') || '[]');
        if (Array.isArray(raw) && raw.length > 0) {
          setSongs(raw);
          setError(null);
          setLoading(false);
          return true;
        }
      } catch (e) {
        // ignore parse errors
      }
      // localStorage may be blocked (tracking prevention) — fallback to in-memory queueService
      try {
        const fallback = queueService.getRecentEntries && queueService.getRecentEntries();
        if (Array.isArray(fallback) && fallback.length > 0) {
          setSongs(fallback);
          setError(null);
          setLoading(false);
          return true;
        }
      } catch (e) {}
      return false;
    };

    if (!token) {
      // No auth token: fall back to local recents if available
      const found = loadLocalRecents();
      if (!found) {
        setError('You are not logged in and no local recents are available.');
        setLoading(false);
      }
      return () => { mounted = false; };
    }

    // If we've previously detected that the server doesn't support GET history,
    // skip the server call and use local recents immediately.
    const serverSupportedFlag = localStorage.getItem('recents_server_supported');
    if (serverSupportedFlag === 'false') {
      const found = loadLocalRecents();
      if (!found) {
        setSongs([]);
      }
      setLoading(false);
      return () => { mounted = false; };
    }

    // Try server first, fallback to local recents on error or unsupported marker
    getListenHistory(token, 100).then(data => {
      if (!mounted) return;
      if (data && data.unsupported) {
        // remember for future visits to avoid repeated 404 requests
        try { localStorage.setItem('recents_server_supported', 'false'); } catch (e) {}
        const found = loadLocalRecents();
        if (!found) setSongs([]);
        setLoading(false);
        return;
      }
      const items = Array.isArray(data) ? data : (data.songs || []);
      if (items && items.length > 0) {
        setSongs(items);
        setError(null);
      } else {
        // server returned empty - try local
        if (!loadLocalRecents()) {
          setSongs([]);
        }
      }
      setLoading(false);
    }).catch(err => {
      if (!mounted) return;
      // If an error occurred, fallback to local recents but avoid noisy logs
      console.debug('Recents server failed, falling back to local:', err && err.message ? err.message : err);
      const found = loadLocalRecents();
      if (!found) {
        setError(err && err.message ? err.message : 'Failed to load recents');
      }
      setLoading(false);
    });

    return () => { mounted = false; };
  }, []);

  // Update recents when localStorage changes (other tabs) or app dispatches an event
  useEffect(() => {
    const reload = () => {
      try {
        const raw = JSON.parse(localStorage.getItem('recents') || '[]');
        console.debug('RecentsPage: reload from storage, items=', Array.isArray(raw) ? raw.length : 'invalid');
        if (Array.isArray(raw) && raw.length > 0) {
          setSongs(raw);
          return;
        }
      } catch (e) { console.debug('RecentsPage: reload parse error', e); }
      // fallback to in-memory queueService entries
      try {
        const fallback = queueService.getRecentEntries && queueService.getRecentEntries();
        if (Array.isArray(fallback) && fallback.length > 0) {
          setSongs(fallback);
          console.debug('RecentsPage: reload from in-memory fallback, items=', fallback.length);
        }
      } catch (e) { /* ignore */ }
    };
    const onStorage = (e) => {
      if (!e || e.key === 'recents') reload();
    };
    const onCustom = (ev) => { console.debug('RecentsPage: received recents-updated', ev && ev.detail); reload(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('recents-updated', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('recents-updated', onCustom);
    };
  }, []);

  useEffect(() => {
    function onDocClick() { setActiveMenuId(null); }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  if (loading) return <div className="p-4">Loading recents...</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;

  // Limit to recent 30 songs
  const recentSongs = songs.slice(0, 30);

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <div className="p-4 border-b border-gray-700 bg-[#1f1f1f]/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-900">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-semibold text-white">Recents</h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {recentSongs.length === 0 ? (
          <p className="text-gray-400">No recently played songs</p>
        ) : (
          <div className="space-y-2">
            {recentSongs.map((s) => {
            const key = s.id || s.songId || JSON.stringify(s);
            const title = s.title || s.name || s.songTitle || 'Unknown';
            const artist = Array.isArray(s.artist) ? s.artist.join(', ') : (s.artist || s.artists || s.artistName || '');
            const idVal = s.id ?? s.songId ?? null;
            const isCurrent = String(idVal) === String(currentSongId);
            return (
              <div key={key} className="relative">
                <div className={`flex items-center gap-3 p-1 rounded-lg cursor-pointer ${isCurrent ? 'bg-blue-700' : 'bg-[#1f1f1f]/50 hover:bg-[#282828]/50'}`} onClick={() => { try { if (typeof onSelectSong === 'function') { onSelectSong(s.id || s.songId || s); } else { navigate('/'); window.setTimeout(()=>{ const evt = new CustomEvent('play-song-from-recents', { detail: s }); window.dispatchEvent(evt); }, 50); } } catch(e){} }}>
                  <div className={`w-8 h-8 rounded-md overflow-hidden flex-shrink-0 ${isCurrent ? 'ring-2 ring-red-300' : 'bg-[#282828]'}`}>
                    <ImageWithFallback src={s.coverUrl || s.cover || ''} alt={title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold truncate ${isCurrent ? 'text-white' : 'text-white'}`}>{title}</div>
                    <div className={`text-xs truncate ${isCurrent ? 'text-red-100' : 'text-gray-400'}`}>{artist}</div>
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    <button aria-label="Play quick" onClick={(e) => { e.stopPropagation(); try { if (typeof onSelectSong === 'function') onSelectSong(s.id || s.songId || s); else { navigate('/'); window.setTimeout(()=>{ const evt = new CustomEvent('play-song-from-recents', { detail: s }); window.dispatchEvent(evt); }, 50); } } catch(e){} }} className="p-2 text-gray-300 hover:text-white">
                      {isCurrent && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <div ref={menuRef}>
                      <button aria-label="More" onClick={(e) => { e.stopPropagation(); setActiveMenuId(prev => prev === key ? null : key); }} className="p-2 text-gray-300 hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeMenuId === key && (
                        <div className="absolute right-0 top-10 z-40 w-44 bg-[#0f0f0f] border border-gray-800 rounded shadow-lg text-sm overflow-hidden">
                          <button onClick={(ev) => { ev.stopPropagation(); setActiveMenuId(null); try { if (typeof onAddToQueue === 'function') onAddToQueue(s); else { const e = new CustomEvent('add-to-queue', { detail: s }); window.dispatchEvent(e); } } catch(e){} }} className="w-full text-left px-3 py-2 hover:bg-[#1f1f1f]">Add to queue</button>
                          <button onClick={(ev) => { ev.stopPropagation(); setActiveMenuId(null); try { if (typeof onAddToPlaylist === 'function') onAddToPlaylist(s.id || s.songId || s); else { const e = new CustomEvent('open-add-to-playlist', { detail: s }); window.dispatchEvent(e); } } catch(e){} }} className="w-full text-left px-3 py-2 hover:bg-[#1f1f1f]">Add to playlist</button>
                          <button onClick={(ev) => { ev.stopPropagation(); setActiveMenuId(null); try { if (typeof toggleSongFavorite === 'function') toggleSongFavorite(s.id || s.songId || s); else { const e = new CustomEvent('toggle-favorite', { detail: s }); window.dispatchEvent(e); } } catch(e){} }} className="w-full text-left px-3 py-2 hover:bg-[#1f1f1f]">Add to favourites</button>
                          <button onClick={(ev) => { ev.stopPropagation(); setActiveMenuId(null); try { const artistName = Array.isArray(s.artist) ? s.artist[0] : (s.artist || s.artists || s.artistName || ''); if (artistName) { if (typeof onShowArtist === 'function') onShowArtist(artistName); else navigate(`/artist/${encodeURIComponent(artistName)}`); } } catch(e){} }} className="w-full text-left px-3 py-2 hover:bg-[#1f1f1f]">Artist</button>
                          <button onClick={(ev) => { ev.stopPropagation(); setActiveMenuId(null); try { const raw = JSON.parse(localStorage.getItem('recents')||'[]'); const list = raw.filter(item => String(item.id) !== String(idVal)); localStorage.setItem('recents', JSON.stringify(list)); setSongs(list); try { console.debug('RecentsPage: removed item, newCount=', list.length); } catch(e){} try { window.dispatchEvent(new CustomEvent('recents-updated', { detail: { removedId: idVal } })); } catch(e){} } catch(e){} }} className="w-full text-left px-3 py-2 hover:bg-[#1f1f1f]">Remove from recents</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentsPage;
