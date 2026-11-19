package com.athlete.spa.runtracking;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Base64;
import android.util.Log;

import com.athlete.spa.cueaudio.CuePlayer;
import com.getcapacitor.JSObject;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * The AI voice coach of an advanced-goal run, driven from the native recorder
 * so it keeps talking with the screen locked (the WebView is frozen then).
 *
 * After each finished kilometre RunRecorder hands over the run so far; this
 * posts it to POST /api/athlete/running/coach on a background thread, writes
 * the returned mp3 to the cache and plays it through CuePlayer, which ducks
 * the music under it. The advice also goes to JS as a "coach" event so the run
 * screen can show it (see src/hooks/useRunCoach.ts).
 *
 * One request at a time: a kilometre finished while one is out waits, and only
 * the newest such kilometre is asked about.
 *
 * {@link #test} sends a made-up kilometre down the same path, for the coach
 * test button on the run screen — with or without a run in progress.
 */
public final class RunCoach {

    private static final String TAG = "RunCoach";
    private static final int CONNECT_TIMEOUT_MS = 10_000;
    /** The backend runs a model and text-to-speech back to back. */
    private static final int READ_TIMEOUT_MS = 25_000;
    private static final long WAKE_LOCK_MS = 60_000;
    private static final String CACHE_DIR = "run-coach";
    /** Run id of test requests: never a real run, so no run state is checked or changed. */
    private static final long TEST_RUN_ID = -1;

    /** Result of a test request: the HTTP status (0 when it never got one) and whether audio played. */
    public interface TestCallback {
        void done(int status, boolean played);
    }

    private static final class Outcome {
        final int status;
        final boolean played;

        Outcome(int status, boolean played) {
            this.status = status;
            this.played = played;
        }
    }

    private static RunCoach instance;

    public static synchronized RunCoach get(Context context) {
        if (instance == null) instance = new RunCoach(context.getApplicationContext());
        return instance;
    }

    private final Context context;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean inFlight = new AtomicBoolean(false);
    /** Last spoken line of the current run, so the model doesn't repeat its jokes. */
    private volatile String previousSpeech;
    private volatile long previousRunId = -1;
    private PowerManager.WakeLock wakeLock;

    private RunCoach(Context context) {
        this.context = context;
    }

    /** Called with every batch of fixes; cheap when there is nothing to ask. */
    public void onProgress() {
        if (inFlight.get()) return;
        RunRecorder.CoachRequest request = RunRecorder.get().takeDueCoachRequest();
        if (request == null) return;

        if (request.runId != previousRunId) {
            previousRunId = request.runId;
            previousSpeech = null;
            executor.execute(this::clearCache);
        }
        inFlight.set(true);
        executor.execute(() -> {
            // Taken inside the task: tasks run one by one, so locks never overlap.
            acquireWakeLock();
            try {
                perform(request, false);
            } catch (Exception e) {
                Log.w(TAG, "Coach request failed for km " + request.km, e);
            } finally {
                inFlight.set(false);
                releaseWakeLock();
            }
        });
    }

    /** `payload` is the coach endpoint's body as JS built it, previous spoken line included. */
    public void test(String url, String token, JSONObject payload, TestCallback callback) {
        RunRecorder.CoachRequest request =
            new RunRecorder.CoachRequest(TEST_RUN_ID, payload.optInt("km", 1), url, token, payload);
        executor.execute(() -> {
            acquireWakeLock();
            Outcome outcome;
            try {
                outcome = perform(request, true);
            } catch (Exception e) {
                Log.w(TAG, "Coach test request failed", e);
                outcome = new Outcome(0, false);
            } finally {
                releaseWakeLock();
            }
            callback.done(outcome.status, outcome.played);
        });
    }

    private Outcome perform(RunRecorder.CoachRequest request, boolean test) throws Exception {
        JSONObject payload = request.payload;
        String previous = test ? null : previousSpeech;
        if (previous != null) payload.put("previousSpeech", previous);

        HttpURLConnection connection = (HttpURLConnection) new URL(request.url).openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
        connection.setReadTimeout(READ_TIMEOUT_MS);
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Authorization", "Bearer " + request.token);

        JSONObject response;
        try {
            byte[] body = payload.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream out = connection.getOutputStream()) {
                out.write(body);
            }
            int code = connection.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                Log.w(TAG, "Coach answered " + code + " for km " + request.km);
                return new Outcome(code, false);
            }
            try (InputStream in = connection.getInputStream()) {
                response = new JSONObject(readAll(in));
            }
        } finally {
            connection.disconnect();
        }

        // The run was stopped, or a new one started, while we waited.
        if (!test && !RunRecorder.get().isCurrentRun(request.runId)) return new Outcome(HttpURLConnection.HTTP_OK, false);

        String speech = response.optString("speech", "");
        if (!test) previousSpeech = speech.isEmpty() ? previous : speech;

        File audio = null;
        if (!response.isNull("audio")) {
            byte[] bytes = Base64.decode(response.getString("audio"), Base64.DEFAULT);
            audio = new File(cacheDir(), (test ? "test-km-" : "km-") + request.km + ".mp3");
            try (OutputStream out = new FileOutputStream(audio)) {
                out.write(bytes);
            }
        }

        JSObject event = new JSObject();
        event.put("km", request.km);
        event.put("firedAt", System.currentTimeMillis());
        JSONObject coaching = response.optJSONObject("coaching");
        event.put("coaching", coaching != null ? coaching : JSONObject.NULL);
        event.put("speech", speech);
        event.put("played", audio != null);
        event.put("test", test);

        String src = audio != null ? "file://" + audio.getAbsolutePath() : null;
        // Test ids must differ per tap: CuePlayer never replays an id it has played.
        String cueId = test
            ? "coach-test-" + System.currentTimeMillis()
            : "coach-" + request.runId + "-" + request.km;
        // CuePlayer and the plugin bridge both expect the main thread.
        mainHandler.post(() -> {
            if (src != null) CuePlayer.get(context).play(cueId, src, false);
            RunRecorder.get().emitEvent("coach", event);
        });
        return new Outcome(HttpURLConnection.HTTP_OK, audio != null);
    }

    private File cacheDir() {
        File dir = new File(context.getCacheDir(), CACHE_DIR);
        if (!dir.exists() && !dir.mkdirs()) Log.w(TAG, "Could not create " + dir);
        return dir;
    }

    /** Last run's clips are useless once a new run starts. */
    private void clearCache() {
        File[] files = cacheDir().listFiles();
        if (files == null) return;
        for (File file : files) {
            if (!file.delete()) Log.w(TAG, "Could not delete " + file);
        }
    }

    private static String readAll(InputStream in) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int read;
        while ((read = in.read(chunk)) != -1) buffer.write(chunk, 0, read);
        return buffer.toString(StandardCharsets.UTF_8.name());
    }

    /** Keeps the CPU up for the request; location fixes alone don't hold it between batches. */
    private synchronized void acquireWakeLock() {
        if (wakeLock == null) {
            PowerManager power = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "athlete:run-coach");
            wakeLock.setReferenceCounted(false);
        }
        wakeLock.acquire(WAKE_LOCK_MS);
    }

    private synchronized void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
    }
}
