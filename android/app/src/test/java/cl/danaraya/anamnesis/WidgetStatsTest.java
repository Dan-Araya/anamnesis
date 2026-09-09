package cl.danaraya.anamnesis;

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;
import java.util.TimeZone;

public class WidgetStatsTest {
    private Calendar date(int year, int month, int day) {
        Calendar now = Calendar.getInstance(TimeZone.getTimeZone("America/Santiago"));
        now.clear(); now.set(year, month - 1, day, 12, 0);
        return now;
    }

    @Test public void keepsYesterdayStreakButResetsTodaysCounter() {
        Map<String, Integer> days = new HashMap<>();
        days.put("2026-09-07", 12); days.put("2026-09-06", 4);
        WidgetStats stats = new WidgetStats(days, 40, date(2026, 9, 8));
        assertEquals(2, stats.streak); assertEquals(0, stats.reviews);
    }

    @Test public void expiresStreakAfterMissedDayWithoutOpeningApp() {
        Map<String, Integer> days = new HashMap<>(); days.put("2026-09-06", 40);
        assertEquals(0, new WidgetStats(days, 40, date(2026, 9, 8)).streak);
    }

    @Test public void countsTodayAndHandlesDstWithCalendarDays() {
        Map<String, Integer> days = new HashMap<>();
        days.put("2026-09-05", 3); days.put("2026-09-06", 4); days.put("2026-09-07", 42);
        WidgetStats stats = new WidgetStats(days, 40, date(2026, 9, 7));
        assertEquals(3, stats.streak); assertEquals(42, stats.reviews); assertEquals(40, stats.goal);
    }

    @Test public void emptyOrRestoredHistoryClearsWidget() {
        WidgetStats stats = new WidgetStats(new HashMap<>(), 0, date(2026, 9, 8));
        assertEquals(0, stats.streak); assertEquals(0, stats.reviews); assertEquals(1, stats.goal);
    }
}
