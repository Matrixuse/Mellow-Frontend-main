import React from 'react';
import { Home, Search, List } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();

  const goHome = () => navigate('/');

  const openSearch = () => {
    navigate('/');
    // small delay to allow route render; focus the search input if present
    setTimeout(() => {
      const el = document.getElementById('global-search-input');
      if (el) {
        el.focus();
        // on mobile, ensure it's visible
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 150);
  };

  const openPlaylists = () => {
    navigate('/playlists');
  };

    const location = useLocation();
    const isActive = (path) => location.pathname.startsWith(path);

    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden">
          <div className="bg-gray-900 border-t border-gray-800 h-14 flex items-center">
            <div className="w-full max-w-[480px] mx-auto px-4 flex items-center justify-between">
              <button onClick={goHome} aria-label="Home" className={`flex flex-col items-center ${isActive('/') ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                <Home className={`w-5 h-5 ${isActive('/') ? 'scale-110' : ''}`} />
                <span className={`text-[10px] mt-0.5 ${isActive('/') ? 'text-white font-semibold' : ''}`}>Home</span>
              </button>
              <button onClick={openSearch} aria-label="Search" className={`flex flex-col items-center ${isActive('/search') ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                <Search className={`w-5 h-5 ${isActive('/search') ? 'scale-110' : ''}`} />
                <span className={`text-[10px] mt-0.5 ${isActive('/search') ? 'text-white font-semibold' : ''}`}>Search</span>
              </button>
              <button onClick={openPlaylists} aria-label="Playlists" className={`flex flex-col items-center ${isActive('/playlists') ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                <List className={`w-5 h-5 ${isActive('/playlists') ? 'scale-110' : ''}`} />
                <span className={`text-[10px] mt-0.5 ${isActive('/playlists') ? 'text-white font-semibold' : ''}`}>Playlists</span>
              </button>
            </div>
        </div>
      </div>
    );
}
