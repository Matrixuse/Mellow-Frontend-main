import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export default function SongContextMenu({ song, onAddToQueue, onAddToPlaylist, onNavigateToArtist, onReport }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleToggle = (e) => {
    e.stopPropagation();
    setOpen(o => !o);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={handleToggle} onMouseDown={(e) => e.stopPropagation()} aria-label="More" className="p-1 rounded-full hover:bg-gray-700">
        <MoreVertical size={16} className="text-gray-200" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-gray-900 text-white rounded-md shadow-lg z-50 overflow-hidden">
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onAddToQueue && onAddToQueue(song, 'end'); }} className="w-full text-left px-3 py-2 hover:bg-gray-800">Add to Queue</button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onAddToPlaylist && onAddToPlaylist(song.id); }} className="w-full text-left px-3 py-2 hover:bg-gray-800">Add to Playlist</button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onNavigateToArtist && onNavigateToArtist(Array.isArray(song.artist) ? song.artist[0] : song.artist); }} className="w-full text-left px-3 py-2 hover:bg-gray-800">Artist</button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onReport && onReport(song); }} className="w-full text-left px-3 py-2 hover:bg-gray-800">Report</button>
        </div>
      )}
    </div>
  );
}
