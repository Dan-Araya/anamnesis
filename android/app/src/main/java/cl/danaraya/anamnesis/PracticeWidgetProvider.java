package cl.danaraya.anamnesis;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;

public class PracticeWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "practice_widget";
    static final String PRACTICE = "widgetPractice";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, views(context));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (Intent.ACTION_DATE_CHANGED.equals(action) || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) updateAll(context);
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, PracticeWidgetProvider.class));
        for (int id : ids) manager.updateAppWidget(id, views(context));
    }

    static RemoteViews views(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Map<String, Integer> days = new HashMap<>();
        try {
            JSONArray daily = new JSONArray(prefs.getString("daily", "[]"));
            for (int i = 0; i < daily.length(); i++) {
                JSONObject day = daily.getJSONObject(i);
                days.put(day.getString("date"), day.optInt("reviews", 0));
            }
        } catch (Exception ignored) {
            // A missing or invalid display cache must never affect the real progress.
        }
        WidgetStats stats = new WidgetStats(days, prefs.getInt("goal", 40), Calendar.getInstance());
        boolean synced = prefs.contains("daily");
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.practice_widget);
        views.setTextViewText(R.id.widget_streak, context.getString(R.string.widget_streak_count, stats.streak));
        views.setTextViewText(R.id.widget_days, context.getResources().getQuantityString(R.plurals.widget_days, stats.streak));
        views.setTextViewText(R.id.widget_message, context.getString(!synced ? R.string.widget_first_open
                : stats.reviews >= stats.goal ? R.string.widget_goal_done
                : stats.reviews > 0 ? R.string.widget_keep_going
                : stats.streak > 0 ? R.string.widget_keep_streak : R.string.widget_start_streak));
        views.setTextViewText(R.id.widget_today, context.getString(R.string.widget_today_count, stats.reviews, stats.goal));
        views.setProgressBar(R.id.widget_progress, stats.goal, Math.min(stats.reviews, stats.goal), false);
        Intent launch = new Intent(context, MainActivity.class)
                .setAction("cl.danaraya.anamnesis.WIDGET_PRACTICE")
                .putExtra(PRACTICE, true)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, 41, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_practice, pending);
        views.setOnClickPendingIntent(R.id.widget_root, pending);
        return views;
    }
}
