package cl.danaraya.anamnesis;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "PracticeWidget")
public class PracticeWidgetPlugin extends Plugin {
    private final AtomicBoolean pendingPractice = new AtomicBoolean(false);

    @Override
    public void load() {
        readIntent(getActivity().getIntent());
    }

    private void readIntent(Intent intent) {
        if (intent != null && intent.getBooleanExtra(PracticeWidgetProvider.PRACTICE, false)) {
            pendingPractice.set(true);
            intent.removeExtra(PracticeWidgetProvider.PRACTICE);
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        readIntent(intent);
        if (pendingPractice.get()) notifyListeners("practiceRequested", new JSObject());
    }

    @PluginMethod
    public void consumePractice(PluginCall call) {
        JSObject result = new JSObject();
        result.put("requested", pendingPractice.getAndSet(false));
        call.resolve(result);
    }

    @PluginMethod
    public void update(PluginCall call) {
        JSArray daily = call.getArray("daily");
        if (daily == null) { call.reject("Missing daily statistics"); return; }
        getContext().getSharedPreferences(PracticeWidgetProvider.PREFS, Context.MODE_PRIVATE)
                .edit().putString("daily", daily.toString())
                .putInt("goal", Math.max(1, call.getInt("goal", 40))).apply();
        PracticeWidgetProvider.updateAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void requestPin(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
            boolean supported = Build.VERSION.SDK_INT >= 26 && manager.isRequestPinAppWidgetSupported();
            JSObject result = new JSObject();
            result.put("supported", supported);
            if (supported) {
                ComponentName provider = new ComponentName(getContext(), PracticeWidgetProvider.class);
                result.put("requested", manager.requestPinAppWidget(provider, null, null));
            }
            call.resolve(result);
        });
    }
}
