package com.athlete.spa.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import androidx.core.content.ContextCompat;

import com.athlete.spa.MainActivity;
import com.athlete.spa.R;
import com.athlete.spa.runtracking.RunRecorder;
import com.athlete.spa.runtracking.RunTrackingService;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

import app.capgo.widgetkit.CapgoNativeWidgetBridge;
import app.capgo.widgetkit.CapgoWidgetKit;
import app.capgo.widgetkit.CapgoWidgetKitConstants;

/**
 * Home-screen widget fed by src/lib/live-widget.ts through
 * @capgo/capacitor-widget-kit's session store. Shows the workout or run in
 * progress ("active-session") and, between them, the last 7 days
 * ("weekly-stats"). A run is read from RunRecorder directly, so distance and
 * pace stay live while the WebView sleeps; RunTrackingService refreshes it.
 */
public class SessionWidgetProvider extends AppWidgetProvider {

    private static final String SESSION_ID = "active-session";
    private static final String STATS_ID = "weekly-stats";
    /** Must match WIDGET_URL_PREFIX in src/components/native-widget-bridge.tsx. */
    private static final String URL_PREFIX = "leniwakluska.com://app";
    /** Must match WIDGET_COMMAND_COMPLETE_SET in src/lib/live-widget.ts. */
    private static final String COMMAND_COMPLETE_SET = "completeSet";
    private static final String ACTION_COMPLETE_SET = "com.athlete.spa.widget.COMPLETE_SET";

    private static final int DEFAULT_WIDTH_DP = 250;
    private static final int DEFAULT_HEIGHT_DP = 110;
    /** Padding plus the three text lines above the chart. */
    private static final int STATS_TEXT_HEIGHT_DP = 88;

    /** Re-renders every placed widget, e.g. after the run moved on. */
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, SessionWidgetProvider.class));
        for (int id : ids) manager.updateAppWidget(id, render(context, manager, id));
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) manager.updateAppWidget(id, render(context, manager, id));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int appWidgetId, Bundle newOptions) {
        // The chart is a bitmap sized to the widget; redraw it after a resize.
        manager.updateAppWidget(appWidgetId, render(context, manager, appWidgetId));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (CapgoWidgetKitConstants.ACTION_NATIVE_WIDGET_BRIDGE_CHANGED.equals(action)) {
            refresh(context);
        } else if (ACTION_COMPLETE_SET.equals(action)) {
            try {
                // Picked up by useWidgetCommands on the workout screen; the store change refreshes us.
                new CapgoWidgetKit(context).sendWidgetMessage(
                    SESSION_ID, CapgoNativeWidgetBridge.DIRECTION_WIDGET_TO_APP, COMMAND_COMPLETE_SET, null, false);
            } catch (JSONException ignored) {
                // Nothing sent — the tap is simply lost.
            }
        }
    }

    private static RemoteViews render(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_session);
        CapgoWidgetKit kit = new CapgoWidgetKit(context);

        JSONObject session = loadSession(kit, SESSION_ID);
        if (session != null && "active".equals(session.optString("status"))) {
            JSONObject state = session.optJSONObject("state");
            if (state == null) state = new JSONObject();
            views.setViewVisibility(R.id.widget_active, View.VISIBLE);
            views.setViewVisibility(R.id.widget_stats, View.GONE);
            if ("run".equals(state.optString("activity"))) renderRun(context, views, state);
            else renderWorkout(context, views, state);
            return views;
        }

        views.setViewVisibility(R.id.widget_active, View.GONE);
        views.setViewVisibility(R.id.widget_stats, View.VISIBLE);
        views.setOnClickPendingIntent(R.id.widget_root, openApp(context, "/athlete", 10));
        JSONObject stats = loadSession(kit, STATS_ID);
        JSONObject statsState = stats != null ? stats.optJSONObject("state") : null;
        if (statsState != null) renderStats(context, manager, appWidgetId, views, statsState);
        return views;
    }

    private static void renderWorkout(Context context, RemoteViews views, JSONObject state) {
        String openPath = state.optString("openPath", "/athlete");
        views.setTextViewText(R.id.widget_title, state.optString("title", "Trening"));
        views.setTextViewText(R.id.widget_line1, state.optString("line1"));
        views.setTextViewText(R.id.widget_line2, state.optString("line2"));
        views.setChronometer(R.id.widget_clock, clockBase(sampledElapsedMs(state)), null, true);
        views.setOnClickPendingIntent(R.id.widget_root, openApp(context, openPath, 10));
        views.setOnClickPendingIntent(
            R.id.widget_finish_button, openApp(context, state.optString("finishPath", openPath), 11));

        if (state.optBoolean("interactive")) {
            views.setTextViewText(R.id.widget_primary_button, "Seria ✓");
            Intent completeSet = new Intent(context, SessionWidgetProvider.class).setAction(ACTION_COMPLETE_SET);
            views.setOnClickPendingIntent(
                R.id.widget_primary_button,
                PendingIntent.getBroadcast(context, 12, completeSet, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        } else {
            // The sets live in the workout screen's form; only it can complete one.
            views.setTextViewText(R.id.widget_primary_button, "Otwórz");
            views.setOnClickPendingIntent(R.id.widget_primary_button, openApp(context, openPath, 12));
        }
    }

    private static void renderRun(Context context, RemoteViews views, JSONObject state) {
        String openPath = state.optString("openPath", "/athlete/running/record");
        views.setTextViewText(R.id.widget_title, state.optString("title", "Bieg"));
        views.setOnClickPendingIntent(R.id.widget_root, openApp(context, openPath, 10));
        views.setOnClickPendingIntent(
            R.id.widget_finish_button, openApp(context, state.optString("finishPath", openPath), 11));

        RunRecorder recorder = RunRecorder.get();
        if (recorder.isIdle()) {
            // The process lost the run (killed while paused): show what the app last
            // sent, frozen, and let the run screen restore it.
            views.setTextViewText(R.id.widget_line1, state.optString("line1"));
            views.setTextViewText(R.id.widget_line2, state.optString("line2"));
            views.setChronometer(R.id.widget_clock, clockBase(state.optLong("elapsedMs")), null, false);
            views.setTextViewText(R.id.widget_primary_button, "Otwórz");
            views.setOnClickPendingIntent(R.id.widget_primary_button, openApp(context, openPath, 12));
            return;
        }

        boolean running = recorder.isRunning();
        double km = recorder.getDistance() / 1000;
        long durationMs = recorder.getDurationMs();
        views.setTextViewText(R.id.widget_line1, String.format(Locale.ROOT, "%.2f km", km));
        views.setTextViewText(R.id.widget_line2, km > 0.05 ? formatPace(durationMs, km) + " /km" : "Tempo: --:--");
        views.setChronometer(R.id.widget_clock, clockBase(durationMs), null, running);
        views.setTextViewText(R.id.widget_primary_button, running ? "Pauza" : "Wznów");
        views.setOnClickPendingIntent(R.id.widget_primary_button, RunTrackingService.toggleIntent(context, running));
    }

    private static void renderStats(
        Context context, AppWidgetManager manager, int appWidgetId, RemoteViews views, JSONObject stats) {
        int workouts = stats.optInt("workouts");
        double distanceKm = stats.optDouble("distanceKm", 0);
        views.setTextViewText(
            R.id.widget_stats_summary,
            workouts + " " + workoutsWord(workouts) + " · " + String.format(Locale.forLanguageTag("pl"), "%.1f km", distanceKm));
        views.setTextViewText(
            R.id.widget_stats_detail,
            stats.optInt("activeMinutes") + " min aktywności · " + stats.optInt("volumeKg") + " kg");

        JSONArray days = stats.optJSONArray("days");
        if (days == null || days.length() == 0) return;

        Bundle options = manager.getAppWidgetOptions(appWidgetId);
        // Portrait reports min width and max height.
        int widthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, DEFAULT_WIDTH_DP);
        int heightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, DEFAULT_HEIGHT_DP);
        if (widthDp <= 0) widthDp = DEFAULT_WIDTH_DP;
        if (heightDp <= 0) heightDp = DEFAULT_HEIGHT_DP;
        int chartWidthDp = Math.max(120, widthDp - 28);
        int chartHeightDp = Math.max(36, heightDp - STATS_TEXT_HEIGHT_DP);
        views.setImageViewBitmap(R.id.widget_stats_chart, drawChart(context, days, chartWidthDp, chartHeightDp));
    }

    /** One bar per day, labelled underneath; a day without activity shows a short stub. */
    private static Bitmap drawChart(Context context, JSONArray days, int widthDp, int heightDp) {
        float density = context.getResources().getDisplayMetrics().density;
        int width = Math.round(widthDp * density);
        int height = Math.round(heightDp * density);
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        int max = 1;
        for (int i = 0; i < days.length(); i++) {
            JSONObject day = days.optJSONObject(i);
            if (day != null) max = Math.max(max, day.optInt("count"));
        }

        Paint label = new Paint(Paint.ANTI_ALIAS_FLAG);
        label.setColor(ContextCompat.getColor(context, R.color.widget_text_muted));
        label.setTextSize(10 * density);
        label.setTextAlign(Paint.Align.CENTER);
        Paint active = new Paint(Paint.ANTI_ALIAS_FLAG);
        active.setColor(ContextCompat.getColor(context, R.color.widget_accent));
        Paint empty = new Paint(Paint.ANTI_ALIAS_FLAG);
        empty.setColor(ContextCompat.getColor(context, R.color.widget_surface));

        float labelHeight = 14 * density;
        float barArea = height - labelHeight;
        float column = (float) width / days.length();
        float barWidth = Math.min(column * 0.5f, 18 * density);
        float radius = 3 * density;
        float stub = 3 * density;

        for (int i = 0; i < days.length(); i++) {
            JSONObject day = days.optJSONObject(i);
            if (day == null) continue;
            int count = day.optInt("count");
            float centerX = column * i + column / 2;
            float barHeight = count > 0 ? Math.max(stub * 2, barArea * count / max) : stub;
            RectF bar = new RectF(centerX - barWidth / 2, barArea - barHeight, centerX + barWidth / 2, barArea);
            canvas.drawRoundRect(bar, radius, radius, count > 0 ? active : empty);
            canvas.drawText(day.optString("label"), centerX, height - 2 * density, label);
        }
        return bitmap;
    }

    private static PendingIntent openApp(Context context, String path, int requestCode) {
        // Explicit, so it reaches the app even if another one claims the scheme; the
        // Capacitor App plugin reports the URL to JS as appUrlOpen / getLaunchUrl.
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(URL_PREFIX + path))
            .setClass(context, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
            context, requestCode, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static JSONObject loadSession(CapgoWidgetKit kit, String widgetId) {
        try {
            return kit.getWidgetSession(widgetId);
        } catch (JSONException e) {
            return null;
        }
    }

    /** Elapsed time now, from the value the app sampled at `sampledAt`. */
    private static long sampledElapsedMs(JSONObject state) {
        long elapsed = state.optLong("elapsedMs");
        long sampledAt = state.optLong("sampledAt", System.currentTimeMillis());
        return elapsed + Math.max(0, System.currentTimeMillis() - sampledAt);
    }

    private static long clockBase(long elapsedMs) {
        return SystemClock.elapsedRealtime() - Math.max(0, elapsedMs);
    }

    private static String formatPace(long durationMs, double km) {
        long paceS = Math.round(durationMs / 1000.0 / km);
        return String.format(Locale.ROOT, "%d:%02d", paceS / 60, paceS % 60);
    }

    private static String workoutsWord(int n) {
        if (n == 1) return "trening";
        int lastTwo = n % 100;
        int last = n % 10;
        if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "treningi";
        return "treningów";
    }
}
