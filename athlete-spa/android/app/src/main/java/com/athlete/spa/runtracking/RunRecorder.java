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
 * Process-wide state of the run being recorded: route, distance and moving
 * time. RunTrackingService feeds it fixes, RunTrackingPlugin reads and steers
 * it. The filtering mirrors the WebView recorder in src/hooks/useRunTracker.ts
 * so a run measures the same whichever side recorded it.
 */
public final class RunRecorder {

    public interface Listener {
        void onUpdate(JSObject update);
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

    public synchronized void start() {
        points.clear();
        distance = 0;
        movingMs = 0;
        accuracy = null;
        segmentStart = true;
        status = RUNNING;
        runningSince = SystemClock.elapsedRealtime();
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
     * while paused), `restore` carries the route the WebView kept; returns
     * false if there is nothing to continue.
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
        return snapshot;
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
        target.onUpdate(update);
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
