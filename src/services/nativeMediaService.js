import { Capacitor } from '@capacitor/core';
import musicControlsService from './musicControlsService';

// Try to resolve the NativeMedia plugin from Capacitor.Plugins (if available) or fallback to window.NativeMedia
const NativeMedia = (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.NativeMedia)
  ? Capacitor.Plugins.NativeMedia
  : (typeof window !== 'undefined' ? window.NativeMedia : null);

const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');

let _serviceStarted = false;
let _lastPayloadKey = null;
let _lastIsPlaying = null;
let _lastIsPlayingTs = 0;
let _lastPositionSentTs = 0;
// Debounce pending metadata updates to avoid spamming the native service
let _pendingPayload = null;
let _debounceTimer = null;
const DEBOUNCE_MS = 300; // throttle metadata updates to at most ~3/sec

const nativeMediaService = {
  async start(track, isPlaying = true) {
    if (!isAndroid) return false;

    const payload = {
      title: track.title || 'Mellow',
      artist: Array.isArray(track.artist) ? track.artist.join(', ') : (track.artist || ''),
      cover: track.coverUrl || ''
    };
    const payloadKey = `${payload.title}|${payload.artist}|${payload.cover}`;

    try {
      if (NativeMedia && NativeMedia.startService) {
        if (_serviceStarted && _lastPayloadKey === payloadKey) {
          try { await NativeMedia.updateMetadata(payload); } catch (e) {}
          return true;
        }
        if (_serviceStarted && _lastPayloadKey !== payloadKey) {
          try { await NativeMedia.updateMetadata(payload); _lastPayloadKey = payloadKey; } catch (e) { console.warn('NativeMedia.updateMetadata error', e); }
          return true;
        }
        await NativeMedia.startService(payload);
        _serviceStarted = true;
        _lastPayloadKey = payloadKey;
        return true;
      }
    } catch (e) {
      console.warn('NativeMedia.start error', e);
    }

    if (musicControlsService.isAvailable()) {
      _serviceStarted = true;
      _lastPayloadKey = `${track.title || 'Mellow'}|${Array.isArray(track.artist) ? track.artist.join(', ') : track.artist || ''}|${track.coverUrl || ''}`;
      return musicControlsService.start(track, isPlaying);
    }
    return false;
  },

  async stop() {
    if (!isAndroid) return;
    try {
      if (NativeMedia && NativeMedia.stopService) {
        await NativeMedia.stopService();
        _serviceStarted = false;
        _lastPayloadKey = null;
        return;
      }
    } catch (e) {
      console.warn('NativeMedia.stop error', e);
    }
    if (musicControlsService.isAvailable()) {
      musicControlsService.stop();
    }
  },

  async updateMetadata(track) {
    if (!isAndroid) return;
    try {
      if (NativeMedia && NativeMedia.updateMetadata) {
        const payload = {
          title: track.title || 'Mellow',
          artist: Array.isArray(track.artist) ? track.artist.join(', ') : (track.artist || ''),
          cover: track.coverUrl || ''
        };
        const payloadKey = `${payload.title}|${payload.artist}|${payload.cover}`;
        if (_lastPayloadKey === payloadKey) {
          _lastPayloadKey = payloadKey;
          return;
        }
        _pendingPayload = { payload, payloadKey };
        if (_debounceTimer) clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(async () => {
          try {
            if (!_pendingPayload) return;
            const { payload: toSend, payloadKey: keyToSend } = _pendingPayload;
            if (_lastPayloadKey !== keyToSend) {
              await NativeMedia.updateMetadata(toSend);
              _lastPayloadKey = keyToSend;
            }
          } catch (e) {
            console.warn('NativeMedia.updateMetadata (debounced) error', e);
          } finally {
            _pendingPayload = null;
            _debounceTimer = null;
          }
        }, DEBOUNCE_MS);
        return;
      }
    } catch (e) {
      console.warn('NativeMedia.updateMetadata error', e);
    }
    if (musicControlsService.isAvailable()) {
      musicControlsService.updateMetadata(track);
    }
  },

  async updateIsPlaying(isPlaying) {
    if (!isAndroid) return;
    try {
      const now = Date.now();
      if (_lastIsPlaying !== null && _lastIsPlaying === isPlaying && (now - _lastIsPlayingTs) < 500) {
        return;
      }
      _lastIsPlaying = isPlaying;
      _lastIsPlayingTs = now;
      if (NativeMedia && NativeMedia.updateIsPlaying) {
        try { await NativeMedia.updateIsPlaying({ isPlaying }); } catch (e) {}
        return;
      }
      if (musicControlsService.isAvailable()) {
        musicControlsService.updateIsPlaying(isPlaying);
      }
    } catch (e) {
      console.warn('NativeMedia.updateIsPlaying error', e);
    }
  },

  async updatePosition(positionMs) {
    if (!isAndroid) return;
    try {
      const now = Date.now();
      if (_lastPositionSentTs && (now - _lastPositionSentTs) < 800) {
        return;
      }
      _lastPositionSentTs = now;
      if (NativeMedia && NativeMedia.updatePosition) {
        try { await NativeMedia.updatePosition({ position: positionMs }); } catch (e) {}
        return;
      }
    } catch (e) {
      console.warn('NativeMedia.updatePosition error', e);
    }
  }
};

export default nativeMediaService;
