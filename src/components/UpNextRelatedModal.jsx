import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Shuffle, MoreVertical } from 'lucide-react';
import { useDrag } from '@use-gesture/react';
import { useSpring } from '@react-spring/web';

const UpNextRelatedModal = ({ isOpen, onClose, currentSong, isPlaying, onPlayPause, onNext, onPrev, queue = [], relatedSongs = [], initialTab = 'upnext', onTogglePlayerExpand = () => {}, isShuffle = false, onShuffleToggle = () => {}, onSelectSong = () => {}, onAddToQueue = () => {}, onAddToPlaylist = () => {}, onShowArtist = () => {}, onReportSong = () => {} }) => {
    const [activeTab, setActiveTab] = React.useState(initialTab); // 'upnext' or 'related'
    const [openMenuId, setOpenMenuId] = useState(null);
    const contentRef = useRef(null);
    const containerRef = useRef(null);

    // spring for y translation (slower gesture animation: lower tension, higher friction)
    const SPRING_CONFIG = { tension: 1200, friction: 40 };
    const [{ y }, api] = useSpring(() => ({ y: 0, config: SPRING_CONFIG }));

    useEffect(() => {
        // when modal opens, ensure active tab follows the initialTab prop
        if (isOpen) {
            setActiveTab(initialTab || 'upnext');
            api.start({ y: 0 });
        }
        // lock body scroll while modal is open so the modal itself scrolls
        try {
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            }
        } catch (e) {}
        return () => {
            try { document.body.style.overflow = ''; } catch (e) {}
        };
    }, [isOpen, initialTab, api]);

    const dragHandleRef = useRef(null);

    // useDrag handler for vertical drag/minimize (attach to header so content can scroll)
    useDrag(({ last, movement: [, my], direction: [, dy], velocity: [, vy], event, first, active }) => {
        // allow content scroll when user is scrolling up (negative my) or content has scrollTop > 0
        try {
            const contentEl = contentRef.current;
            const atTop = !contentEl || contentEl.scrollTop <= 0;
            const shouldDrag = my > 0 && atTop;
            if (!shouldDrag && !active) return;
            // clamp
            const to = shouldDrag ? Math.min(my, window.innerHeight) : 0;
            if (!last) {
                api.start({ y: to, immediate: true });
                // Only prevent default when the gesture indicates an intentional drag
                // (movement beyond a small slop) and the content is at the top. This
                // preserves native scrolling inside long lists while still allowing
                // drag-to-dismiss from the top.
                if (event && event.cancelable && Math.abs(my) > 6 && atTop) {
                    try { event.preventDefault(); } catch (e) {}
                }
            } else {
                const threshold = 120;
                const shouldClose = my > threshold || (vy > 0.8 && dy > 0);
                    if (shouldClose) {
                    // expand player first so it can animate in from top, then close modal
                    try { onTogglePlayerExpand && onTogglePlayerExpand(); } catch (e) {}
                    api.start({ y: window.innerHeight, immediate: false, config: SPRING_CONFIG });
                    setTimeout(() => {
                        try { onClose && onClose(); } catch (e) {}
                        api.start({ y: 0, immediate: true });
                    }, 260);
                    } else {
                    api.start({ y: 0, immediate: false, config: SPRING_CONFIG });
                }
            }
        } catch (err) {
            // swallow errors
            console.debug('useDrag error', err);
        }
    }, {
        target: dragHandleRef,
        axis: 'y',
        from: () => [0, y.get()],
        filterTaps: true,
        pointer: { touch: true },
        eventOptions: { passive: false }
    });
    // horizontal swipe between tabs: keep the simple touch-based approach
    // small lightweight handler bound to contentRef only (no preventDefault)
    useEffect(() => {
        let startX = 0;
        let endX = 0;
        const el = contentRef.current;
        if (!el) return;
        const onTouchStart = (e) => { if (e.touches && e.touches[0]) startX = e.touches[0].clientX; };
        const onTouchEnd = (e) => { if (e.changedTouches && e.changedTouches[0]) { endX = e.changedTouches[0].clientX; const dist = startX - endX; if (dist > 50 && activeTab === 'upnext') setActiveTab('related'); else if (dist < -50 && activeTab === 'related') setActiveTab('upnext'); } };
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchend', onTouchEnd, { passive: true });
        return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchend', onTouchEnd); };
    }, [activeTab]);

    if (!isOpen) return null;

    const upNextItems = Array.isArray(queue) ? queue : [];
    const relatedItems = Array.isArray(relatedSongs) ? relatedSongs : [];

    

    return (
        <div className="fixed inset-0 bg-black/40 md:hidden z-50 animate-in fade-in duration-300">
                <div ref={containerRef} style={{ transform: y.to(v => `translateY(${v}px)`), touchAction: 'pan-y' }} className="fixed inset-0 top-0 bg-gradient-to-b from-gray-900 to-gray-950 z-50 flex flex-col slide-in-from-bottom duration-300 rounded-t-3xl max-h-screen">
                {/* Mini Player Bar at Top (click to expand) */}
                {currentSong && (
                    <div ref={dragHandleRef} style={{ touchAction: 'none' }} className="bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700 p-2 flex-shrink-0">
                        <div role="button" tabIndex={0} onClick={(e) => {
                                e.stopPropagation();
                                // animate modal down then open expanded player
                                try { onTogglePlayerExpand && onTogglePlayerExpand(); } catch (err) {}
                                api.start({ y: window.innerHeight, immediate: false, config: SPRING_CONFIG });
                                setTimeout(() => { try { onClose && onClose(); } catch (err) {} }, 260);
                            }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { onTogglePlayerExpand && onTogglePlayerExpand(); } catch (err) {} api.start({ y: window.innerHeight, immediate: false }); setTimeout(() => { try { onClose && onClose(); } catch (err) {} }, 260); } }} className="w-full flex items-center gap-2 text-left">
                            <img 
                                src={currentSong.coverUrl} 
                                alt={currentSong.title} 
                                className="w-10 h-10 rounded object-cover flex-shrink-0"
                                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/1F2937/FFFFFF?text=Music'; }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-white truncate">{currentSong.title}</div>
                                <div className="text-xs text-gray-400 truncate">{Array.isArray(currentSong.artist) ? currentSong.artist.join(', ') : (currentSong.artist || '')}</div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <button type="button" onClick={(e) => { e.stopPropagation(); onShuffleToggle && onShuffleToggle(); }} className={`p-3 rounded-full ${isShuffle ? 'text-blue-400' : 'text-gray-300'}`} aria-label="Shuffle">
                                    <Shuffle size={18} />
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); onPlayPause && onPlayPause(); }} className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full text-white" aria-label="Play/Pause">
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Indicator and Title */}
                <div className="border-b border-gray-700 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                        <button 
                            onClick={() => setActiveTab('upnext')}
                            className={`flex-1 text-center py-2 text-xs font-bold uppercase transition-colors ${activeTab === 'upnext' ? 'text-blue-400' : 'text-gray-400'}`}
                        >
                            UP NEXT
                        </button>
                        <button 
                            onClick={() => setActiveTab('related')}
                            className={`flex-1 text-center py-2 text-xs font-bold uppercase transition-colors ${activeTab === 'related' ? 'text-blue-400' : 'text-gray-400'}`}
                        >
                            RELATED
                        </button>
                    </div>
                    {/* Active tab underline */}
                    <div className="relative h-0.5 bg-gray-700 rounded">
                        <div 
                            className="absolute h-full bg-blue-400 rounded transition-all duration-300"
                            style={{
                                left: activeTab === 'upnext' ? '0%' : '50%',
                                width: '50%'
                            }}
                        />
                    </div>
                </div>

                {/* Content Area with Swipe */}
                <div 
                    ref={contentRef}
                    className="flex-1 overflow-auto"
                >
                    {activeTab === 'upnext' ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
                            {upNextItems.length > 0 ? (
                                <div className="space-y-2">
                                    
                                    {upNextItems.map((song, index) => {
                                        const isActive = currentSong && String(song.id) === String(currentSong.id);
                                        return (
                                        <div key={`${song.id}-${index}`} className={`flex items-center gap-2 p-2 rounded transition-colors relative ${isActive ? 'bg-gradient-to-r from-blue-900/25 to-transparent' : 'hover:bg-gray-700/30'}`}>
                                            <img 
                                                src={song.coverUrl} 
                                                alt={song.title}
                                                className={`w-10 h-10 rounded object-cover flex-shrink-0 ${isActive ? 'ring-2 ring-blue-500' : ''}`}
                                                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/1F2937/FFFFFF?text=Music'; }}
                                            />
                                            <div onClick={() => { try { onSelectSong && onSelectSong(song.id); } catch (e) {} }} className="flex-1 min-w-0 cursor-pointer">
                                                <div className={`text-sm font-medium ${isActive ? 'text-blue-300' : 'text-white'} truncate`}>{song.title}</div>
                                                <div className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(',') : (song.artist || '')}</div>
                                            </div>
                                            {isActive && (
                                                <div className="flex items-center text-blue-400 ml-2">
                                                    <Play size={14} />
                                                </div>
                                            )}
                                            <div className="flex-shrink-0">
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === song.id ? null : song.id); }} className="p-2 rounded hover:bg-gray-700/20 text-gray-300">
                                                    <MoreVertical size={16} />
                                                </button>
                                                {openMenuId === song.id && (
                                                    <div className="absolute right-3 top-12 w-48 bg-[#15202B] border border-[#2A3942] rounded-md shadow-lg text-left py-1 z-50">
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onAddToQueue && onAddToQueue(song, 'end'); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100">Add to Queue</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onAddToPlaylist && onAddToPlaylist(song.id); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100">Add to Playlist</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onShowArtist && onShowArtist(Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100">Artist</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onReportSong && onReportSong(song.id); }} className="w-full text-left px-3 py-2 text-rose-400 hover:bg-[#121a20]">Report</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-32">
                                    <p className="text-gray-400 text-sm">No songs in queue</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
                            {relatedItems.length > 0 ? (
                                <div className="space-y-2">
                                    
                                    {relatedItems.map((song, index) => (
                                        <div key={`${song.id}-${index}`} className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/30 transition-colors relative">
                                            <img 
                                                src={song.coverUrl} 
                                                alt={song.title} 
                                                className="w-10 h-10 rounded object-cover flex-shrink-0"
                                                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/1F2937/FFFFFF?text=Music'; }}
                                            />
                                            <div onClick={() => { try { onSelectSong && onSelectSong(song.id); } catch (e) {} }} className="flex-1 min-w-0 cursor-pointer">
                                                <div className="text-sm font-medium text-white truncate">{song.title}</div>
                                                <div className="text-xs text-gray-400 truncate">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</div>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === song.id ? null : song.id); }} className="p-2 rounded hover:bg-gray-700/20 text-gray-300">
                                                    <MoreVertical size={16} />
                                                </button>
                                                {openMenuId === song.id && (
                                                    <div className="absolute right-3 top-12 w-48 bg-[#15202B] border border-[#2A3942] rounded-md shadow-lg text-left py-1 z-50">
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onAddToQueue && onAddToQueue(song, 'end'); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100">Add to Queue</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onAddToPlaylist && onAddToPlaylist(song.id); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100">Add to Playlist</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onShowArtist && onShowArtist(Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')); }} className="w-full text-left px-3 py-2 hover:bg-[#121a20] text-gray-100">Artist</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onReportSong && onReportSong(song.id); }} className="w-full text-left px-3 py-2 text-rose-400 hover:bg-[#121a20]">Report</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-32">
                                    <p className="text-gray-400 text-sm">No related songs found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpNextRelatedModal;
