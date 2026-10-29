package com.athlete.spa.cueaudio;

import android.content.Context;
import android.content.Intent;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Plays short audio cues (rest over, run interval reached) natively instead of
 * through the WebView.
 *
 * Two problems with HTMLAudioElement in a Capacitor app: a backgrounded or
 * locked WebView doesn't run timers (so a cue due at a deadline never fires
 * until the app is reopened) and won't start media anyway; and the WebView
 * takes full audio focus, which pauses Spotify instead of lowering it.
 *
 * Here cues can be scheduled for a wall-clock time and fire from a Handler on
 * the main looper. While anything is scheduled the CPU is held awake with a
 * partial wake lock and, unless the caller says another foreground service
 * already keeps the process alive, CueAudioService runs in the foreground so
 * the OS doesn't freeze the cached process. Playback requests transient focus
 * with ducking, so other music dips under the cue and comes back after.
 */
public final class CuePlayer {

    private static final String TAG = "CuePlayer";
    /** Ids of cues already played; a later play() with the same id is a no-op. */
    private static final int MAX_PLAYED_IDS = 200;
    /** Keep-alive is released a moment after the last cue, so a quick re-schedule doesn't bounce the service. */
    private static final long KEEP_ALIVE_LINGER_MS = 2_000;
    private static final long WAKE_LOCK_MARGIN_MS = 30_000;
    private static final long MAX_WAKE_LOCK_MS = 4 * 60 * 60 * 1000L;

    private static CuePlayer instance;

    public static synchronized CuePlayer get(Context context) {
        if (instance == null) instance = new CuePlayer(context.getApplicationContext());
        return instance;
    }

    private static final class Scheduled {
        final String src;
        final long at;
        final boolean foreground;
        final Runnable runnable;

        Scheduled(String src, long at, boolean foreground, Runnable runnable) {
            this.src = src;
            this.at = at;
            this.foreground = foreground;
            this.runnable = runnable;
        }
    }

    private final Context context;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService downloader = Executors.newSingleThreadExecutor();
    private final AudioManager audioManager;
    private final AudioAttributes attributes;

    private final Map<String, Scheduled> scheduled = new HashMap<>();
    private final LinkedHashSet<String> played = new LinkedHashSet<>();
    private int activePlayers = 0;

    private PowerManager.WakeLock wakeLock;
    private boolean serviceRunning = false;
    private AudioFocusRequest focusRequest;

    private final Runnable releaseKeepAlive = this::applyKeepAlive;

    private CuePlayer(Context context) {
        this.context = context;
        this.audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        // Navigation guidance is the usage fitness apps use for spoken cues:
        // music players duck under it rather than pausing.
        this.attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build();
    }

    // ---- Public API (main thread) ----

    public void schedule(String id, String src, long at, boolean foreground) {
        cancelInternal(id);
        played.remove(id);
        long delay = at - System.currentTimeMillis();
        if (delay <= 0) {
            play(id, src);
            return;
        }
        Runnable runnable = () -> {
            scheduled.remove(id);
            play(id, src);
        };
        scheduled.put(id, new Scheduled(src, at, foreground, runnable));
        handler.postDelayed(runnable, delay);
        preload(src);
        applyKeepAlive();
    }

    public void cancel(String id) {
        if (cancelInternal(id)) scheduleKeepAliveUpdate();
    }

    /** Plays now. With an id, a cue that already played (e.g. from its schedule) is not repeated. */
    public void play(String id, String src) {
        if (id != null) {
            if (played.contains(id)) return;
            cancelInternal(id);
            markPlayed(id);
        }
        startPlayback(src);
    }

    public void preload(String src) {
        if (!isRemote(src) || cacheFile(src).exists()) return;
        downloader.execute(() -> download(src));
    }

    // ---- Scheduling ----

    private boolean cancelInternal(String id) {
        Scheduled entry = scheduled.remove(id);
        if (entry == null) return false;
        handler.removeCallbacks(entry.runnable);
        return true;
    }

    private void markPlayed(String id) {
        played.add(id);
        if (played.size() > MAX_PLAYED_IDS) {
            Iterator<String> it = played.iterator();
            it.next();
            it.remove();
        }
    }

    private void scheduleKeepAliveUpdate() {
        handler.removeCallbacks(releaseKeepAlive);
        handler.postDelayed(releaseKeepAlive, KEEP_ALIVE_LINGER_MS);
    }

    /** Holds the wake lock / foreground service exactly while something is scheduled or playing. */
    private void applyKeepAlive() {
        handler.removeCallbacks(releaseKeepAlive);

        long latest = 0;
        boolean needsService = false;
        for (Scheduled entry : scheduled.values()) {
            latest = Math.max(latest, entry.at);
            needsService |= entry.foreground;
        }
        boolean busy = !scheduled.isEmpty() || activePlayers > 0;

        if (busy) {
            long timeout = Math.max(latest - System.currentTimeMillis(), 0) + WAKE_LOCK_MARGIN_MS;
            acquireWakeLock(Math.min(timeout, MAX_WAKE_LOCK_MS));
        } else {
            releaseWakeLock();
        }

        if (needsService && !serviceRunning) {
            try {
                Intent intent = new Intent(context, CueAudioService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent);
                else context.startService(intent);
                serviceRunning = true;
            } catch (RuntimeException e) {
                // Started from the background on Android 12+ — the wake lock still
                // covers the common case of a screen that was just switched off.
                Log.w(TAG, "Could not start keep-alive service", e);
            }
        } else if (!needsService && serviceRunning && activePlayers == 0) {
            context.stopService(new Intent(context, CueAudioService.class));
            serviceRunning = false;
        }
    }

    private void acquireWakeLock(long timeoutMs) {
        if (wakeLock == null) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "athlete:cue-audio");
            wakeLock.setReferenceCounted(false);
        }
        // Re-acquiring a non-counted lock just extends its timeout.
        wakeLock.acquire(timeoutMs);
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
    }

    // ---- Playback ----

    private void startPlayback(String src) {
        MediaPlayer player = new MediaPlayer();
        player.setAudioAttributes(attributes);
        try {
            setDataSource(player, src);
        } catch (IOException | RuntimeException e) {
            Log.w(TAG, "Could not open cue " + src, e);
            player.release();
            return;
        }

        activePlayers++;
        applyKeepAlive();
        requestFocus();

        player.setOnPreparedListener(MediaPlayer::start);
        player.setOnCompletionListener(this::finishPlayback);
        player.setOnErrorListener((mp, what, extra) -> {
            Log.w(TAG, "Cue playback failed: " + what + "/" + extra);
            finishPlayback(mp);
            return true;
        });
        player.prepareAsync();
    }

    private void finishPlayback(MediaPlayer player) {
        player.release();
        activePlayers = Math.max(0, activePlayers - 1);
        if (activePlayers == 0) abandonFocus();
        scheduleKeepAliveUpdate();
    }

    private void setDataSource(MediaPlayer player, String src) throws IOException {
        if (isRemote(src)) {
            File cached = cacheFile(src);
            if (cached.exists()) player.setDataSource(cached.getAbsolutePath());
            else player.setDataSource(src); // Streams; cache it for next time.
            if (!cached.exists()) preload(src);
            return;
        }
        // A path relative to the web app, bundled under assets/public by `cap sync`.
        String assetPath = "public/" + (src.startsWith("/") ? src.substring(1) : src);
        try (AssetFileDescriptor fd = context.getAssets().openFd(assetPath)) {
            player.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
        } catch (IOException compressed) {
            // openFd only works for uncompressed assets; fall back to a copy.
            File copy = new File(cacheDir(), "asset-" + hash(assetPath));
            if (!copy.exists()) {
                try (InputStream in = context.getAssets().open(assetPath)) {
                    writeAtomically(in, copy);
                }
            }
            player.setDataSource(copy.getAbsolutePath());
        }
    }

    @SuppressWarnings("deprecation")
    private void requestFocus() {
        if (activePlayers > 1) return; // Already holding focus for an earlier cue.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(attributes)
                .setOnAudioFocusChangeListener(change -> {})
                .build();
            audioManager.requestAudioFocus(focusRequest);
        } else {
            audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
        }
    }

    @SuppressWarnings("deprecation")
    private void abandonFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest != null) audioManager.abandonAudioFocusRequest(focusRequest);
            focusRequest = null;
        } else {
            audioManager.abandonAudioFocus(null);
        }
    }

    // ---- Remote file cache ----

    private static boolean isRemote(String src) {
        return src.startsWith("http://") || src.startsWith("https://");
    }

    private File cacheDir() {
        File dir = new File(context.getCacheDir(), "cue-audio");
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    private File cacheFile(String src) {
        return new File(cacheDir(), hash(src));
    }

    private void download(String src) {
        File target = cacheFile(src);
        if (target.exists()) return;
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(src).openConnection();
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(30_000);
            if (connection.getResponseCode() / 100 != 2) return;
            try (InputStream in = connection.getInputStream()) {
                writeAtomically(in, target);
            }
        } catch (IOException e) {
            Log.w(TAG, "Could not cache cue " + src, e);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static void writeAtomically(InputStream in, File target) throws IOException {
        File tmp = new File(target.getPath() + ".part");
        try (OutputStream out = new FileOutputStream(tmp)) {
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
        }
        if (!tmp.renameTo(target)) {
            tmp.delete();
            throw new IOException("Could not move " + tmp + " into place");
        }
    }

    private static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-1").digest(value.getBytes("UTF-8"));
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            return Integer.toHexString(value.hashCode());
        }
    }
}
