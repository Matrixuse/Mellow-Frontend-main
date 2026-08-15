import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Shuffle, Search, X, MoreVertical, Bookmark, Plus } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';
import SongContextMenu from './SongContextMenu';
import { getPlaylists, createPlaylist, addSongToPlaylist, deletePlaylist } from '../api/playlistService';
import { getDailyVibePlaylist } from '../utils/vibeMatching';

const MAX_VIBE_SONGS = 40;

const VibePage = () => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const {
    allSongs,
    onSelectSong,
    currentSongId,
    isPlaying,
    setIsUsingMoodQueue,
    setMoodQueue,
    setMoodQueueIndex,
    onAddToQueue,
    onAddToPlaylist,
  } = outlet;
  const { vibeName: encodedVibeName } = useParams();
  const vibeName = decodeURIComponent(encodedVibeName || '');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef(null);
  const mobileScrollContainerRef = useRef(null);
  const desktopScrollContainerRef = useRef(null);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [vibeMenuOpen, setVibeMenuOpen] = useState(false);
  const [isVibeShuffleMode, setIsVibeShuffleMode] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const dailySongs = useMemo(() => {
    if (!Array.isArray(allSongs)) return [];
    const normalizedDate = new Date().toISOString().slice(0, 10);
    return getDailyVibePlaylist(allSongs, vibeName, normalizedDate, MAX_VIBE_SONGS);
  }, [allSongs, vibeName]);

  const filteredSongs = useMemo(() => {
    if (!searchTerm.trim()) return dailySongs;
    const q = searchTerm.toLowerCase();
    return dailySongs.filter((song) => {
      const title = (song.title || '').toLowerCase();
      const artist = Array.isArray(song.artist) ? song.artist.join(' ').toLowerCase() : (song.artist || '').toLowerCase();
      return title.includes(q) || artist.includes(q);
    });
  }, [dailySongs, searchTerm]);

  const handleToggleShuffle = useCallback(() => {
    setIsVibeShuffleMode(prev => !prev);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkSaved = async () => {
      const token = outlet?.user?.token || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null')?.token : null);
      if (!token) {
        setIsSaved(false);
        return;
      }

      try {
        const existing = await getPlaylists(token);
        if (cancelled) return;
        const normalizedName = `${vibeName} Vibe Mix`.trim().toLowerCase();
        setIsSaved((existing || []).some((playlist) => String(playlist?.name || '').trim().toLowerCase() === normalizedName));
      } catch (error) {
        if (!cancelled) setIsSaved(false);
      }
    };

    checkSaved();
    return () => {
      cancelled = true;
    };
  }, [outlet, vibeName]);

  const handleSaveVibeAsPlaylist = useCallback(async () => {
    const token = outlet?.user?.token || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null')?.token : null);

    if (!token) {
      alert('Please login to save playlists.');
      return;
    }

    if (!dailySongs.length) {
      alert('No songs available to save for this vibe yet.');
      return;
    }

    try {
      const existing = await getPlaylists(token);
      const normalizedName = `${vibeName} Vibe Mix`.trim().toLowerCase();
      const existingPlaylist = (existing || []).find((playlist) => String(playlist?.name || '').trim().toLowerCase() === normalizedName);

      if (existingPlaylist) {
        const playlistId = existingPlaylist.id || existingPlaylist._id;
        if (playlistId) {
          await deletePlaylist(playlistId, token);
        }
        setIsSaved(false);
        setVibeMenuOpen(false);
        return;
      }

      const created = await createPlaylist({
        name: `${vibeName} Vibe Mix`,
        description: `Auto-generated playlist for ${vibeName}`,
        isPublic: false
      }, token);

      const playlistId = created?.id || created?._id;
      if (!playlistId) {
        throw new Error('Playlist was created but no ID was returned.');
      }

      for (const song of dailySongs) {
        if (!song?.id) continue;
        await addSongToPlaylist(playlistId, song.id, token);
      }

      setIsSaved(true);
      setVibeMenuOpen(false);
      navigate('/playlists');
    } catch (error) {
      console.error('Failed to save vibe as playlist:', error);
      alert('Could not save this vibe as a playlist. Please try again.');
    }
  }, [dailySongs, navigate, outlet, vibeName]);

  const toggleSearch = useCallback(() => {
    setSearchOpen(v => {
      const next = !v;
      if (!next) setSearchTerm('');
      return next;
    });
  }, []);

  const formatDuration = useCallback((song) => {
    if (!song) return '0:00';
    const raw = song.duration ?? song.length ?? song.durationSeconds ?? song.totalTime ?? 0;
    const totalSeconds = Number(raw);
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0:00';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, []);

  const handleSelectSong = useCallback((songId) => {
    const queueSource = isVibeShuffleMode
      ? [...dailySongs].sort(() => Math.random() - 0.5)
      : dailySongs;

    const selectedIndex = queueSource.findIndex(s => String(s.id) === String(songId));

    if (setIsUsingMoodQueue && typeof setIsUsingMoodQueue === 'function') {
      setIsUsingMoodQueue(true);
    }

    if (setMoodQueue && typeof setMoodQueue === 'function') {
      setMoodQueue(queueSource);
    }

    if (setMoodQueueIndex && typeof setMoodQueueIndex === 'function') {
      setMoodQueueIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }

    if (typeof onSelectSong === 'function') {
      onSelectSong(songId, { queue: queueSource, source: 'vibe' });
    }
  }, [dailySongs, isVibeShuffleMode, onSelectSong, setIsUsingMoodQueue, setMoodQueue, setMoodQueueIndex]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      try { searchInputRef.current.focus(); } catch (error) {}
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleMobileScroll = () => {
      if (mobileScrollContainerRef.current) {
        const scrollTop = mobileScrollContainerRef.current.scrollTop;
        setIsHeaderExpanded(scrollTop < 50);
      }
    };

    const mobileContainer = mobileScrollContainerRef.current;
    if (mobileContainer) {
      mobileContainer.addEventListener('scroll', handleMobileScroll);
      return () => mobileContainer.removeEventListener('scroll', handleMobileScroll);
    }
  }, []);

  useEffect(() => {
    const handleDesktopScroll = () => {
      if (desktopScrollContainerRef.current) {
        const scrollTop = desktopScrollContainerRef.current.scrollTop;
        setIsHeaderExpanded(scrollTop < 50);
      }
    };

    const desktopContainer = desktopScrollContainerRef.current;
    if (desktopContainer) {
      desktopContainer.addEventListener('scroll', handleDesktopScroll);
      return () => desktopContainer.removeEventListener('scroll', handleDesktopScroll);
    }
  }, []);

  const getVibeImageUrl = (name) => {
    const imageMap = {
      'Relaxing': '/vibes/relaxing.jpg',
      'Driving': '/vibes/driving.jpg',
      'Focus & Work': '/vibes/focus.jpg',
      'Cooking / Dining': '/vibes/cooking.jpg',
      'Deep Sleep': '/vibes/deepsleep.jpg',
      'Workout & Gym': '/vibes/workout.jpg',
      'Romance or Date Night': '/vibes/datenight.jpg',
    };
    return imageMap[name] || '/vibes/relaxing.jpg';
  };

  if (!vibeName) {
    return <div className="p-8 text-center text-white">Vibe not found.</div>;
  }

  return (
    <>
      <div className="flex flex-col min-h-0 min-w-0 md:hidden">
        <div className="flex-grow flex flex-col min-h-0 min-w-0">
          <div className={`flex-shrink-0 transition-all duration-300 ${isHeaderExpanded ? 'bg-gray-900/80 p-6' : 'bg-gray-900/80 p-3'}`}>
            <div className="flex items-center gap-3 mb-0">
              <Link to="/" className="p-2 rounded-full bg-gray-900 hover:bg-gray-700 flex-shrink-0">
                <ArrowLeft size={20} />
              </Link>
              {isHeaderExpanded ? (
                <h1 className="flex-1"></h1>
              ) : (
                <h1 className="text-xl font-bold flex-1">{vibeName}</h1>
              )}
              <div className="flex items-center gap-2">
                {dailySongs.length > 0 && (
                  <button onClick={toggleSearch} className="p-2 rounded-full bg-gray-900 hover:bg-gray-700 flex-shrink-0">
                    {searchOpen ? <X size={18} /> : <Search size={18} />}
                  </button>
                )}
                {dailySongs.length > 0 && (
                  <button
                    onClick={handleToggleShuffle}
                    className={`p-2 rounded-full transition-all flex-shrink-0 ${
                      isVibeShuffleMode ? 'bg-blue-900 shadow-lg shadow-blue-500/50 animate-pulse' : 'bg-gray-900 hover:bg-gray-500'
                    }`}
                    title={isVibeShuffleMode ? 'Shuffle is on - songs will play randomly' : 'Shuffle is off - click to turn on'}
                  >
                    <Shuffle size={20} className="text-white" />
                  </button>
                )}
              </div>
            </div>

            {isHeaderExpanded && dailySongs.length > 0 && (
              <div className="mt-4 flex items-center">
                <ImageWithFallback
                  src={getVibeImageUrl(vibeName)}
                  alt={vibeName}
                  className="w-24 h-22 rounded-lg object-cover shadow-lg"
                  fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'}
                />
                <div className="w-full mt-3">
                  <h2 className="text-2xl font-bold ml-5 leading-none tracking-tight text-white">{vibeName}</h2>
                  <div className="mt-3 ml-5 flex items-center justify-start gap-5 md:gap-6">
                    <button
                      onClick={() => {
                        if (dailySongs.length > 0) {
                          handleSelectSong(dailySongs[0].id);
                        }
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 shadow-sm shadow-blue-500/40 transition-all hover:bg-blue-500"
                      aria-label={isPlaying ? 'Pause vibe playback' : 'Play vibe'}
                    >
                      {isPlaying ? <Pause className="h-5 w-5 fill-white text-white" /> : <Play className="ml-1 h-5 w-5 fill-white text-white" />}
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setVibeMenuOpen(!vibeMenuOpen)}
                        className="rounded-full bg-gray-800 p-2 text-white transition-colors hover:bg-gray-700"
                        aria-label="Vibe actions"
                      >
                        <MoreVertical size={20} />
                      </button>
                      {vibeMenuOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-40 bg-gray-800 rounded-lg shadow-lg z-20">
                          <button
                            onClick={() => {
                              handleToggleShuffle();
                              setVibeMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-700 rounded-t-lg flex items-center gap-2 text-white transition-colors"
                          >
                            <Shuffle size={16} />
                            <span>Shuffle</span>
                          </button>
                          <button
                            onClick={async () => {
                              await handleSaveVibeAsPlaylist();
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2 text-white transition-colors"
                          >
                            <Bookmark size={16} className={isSaved ? 'fill-current text-blue-400' : ''} />
                            <span>{isSaved ? 'Already Saved' : 'Save'}</span>
                          </button>
                          <button
                            onClick={() => {
                              if (onAddToQueue && dailySongs.length > 0) {
                                onAddToQueue(dailySongs);
                              }
                              setVibeMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-700 rounded-b-lg flex items-center gap-2 text-white transition-colors"
                          >
                            <Plus size={16} />
                            <span>Add to Queue</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {searchOpen && (
            <div className="flex-shrink-0 bg-gray-900/80 px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={`Search within ${vibeName} vibe...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-800/40 text-white rounded-full py-2 pl-10 pr-3 text-sm focus:outline-none focus:bg-gray-800"
                  autoComplete="off"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          <hr className="h-px bg-gray-500" />
          <div ref={mobileScrollContainerRef} className="flex-grow overflow-y-auto custom-scrollbar p-4">
          {filteredSongs.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {filteredSongs.map((song) => {
                const isActive = currentSongId === song.id && isPlaying;
                return (
                  <div
                    key={song.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectSong(song.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectSong(song.id);
                      }
                    }}
                    className={`group relative p-1 cursor-pointer transition-colors ${isActive ? 'bg-blue-900/30' : 'bg-gray-900/50 hover:bg-gray-700/80'}`}
                  >
                    <div className="relative flex gap-3 items-start">
                      <div onClick={() => handleSelectSong(song.id)} className="cursor-pointer flex-shrink-0">
                        <ImageWithFallback
                          src={song.coverUrl || song.cover}
                          alt={song.title}
                          className="w-10 h-10 rounded-md object-cover"
                          fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'}
                        />
                      </div>
                      <div className="flex-grow min-w-0 overflow-hidden">
                        <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-blue-300' : 'text-white'}`}>{song.title}</h4>
                        <p className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</p>
                      </div>
                      <div className="flex-shrink-0 ml-auto">
                        <SongContextMenu
                          song={song}
                          onAddToQueue={onAddToQueue}
                          onAddToPlaylist={onAddToPlaylist}
                          onNavigateToArtist={(artist) => navigate(`/artist/${encodeURIComponent(artist)}`)}
                          onReport={() => {}}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-10">
              <p className="text-lg">No songs found for {vibeName} vibe.</p>
              <p className="text-sm mt-2">Try uploading songs for this vibe.</p>
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:flex md:flex-grow md:min-h-0 md:min-w-0 md:overflow-hidden md:flex-row">
        <div className="flex-shrink-0 transition-all duration-300 bg-gray-900/80 p-6 md:w-[430px] md:min-w-[430px] md:sticky md:top-0 md:h-full md:border-r md:border-gray-800 md:p-5">
          <div className="flex items-center gap-3 mb-0 md:mb-4">
            <Link to="/" className="p-2 rounded-full bg-gray-900 hover:bg-gray-700 flex-shrink-0">
              <ArrowLeft size={20} />
            </Link>
          </div>

          {dailySongs.length > 0 && (
            <div className="mt-4 md:mt-8 md:flex md:flex-col md:items-center md:text-center">
              <ImageWithFallback
                src={getVibeImageUrl(vibeName)}
                alt={vibeName}
                className="w-56 h-56 rounded-xl object-cover shadow-lg md:w-64 md:h-64"
                fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'}
              />
              <div className="flex-1 mt-5 md:mt-7 md:w-full">
                <h2 className="text-4xl leading-none tracking-tight font-bold text-white md:text-4xl">{vibeName}</h2>
                <div className="mt-6 flex items-center justify-center gap-5 md:gap-6">
                  <button
                    onClick={async () => {
                      await handleSaveVibeAsPlaylist();
                    }}
                    className="rounded-full p-2 text-white transition-colors hover:bg-gray-700"
                    aria-label="Save vibe as playlist"
                  >
                    <Bookmark size={20} className={isSaved ? 'fill-current text-blue-400' : ''} />
                  </button>
                  <button
                    onClick={() => {
                      if (dailySongs.length > 0) {
                        handleSelectSong(dailySongs[0].id);
                      }
                    }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-sm shadow-blue-500/40 transition-all hover:bg-blue-500 md:h-16 md:w-16"
                    aria-label={isPlaying ? 'Pause vibe playback' : 'Play vibe'}
                  >
                    {isPlaying ? <Pause className="h-7 w-7 fill-white text-white md:h-8 md:w-8" /> : <Play className="ml-1 h-7 w-7 fill-white text-white md:h-8 md:w-8" />}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setVibeMenuOpen(!vibeMenuOpen)}
                      className="rounded-full bg-gray-800 p-2 text-white transition-colors hover:bg-gray-700"
                      aria-label="Vibe actions"
                    >
                      <MoreVertical size={20} />
                    </button>
                    {vibeMenuOpen && (
                      <div className="absolute right-0 bottom-full mb-2 w-40 bg-gray-800 rounded-lg shadow-lg z-20">
                        <button
                          onClick={() => {
                            handleToggleShuffle();
                            setVibeMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 rounded-t-lg flex items-center gap-2 text-white transition-colors"
                        >
                          <Shuffle size={16} />
                          <span>Shuffle</span>
                        </button>
                        <button
                          onClick={async () => {
                            await handleSaveVibeAsPlaylist();
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2 text-white transition-colors"
                        >
                          <Bookmark size={16} className={isSaved ? 'fill-current text-blue-400' : ''} />
                          <span>{isSaved ? 'Already Saved' : 'Save'}</span>
                        </button>
                        <button
                          onClick={() => {
                            if (onAddToQueue && dailySongs.length > 0) {
                              onAddToQueue(dailySongs);
                            }
                            setVibeMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 rounded-b-lg flex items-center gap-2 text-white transition-colors"
                        >
                          <Plus size={16} />
                          <span>Add to Queue</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-shrink-0 bg-gray-900/80 px-4 py-2 pb-2 md:px-6 md:pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={`Search songs in ${vibeName}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800/40 text-white rounded py-2 pl-10 pr-10 text-sm focus:outline-none focus:bg-gray-800"
                autoComplete="off"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div ref={desktopScrollContainerRef} className="flex-grow mt-2 overflow-y-auto custom-scrollbar p-4 md:p-4">
            {filteredSongs.length > 0 ? (
              <div className="space-y-1 md:space-y-1 mr-8">
                {filteredSongs.map((song) => {
                  const isActive = currentSongId === song.id && isPlaying;
                  return (
                    <div
                      key={song.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectSong(song.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectSong(song.id);
                        }
                      }}
                      className={`group relative flex cursor-pointer items-center border-b gap-1 rounded border-gray-800 bg-gray-900/50 px-1 py-1 transition-colors hover:bg-gray-700/80 md:gap-4 md:px-1 md:py-1 overflow-visible z-0 ${isActive ? 'border-blue-500 bg-blue-900/20' : ''}`}
                    >
                      <div className="flex-shrink-0">
                        <ImageWithFallback
                          src={song.coverUrl || song.cover}
                          alt={song.title}
                          className="h-10 w-10 rounded object-cover md:h-10 md:w-10"
                          fallback={'https://placehold.co/400x400/1F2937/FFFFFF?text=Music'}
                        />
                      </div>

                      <div className="flex flex-1 items-center justify-between gap-3 overflow-visible">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white md:text-base">{song.title}</div>
                          <div className="truncate text-xs text-gray-400 md:text-sm">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-gray-300 md:text-sm mr-4">{formatDuration(song)}</span>
                          <div className="relative z-50 md:opacity-1 md:group-hover:opacity-100 md:transition-opacity mr-5">
                            <SongContextMenu
                              song={song}
                              onAddToQueue={onAddToQueue}
                              onAddToPlaylist={onAddToPlaylist}
                              onNavigateToArtist={(artist) => navigate(`/artist/${encodeURIComponent(artist)}`)}
                              onReport={() => {}}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-10">
                <p className="text-lg">No songs found for {vibeName} vibe.</p>
                <p className="text-sm mt-2">Try uploading songs for this vibe.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default VibePage;
