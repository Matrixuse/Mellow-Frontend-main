Media notifications & lock-screen controls (Android)

This project uses the Web Media Session API for web/desktop, but Android needs a native media notification/foreground service to show controls on the lock screen. Follow these steps to enable media notifications in the Android build.

Quick plugin route (recommended for speed)

1. Install cordova-plugin-music-controls2

   npm install cordova-plugin-music-controls2
   npx cap sync android

2. Manifest permission

   We already added the runtime permission to the manifest:
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

   Note: You must still request the permission at runtime on Android 13+ (API 33).

3. Usage (JS)

   - Import the wrapper: `import musicControlsService from './services/musicControlsService';`
   - Start controls when playback starts:

       await musicControlsService.start({ id: song.id, title: song.title, artist: song.artist, coverUrl: song.coverUrl }, true);

   - Subscribe to events:

       musicControlsService.setEventHandler((msg) => {
         // handle messages: 'music-controls-next', 'music-controls-pause', 'music-controls-play', 'music-controls-previous', 'music-controls-destroy'
       });

   - Update playback state:

       musicControlsService.updateIsPlaying(true);
       musicControlsService.updateMetadata({ title, artist, coverUrl, isPlaying });

   - Stop and remove notification when playback stops:

       musicControlsService.stop();

4. Request notification permission on Android 13+

   Implement a small native request or use a plugin to call ActivityCompat.requestPermissions for POST_NOTIFICATIONS. Alternatively you can prompt users to enable notifications via app settings.

5. Build & test

   - Open Android Studio: `npx cap open android`
   - Build and run on device/emulator
   - Start playback in the app. Lock the device and verify controls are visible on the lock screen.

Native route (robust, recommended for production)

- Implement a MediaPlaybackService that uses MediaSessionCompat and NotificationCompat.MediaStyle to show a media notification and handle media buttons.
- Register the service in AndroidManifest.xml and expose start/update/stop APIs via a Capacitor plugin so your JS can control it.

Debugging tips

- adb shell input keyevent KEYCODE_MEDIA_PLAY_PAUSE
- adb logcat | findstr MusicControls
- adb shell dumpsys notification --noredact | findstr music-player

If lock screen controls still don't appear after adding the plugin and permissions, check:
- Plugin installed correctly (check `android/app/src/main/assets/public/index.html` or use `npx cap sync android`)
- Notification permission granted on device (Android 13+)
- OEM battery optimizations blocking background/foreground services

If you'd like, I can also scaffold a Kotlin `MediaPlaybackService` and a small Capacitor plugin instead of the plugin approach. If you want that, tell me and I will create the native files and manifest entries.
