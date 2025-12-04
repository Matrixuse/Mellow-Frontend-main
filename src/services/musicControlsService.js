// Wrapper for cordova-plugin-music-controls2
// Usage: install plugin: npm i cordova-plugin-music-controls2 && npx cap sync android
// Then import this service and call start(track), updateIsPlaying(bool), updateMetadata(track), stop()

class MusicControlsService {
  constructor() {
    this.available = !!window.MusicControls || !!(window.cordova && window.cordova.plugins && window.cordova.plugins.MusicControls);
    this.subscribed = false;
  }

  isAvailable() {
    return this.available;
  }

  // Create the notification and show controls on lock screen
  // track: { id, title, artist, coverUrl }
  start(track, isPlaying = true) {
    if (!this.available) return Promise.resolve(false);

    // plugin sometimes lives at window.MusicControls or window.cordova.plugins.MusicControls
    const MC = window.MusicControls || (window.cordova && window.cordova.plugins && window.cordova.plugins.MusicControls);
    if (!MC) return Promise.resolve(false);

    const defaults = {
      track: track.title || 'Unknown Title',
      artist: Array.isArray(track.artist) ? track.artist.join(', ') : track.artist || '',
      cover: track.coverUrl || '/logo.png', // URL or local path
      isPlaying: !!isPlaying,
      dismissable: false,
      hasPrev: true,
      hasNext: true,
      hasClose: true,
      // Android-specific
      // ticker: 'Now playing',
      // playIcon: 'media_play',
    };

    return new Promise((resolve) => {
      try {
        MC.create(defaults, () => {
          // created
          if (!this.subscribed) {
            MC.subscribe((action) => {
              // action will be an object with message property
              const message = action && action.message ? action.message : action;
              // forward events via a simple event system
              this.onEvent && this.onEvent(message);
            });
            this.subscribed = true;
          }
          resolve(true);
        }, (err) => {
          console.warn('MusicControls.create error', err);
          resolve(false);
        });
      } catch (e) {
        console.error('MusicControls.create threw', e);
        resolve(false);
      }
    });
  }

  updateIsPlaying(isPlaying) {
    if (!this.available) return;
    const MC = window.MusicControls || (window.cordova && window.cordova.plugins && window.cordova.plugins.MusicControls);
    try {
      MC.updateIsPlaying(isPlaying);
    } catch (e) {
      console.warn('MusicControls.updateIsPlaying error', e);
    }
  }

  updateMetadata(track) {
    if (!this.available) return;
    const MC = window.MusicControls || (window.cordova && window.cordova.plugins && window.cordova.plugins.MusicControls);
    try {
      MC.updateIsPlaying(!!track.isPlaying);
      MC.updateMetadata({
        track: track.title || 'Unknown Title',
        artist: Array.isArray(track.artist) ? track.artist.join(', ') : track.artist || '',
        cover: track.coverUrl || '/logo.png'
      });
    } catch (e) {
      console.warn('MusicControls.updateMetadata error', e);
    }
  }

  stop() {
    if (!this.available) return;
    const MC = window.MusicControls || (window.cordova && window.cordova.plugins && window.cordova.plugins.MusicControls);
    try {
      MC.destroy(() => {
        // destroyed
      });
    } catch (e) {
      console.warn('MusicControls.destroy error', e);
    }
  }

  // Simple event registration
  setEventHandler(fn) {
    this.onEvent = fn; // fn receives messages like 'music-controls-next', 'music-controls-pause', etc.
  }
}

const musicControlsService = new MusicControlsService();
export default musicControlsService;
