package cl.danaraya.anamnesis;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import java.util.Map;

/** Read-only projection of daily practice, including the one-day streak grace. */
final class WidgetStats {
    final int streak;
    final int reviews;
    final int goal;

    WidgetStats(Map<String, Integer> days, int dailyGoal, Calendar now) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT);
        format.setTimeZone(now.getTimeZone());
        Calendar cursor = (Calendar) now.clone();
        reviews = Math.max(0, days.getOrDefault(format.format(cursor.getTime()), 0));
        goal = Math.max(1, dailyGoal);
        if (reviews == 0) cursor.add(Calendar.DATE, -1);
        int count = 0;
        while (days.getOrDefault(format.format(cursor.getTime()), 0) > 0) {
            count++;
            cursor.add(Calendar.DATE, -1);
        }
        streak = count;
    }
}
