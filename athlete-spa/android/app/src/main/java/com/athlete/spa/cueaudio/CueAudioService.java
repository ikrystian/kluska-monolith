package com.athlete.spa.cueaudio;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

/**
 * Keeps the process running while a cue is scheduled (a rest countdown with
 * the app minimised). Without a foreground service Android freezes a cached
 * app within seconds, and the scheduled Handler in CuePlayer would only run
 * once the athlete reopened the app. CuePlayer starts and stops it.
 */
public class CueAudioService extends Service {

    private static final String CHANNEL_ID = "cue_audio";
    private static final int NOTIFICATION_ID = 4711;

    @Override
    public void onCreate() {
        super.onCreate();
        // In onCreate rather than onStartCommand: startForeground has to land
        // even if a quick stop arrives before the start command is delivered.
        goForeground();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        goForeground();
        return START_NOT_STICKY;
    }

    private void goForeground() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Sygnały dźwiękowe", NotificationManager.IMPORTANCE_LOW);
                channel.setShowBadge(false);
                manager.createNotificationChannel(channel);
            }
        }

        PendingIntent contentIntent = null;
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch != null) {
            launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            contentIntent = PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE);
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            // A system glyph: adaptive launcher icons can't be used as small icons on Android 8.0.
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Odliczanie trwa")
            .setContentText("Sygnał zagra o czasie, także przy zablokowanym ekranie.")
            .setOngoing(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setContentIntent(contentIntent)
            .build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
