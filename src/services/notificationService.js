// Mobile notification service
class NotificationService {
    constructor() {
        this.permission = null;
        this.isSupported = 'Notification' in window;
        this.init();
    }

    async init() {
        if (this.isSupported) {
            this.permission = Notification.permission;
        }
    }

    async requestPermission() {
        if (!this.isSupported) {
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        if (this.permission === 'default') {
            this.permission = await Notification.requestPermission();
            return this.permission === 'granted';
        }

        return false;
    }

    showNotification(title, options = {}) {
        if (!this.isSupported || this.permission !== 'granted') {
            return null;
        }

        const defaultOptions = {
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'music-player',
            requireInteraction: false,
            silent: false,
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);
            
            // Auto-close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);

            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
            return null;
        }
    }

    showSongNotification(song) {
        const title = 'Now Playing';
        const body = `${song.title} - ${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}`;
        
        return this.showNotification(title, {
            body,
            icon: song.coverUrl || '/logo.png',
            tag: `song-${song.id}`,
            requireInteraction: false
        });
    }

    showUploadNotification(songTitle) {
        const title = 'Song Uploaded';
        const body = `${songTitle} has been added to your library`;
        
        return this.showNotification(title, {
            body,
            tag: 'song-upload',
            requireInteraction: false
        });
    }

    showPlaylistNotification(playlistName) {
        const title = 'Playlist Created';
        const body = `${playlistName} has been created successfully`;
        
        return this.showNotification(title, {
            body,
            tag: 'playlist-created',
            requireInteraction: false
        });
    }

    closeAllNotifications() {
        if (this.isSupported && this.permission === 'granted') {
            // Close notifications with our tag
            const notifications = ['music-player', 'song-upload', 'playlist-created'];
            notifications.forEach(tag => {
                // Note: There's no direct way to close notifications by tag
                // This is a limitation of the Web Notifications API
            });
        }
    }

    isPermissionGranted() {
        return this.permission === 'granted';
    }

    isAvailable() {
        return this.isSupported;
    }
}

// Create a singleton instance
const notificationService = new NotificationService();

export default notificationService;
