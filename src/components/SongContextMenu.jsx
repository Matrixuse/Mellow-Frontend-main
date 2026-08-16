import React, { useState, useRef, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { FavoritesContext } from '../contexts/FavoritesContext';

export default function SongContextMenu({ song, onAddToQueue, onAddToPlaylist, onNavigateToArtist, onReport }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0 });
  const [menuAbove, setMenuAbove] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updateMenuPosition = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = 220;
      const gap = 8;
      const margin = 12;

      let left = rect.right - menuWidth;
      if (left < margin) left = margin;
      if (left + menuWidth > window.innerWidth - margin) {
        left = window.innerWidth - menuWidth - margin;
      }

      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenAbove = spaceBelow < menuHeight + gap;
      let top = rect.bottom + gap;
      if (shouldOpenAbove) {
        top = rect.top - menuHeight - gap;
      }
      if (top < margin) top = margin;
      if (top + menuHeight > window.innerHeight - margin) {
        top = window.innerHeight - menuHeight - margin;
      }

      setMenuAbove(shouldOpenAbove);
      setMenuStyle({ top, left });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open]);

  const { isSongFavorite, toggleSongFavorite } = useContext(FavoritesContext);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  return (
    <div ref={ref} className="relative inline-flex items-center justify-center overflow-visible z-[200]">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        aria-label="More"
        className="p-1 rounded-full hover:bg-gray-700"
      >
        <MoreVertical size={16} className="text-gray-200" />
      </button>
      {open && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={`fixed z-[9999] w-44 overflow-hidden rounded-md text-white shadow-2xl ring-1 ring-white/10 ${menuAbove ? 'shadow-lg' : ''}`}
          style={{
            top: `${menuStyle.top}px`,
            left: `${menuStyle.left}px`,
            opacity: 1,
            background: 'rgb(17, 24, 39)',
            backgroundColor: 'rgb(17, 24, 39)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            filter: 'none',
            boxShadow: '0 18px 48px rgba(0,0,0,0.75)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            mixBlendMode: 'normal',
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onAddToQueue && onAddToQueue(song, 'end'); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-700"
            style={{ backgroundColor: 'rgb(17, 24, 39)', color: '#fff', opacity: 1, filter: 'none' }}
          >
            Add to Queue
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); toggleSongFavorite && toggleSongFavorite(song.id); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-700"
            style={{ backgroundColor: 'rgb(17, 24, 39)', color: '#fff', opacity: 1, filter: 'none' }}
          >
            {isSongFavorite(song.id) ? 'Remove Favourite' : 'Add Favourite'}
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onAddToPlaylist && onAddToPlaylist(song.id); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-700"
            style={{ backgroundColor: 'rgb(17, 24, 39)', color: '#fff', opacity: 1, filter: 'none' }}
          >
            Add to Playlist
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onNavigateToArtist && onNavigateToArtist(Array.isArray(song.artist) ? song.artist[0] : song.artist); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-700"
            style={{ backgroundColor: 'rgb(17, 24, 39)', color: '#fff', opacity: 1, filter: 'none' }}
          >
            Artist
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onReport && onReport(song); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-700"
            style={{ backgroundColor: 'rgb(17, 24, 39)', color: '#fff', opacity: 1, filter: 'none' }}
          >
            Report
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
