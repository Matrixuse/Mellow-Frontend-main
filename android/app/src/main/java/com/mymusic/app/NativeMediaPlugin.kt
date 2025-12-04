package com.mymusic.app
import android.content.Intent
import android.content.BroadcastReceiver
import android.content.IntentFilter
import android.util.Log
import com.getcapacitor.JSObject
import androidx.core.content.ContextCompat
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.PluginMethod

@CapacitorPlugin(name = "NativeMedia")
class NativeMediaPlugin : Plugin() {
    override fun load() {
        Log.i(TAG, "NativeMediaPlugin loaded")
        // Register receiver to forward media control intents back to the WebView via Capacitor events
        try {
            controlReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: android.content.Context?, intent: Intent?) {
                    try {
                        val action = intent?.getStringExtra("control") ?: ""
                        Log.i(TAG, "controlReceiver received action: $action")
                            // Simple dedupe: ignore the same action repeated within a short window
                            val now = System.currentTimeMillis()
                            synchronized(LOCK) {
                                if (lastForwardedAction != null && lastForwardedAction == action && (now - lastForwardedTs) < 300) {
                                    Log.i(TAG, "Ignoring duplicate forwarded action: $action")
                                    return
                                }
                                lastForwardedAction = action
                                lastForwardedTs = now
                            }
                            val data = JSObject()
                            data.put("action", action)
                            // Forward action to JS; retainUntilConsumed = true so listeners added later still receive
                            notifyListeners("mediaAction", data, true)
                            Log.i(TAG, "controlReceiver forwarded mediaAction to JS: $action")
                    } catch (e: Exception) {
                        Log.w(TAG, "controlReceiver error: ${e.message}")
                    }
                }
            }
            val filter = IntentFilter("com.mymusic.app.ACTION_MEDIA_CONTROL")
            getContext().registerReceiver(controlReceiver, filter)
            Log.i(TAG, "controlReceiver registered")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to register controlReceiver: ${e.message}")
        }
    }

    override fun handleOnDestroy() {
        try {
            if (controlReceiver != null) {
                getContext().unregisterReceiver(controlReceiver)
                controlReceiver = null
            }
        } catch (e: Exception) {
            // ignore
        }
    }
    @PluginMethod
    fun startService(call: PluginCall) {
        Log.i(TAG, "startService called from JS with params: " + call.data.toString())
        val title: kotlin.String? = call.getString("title", "Mellow")
        // Normalize artist: accept string or array payloads and convert to a stable comma-separated string
        val artist: kotlin.String? = try {
            val direct = call.getString("artist", null)
            if (!direct.isNullOrBlank()) {
                direct
            } else {
                val raw = call.getData().get("artist")
                if (raw == null) {
                    ""
                } else {
                    try {
                        val ja = org.json.JSONArray(raw.toString())
                        val sb = StringBuilder()
                        for (i in 0 until ja.length()) {
                            if (i > 0) sb.append(", ")
                            sb.append(ja.getString(i))
                        }
                        sb.toString()
                    } catch (e: Exception) {
                        raw.toString()
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "artist normalization failed: ${e.message}")
            call.getString("artist", "")
        }
        val cover: kotlin.String? = call.getString("cover", null)

        // Simple dedupe: if a start was requested very recently with same params, ignore to avoid restart storms
        try {
            val now = System.currentTimeMillis()
            synchronized(LOCK) {
                if (lastStartTime > 0) {
                    val samePayload = title == lastTitle && artist == lastArtist && (cover == lastCover)
                    if (samePayload && (now - lastStartTime) < DEDUPE_WINDOW_MS) {
                        Log.i(TAG, "Ignoring duplicate startService within window")
                        call.resolve()
                        return
                    }
                }
                lastStartTime = now
                lastTitle = title
                lastArtist = artist
                lastCover = cover
            }
        } catch (e: Exception) {
            Log.w(TAG, "dedupe check failed: ${e.message}")
        }

        try {
            val intent: Intent =
                Intent(getContext(), com.mymusic.app.MediaPlaybackService::class.java)
            intent.action = "ACTION_START"
            intent.putExtra("title", title)
            intent.putExtra("artist", artist)
            intent.putExtra("cover", cover)
            // start service from app context
            // Use startForegroundService for modern Android so the service can post a foreground notification
            // If the service is already running, avoid issuing another start request which can
            // result in additional service instances or restart storms on some devices.
            try {
                if (com.mymusic.app.MediaPlaybackService.isRunning) {
                    Log.i(TAG, "Service already running - sending metadata broadcast instead of starting")
                    // If already running, forward metadata via broadcast so notification updates in-place
                    val bcast = Intent("com.mymusic.app.ACTION_UPDATE_METADATA")
                    bcast.putExtra("title", title)
                    bcast.putExtra("artist", artist)
                    bcast.putExtra("cover", cover)
                    bcast.setPackage(getContext().packageName)
                    try {
                        getContext().sendBroadcast(bcast)
                        Log.i(TAG, "updateMetadata broadcast sent (service-running path)")
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to send updateMetadata broadcast: ${e.message}")
                    }
                } else {
                    ContextCompat.startForegroundService(getContext(), intent)
                    Log.i(TAG, "startForegroundService requested")
                }
            } catch (e: Exception) {
                Log.w(TAG, "startForegroundService failed, fallback to startService: ${e.message}")
                try {
                    getContext().startService(intent)
                } catch (ex: Exception) {
                    Log.e(TAG, "Failed to start service: ${ex.message}", ex)
                    throw ex
                }
            }
            Log.i(TAG, "Intent to start MediaPlaybackService sent")
            call.resolve()
        } catch (e: java.lang.Exception) {
            android.util.Log.w(
                com.mymusic.app.NativeMediaPlugin.Companion.TAG,
                "startService error: " + e.message
            )
            call.reject("start failed")
        }
    }

    @PluginMethod
    fun stopService(call: PluginCall) {
        Log.i(TAG, "stopService called from JS")
        try {
            val intent: Intent =
                Intent(getContext(), com.mymusic.app.MediaPlaybackService::class.java)
            getContext().stopService(intent)
            call.resolve()
        } catch (e: java.lang.Exception) {
            call.reject("stop failed")
        }
    }

    @PluginMethod
    fun updateMetadata(call: PluginCall) {
        Log.i(TAG, "updateMetadata called from JS: " + call.data.toString())
        try {
            val title: String? = call.getString("title", "Mellow")
            val artist: String? = call.getString("artist", "")
            val cover: String? = call.getString("cover", null)

            // Compute a stable payload key to detect duplicates (title|artist|cover)
            val payloadKey = (title ?: "") + "|" + (artist ?: "") + "|" + (cover ?: "")
            synchronized(LOCK) {
                if (lastPayloadKey != null && lastPayloadKey == payloadKey) {
                    // Identical metadata already sent — ignore to avoid notification flutter
                    Log.i(TAG, "Ignoring duplicate updateMetadata payload")
                    call.resolve()
                    return
                }
                lastPayloadKey = payloadKey
            }

            // Send a broadcast to the service to update notification metadata without restarting the service
            val intent = Intent("com.mymusic.app.ACTION_UPDATE_METADATA")
            intent.putExtra("title", title)
            intent.putExtra("artist", artist)
            intent.putExtra("cover", cover)
            // Scope to our app package to be safe
            intent.setPackage(getContext().packageName)
            try {
                getContext().sendBroadcast(intent)
                Log.i(TAG, "updateMetadata: broadcast sent")
            } catch (e: Exception) {
                Log.w(TAG, "updateMetadata: failed to send broadcast: ${e.message}")
            }
        } catch (e: Exception) {
            Log.w(TAG, "updateMetadata error: ${e.message}")
        }
        call.resolve()
    }

    @PluginMethod
    fun updateIsPlaying(call: PluginCall) {
        try {
            val isPlaying = call.getBoolean("isPlaying", false)
            val intent = Intent("com.mymusic.app.ACTION_SET_PLAYBACK")
            intent.putExtra("isPlaying", isPlaying)
            intent.setPackage(getContext().packageName)
            try {
                getContext().sendBroadcast(intent)
                Log.i(TAG, "updateIsPlaying: broadcast sent isPlaying=$isPlaying")
            } catch (e: Exception) {
                Log.w(TAG, "updateIsPlaying: failed to send broadcast: ${e.message}")
            }
        } catch (e: Exception) {
            Log.w(TAG, "updateIsPlaying error: ${e.message}")
        }
        call.resolve()
    }

    @PluginMethod
    fun updatePosition(call: PluginCall) {
        try {
            // Accept either seconds (double) or milliseconds (int)
            var posMs: Long = -1
            try {
                val d: Double? = try { call.getDouble("position", -1.0) } catch (e: Exception) { null }
                if (d != null && d >= 0.0) {
                    posMs = (d * 1000.0).toLong()
                }
            } catch (e: Exception) {
                // ignore
            }
            if (posMs < 0) {
                try {
                    val intVal: Int? = try { call.getInt("positionMs", -1) } catch (e: Exception) { null }
                    if (intVal != null && intVal >= 0) {
                        posMs = intVal.toLong()
                    }
                } catch (e: Exception) {
                    // ignore
                }
            }

            if (posMs >= 0) {
                val intent = Intent("com.mymusic.app.ACTION_UPDATE_POSITION")
                intent.putExtra("positionMs", posMs)
                intent.setPackage(getContext().packageName)
                try {
                    getContext().sendBroadcast(intent)
                    Log.i(TAG, "updatePosition: broadcast sent positionMs=$posMs")
                } catch (e: Exception) {
                    Log.w(TAG, "updatePosition: failed to send broadcast: ${e.message}")
                }
            } else {
                Log.w(TAG, "updatePosition: no valid position provided")
            }
        } catch (e: Exception) {
            Log.w(TAG, "updatePosition error: ${e.message}")
        }
        call.resolve()
    }

    companion object {
        private const val TAG = "NativeMediaPlugin"
        private val LOCK = Any()
        private var lastStartTime: Long = 0
        private var lastTitle: String? = null
        private var lastArtist: String? = null
        private var lastCover: String? = null
        private const val DEDUPE_WINDOW_MS: Long = 2000 // 2 seconds
        // Track last metadata payload to avoid duplicate broadcasts
        private var lastPayloadKey: String? = null
        // Track last forwarded control to JS to avoid duplicates
        private var lastForwardedAction: String? = null
        private var lastForwardedTs: Long = 0
    }

    private var controlReceiver: BroadcastReceiver? = null
}
