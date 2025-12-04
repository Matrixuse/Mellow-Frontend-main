package com.mymusic.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import java.util.concurrent.Executors
import java.util.concurrent.ExecutorService
import androidx.core.app.NotificationCompat
import androidx.media.session.MediaButtonReceiver
import androidx.media.app.NotificationCompat.MediaStyle
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import com.bumptech.glide.Glide
import com.bumptech.glide.request.target.CustomTarget
import com.bumptech.glide.request.transition.Transition
import android.graphics.drawable.Drawable
import java.net.URL
import java.net.URLConnection
import java.io.InputStream

class MediaPlaybackService : Service() {
    private val TAG = "MediaPlaybackService"
    private val CHANNEL_ID = "mellow_media_channel"
    private val NOTIF_ID = 1001
    private var mediaSession: MediaSessionCompat? = null
    private var notificationManager: NotificationManager? = null
    private var foregroundStarted: Boolean = false
    private var metadataReceiver: android.content.BroadcastReceiver? = null
    private val notifLock = Any()
    companion object {
        // Visible to plugin to know if service is already running and avoid restart storms
        @JvmStatic
        var isRunning: Boolean = false
    }

    // Dedupe forwarding of media session controls to app to avoid duplicate toggles
    private var lastForwardedControl: String? = null
    private var lastForwardedControlTs: Long = 0
    // Suppress handling of incoming media button callbacks for a short window after
    // we've forwarded an action to JS. This prevents OS/button repeats and rapid
    // duplicate callbacks from re-triggering forwards.
    private var suppressIncomingMediaButtonsUntil: Long = 0
    // Authoritative expectation: when we forward a control we optimistically set the
    // expected playback state here and ignore incoming contradictory set-playback
    // broadcasts from JS for a short safety window. This helps break loops where
    // the service and JS race to flip state rapidly.
    private var expectedPlaybackState: Boolean? = null
    private var expectedPlaybackUntil: Long = 0

    // Debounce/coalesce notification updates to avoid flutter when metadata changes quickly
    private var pendingTitle: String? = null
    private var pendingArtist: String? = null
    private var pendingCover: String? = null
    private var pendingUpdateRunnable: Runnable? = null
    private val NOTIF_DEBOUNCE_MS: Long = 250 // short debounce window
    // Current Glide target so we can cancel stale loads
    private var currentGlideTarget: CustomTarget<android.graphics.Bitmap>? = null

    // Last full-notification payload key and timestamp to avoid redundant notify() calls
    private var lastNotifPayloadKey: String? = null
    private var lastNotifTs: Long = 0
    // Dedupe for set-playback broadcasts coming from JS
    private var lastSetPlaybackState: Boolean? = null
    private var lastSetPlaybackTs: Long = 0

    // Executor for background IO (image fetches)
    private var ioExecutor: ExecutorService? = null
    private var mainHandler: Handler? = null

    override fun onCreate() {
        super.onCreate()
        // mark running early so plugin can check before attempting to start service
        isRunning = true
        createChannel()
        Log.i(TAG, "onCreate called - creating MediaSession")
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        mediaSession = MediaSessionCompat(this, "MellowMediaSession")
        mediaSession?.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        )

        mediaSession?.setCallback(object : MediaSessionCompat.Callback() {
            override fun onPlay() {
                Log.i(TAG, "MediaSession onPlay")
                // Forward the control to the app (JS). JS will perform playback and
                // then call back via NativeMedia.updateIsPlaying to set the authoritative
                // playback state in this service. This prevents a control -> service -> JS
                // -> service loop that causes fluttering.
                    try {
                        val action = "play"
                        val now = System.currentTimeMillis()
                        // If we recently suppressed incoming media buttons, ignore
                        if (now < suppressIncomingMediaButtonsUntil) {
                            Log.i(TAG, "${now} Suppressed MediaSession onPlay due to recent forward (suppressUntil=$suppressIncomingMediaButtonsUntil)")
                            return
                        }
                        synchronized(notifLock) {
                            if (lastForwardedControl != null && lastForwardedControl == action && (now - lastForwardedControlTs) < 2000) {
                                Log.i(TAG, "${now} Ignoring duplicate MediaSession play forwarded to app (2000ms)")
                                return
                            }
                            lastForwardedControl = action
                            lastForwardedControlTs = now
                            // Suppress further incoming callbacks for a longer window
                            suppressIncomingMediaButtonsUntil = now + 2000
                            // Set authoritative expectation: we assume play is desired until JS confirms
                            expectedPlaybackState = true
                            expectedPlaybackUntil = now + 2000
                            Log.i(TAG, "${now} Forwarding play -> expectPlaying=${expectedPlaybackState} until=${expectedPlaybackUntil}")
                        }
                        val intent = Intent("com.mymusic.app.ACTION_MEDIA_CONTROL")
                        intent.putExtra("control", action)
                        sendBroadcast(intent)
                        Log.i(TAG, "MediaSession onPlay -> forwarded to app")
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to broadcast play control: ${e.message}")
                    }
            }

            override fun onPause() {
                Log.i(TAG, "MediaSession onPause")
                // Forward to app; app will call updateIsPlaying(false) to inform service
                    try {
                        val action = "pause"
                        val now = System.currentTimeMillis()
                        if (now < suppressIncomingMediaButtonsUntil) {
                            Log.i(TAG, "${now} Suppressed MediaSession onPause due to recent forward (suppressUntil=$suppressIncomingMediaButtonsUntil)")
                            return
                        }
                        synchronized(notifLock) {
                            if (lastForwardedControl != null && lastForwardedControl == action && (now - lastForwardedControlTs) < 2000) {
                                Log.i(TAG, "${now} Ignoring duplicate MediaSession pause forwarded to app (2000ms)")
                                return
                            }
                            lastForwardedControl = action
                            lastForwardedControlTs = now
                            suppressIncomingMediaButtonsUntil = now + 2000
                            expectedPlaybackState = false
                            expectedPlaybackUntil = now + 2000
                            Log.i(TAG, "${now} Forwarding pause -> expectPlaying=${expectedPlaybackState} until=${expectedPlaybackUntil}")
                        }
                        val intent = Intent("com.mymusic.app.ACTION_MEDIA_CONTROL")
                        intent.putExtra("control", action)
                        sendBroadcast(intent)
                        Log.i(TAG, "MediaSession onPause -> forwarded to app")
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to broadcast pause control: ${e.message}")
                    }
            }

            override fun onSkipToNext() {
                Log.i(TAG, "MediaSession onSkipToNext")
                    try {
                        val action = "next"
                        val now = System.currentTimeMillis()
                        if (now < suppressIncomingMediaButtonsUntil) {
                            Log.i(TAG, "${now} Suppressed MediaSession onSkipToNext due to recent forward (suppressUntil=$suppressIncomingMediaButtonsUntil)")
                            return
                        }
                        synchronized(notifLock) {
                            if (lastForwardedControl != null && lastForwardedControl == action && (now - lastForwardedControlTs) < 2000) {
                                Log.i(TAG, "${now} Ignoring duplicate MediaSession next forwarded to app (2000ms)")
                                return
                            }
                            lastForwardedControl = action
                            lastForwardedControlTs = now
                            suppressIncomingMediaButtonsUntil = now + 2000
                            // next/prev do not set expected playback state; only play/pause do
                            Log.i(TAG, "${now} Forwarding next -> suppressed until=${suppressIncomingMediaButtonsUntil}")
                        }
                        val intent = Intent("com.mymusic.app.ACTION_MEDIA_CONTROL")
                        intent.putExtra("control", action)
                        sendBroadcast(intent)
                        Log.i(TAG, "MediaSession onSkipToNext -> forwarded to app")
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to broadcast next control: ${e.message}")
                    }
            }

            override fun onSkipToPrevious() {
                Log.i(TAG, "MediaSession onSkipToPrevious")
                    try {
                        val action = "prev"
                        val now = System.currentTimeMillis()
                        if (now < suppressIncomingMediaButtonsUntil) {
                            Log.i(TAG, "${now} Suppressed MediaSession onSkipToPrevious due to recent forward (suppressUntil=$suppressIncomingMediaButtonsUntil)")
                            return
                        }
                        synchronized(notifLock) {
                            if (lastForwardedControl != null && lastForwardedControl == action && (now - lastForwardedControlTs) < 2000) {
                                Log.i(TAG, "${now} Ignoring duplicate MediaSession prev forwarded to app (2000ms)")
                                return
                            }
                            lastForwardedControl = action
                            lastForwardedControlTs = now
                            suppressIncomingMediaButtonsUntil = now + 2000
                            Log.i(TAG, "${now} Forwarding prev -> suppressed until=${suppressIncomingMediaButtonsUntil}")
                        }
                        val intent = Intent("com.mymusic.app.ACTION_MEDIA_CONTROL")
                        intent.putExtra("control", action)
                        sendBroadcast(intent)
                        Log.i(TAG, "MediaSession onSkipToPrevious -> forwarded to app")
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to broadcast prev control: ${e.message}")
                    }
            }
        })

        Log.i(TAG, "MediaSession created: " + (mediaSession != null))

        // init async helpers
        ioExecutor = Executors.newSingleThreadExecutor()
        mainHandler = Handler(Looper.getMainLooper())

        // Register receiver to listen for metadata update broadcasts from the plugin
        try {
            metadataReceiver = object : android.content.BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    try {
                        val action = intent?.action
                        if (action == "com.mymusic.app.ACTION_SET_PLAYBACK") {
                            val isPlaying = intent.getBooleanExtra("isPlaying", false)
                            Log.i(TAG, "metadataReceiver received set-playback: isPlaying=$isPlaying")
                            try {
                                        // Dedupe identical set-playback requests within a short window
                                        val now = System.currentTimeMillis()
                                        if (lastSetPlaybackState != null && lastSetPlaybackState == isPlaying && (now - lastSetPlaybackTs) < 500) {
                                            Log.i(TAG, "${now} Ignoring duplicate set-playback from JS (500ms)")
                                            return
                                        }
                                        // If the service recently forwarded a control and expects a particular
                                        // playback state, prefer the forwarded expectation: ignore contradictory
                                        // set-playback messages from JS until the expectation window expires.
                                        if (expectedPlaybackState != null && now < expectedPlaybackUntil) {
                                            if (isPlaying != expectedPlaybackState) {
                                                Log.i(TAG, "${now} Ignoring contradictory set-playback from JS (expected=${expectedPlaybackState}, until=${expectedPlaybackUntil})")
                                                return
                                            } else {
                                                // Confirmation from JS matches expectation: clear expectation
                                                Log.i(TAG, "${now} Received expected set-playback confirmation from JS: $isPlaying; clearing expectation")
                                                expectedPlaybackState = null
                                                expectedPlaybackUntil = 0
                                            }
                                        }
                                        lastSetPlaybackState = isPlaying
                                        lastSetPlaybackTs = now

                                        setPlaybackState(if (isPlaying) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED)
                                                    updateNotification()
                            } catch (e: Exception) {
                                Log.w(TAG, "Failed to apply playback state from JS: ${e.message}")
                            }
                            return
                        }

                                    // Position-only updates: update MediaSession playback position without rebuilding notification
                                    if (action == "com.mymusic.app.ACTION_UPDATE_POSITION") {
                                        try {
                                            val posMs = intent.getLongExtra("positionMs", -1L)
                                            if (posMs >= 0L) {
                                                Log.d(TAG, "metadataReceiver received position update: posMs=$posMs")
                                                setPlaybackPosition(posMs)
                                            }
                                        } catch (e: Exception) {
                                            Log.w(TAG, "Failed to apply position update: ${e.message}")
                                        }
                                        return
                                    }

                        // Otherwise treat it as a metadata update
                        val title = intent?.getStringExtra("title") ?: "Mellow"
                        val artist = intent?.getStringExtra("artist") ?: ""
                        val cover = intent?.getStringExtra("cover")

                        Log.i(TAG, "metadataReceiver received update (scheduling): title=$title artist=$artist")
                        // Coalesce rapid metadata updates: schedule a debounced notification update
                        // Store latest values so only the most recent update is applied.
                        pendingTitle = title
                        pendingArtist = artist
                        pendingCover = cover

                        // Cancel any previously scheduled update
                        val prev = pendingUpdateRunnable
                        if (prev != null) {
                            try { mainHandler?.removeCallbacks(prev) } catch (e: Exception) {}
                        }

                        // Create a local runnable reference to satisfy Kotlin's null-safety and
                        // avoid smart-cast concurrency issues when reading/writing the mutable var.
                        val runnable = Runnable {
                            try {
                                val t = pendingTitle ?: "Mellow"
                                val a = pendingArtist ?: ""
                                val c = pendingCover

                                // Show notification (without large icon immediately)
                                updateNotification(t, a, null)

                                // Cancel any in-flight Glide load for previous cover
                                try {
                                    currentGlideTarget?.let {
                                        Glide.with(this@MediaPlaybackService).clear(it)
                                        currentGlideTarget = null
                                    }
                                } catch (e: Exception) {
                                    Log.d(TAG, "Failed to clear previous Glide target: ${e.message}")
                                }

                                // Start async load for the current cover and ensure only the
                                // most recent requested cover is applied when ready.
                                if (!c.isNullOrBlank()) {
                                    try {
                                        val requestedCover = c
                                        val target = object : CustomTarget<android.graphics.Bitmap>() {
                                            override fun onResourceReady(resource: android.graphics.Bitmap, transition: Transition<in android.graphics.Bitmap>?) {
                                                try {
                                                    // Only apply bitmap if it matches the latest requested cover
                                                    if (requestedCover == pendingCover) {
                                                        updateNotification(t, a, resource)
                                                    } else {
                                                        Log.d(TAG, "Discarding stale Glide bitmap for $requestedCover (latest=${pendingCover})")
                                                    }
                                                } catch (e: Exception) {
                                                    Log.w(TAG, "Failed to update notification with Glide bitmap: ${e.message}")
                                                }
                                            }

                                            override fun onLoadCleared(placeholder: Drawable?) {
                                                // no-op
                                            }
                                        }
                                        currentGlideTarget = target
                                        Glide.with(this@MediaPlaybackService).asBitmap().load(c).into(target)
                                    } catch (e: Exception) {
                                        Log.d(TAG, "Glide async load failed: ${e.message}")
                                    }
                                }
                            } catch (e: Exception) {
                                Log.w(TAG, "debounced metadata update failed: ${e.message}")
                            } finally {
                                // clear reference (best-effort)
                                pendingUpdateRunnable = null
                            }
                        }

                        pendingUpdateRunnable = runnable
                        mainHandler?.postDelayed(runnable, NOTIF_DEBOUNCE_MS)
                    } catch (e: Exception) {
                        Log.w(TAG, "metadataReceiver error: ${e.message}")
                    }
                }
            }
            val f = IntentFilter()
            f.addAction("com.mymusic.app.ACTION_UPDATE_METADATA")
            f.addAction("com.mymusic.app.ACTION_SET_PLAYBACK")
            f.addAction("com.mymusic.app.ACTION_UPDATE_POSITION")
            registerReceiver(metadataReceiver, f)
            Log.i(TAG, "metadataReceiver registered")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to register metadataReceiver: ${e.message}")
        }
    }

    // Update only the playback position on the media session; do not rebuild notification
    private fun setPlaybackPosition(positionMs: Long) {
        try {
            val currentState = mediaSession?.controller?.playbackState?.state ?: PlaybackStateCompat.STATE_PAUSED
            val speed = if (currentState == PlaybackStateCompat.STATE_PLAYING) 1.0f else 0.0f
            val playbackState = PlaybackStateCompat.Builder()
                .setState(currentState, positionMs, speed)
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY_PAUSE or
                        PlaybackStateCompat.ACTION_PLAY or
                        PlaybackStateCompat.ACTION_PAUSE or
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                )
                .build()

            mediaSession?.setPlaybackState(playbackState)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to set playback position: ${e.message}")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "onStartCommand received: " + (intent?.action ?: "no-action"))
        // For now we'll just ensure a notification is shown when service started
        val title = intent?.getStringExtra("title") ?: "Mellow"
        val artist = intent?.getStringExtra("artist") ?: ""
        val cover = intent?.getStringExtra("cover")

        // Immediately show notification without large icon to avoid blocking
        updateNotification(title, artist, null)

        // Load cover using Glide (caching + async) when available
        if (!cover.isNullOrBlank()) {
            try {
                Glide.with(this@MediaPlaybackService)
                    .asBitmap()
                    .load(cover)
                    .into(object : CustomTarget<android.graphics.Bitmap>() {
                        override fun onResourceReady(resource: android.graphics.Bitmap, transition: Transition<in android.graphics.Bitmap>?) {
                            try {
                                updateNotification(title, artist, resource)
                            } catch (e: Exception) {
                                Log.w(TAG, "Failed to update notification with Glide bitmap: ${e.message}")
                            }
                        }

                        override fun onLoadCleared(placeholder: Drawable?) {
                            // no-op
                        }
                    })
            } catch (e: Exception) {
                Log.d(TAG, "Glide async load failed: ${e.message}")
            }
        }

        // Handle media button / action intents
        when (intent?.action) {
            null, "ACTION_START" -> {
                // initial start
                mediaSession?.isActive = true
                setPlaybackState(PlaybackStateCompat.STATE_PLAYING)
                // notification already shown above without large icon; ensure state updated
                updateNotification(title, artist, null)
            }
            "ACTION_PLAY" -> mediaSession?.controller?.transportControls?.play()
            "ACTION_PAUSE" -> mediaSession?.controller?.transportControls?.pause()
            "ACTION_NEXT" -> mediaSession?.controller?.transportControls?.skipToNext()
            "ACTION_PREV" -> mediaSession?.controller?.transportControls?.skipToPrevious()
            else -> {
                // Let MediaButtonReceiver handle media button intents
                MediaButtonReceiver.handleIntent(mediaSession, intent)
            }
        }

        return START_STICKY
    }

    private fun setPlaybackState(state: Int) {
        try {
            val playbackState = PlaybackStateCompat.Builder()
                .setState(state, 0L, if (state == PlaybackStateCompat.STATE_PLAYING) 1.0f else 0.0f)
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY_PAUSE or
                        PlaybackStateCompat.ACTION_PLAY or
                        PlaybackStateCompat.ACTION_PAUSE or
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                )
                .build()

            mediaSession?.setPlaybackState(playbackState)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to set playback state: ${e.message}")
        }
    }

    private fun updateNotification(title: String = "Mellow", artist: String = "", largeIcon: Bitmap? = null) {
        // Ensure notification updates run on the main thread to avoid parceling races
        if (Looper.myLooper() != Looper.getMainLooper()) {
            mainHandler?.post { updateNotification(title, artist, largeIcon) }
            return
        }

        // Serialize notification updates to avoid concurrent notify() calls from other threads/plugins
        synchronized(notifLock) {
            // Final rate-limit / payload dedupe: if the incoming notification payload is identical
            // to the last one and was sent very recently, skip to avoid fluttering and redundant
            // notify() calls that can confuse the system UI.
            try {
                val now = System.currentTimeMillis()
                val isPlayingFlag = if (mediaSession?.controller?.playbackState?.state == PlaybackStateCompat.STATE_PLAYING) "1" else "0"
                val hasLarge = if (largeIcon != null) "1" else "0"
                val payloadKey = "$title|$artist|$hasLarge|$isPlayingFlag"
                if (lastNotifPayloadKey != null && lastNotifPayloadKey == payloadKey && (now - lastNotifTs) < 500) {
                    Log.i(TAG, "Skipping redundant notification update (dedupe)")
                    return
                }
                lastNotifPayloadKey = payloadKey
                lastNotifTs = now
            } catch (e: Exception) {
                // ignore payload dedupe failures
            }
            val playPauseAction = if (mediaSession?.controller?.playbackState?.state == PlaybackStateCompat.STATE_PLAYING) {
            NotificationCompat.Action(
                android.R.drawable.ic_media_pause,
                "Pause",
                MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_PAUSE)
            )
        } else {
            NotificationCompat.Action(
                android.R.drawable.ic_media_play,
                "Play",
                MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_PLAY)
            )
        }

            val prevAction = NotificationCompat.Action(
            android.R.drawable.ic_media_previous,
            "Prev",
            MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS)
        )

        val nextAction = NotificationCompat.Action(
            android.R.drawable.ic_media_next,
            "Next",
            MediaButtonReceiver.buildMediaButtonPendingIntent(this, PlaybackStateCompat.ACTION_SKIP_TO_NEXT)
        )

        val mediaStyle = MediaStyle().setMediaSession(mediaSession?.sessionToken)

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(artist)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setLargeIcon(largeIcon)
            .setStyle(mediaStyle)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(prevAction)
            .addAction(playPauseAction)
            .addAction(nextAction)
            .setShowWhen(false)
            .build()

            try {
                if (!foregroundStarted) {
                    // First time: start foreground
                    startForeground(NOTIF_ID, notification)
                    foregroundStarted = true
                    Log.i(TAG, "startForeground called successfully (notifId=$NOTIF_ID)")
                } else {
                    // Update existing notification
                    notificationManager?.notify(NOTIF_ID, notification)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to show/update notification: ${e.message}", e)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        mediaSession?.release()
        try {
            if (metadataReceiver != null) {
                unregisterReceiver(metadataReceiver)
                metadataReceiver = null
            }
        } catch (e: Exception) {
            // ignore
        }
        // shutdown executor and handler
        try {
            ioExecutor?.shutdownNow()
            ioExecutor = null
        } catch (e: Exception) {
            // ignore
        }
        mainHandler = null
        // mark not running when destroyed
        isRunning = false
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Mellow Media"
            val descriptionText = "Media playback controls"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, name, importance)
            channel.description = descriptionText
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun urlToBitmap(src: String?): Bitmap? {
        if (src.isNullOrBlank()) return null

        return try {
            val url = URL(src)
            val connection: URLConnection = url.openConnection()
            connection.doInput = true
            connection.connect()
            val input: InputStream = connection.getInputStream()
            BitmapFactory.decodeStream(input)
        } catch (e: Exception) {
            // Downgrade to debug level to avoid spamming logs when covers fail to load
            val shortSrc = if (src.length > 120) src.substring(0, 120) + "..." else src
            Log.d(TAG, "Failed to load bitmap for url=$shortSrc: ${e.message}")
            null
        }
    }
}
