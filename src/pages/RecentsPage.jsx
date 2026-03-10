import React, { useEffect, useState, useRef, useContext } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import ImageWithFallback from '../components/ImageWithFallback';
import { getListenHistory } from '../api/userService';
import { MoreHorizontal, MoreVertical, Play } from 'lucide-react';
import { Pause } from 'lucide-react';
import { FavoritesContext } from '../contexts/FavoritesContext';

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

  useEffect(() => {
    function onDocClick() { setActiveMenuId(null); }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  if (loading) return <div className="p-4">Loading recents...</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-white mb-4">Recents</h2>
      {songs.length === 0 ? (
        <p className="text-gray-400">No recent plays yet.</p>
      ) : (
        <div className="space-y-2">
          {songs.map((s) => {
            const key = s.id || s.songId || JSON.stringify(s);
            const title = s.title || s.name || s.songTitle || 'Unknown';
            const artist = Array.isArray(s.artist) ? s.artist.join(', ') : (s.artist || s.artists || s.artistName || '');
            const idVal = s.id ?? s.songId ?? null;
            const isCurrent = String(idVal) === String(currentSongId);
            return (
              <div key={key} className="relative">
                <div className={`flex items-center gap-3 p-1 rounded-lg cursor-pointer ${isCurrent ? 'bg-blue-700' : 'bg-gray-800/50 hover:bg-gray-700/50'}`} onClick={() => { try { if (typeof onSelectSong === 'function') { onSelectSong(s.id || s.songId || s); } else { navigate('/'); window.setTimeout(()=>{ const evt = new CustomEvent('play-song-from-recents', { detail: s }); window.dispatchEvent(evt); }, 50); } } catch(e){} }}>
                  <div className={`w-8 h-8 rounded-md overflow-hidden flex-shrink-0 ${isCurrent ? 'ring-2 ring-blue-300' : 'bg-gray-700'}`}>
                    <ImageWithFallback src={s.coverUrl || s.cover || ''} alt={title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold truncate ${isCurrent ? 'text-white' : 'text-white'}`}>{title}</div>
                    <div className={`text-xs truncate ${isCurrent ? 'text-blue-100' : 'text-gray-400'}`}>{artist}</div>
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
                        <div className="absolute right-0 top-10 z-40 w-44 bg-gray-900 border border-gray-800 rounded shadow-lg text-sm overflow-hidden">
                          <button onClick={(ev) => { ev.stopPropagation(); setActiveMenuId(null); try { if (typeof onAddToQueue === 'function') onAddToQueue(s); else { const e = new CustomEvent('add-to-queue', { detail: s }); window.dispatchEvent(e); } } catch(e){} }} className="w-full text-left px-3 py-2 hover:bg-gray-800">Add to queue</button>
                          <button onClick={(ev) => { ev.stopPropagation(); setActiveMenuId(null); try { if (typeof onAddToPlaylist === 'function') onAddToPlaylist(s.id || s.songId || s); else { const e = new CustomEvent('open-add-to-playlist', { detail: s }); window.dispatchEvent(e); } } catch(e){} }} className="w-full text-left px-3 py-2 hover:bg-gray-800">Add to playlist</button>
                          <button onClick={(ev) => { ev.stopPropagation(); setActiveMenuId(null); try { if (typeof toggleSongFavorite === 'function') toggleSongFavorite(s.id || s.songId || s); else { const e = new CustomEvent('toggle-favorite', { detail: s }); window.dispatchEvent(e); } } catch(e){} }} className="w-full text-left px-3 py-2 hover:bg-gray-800">Add to favourites</button>
                          <button onClick={(ev) => { ev.stopPropagation(); setActiveMenuId(null); try { const artistName = Array.isArray(s.artist) ? s.artist[0] : (s.artist || s.artists || s.artistName || ''); if (artistName) { if (typeof onShowArtist === 'function') onShowArtist(artistName); else navigate(`/artist/${encodeURIComponent(artistName)}`); } } catch(e){} }} className="w-full text-left px-3 py-2 hover:bg-gray-800">Artist</button>
                          <button onClick={(ev) => { ev.stopPropagation(); setActiveMenuId(null); try { const raw = JSON.parse(localStorage.getItem('recents')||'[]'); const list = raw.filter(item => String(item.id) !== String(idVal)); localStorage.setItem('recents', JSON.stringify(list)); setSongs(list); } catch(e){} }} className="w-full text-left px-3 py-2 hover:bg-gray-800">Remove from recents</button>
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
  );
};

export default RecentsPage;
