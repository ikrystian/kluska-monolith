package com.athlete.spa.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.RemoteViews;

import com.athlete.spa.R;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.util.Calendar;
import java.util.TimeZone;

/**
 * Home-screen widget with the pet from the app's /athlete/pet screen: its
 * picture, what it says, and the three bars (sytość, radość, forma).
 *
 * The app hands over the pet's state and one drawing per mood through
 * PetWidgetPlugin (src/lib/pet-widget.ts). From there the widget runs on its
 * own: the bars sink with time by the backend's rules (src/lib/pet/state.ts
 * in the main app), so the pet gets hungry on the home screen even while the
 * app stays closed. The heart strokes the pet; the stroke waits here until
 * the app next runs and sends it to the server.
 */
public class PetWidgetProvider extends AppWidgetProvider {

    private static final String PREFS = "pet_widget";
    private static final String KEY_STATE = "state";
    private static final String KEY_ART_KEY = "artKey";
    private static final String KEY_STROKES = "strokes";
    private static final String KEY_STROKED_UNTIL = "strokedUntil";
    private static final String ART_DIR = "pet-widget";
    /** The drawing shown while the pet is being stroked; the other drawings are named after moods. */
    private static final String FACE_STROKED = "pet";

    private static final String ACTION_STROKE = "com.athlete.spa.widget.PET_STROKE";
    private static final String PET_PATH = "/athlete/pet";

    // Mirrors of src/lib/pet/state.ts and service.ts in the main app.
    private static final double HOUR_MS = 3_600_000.0;
    private static final long DAY_MS = 86_400_000L;
    private static final double HUNGER_DECAY_PER_HOUR = 100.0 / 48;
    private static final double JOY_DECAY_PER_HOUR = 100.0 / 72;
    private static final int HUNGRY_THRESHOLD = 25;
    private static final int STROKE_JOY = 4;
    /** The backend's day boundary (APP_TZ). */
    private static final TimeZone APP_TZ = TimeZone.getTimeZone("Europe/Warsaw");

    private static final long STROKE_SHOW_MS = 4_000;

    /** From this width the widget lays out sideways, with text next to the pet. */
    static final int WIDE_MIN_DP = 200;
    private static final int DEFAULT_SIZE_DP = 110;

    // Approximate row heights of the wide layout, used to drop rows on a short widget.
    private static final int PADDING_DP = 28;
    private static final int HEADER_DP = 30;
    private static final int BARS_DP = 24;
    private static final int LINE_DP = 20;
    private static final int LINE_EXTRA_DP = 17;
    private static final int SUB_DP = 17;
    private static final int ACTION_DP = 40;

    private static final Handler HANDLER = new Handler(Looper.getMainLooper());
    private static Runnable pendingStrokeEnd;

    // ---------- Store, shared with PetWidgetPlugin ----------

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Replaces the pet shown; null means there is no pet (or nobody signed in). */
    static void saveState(Context context, String stateJson) {
        SharedPreferences.Editor editor = prefs(context).edit();
        if (stateJson == null) editor.remove(KEY_STATE).remove(KEY_STROKES).remove(KEY_STROKED_UNTIL);
        else editor.putString(KEY_STATE, stateJson);
        editor.apply();
    }

    static String artKey(Context context) {
        return prefs(context).getString(KEY_ART_KEY, null);
    }

    static void saveArtKey(Context context, String artKey) {
        prefs(context).edit().putString(KEY_ART_KEY, artKey).apply();
    }

    static File artDir(Context context) {
        return new File(context.getFilesDir(), ART_DIR);
    }

    /** Strokes made on the widget since the last call; hands them to the app once. */
    static int takeStrokes(Context context) {
        SharedPreferences prefs = prefs(context);
        int strokes = prefs.getInt(KEY_STROKES, 0);
        if (strokes > 0) prefs.edit().remove(KEY_STROKES).apply();
        return strokes;
    }

    /** Re-renders every placed pet widget. */
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, PetWidgetProvider.class));
        for (int id : ids) manager.updateAppWidget(id, render(context, manager, id));
    }

    // ---------- Widget ----------

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) manager.updateAppWidget(id, render(context, manager, id));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int appWidgetId, Bundle newOptions) {
        // The layout and its rows depend on the size.
        manager.updateAppWidget(appWidgetId, render(context, manager, appWidgetId));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (!ACTION_STROKE.equals(intent.getAction())) return;
        SharedPreferences prefs = prefs(context);
        if (prefs.getString(KEY_STATE, null) == null) return;
        prefs.edit()
            .putInt(KEY_STROKES, prefs.getInt(KEY_STROKES, 0) + 1)
            .putLong(KEY_STROKED_UNTIL, System.currentTimeMillis() + STROKE_SHOW_MS)
            .apply();
        refresh(context);
        refreshWhenStrokeEnds(context);
    }

    /**
     * Puts the everyday face back after a stroke. A Handler, for a delay this
     * short; should the process be gone by then, the next periodic update does it.
     */
    private static void refreshWhenStrokeEnds(Context context) {
        Context appContext = context.getApplicationContext();
        if (pendingStrokeEnd != null) HANDLER.removeCallbacks(pendingStrokeEnd);
        pendingStrokeEnd = () -> refresh(appContext);
        HANDLER.postDelayed(pendingStrokeEnd, STROKE_SHOW_MS + 200);
    }

    private static RemoteViews render(Context context, AppWidgetManager manager, int appWidgetId) {
        Bundle options = manager.getAppWidgetOptions(appWidgetId);
        // Portrait reports min width and max height.
        int widthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, DEFAULT_SIZE_DP);
        int heightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, DEFAULT_SIZE_DP);
        if (widthDp <= 0) widthDp = DEFAULT_SIZE_DP;
        if (heightDp <= 0) heightDp = DEFAULT_SIZE_DP;
        boolean wide = widthDp >= WIDE_MIN_DP;

        RemoteViews views = new RemoteViews(context.getPackageName(), wide ? R.layout.widget_pet : R.layout.widget_pet_small);
        views.setOnClickPendingIntent(R.id.pet_widget_root, SessionWidgetProvider.openApp(context, PET_PATH, 40));

        SharedPreferences prefs = prefs(context);
        JSONObject state = parse(prefs.getString(KEY_STATE, null));
        if (state == null) {
            renderNoPet(views, wide);
            return views;
        }

        long now = System.currentTimeMillis();
        int hunger = hungerNow(state, now);
        int joy = joyNow(state, now);
        // A stroke still waiting for the app is shown as given already.
        if (prefs.getInt(KEY_STROKES, 0) > 0) joy = Math.min(100, joy + STROKE_JOY);
        int form = formNow(state, now);
        String mood = mood(hunger, joy, form);
        String thought = thought(hunger, joy, form);
        boolean stroked = prefs.getLong(KEY_STROKED_UNTIL, 0) > now;
        int chests = state.optInt("chests");

        views.setTextViewText(R.id.pet_widget_name, state.optString("name", "Zwierzak"));
        views.setViewVisibility(R.id.pet_widget_stroke, View.VISIBLE);
        views.setOnClickPendingIntent(R.id.pet_widget_stroke, stroke(context));
        views.setViewVisibility(R.id.pet_widget_bars, View.VISIBLE);
        views.setProgressBar(R.id.pet_widget_hunger, 100, hunger, false);
        views.setProgressBar(R.id.pet_widget_joy, 100, joy, false);
        views.setProgressBar(R.id.pet_widget_form, 100, form, false);

        Bitmap art = loadArt(context, stroked ? FACE_STROKED : mood);
        if (art != null) {
            views.setImageViewBitmap(R.id.pet_widget_image, art);
            views.setViewVisibility(R.id.pet_widget_image, View.VISIBLE);
            views.setViewVisibility(R.id.pet_widget_emoji, View.GONE);
        } else {
            views.setTextViewText(R.id.pet_widget_emoji, emoji(state.optString("species")));
            views.setViewVisibility(R.id.pet_widget_image, View.GONE);
            views.setViewVisibility(R.id.pet_widget_emoji, View.VISIBLE);
        }
        if (!wide) return views;

        views.setTextViewText(R.id.pet_widget_hunger_label, "Sytość " + hunger);
        views.setTextViewText(R.id.pet_widget_joy_label, "Radość " + joy);
        views.setTextViewText(R.id.pet_widget_form_label, "Forma " + form);

        String line;
        if (stroked) line = "Mrrr… jak miło!";
        else if (chests > 0) line = "🎁 Skrzynia czeka na otwarcie";
        else line = line(mood, thought);
        views.setTextViewText(R.id.pet_widget_line, line);

        String sub = moodLabel(mood);
        String stage = state.optString("stageLabel");
        if (!stage.isEmpty()) sub += " · " + stage + " · poz. " + state.optInt("level", 1);
        views.setTextViewText(R.id.pet_widget_sub, sub);

        String actionLabel;
        String actionPath = PET_PATH;
        if (chests > 0) actionLabel = "Otwórz skrzynię";
        else if ("food".equals(thought)) actionLabel = "Nakarm";
        else if ("workout".equals(thought)) {
            actionLabel = "Zacznij trening";
            actionPath = "/athlete/workouts";
        } else if ("play".equals(thought)) actionLabel = "Pobaw się";
        else actionLabel = "Odwiedź pokój";
        views.setTextViewText(R.id.pet_widget_action, actionLabel);
        views.setOnClickPendingIntent(R.id.pet_widget_action, SessionWidgetProvider.openApp(context, actionPath, 41));

        // The name and the bars always show; the rest by what the height leaves, most telling first.
        int budgetDp = heightDp - PADDING_DP - HEADER_DP - BARS_DP;
        budgetDp = fitRow(views, R.id.pet_widget_line, budgetDp, LINE_DP);
        budgetDp = fitRow(views, R.id.pet_widget_sub, budgetDp, SUB_DP);
        budgetDp = fitRow(views, R.id.pet_widget_action, budgetDp, ACTION_DP);
        views.setInt(R.id.pet_widget_line, "setMaxLines", budgetDp >= LINE_EXTRA_DP ? 2 : 1);
        return views;
    }

    /** Nobody to show yet: invite to adopt (or to sign in — the pet screen sorts that out). */
    private static void renderNoPet(RemoteViews views, boolean wide) {
        views.setViewVisibility(R.id.pet_widget_image, View.GONE);
        views.setViewVisibility(R.id.pet_widget_emoji, View.VISIBLE);
        views.setTextViewText(R.id.pet_widget_emoji, emoji("hamster"));
        views.setViewVisibility(R.id.pet_widget_stroke, View.GONE);
        views.setViewVisibility(R.id.pet_widget_bars, View.GONE);
        views.setTextViewText(R.id.pet_widget_name, wide ? "Zwierzak" : "Adoptuj zwierzaka");
        if (!wide) return;
        views.setViewVisibility(R.id.pet_widget_sub, View.GONE);
        views.setViewVisibility(R.id.pet_widget_action, View.GONE);
        views.setViewVisibility(R.id.pet_widget_line, View.VISIBLE);
        views.setInt(R.id.pet_widget_line, "setMaxLines", 3);
        views.setTextViewText(R.id.pet_widget_line, "Adoptuj towarzysza treningów — rośnie razem z Twoją formą.");
    }

    /** Shows the row if it fits in what is left of the height; once one doesn't, neither do the rows after it. */
    private static int fitRow(RemoteViews views, int viewId, int budgetDp, int rowDp) {
        boolean fits = budgetDp >= rowDp;
        views.setViewVisibility(viewId, fits ? View.VISIBLE : View.GONE);
        return fits ? budgetDp - rowDp : 0;
    }

    private static PendingIntent stroke(Context context) {
        Intent intent = new Intent(context, PetWidgetProvider.class).setAction(ACTION_STROKE);
        return PendingIntent.getBroadcast(
            context, 42, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static Bitmap loadArt(Context context, String face) {
        File file = new File(artDir(context), face + ".png");
        return file.isFile() ? BitmapFactory.decodeFile(file.getPath()) : null;
    }

    private static JSONObject parse(String json) {
        if (json == null) return null;
        try {
            return new JSONObject(json);
        } catch (JSONException e) {
            return null;
        }
    }

    // ---------- The pet's state now, from what the app last sampled ----------

    /**
     * `hungryAt` is the moment the server expects hunger to reach the "hungry"
     * threshold, a filling meal's standstill included — so hunger is read back
     * from it rather than from the sampled value, which only caps it.
     */
    private static int hungerNow(JSONObject state, long now) {
        double sampled = state.optDouble("hunger", 0);
        double value;
        if (state.isNull("hungryAt")) value = sampled - hoursSinceSample(state, now) * HUNGER_DECAY_PER_HOUR;
        else value = Math.min(sampled, HUNGRY_THRESHOLD + (state.optLong("hungryAt") - now) / HOUR_MS * HUNGER_DECAY_PER_HOUR);
        return clamp(value);
    }

    private static int joyNow(JSONObject state, long now) {
        return clamp(state.optDouble("joy", 0) - hoursSinceSample(state, now) * JOY_DECAY_PER_HOUR);
    }

    /** formFromActivity: 100 the day after a workout, −15 per idle day after that, never below 20. */
    private static int formNow(JSONObject state, long now) {
        if (state.isNull("lastActiveDay")) return 20;
        String[] parts = state.optString("lastActiveDay").split("-");
        if (parts.length != 3) return 20;
        long lastDay;
        try {
            lastDay = utcDay(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) - 1, Integer.parseInt(parts[2]));
        } catch (NumberFormatException e) {
            return 20;
        }
        Calendar today = Calendar.getInstance(APP_TZ);
        today.setTimeInMillis(now);
        long todayDay = utcDay(today.get(Calendar.YEAR), today.get(Calendar.MONTH), today.get(Calendar.DAY_OF_MONTH));
        long idleDays = Math.max(0, Math.round((todayDay - lastDay) / (double) DAY_MS));
        return (int) Math.max(20, 100 - 15 * Math.max(0, idleDays - 1));
    }

    private static long utcDay(int year, int month, int day) {
        Calendar utc = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        utc.clear();
        utc.set(year, month, day);
        return utc.getTimeInMillis();
    }

    private static double hoursSinceSample(JSONObject state, long now) {
        return Math.max(0, now - state.optLong("sampledAt", now)) / HOUR_MS;
    }

    private static int clamp(double value) {
        return (int) Math.round(Math.max(0, Math.min(100, value)));
    }

    /** petMood in src/lib/pet/state.ts. */
    private static String mood(int hunger, int joy, int form) {
        if (form <= 25) return "sleepy";
        if (hunger < 25) return "hungry";
        if (form <= 55) return "lazy";
        if (joy < 25) return "sad";
        if (form >= 85 && hunger >= 50 && joy >= 50) return "energetic";
        return "happy";
    }

    /** petThought in src/lib/pet/state.ts; null when the pet wants for nothing. */
    private static String thought(int hunger, int joy, int form) {
        if (hunger < 40) return "food";
        if (form <= 70) return "workout";
        if (joy < 50) return "play";
        return null;
    }

    /** MOOD_LABEL in src/components/pet/pet-meta.ts. */
    private static String moodLabel(String mood) {
        switch (mood) {
            case "energetic": return "Pełen energii";
            case "hungry": return "Głodny";
            case "sad": return "Smutny";
            case "lazy": return "Rozleniwiony";
            case "sleepy": return "Senny";
            default: return "Zadowolony";
        }
    }

    /** petLine in src/components/pet/pet-meta.ts. */
    private static String line(String mood, String thought) {
        if ("sleepy".equals(mood)) return "Zzz… obudź mnie, jak pójdziemy poćwiczyć.";
        if ("food".equals(thought)) return "Burczy mi w brzuszku. Masz coś dobrego?";
        if ("workout".equals(thought)) return "lazy".equals(mood) ? "Trochę się zasiedziałem. Ruszamy się?" : "Idziemy potrenować?";
        if ("play".equals(thought)) return "Pobawisz się ze mną?";
        return "energetic".equals(mood) ? "Ale mam dziś moc!" : "Dobrze mi tu z Tobą.";
    }

    private static String emoji(String species) {
        if ("fox".equals(species)) return "🦊";
        if ("bear".equals(species)) return "🐻";
        return "🐹";
    }
}
