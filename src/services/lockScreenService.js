// Mobile lock screen controls service
class LockScreenService {
    constructor() {
        this.isSupported = 'mediaSession' in navigator;
        this.currentSong = null;
        this.playbackState = 'none';
        this.init();
    }

    init() {
        if (this.isSupported) {
            this.setupMediaSessionHandlers();
        }
    }

    setupMediaSessionHandlers() {
        // Handle play button press
        navigator.mediaSession.setActionHandler('play', () => {
            this.onPlay?.();
        });

        // Handle pause button press
        navigator.mediaSession.setActionHandler('pause', () => {
            this.onPause?.();
        });

        // Handle previous track button press
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            this.onPrevious?.();
        });

        // Handle next track button press
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            this.onNext?.();
        });

        // Handle seek backward
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            const skipTime = details.seekOffset || 10;
            this.onSeekBackward?.(skipTime);
        });

        // Handle seek forward
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            const skipTime = details.seekOffset || 10;
            this.onSeekForward?.(skipTime);
        });

        // Handle seek to specific position
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            this.onSeekTo?.(details.seekTime);
        });

        // Handle stop button press
        navigator.mediaSession.setActionHandler('stop', () => {
            this.onStop?.();
        });
    }

    setMetadata(song) {
        if (!this.isSupported || !song) return;

        this.currentSong = song;
        
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: Array.isArray(song.artist) ? song.artist.join(', ') : song.artist,
                album: 'Mellow Music Player',
                artwork: [
                    { src: song.coverUrl || '/logo.png', sizes: '96x96', type: 'image/png' },
                    { src: song.coverUrl || '/logo.png', sizes: '128x128', type: 'image/png' },
                    { src: song.coverUrl || '/logo.png', sizes: '192x192', type: 'image/png' },
                    { src: song.coverUrl || '/logo.png', sizes: '256x256', type: 'image/png' },
                    { src: song.coverUrl || '/logo.png', sizes: '384x384', type: 'image/png' },
                    { src: song.coverUrl || '/logo.png', sizes: '512x512', type: 'image/png' }
                ]
            });
        } catch (error) {
            console.error('Error setting media session metadata:', error);
        }
    }

    setPlaybackState(state) {
        if (!this.isSupported) return;

        this.playbackState = state;
        
        try {
            navigator.mediaSession.playbackState = state;
        } catch (error) {
            console.error('Error setting playback state:', error);
        }
    }

    setPositionState(positionState) {
        if (!this.isSupported) return;

        try {
            navigator.mediaSession.setPositionState({
                duration: positionState.duration || 0,
                playbackRate: positionState.playbackRate || 1.0,
                position: positionState.position || 0
            });
        } catch (error) {
            console.error('Error setting position state:', error);
        }
    }

    // Event handlers
    setEventHandlers(handlers) {
        this.onPlay = handlers.onPlay;
        this.onPause = handlers.onPause;
        this.onPrevious = handlers.onPrevious;
        this.onNext = handlers.onNext;
        this.onSeekBackward = handlers.onSeekBackward;
        this.onSeekForward = handlers.onSeekForward;
        this.onSeekTo = handlers.onSeekTo;
        this.onStop = handlers.onStop;
    }

    clearMetadata() {
        if (!this.isSupported) return;

        this.currentSong = null;
        navigator.mediaSession.metadata = null;
    }

    isAvailable() {
        return this.isSupported;
    }

    getCurrentSong() {
        return this.currentSong;
    }

    getPlaybackState() {
        return this.playbackState;
    }
}

// Create a singleton instance
const lockScreenService = new LockScreenService();

export default lockScreenService;
