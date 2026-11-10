package com.athlete.spa.runtracking;

import android.location.Location;
import android.os.SystemClock;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Process-wide state of the run being recorded: route, distance, moving time
 * and the training's audio cues. RunTrackingService feeds it fixes and plays
 * the cues it reports due, RunTrackingPlugin reads and steers it. The
 * filtering mirrors the WebView recorder in src/hooks/useRunTracker.ts so a
 * run measures the same whichever side recorded it.
 */
public final class RunRecorder {

    public interface Listener {
        /** Forwarded to JS as a plugin event: "update" or "cue". */
        void onEvent(String event, JSObject data);
    }

    /**
     * A training cue (interval reached) played from here rather than from the
     * WebView: once the app is minimised or the screen locks, the WebView is
     * frozen and would only notice the threshold after being reopened.
     */
    public static final class Cue {
        /** Position in the list the run was started with, so JS can show its label. */
        final int index;
        final boolean byDistance;
        /** Metres covered, or seconds of moving time. */
        final double value;
        public final String src;
        boolean fired;

        Cue(int index, boolean byDistance, double value, String src) {
            this.index = index;
            this.byDistance = byDistance;
            this.value = value;
            this.src = src;
        }

        boolean isDue(double distance, long durationMs) {
            return byDistance ? distance >= value : durationMs >= value * 1000;
        }
    }

    /** Fixes less accurate than this are shown but never add distance. */
    private static final float MAX_ACCEPTABLE_ACCURACY_M = 40f;
    /** Faster than any runner; a step implying more is a relocation glitch. */
    private static final double MAX_PLAUSIBLE_SPEED_MPS = 12;
    /** Steps up to this are always plausible, so closely spaced fixes aren't over-filtered. */
    private static final double MIN_PLAUSIBLE_STEP_M = 25;
    /** Below this, movement is indistinguishable from standing still and jittering. */
    private static final double MIN_STEP_M = 2;

    public static final String IDLE = "idle";
    public static final String RUNNING = "running";
    public static final String PAUSED = "paused";

    private static final RunRecorder INSTANCE = new RunRecorder();

    public static RunRecorder get() {
        return INSTANCE;
    }

    private static final class Point {
        final double lat;
        final double lng;
        final long at;
        final Double alt;

        Point(double lat, double lng, long at, Double alt) {
            this.lat = lat;
            this.lng = lng;
            this.at = at;
            this.alt = alt;
        }

        JSObject toJson() {
            JSObject json = new JSObject();
            json.put("lat", lat);
            json.put("lng", lng);
            json.put("at", at);
            json.put("alt", alt != null ? alt : JSONObject.NULL);
            return json;
        }
    }

    private String status = IDLE;
    private final List<Point> points = new ArrayList<>();
    private double distance;
    /** Moving time banked before the current running segment. */
    private long movingMs;
    /** elapsedRealtime at which the current running segment began. */
    private long runningSince;
    private Float accuracy;
    /** The next accepted fix starts a new segment instead of extending the last one. */
    private boolean segmentStart;
    private final List<Cue> cues = new ArrayList<>();
    private Listener listener;

    private RunRecorder() {}

    public synchronized void setListener(Listener listener) {
        this.listener = listener;
    }

    public synchronized String getStatus() {
        return status;
    }

    public synchronized boolean isIdle() {
        return IDLE.equals(status);
    }

    public synchronized boolean isRunning() {
        return RUNNING.equals(status);
    }

    public synchronized double getDistance() {
        return distance;
    }

    public synchronized long getDurationMs() {
        long ms = movingMs;
        if (RUNNING.equals(status)) ms += SystemClock.elapsedRealtime() - runningSince;
        return ms;
    }

    /** `cueList` holds the training's cues as sent by JS ({ trigger, value, src }), or null. */
    public synchronized void start(JSONArray cueList) {
        points.clear();
        distance = 0;
        movingMs = 0;
        accuracy = null;
        segmentStart = true;
        status = RUNNING;
        runningSince = SystemClock.elapsedRealtime();
        setCues(cueList, false);
    }

    public void pause(boolean external) {
        synchronized (this) {
            if (!RUNNING.equals(status)) return;
            movingMs += SystemClock.elapsedRealtime() - runningSince;
            status = PAUSED;
        }
        emit(null, external);
    }

    /**
     * Continues a paused run. When this process lost the run (it was killed
     * while paused), `restore` carries the route and cues the WebView kept;
     * returns false if there is nothing to continue.
     */
    public boolean resume(JSObject restore, boolean external) {
        synchronized (this) {
            if (RUNNING.equals(status)) return true;
            if (IDLE.equals(status)) {
                if (restore == null) return false;
                restoreFrom(restore);
            }
            status = RUNNING;
            runningSince = SystemClock.elapsedRealtime();
            segmentStart = true;
        }
        emit(null, external);
        return true;
    }

    /** Ends the run; the returned snapshot carries the full route. */
    public synchronized JSObject stop() {
        if (RUNNING.equals(status)) movingMs += SystemClock.elapsedRealtime() - runningSince;
        status = IDLE;
        JSObject snapshot = snapshot(true);
        points.clear();
        distance = 0;
        movingMs = 0;
        accuracy = null;
        cues.clear();
        return snapshot;
    }

    /** Marks the cues the run has now reached as fired, tells JS, and returns them to be played. */
    public List<Cue> fireDueCues() {
        List<Cue> due = new ArrayList<>();
        Listener target;
        synchronized (this) {
            long durationMs = getDurationMs();
            for (Cue cue : cues) {
                if (cue.fired || !cue.isDue(distance, durationMs)) continue;
                cue.fired = true;
                due.add(cue);
            }
            target = listener;
        }
        if (target != null) {
            for (Cue cue : due) {
                JSObject event = new JSObject();
                event.put("index", cue.index);
                event.put("firedAt", System.currentTimeMillis());
                target.onEvent("cue", event);
            }
        }
        return due;
    }

    /** Moving time until the next time cue is due, or -1 when none is pending or the clock is stopped. */
    public synchronized long msUntilNextTimeCue() {
        if (!RUNNING.equals(status)) return -1;
        long durationMs = getDurationMs();
        long next = -1;
        for (Cue cue : cues) {
            if (cue.fired || cue.byDistance) continue;
            long wait = Math.max(0, (long) Math.ceil(cue.value * 1000) - durationMs);
            if (next < 0 || wait < next) next = wait;
        }
        return next;
    }

    public void onLocation(Location location) {
        Point accepted = null;
        synchronized (this) {
            accuracy = location.getAccuracy();
            if (!RUNNING.equals(status)) return;

            if (location.getAccuracy() <= MAX_ACCEPTABLE_ACCURACY_M) {
                Point point = new Point(
                    location.getLatitude(),
                    location.getLongitude(),
                    location.getTime(),
                    location.hasAltitude() ? location.getAltitude() : null
                );
                Point previous = points.isEmpty() ? null : points.get(points.size() - 1);
                if (previous == null || segmentStart) {
                    accepted = point;
                    segmentStart = false;
                } else {
                    // Speed-based rather than a fixed cap: after a gap in fixes a
                    // fixed cap would reject every later point and freeze the route.
                    double step = haversine(previous, point);
                    double elapsedS = Math.max(0, (point.at - previous.at) / 1000.0);
                    double maxStep = Math.max(MIN_PLAUSIBLE_STEP_M, MAX_PLAUSIBLE_SPEED_MPS * elapsedS);
                    if (step >= MIN_STEP_M && step <= maxStep) {
                        accepted = point;
                        distance += step;
                    }
                }
                if (accepted != null) points.add(accepted);
            }
        }
        emit(accepted, false);
    }

    public synchronized JSObject snapshot(boolean withPoints) {
        JSObject json = new JSObject();
        json.put("status", status);
        json.put("distance", distance);
        json.put("durationMs", getDurationMs());
        json.put("accuracy", accuracy != null ? accuracy : JSONObject.NULL);
        if (withPoints) {
            JSArray route = new JSArray();
            for (Point p : points) route.put(p.toJson());
            json.put("points", route);
        }
        return json;
    }

    private void emit(Point point, boolean external) {
        Listener target;
        JSObject update;
        synchronized (this) {
            target = listener;
            if (target == null) return;
            update = snapshot(false);
            if (point != null) update.put("point", point.toJson());
            if (external) update.put("external", true);
        }
        target.onEvent("update", update);
    }

    /** With `skipPassed`, cues the restored run is already past count as played. */
    private void setCues(JSONArray list, boolean skipPassed) {
        cues.clear();
        if (list == null) return;
        long durationMs = getDurationMs();
        for (int i = 0; i < list.length(); i++) {
            JSONObject json = list.optJSONObject(i);
            String src = json != null ? json.optString("src") : "";
            if (src.isEmpty()) continue;
            Cue cue = new Cue(i, "distance".equals(json.optString("trigger")), json.optDouble("value", 0), src);
            cue.fired = skipPassed && cue.isDue(distance, durationMs);
            cues.add(cue);
        }
    }

    private void restoreFrom(JSObject run) {
        points.clear();
        JSONArray route = run.optJSONArray("points");
        if (route != null) {
            for (int i = 0; i < route.length(); i++) {
                JSONObject p = route.optJSONObject(i);
                if (p == null) continue;
                Double alt = p.isNull("alt") ? null : p.optDouble("alt");
                points.add(new Point(p.optDouble("lat"), p.optDouble("lng"), (long) p.optDouble("at"), alt));
            }
        }
        distance = run.optDouble("distance", 0);
        movingMs = (long) run.optDouble("durationMs", 0);
        accuracy = null;
        setCues(run.optJSONArray("cues"), true);
    }

    private static double haversine(Point a, Point b) {
        final double r = 6_371_000;
        double dLat = Math.toRadians(b.lat - a.lat);
        double dLng = Math.toRadians(b.lng - a.lng);
        double h = Math.pow(Math.sin(dLat / 2), 2)
            + Math.pow(Math.sin(dLng / 2), 2) * Math.cos(Math.toRadians(a.lat)) * Math.cos(Math.toRadians(b.lat));
        return 2 * r * Math.asin(Math.sqrt(h));
    }
}
