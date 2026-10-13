package app.jelas;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONObject;

import java.util.Calendar;

/**
 * JELAS — local reminder alarms.
 * Everything is scheduled by the phone itself; no network is involved.
 * Inexact alarms are used deliberately so the app needs no SCHEDULE_EXACT_ALARM permission.
 */
public class ReminderReceiver extends BroadcastReceiver {

    public static final String CHANNEL_ID = "jelas_reminders";
    public static final String PREFS = "jelas_reminders";
    public static final String KEY_JSON = "config";

    private static final int RC_DAILY = 1;
    private static final int RC_WEEKLY = 2;
    private static final int RC_MONTHLY = 3;

    @Override
    public void onReceive(Context ctx, Intent intent) {
        // After a reboot, restore all pending reminders and stop.
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            try {
                String saved = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_JSON, null);
                if (saved != null) reschedule(ctx, new JSONObject(saved));
            } catch (Exception ignored) {}
            return;
        }

        String kind = intent.getStringExtra("kind");
        if (kind == null) kind = "daily";

        int titleRes = R.string.rem_daily_title;
        int bodyRes = R.string.rem_daily_body;
        if ("weekly".equals(kind)) { titleRes = R.string.rem_weekly_title; bodyRes = R.string.rem_weekly_body; }
        if ("monthly".equals(kind)) { titleRes = R.string.rem_monthly_title; bodyRes = R.string.rem_monthly_body; }

        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            Intent open = new Intent(ctx, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent pi = PendingIntent.getActivity(ctx, 900, open, flags);

            Notification.Builder b;
            if (Build.VERSION.SDK_INT >= 26) {
                b = new Notification.Builder(ctx, CHANNEL_ID);
            } else {
                b = new Notification.Builder(ctx);
            }
            b.setContentTitle(ctx.getString(titleRes))
             .setContentText(ctx.getString(bodyRes))
             .setSmallIcon(android.R.drawable.ic_menu_agenda)
             .setAutoCancel(true)
             .setContentIntent(pi);
            if (Build.VERSION.SDK_INT >= 21) {
                b.setColor(0xFF1F6F63);
            }
            nm.notify(kind.hashCode(), b.build());
        }

        // schedule the next occurrence from the stored config
        try {
            String json = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_JSON, null);
            if (json != null) reschedule(ctx, new JSONObject(json));
        } catch (Exception ignored) {}
    }

    /* ---------------- scheduling ---------------- */
    public static void reschedule(Context ctx, JSONObject cfg) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        try {
            JSONObject daily = cfg.optJSONObject("daily");
            JSONObject weekly = cfg.optJSONObject("weekly");
            JSONObject monthly = cfg.optJSONObject("monthly");

            if (daily != null && daily.optBoolean("on")) {
                set(ctx, am, RC_DAILY, "daily", nextTime(daily.optString("time", "21:00"), -1));
            } else {
                cancel(ctx, am, RC_DAILY, "daily");
            }

            if (weekly != null && weekly.optBoolean("on")) {
                int day = weekly.optInt("day", 0); // 0 = Sunday, matching JS getDay()
                int calDay = (day == 0) ? Calendar.SUNDAY : day + 1;
                set(ctx, am, RC_WEEKLY, "weekly", nextTime(weekly.optString("time", "20:00"), calDay));
            } else {
                cancel(ctx, am, RC_WEEKLY, "weekly");
            }

            if (monthly != null && monthly.optBoolean("on")) {
                set(ctx, am, RC_MONTHLY, "monthly", nextMonth(monthly.optString("time", "09:00")));
            } else {
                cancel(ctx, am, RC_MONTHLY, "monthly");
            }
        } catch (Exception ignored) {}
    }

    private static void set(Context ctx, AlarmManager am, int rc, String kind, long at) {
        Intent i = new Intent(ctx, ReminderReceiver.class);
        i.putExtra("kind", kind);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getBroadcast(ctx, rc, i, flags);
        // Inexact on purpose: no SCHEDULE_EXACT_ALARM permission required.
        am.set(AlarmManager.RTC_WAKEUP, at, pi);
    }

    private static void cancel(Context ctx, AlarmManager am, int rc, String kind) {
        Intent i = new Intent(ctx, ReminderReceiver.class);
        i.putExtra("kind", kind);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getBroadcast(ctx, rc, i, flags);
        am.cancel(pi);
    }

    /** Next occurrence of hh:mm. calDay = -1 means "every day", otherwise a Calendar day constant. */
    private static long nextTime(String hhmm, int calDay) {
        int h = 21, m = 0;
        try {
            String[] p = hhmm.split(":");
            h = Integer.parseInt(p[0]);
            m = Integer.parseInt(p[1]);
        } catch (Exception ignored) {}
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, h);
        c.set(Calendar.MINUTE, m);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        if (calDay >= 0) {
            while (c.get(Calendar.DAY_OF_WEEK) != calDay || c.getTimeInMillis() <= System.currentTimeMillis()) {
                c.add(Calendar.DAY_OF_MONTH, 1);
            }
        } else if (c.getTimeInMillis() <= System.currentTimeMillis()) {
            c.add(Calendar.DAY_OF_MONTH, 1);
        }
        return c.getTimeInMillis();
    }

    /** The 1st of the next month at hh:mm (or this month's 1st if still ahead). */
    private static long nextMonth(String hhmm) {
        int h = 9, m = 0;
        try {
            String[] p = hhmm.split(":");
            h = Integer.parseInt(p[0]);
            m = Integer.parseInt(p[1]);
        } catch (Exception ignored) {}
        Calendar c = Calendar.getInstance();
        c.add(Calendar.MONTH, 1);
        c.set(Calendar.DAY_OF_MONTH, 1);
        c.set(Calendar.HOUR_OF_DAY, h);
        c.set(Calendar.MINUTE, m);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }
}
