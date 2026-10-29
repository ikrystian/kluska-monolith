package com.athlete.spa.widget;

import android.app.AlarmManager;
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
import android.os.Handler;
import android.os.Looper;
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

import java.util.Calendar;
import java.util.Locale;

import app.capgo.widgetkit.CapgoNativeWidgetBridge;
import app.capgo.widgetkit.CapgoWidgetKit;
import app.capgo.widgetkit.CapgoWidgetKitConstants;

/**
 * Home-screen widget fed by src/lib/live-widget.ts through
 * @capgo/capacitor-widget-kit's session store. Shows the workout or run in
 * progress ("active-session", with the rest countdown between sets) and,
 * between them, the last 7 days and streak ("weekly-stats") with the next
 * planned workout ("up-next"). A run is read from RunRecorder directly, so
 * distance and pace stay live while the WebView sleeps; RunTrackingService
 * refreshes it.
 */
public class SessionWidgetProvider extends AppWidgetProvider {

    private static final String SESSION_ID = "active-session";
    private static final String STATS_ID = "weekly-stats";
    private static final String UP_NEXT_ID = "up-next";
    /** Must match WIDGET_URL_PREFIX in src/components/native-widget-bridge.tsx. */
    private static final String URL_PREFIX = "leniwakluska.com://app";
    /** Must match the WIDGET_COMMAND_* constants in src/lib/live-widget.ts. */
    private static final String COMMAND_COMPLETE_SET = "completeSet";
    private static final String COMMAND_SKIP_REST = "skipRest";
    private static final String COMMAND_EXTEND_REST = "extendRest";
    /** Must match WIDGET_REST_EXTENSION_SECONDS in src/lib/live-widget.ts. */
    private static final long REST_EXTENSION_MS = 30_000;

    private static final String ACTION_COMMAND = "com.athlete.spa.widget.COMMAND";
    private static final String EXTRA_COMMAND = "command";
    private static final String ACTION_REFRESH = "com.athlete.spa.widget.REFRESH";

    /** A planned workout stays on the widget this long past its start time — the athlete may be running late. */
    private static final long UP_NEXT_GRACE_MS = 2 * 60 * 60 * 1000L;

    private static final int DEFAULT_WIDTH_DP = 250;
    private static final int DEFAULT_HEIGHT_DP = 110;

    // Approximate row heights, used to drop the least important rows on a short widget.
    private static final int PADDING_DP = 28;
    private static final int TITLE_DP = 20;
    private static final int BUTTONS_DP = 40;
    private static final int LINE1_DP = 28;
    private static final int LINE2_DP = 18;
    private static final int REST_DP = 30;
    private static final int PROGRESS_DP = 16;
    private static final int HEADER_DP = 18;
    private static final int UP_NEXT_DP = 40;
    private static final int SUMMARY_DP = 24;
    private static final int DETAIL_DP = 18;
    private static final int CHART_MARGIN_DP = 6;
    private static final int CHART_MIN_DP = 36;

    private static final String[] WEEKDAYS = {"", "Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"};

    private static final Handler HANDLER = new Handler(Looper.getMainLooper());
    private static Runnable pendingRestEnd;

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
        // Rows are fitted to the height and the chart is a bitmap sized to the widget; redo both after a resize.
        manager.updateAppWidget(appWidgetId, render(context, manager, appWidgetId));
    }

    @Override
    public void onDisabled(Context context) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms != null) alarms.cancel(refreshIntent(context));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (CapgoWidgetKitConstants.ACTION_NATIVE_WIDGET_BRIDGE_CHANGED.equals(action) || ACTION_REFRESH.equals(action)) {
            refresh(context);
        } else if (ACTION_COMMAND.equals(action)) {
            String command = intent.getStringExtra(EXTRA_COMMAND);
            if (command == null) return;
            CapgoWidgetKit kit = new CapgoWidgetKit(context);
            try {
                // Picked up by useWidgetCommands on the workout screen; the store change refreshes us.
                kit.sendWidgetMessage(SESSION_ID, CapgoNativeWidgetBridge.DIRECTION_WIDGET_TO_APP, command, null, false);
                applyRestCommand(kit, command);
            } catch (JSONException ignored) {
                // Nothing sent — the tap is simply lost.
            }
        }
    }

    /**
     * Shows a skipped or extended rest right away instead of after the app's
     * next poll. The app applies the same change and pushes the same value.
     */
    private static void applyRestCommand(CapgoWidgetKit kit, String command) throws JSONException {
        if (!COMMAND_SKIP_REST.equals(command) && !COMMAND_EXTEND_REST.equals(command)) return;
        JSONObject session = loadSession(kit, SESSION_ID);
        JSONObject state = session != null ? session.optJSONObject("state") : null;
        if (state == null || state.optLong("restEndsAt") <= System.currentTimeMillis()) return;

        JSONObject patch = new JSONObject();
        if (COMMAND_SKIP_REST.equals(command)) patch.put("restEndsAt", JSONObject.NULL);
        else patch.put("restEndsAt", state.optLong("restEndsAt") + REST_EXTENSION_MS);
        kit.updateWidgetSession(SESSION_ID, patch, null, true);
    }

    private static RemoteViews render(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_session);
        CapgoWidgetKit kit = new CapgoWidgetKit(context);

        Bundle options = manager.getAppWidgetOptions(appWidgetId);
        // Portrait reports min width and max height.
        int widthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, DEFAULT_WIDTH_DP);
        int heightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, DEFAULT_HEIGHT_DP);
        if (widthDp <= 0) widthDp = DEFAULT_WIDTH_DP;
        if (heightDp <= 0) heightDp = DEFAULT_HEIGHT_DP;
        int contentDp = heightDp - PADDING_DP;

        JSONObject session = loadSession(kit, SESSION_ID);
        if (session != null && "active".equals(session.optString("status"))) {
            JSONObject state = session.optJSONObject("state");
            if (state == null) state = new JSONObject();
            views.setViewVisibility(R.id.widget_active, View.VISIBLE);
            views.setViewVisibility(R.id.widget_stats, View.GONE);
            int budgetDp = contentDp - TITLE_DP - BUTTONS_DP;
            if ("run".equals(state.optString("activity"))) renderRun(context, views, state, budgetDp);
            else renderWorkout(context, views, state, budgetDp);
            return views;
        }

        views.setViewVisibility(R.id.widget_active, View.GONE);
        views.setViewVisibility(R.id.widget_stats, View.VISIBLE);
        views.setOnClickPendingIntent(R.id.widget_root, openApp(context, "/athlete", 10));
        JSONObject stats = loadSession(kit, STATS_ID);
        JSONObject upNext = loadSession(kit, UP_NEXT_ID);
        renderStats(
            context, views,
            stats != null ? stats.optJSONObject("state") : null,
            widthDp, contentDp - HEADER_DP - UP_NEXT_DP);
        renderUpNext(context, views, upNext != null ? upNext.optJSONObject("state") : null);
        return views;
    }

    private static void renderWorkout(Context context, RemoteViews views, JSONObject state, int budgetDp) {
        String openPath = state.optString("openPath", "/athlete");
        String finishPath = state.optString("finishPath", openPath);
        boolean interactive = state.optBoolean("interactive");
        long restLeftMs = state.optLong("restEndsAt") - System.currentTimeMillis();
        boolean resting = interactive && restLeftMs > 0;

        views.setTextViewText(R.id.widget_title, state.optString("title", "Trening"));
        views.setTextViewText(R.id.widget_line1, state.optString("line1"));
        views.setTextViewText(R.id.widget_line2, state.optString("line2"));
        views.setChronometer(R.id.widget_clock, clockBase(sampledElapsedMs(state)), null, true);
        views.setOnClickPendingIntent(R.id.widget_root, openApp(context, openPath, 10));

        // The rest countdown is what the athlete looks at between sets, so it gets its row first.
        if (resting) budgetDp -= REST_DP;
        budgetDp = fitRow(views, R.id.widget_line1, budgetDp, LINE1_DP);
        budgetDp = fitRow(views, R.id.widget_line2, budgetDp, LINE2_DP);
        int setsTotal = state.optInt("setsTotal");
        if (!resting && setsTotal > 0 && budgetDp >= PROGRESS_DP) {
            int setsDone = Math.min(state.optInt("setsDone"), setsTotal);
            views.setViewVisibility(R.id.widget_progress_row, View.VISIBLE);
            views.setProgressBar(R.id.widget_progress, setsTotal, setsDone, false);
            views.setTextViewText(R.id.widget_progress_text, setsDone + "/" + setsTotal);
        }

        if (resting) {
            views.setViewVisibility(R.id.widget_rest_row, View.VISIBLE);
            // The countdown shows whole seconds rounded down; just under a second extra rounds up, as the app does.
            views.setChronometer(R.id.widget_rest_clock, SystemClock.elapsedRealtime() + restLeftMs + 999, null, true);
            views.setChronometerCountDown(R.id.widget_rest_clock, true);
            views.setTextViewText(R.id.widget_primary_button, "Pomiń");
            views.setOnClickPendingIntent(R.id.widget_primary_button, command(context, COMMAND_SKIP_REST, 13));
            views.setTextViewText(R.id.widget_secondary_button, "+" + REST_EXTENSION_MS / 1000 + " s");
            views.setOnClickPendingIntent(R.id.widget_secondary_button, command(context, COMMAND_EXTEND_REST, 14));
            refreshWhenRestEnds(context, restLeftMs);
            return;
        }

        views.setTextViewText(R.id.widget_secondary_button, "Zakończ");
        views.setOnClickPendingIntent(R.id.widget_secondary_button, openApp(context, finishPath, 11));
        if (interactive) {
            views.setTextViewText(R.id.widget_primary_button, "Seria ✓");
            views.setOnClickPendingIntent(R.id.widget_primary_button, command(context, COMMAND_COMPLETE_SET, 12));
        } else {
            // The sets live in the workout screen's form; only it can complete one.
            views.setTextViewText(R.id.widget_primary_button, "Otwórz");
            views.setOnClickPendingIntent(R.id.widget_primary_button, openApp(context, openPath, 12));
        }
    }

    private static void renderRun(Context context, RemoteViews views, JSONObject state, int budgetDp) {
        String openPath = state.optString("openPath", "/athlete/running/record");
        views.setTextViewText(R.id.widget_title, state.optString("title", "Bieg"));
        views.setOnClickPendingIntent(R.id.widget_root, openApp(context, openPath, 10));
        views.setTextViewText(R.id.widget_secondary_button, "Zakończ");
        views.setOnClickPendingIntent(
            R.id.widget_secondary_button, openApp(context, state.optString("finishPath", openPath), 11));
        budgetDp = fitRow(views, R.id.widget_line1, budgetDp, LINE1_DP);
        fitRow(views, R.id.widget_line2, budgetDp, LINE2_DP);

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

    private static void renderStats(Context context, RemoteViews views, JSONObject stats, int widthDp, int budgetDp) {
        budgetDp = fitRow(views, R.id.widget_stats_summary, budgetDp, SUMMARY_DP);
        budgetDp = fitRow(views, R.id.widget_stats_detail, budgetDp, DETAIL_DP);
        views.setViewVisibility(R.id.widget_stats_chart, View.GONE);
        if (stats == null) return;

        int workouts = stats.optInt("workouts");
        double distanceKm = stats.optDouble("distanceKm", 0);
        views.setTextViewText(
            R.id.widget_stats_summary,
            workouts + " " + plural(workouts, "trening", "treningi", "treningów")
                + " · " + String.format(Locale.forLanguageTag("pl"), "%.1f km", distanceKm));
        views.setTextViewText(
            R.id.widget_stats_detail,
            stats.optInt("activeMinutes") + " min aktywności · " + stats.optInt("volumeKg") + " kg");

        int streak = stats.optInt("streak");
        if (streak > 0) {
            views.setViewVisibility(R.id.widget_streak, View.VISIBLE);
            views.setTextViewText(R.id.widget_streak, "🔥 " + streak + " " + plural(streak, "dzień", "dni", "dni"));
        }

        JSONArray days = stats.optJSONArray("days");
        int chartHeightDp = budgetDp - CHART_MARGIN_DP;
        if (days == null || days.length() == 0 || chartHeightDp < CHART_MIN_DP) return;
        int chartWidthDp = Math.max(120, widthDp - PADDING_DP);
        views.setViewVisibility(R.id.widget_stats_chart, View.VISIBLE);
        views.setImageViewBitmap(R.id.widget_stats_chart, drawChart(context, days, chartWidthDp, chartHeightDp));
    }

    /**
     * The first planned workout not yet well past its start, with a button to
     * start it; without one, shortcuts to pick a workout. Re-rendered when the
     * shown workout lapses and at midnight, so "Dziś" and "Jutro" stay true.
     */
    private static void renderUpNext(Context context, RemoteViews views, JSONObject upNext) {
        long now = System.currentTimeMillis();
        Calendar midnight = Calendar.getInstance();
        midnight.setTimeInMillis(startOfDay(now));
        midnight.add(Calendar.DAY_OF_MONTH, 1);
        long refreshAt = midnight.getTimeInMillis();
        views.setOnClickPendingIntent(R.id.widget_run_button, openApp(context, "/athlete/running/record", 22));

        JSONObject next = null;
        JSONArray workouts = upNext != null ? upNext.optJSONArray("workouts") : null;
        for (int i = 0; workouts != null && i < workouts.length(); i++) {
            JSONObject workout = workouts.optJSONObject(i);
            if (workout != null && workout.optLong("at") + UP_NEXT_GRACE_MS > now) {
                next = workout;
                break;
            }
        }

        if (next == null) {
            views.setTextViewText(R.id.widget_start_button, "Trening");
            views.setOnClickPendingIntent(R.id.widget_start_button, openApp(context, "/athlete/workouts", 20));
            views.setOnClickPendingIntent(R.id.widget_up_next, openApp(context, "/athlete/calendar", 21));
        } else {
            long at = next.optLong("at");
            int exercises = next.optInt("exercises");
            String title = next.optString("title", "Trening");
            if (exercises > 0) title += " · " + exercises + " " + plural(exercises, "ćwiczenie", "ćwiczenia", "ćwiczeń");
            views.setTextViewText(R.id.widget_up_next_when, formatWhen(at, now));
            views.setTextViewText(R.id.widget_up_next_title, title);
            views.setTextViewText(R.id.widget_start_button, "Start");
            views.setOnClickPendingIntent(
                R.id.widget_start_button, openApp(context, next.optString("openPath", "/athlete/calendar"), 20));
            views.setOnClickPendingIntent(
                R.id.widget_up_next, openApp(context, "/athlete/calendar?date=" + formatDate(at), 21));
            refreshAt = Math.min(refreshAt, at + UP_NEXT_GRACE_MS);
        }
        scheduleRefresh(context, refreshAt);
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

    /** Shows the row if it fits in what is left of the height; once one doesn't, neither do the rows after it. */
    private static int fitRow(RemoteViews views, int viewId, int budgetDp, int rowDp) {
        boolean fits = budgetDp >= rowDp;
        views.setViewVisibility(viewId, fits ? View.VISIBLE : View.GONE);
        return fits ? budgetDp - rowDp : 0;
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

    /** A button that hands `name` to the app as a widget command. Extras don't tell PendingIntents apart, so each needs its own requestCode. */
    private static PendingIntent command(Context context, String name, int requestCode) {
        Intent intent = new Intent(context, SessionWidgetProvider.class)
            .setAction(ACTION_COMMAND)
            .putExtra(EXTRA_COMMAND, name);
        return PendingIntent.getBroadcast(
            context, requestCode, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /**
     * Takes the rest row down once the countdown ends. A Handler rather than an
     * alarm, for to-the-second timing without the exact-alarm permission: during
     * a rest CueAudioService keeps the process running. Should it be gone, the
     * countdown runs on past zero until the next refresh.
     */
    private static void refreshWhenRestEnds(Context context, long delayMs) {
        Context appContext = context.getApplicationContext();
        if (pendingRestEnd != null) HANDLER.removeCallbacks(pendingRestEnd);
        pendingRestEnd = () -> refresh(appContext);
        HANDLER.postDelayed(pendingRestEnd, delayMs + 500);
    }

    private static void scheduleRefresh(Context context, long atMillis) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        // Inexact and non-waking: it only has to be right by the time someone looks at the home screen.
        if (alarms != null) alarms.set(AlarmManager.RTC, atMillis, refreshIntent(context));
    }

    private static PendingIntent refreshIntent(Context context) {
        Intent intent = new Intent(context, SessionWidgetProvider.class).setAction(ACTION_REFRESH);
        return PendingIntent.getBroadcast(
            context, 30, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
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

    /** "Dziś, 18:00", "Jutro, 7:30", "Pt 7.11, 18:00"; the time is left out when none was set (midnight). */
    private static String formatWhen(long at, long now) {
        Calendar when = Calendar.getInstance();
        when.setTimeInMillis(at);
        long dayDiff = Math.round((startOfDay(at) - startOfDay(now)) / (24 * 60 * 60 * 1000.0));
        String day;
        if (dayDiff <= 0) day = "Dziś";
        else if (dayDiff == 1) day = "Jutro";
        else day = WEEKDAYS[when.get(Calendar.DAY_OF_WEEK)] + " " + when.get(Calendar.DAY_OF_MONTH) + "."
            + String.format(Locale.ROOT, "%02d", when.get(Calendar.MONTH) + 1);

        int hour = when.get(Calendar.HOUR_OF_DAY);
        int minute = when.get(Calendar.MINUTE);
        if (hour == 0 && minute == 0) return day;
        return day + ", " + String.format(Locale.ROOT, "%d:%02d", hour, minute);
    }

    /** "2026-11-07", the calendar page's `?date=`. */
    private static String formatDate(long at) {
        Calendar when = Calendar.getInstance();
        when.setTimeInMillis(at);
        return String.format(
            Locale.ROOT, "%04d-%02d-%02d",
            when.get(Calendar.YEAR), when.get(Calendar.MONTH) + 1, when.get(Calendar.DAY_OF_MONTH));
    }

    private static long startOfDay(long millis) {
        Calendar day = Calendar.getInstance();
        day.setTimeInMillis(millis);
        day.set(Calendar.HOUR_OF_DAY, 0);
        day.set(Calendar.MINUTE, 0);
        day.set(Calendar.SECOND, 0);
        day.set(Calendar.MILLISECOND, 0);
        return day.getTimeInMillis();
    }

    /** Polish plural: 1 trening, 2–4 (but not 12–14) treningi, otherwise treningów. */
    private static String plural(int n, String one, String few, String many) {
        if (n == 1) return one;
        int lastTwo = n % 100;
        int last = n % 10;
        if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
        return many;
    }
}
