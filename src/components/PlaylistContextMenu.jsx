import React, { useRef, useEffect, useState } from 'react';
import { MoreVertical, Heart, Bookmark } from 'lucide-react';

const PlaylistContextMenu = ({ playlist, onAddToFavorites = () => {}, onSavePlaylist = () => {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleAddToFavorites = async () => {
    try {
      console.debug('PlaylistContextMenu.handleAddToFavorites', { playlistId: playlist && playlist.id });
      const res = await onAddToFavorites(playlist);
      console.debug('PlaylistContextMenu.handleAddToFavorites result', res);
      setIsOpen(false);
      // Provide immediate feedback to the user
      if (res === true || res === undefined) {
        try { window.alert('Playlist added to favorites'); } catch (e) {}
      } else {
        try { window.alert('Playlist removed from favorites'); } catch (e) {}
      }
    } catch (err) {
      setIsOpen(false);
      console.error('Add to favorites failed', err);
      try { window.alert('Failed to add playlist to favorites'); } catch (e) {}
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(v => !v); }}
        className="text-gray-400 hover:text-white focus:outline-none flex-shrink-0 p-1"
        aria-label="Playlist options"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 w-44">
            <button
              onClick={(e) => { e.stopPropagation(); handleAddToFavorites(); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
            >
              <Heart size={14} />
              Add to Favorites
            </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSavePlaylist(playlist); setIsOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2 border-t border-gray-700"
          >
            <Bookmark size={14} />
            Save Playlist
          </button>
        </div>
      )}
    </div>
  );
};

export default PlaylistContextMenu;
