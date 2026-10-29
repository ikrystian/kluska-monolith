package com.athlete.spa.runtracking;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.athlete.spa.widget.SessionWidgetProvider;

import java.util.Locale;

/**
 * Keeps GPS at full rate while a run is recorded with the app backgrounded or
 * the screen locked — a WebView geolocation watch gets throttled there. The
 * ongoing notification shows distance, moving time and average pace, with
 * pause / resume buttons. Runs for as long as RunRecorder is not idle.
 */
public class RunTrackingService extends Service {

    private static final String CHANNEL_ID = "run_tracking";
    private static final int NOTIFICATION_ID = 4712;
    private static final long LOCATION_INTERVAL_MS = 500;
    /** The chronometer ticks on its own; the text only needs to follow distance. */
    private static final long NOTIFICATION_MIN_INTERVAL_MS = 2000;

    private static final String ACTION_SYNC = "com.athlete.spa.runtracking.SYNC";
    private static final String ACTION_PAUSE = "com.athlete.spa.runtracking.PAUSE";
    private static final String ACTION_RESUME = "com.athlete.spa.runtracking.RESUME";

    private FusedLocationProviderClient locationClient;
    private boolean requestingUpdates;
    private long lastNotificationAt;

    private final LocationCallback locationCallback = new LocationCallback() {
        @Override
        public void onLocationResult(@NonNull LocationResult result) {
            RunRecorder recorder = RunRecorder.get();
            for (Location location : result.getLocations()) recorder.onLocation(location);
            long now = SystemClock.elapsedRealtime();
            if (now - lastNotificationAt >= NOTIFICATION_MIN_INTERVAL_MS) updateNotification();
        }
    };

    /** Pause or resume, for the notification's and the home-screen widget's button. */
    public static PendingIntent toggleIntent(Context context, boolean running) {
        Intent toggle = new Intent(context, RunTrackingService.class).setAction(running ? ACTION_PAUSE : ACTION_RESUME);
        return PendingIntent.getService(context, 1, toggle, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Brings the service in line with RunRecorder after the plugin changed it. */
    static void sync(Context context) {
        Intent intent = new Intent(context, RunTrackingService.class).setAction(ACTION_SYNC);
        if (RunRecorder.get().isIdle()) {
            context.stopService(intent);
        } else {
            ContextCompat.startForegroundService(context, intent);
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        locationClient = LocationServices.getFusedLocationProviderClient(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Every startForegroundService has to be answered with startForeground,
        // even when the run turns out to be over already.
        if (!goForeground()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        RunRecorder recorder = RunRecorder.get();
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_PAUSE.equals(action)) recorder.pause(true);
        else if (ACTION_RESUME.equals(action)) recorder.resume(null, true);

        if (recorder.isIdle()) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
        applyState();
        // The run lives in this process's memory; a restart would have nothing to record.
        return START_NOT_STICKY;
    }

    private void applyState() {
        boolean running = RunRecorder.get().isRunning();
        if (running && !requestingUpdates) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {
                LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, LOCATION_INTERVAL_MS)
                    .setMinUpdateIntervalMillis(LOCATION_INTERVAL_MS)
                    .build();
                locationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
                requestingUpdates = true;
            }
        } else if (!running && requestingUpdates) {
            locationClient.removeLocationUpdates(locationCallback);
            requestingUpdates = false;
        }
        updateNotification();
    }

    private boolean goForeground() {
        try {
            Notification notification = buildNotification();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
            return true;
        } catch (RuntimeException e) {
            // Location permission revoked, or started from the background on Android 12+.
            return false;
        }
    }

    private void updateNotification() {
        lastNotificationAt = SystemClock.elapsedRealtime();
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification());
        SessionWidgetProvider.refresh(this);
    }

    private Notification buildNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Rejestrowanie biegu", NotificationManager.IMPORTANCE_LOW);
                channel.setShowBadge(false);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                manager.createNotificationChannel(channel);
            }
        }

        RunRecorder recorder = RunRecorder.get();
        boolean running = recorder.isRunning();
        double distance = recorder.getDistance();
        long durationMs = recorder.getDurationMs();

        PendingIntent contentIntent = null;
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch != null) {
            launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            contentIntent = PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            // A system glyph: adaptive launcher icons can't be used as small icons on Android 8.0.
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle(running ? "Bieg trwa" : "Bieg wstrzymany")
            .setContentText(formatStats(distance, durationMs))
            .setOngoing(true)
            .setSilent(true)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(contentIntent)
            .addAction(0, running ? "Pauza" : "Wznów", toggleIntent(this, running));

        if (running) {
            builder.setUsesChronometer(true).setShowWhen(true).setWhen(System.currentTimeMillis() - durationMs);
        } else {
            builder.setShowWhen(false);
        }
        return builder.build();
    }

    private static String formatStats(double distanceM, long durationMs) {
        double km = distanceM / 1000;
        StringBuilder text = new StringBuilder(String.format(Locale.forLanguageTag("pl"), "%.2f km", km));
        if (km > 0.05) {
            long paceS = Math.round(durationMs / 1000.0 / km);
            text.append(String.format(Locale.ROOT, " · %d:%02d /km", paceS / 60, paceS % 60));
        }
        long totalS = durationMs / 1000;
        text.append(String.format(Locale.ROOT, " · %d:%02d:%02d", totalS / 3600, (totalS / 60) % 60, totalS % 60));
        return text.toString();
    }

    @Override
    public void onDestroy() {
        if (requestingUpdates) {
            locationClient.removeLocationUpdates(locationCallback);
            requestingUpdates = false;
        }
        // The run is over: the widget goes back to whatever the app shows next.
        SessionWidgetProvider.refresh(this);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
