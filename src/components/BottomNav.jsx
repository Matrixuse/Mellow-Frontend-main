import React from 'react';
import { Home, Search, List, Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();

  // Helper to close search overlay if open
  function closeSearchOverlayIfOpen() {
    const evt = new CustomEvent('close-search-overlay');
    window.dispatchEvent(evt);
  }

  const goHome = () => {
    closeSearchOverlayIfOpen();
    navigate('/');
  };

  const openSearch = () => {
    // Focus the search bar without navigating or showing overlay
    const el = document.getElementById('global-search-input-mobile')
      || document.getElementById('global-search-input-desktop')
      || document.querySelector('input[placeholder^="Search songs"]');
    if (el) {
      try { el.focus(); } catch (e) {}
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
    }
  };

  const openPlaylists = () => {
    closeSearchOverlayIfOpen();
    navigate('/playlists');
  };

    const location = useLocation();
    const isActive = (path) => location.pathname.startsWith(path);
    const activeHome = isActive('/');
    const activeSearch = isActive('/search');
    const activeFavs = isActive('/favorites');
    const activePlaylists = isActive('/playlists');
    const activeRecents = isActive('/recents');

    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden">
          <div className="bg-gray-900 border-t border-gray-800 h-14 flex items-center">
            <div className="w-full max-w-[480px] mx-auto px-4 flex items-center justify-between">
              <button onClick={goHome} aria-label="Home" className={`flex flex-col items-center ${isActive('/') ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                <Home className={`w-5 h-5 ${isActive('/') ? 'scale-110' : ''}`} />
                <span className={`text-[10px] mt-0.5 ${isActive('/') ? 'text-white font-semibold' : ''}`}>Home</span>
              </button>
              <button onClick={openSearch} aria-label="Search" className={`flex flex-col items-center ${isActive('/search') ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                <Search className={`w-5 h-5 ${activeSearch ? 'scale-110' : ''}`} fill={'none'} strokeWidth={2} />
                <span className={`text-[10px] mt-0.5 ${activeSearch ? 'text-white font-semibold' : ''}`}>Search</span>
              </button>
              <button onClick={() => { closeSearchOverlayIfOpen(); navigate('/recents'); }} aria-label="Recents" className={`flex flex-col items-center ${activeRecents ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                <svg className={`w-5 h-5 ${activeRecents ? 'scale-110' : ''}`} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 4h3v13H3zM8.5 3h3v14h-3zM14 4h3v13h-3zM3 18h14v2H3z" />
                </svg>
                <span className={`text-[10px] mt-0.5 ${activeRecents ? 'text-white font-semibold' : ''}`}>Recents</span>
              </button>
              <button onClick={() => { closeSearchOverlayIfOpen(); navigate('/favorites'); }} aria-label="Favorites" className={`flex flex-col items-center ${activeFavs ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                <Heart className={`w-5 h-5 ${activeFavs ? 'scale-110' : ''}`} fill={activeFavs ? 'currentColor' : 'none'} strokeWidth={activeFavs ? 0 : 2} />
                <span className={`text-[10px] mt-0.5 ${activeFavs ? 'text-white font-semibold' : ''}`}>Favs</span>
              </button>
              <button onClick={openPlaylists} aria-label="Playlists" className={`flex flex-col items-center ${isActive('/playlists') ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                <List className={`w-5 h-5 ${isActive('/playlists') ? 'scale-110' : ''}`} />
                <span className={`text-[10px] mt-0.5 ${isActive('/playlists') ? 'text-white font-semibold' : ''}`}>Your Library</span>
              </button>
            </div>
        </div>
      </div>
    );
}
