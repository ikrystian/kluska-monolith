package com.athlete.spa.runtracking;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** JS bridge for RunRecorder + RunTrackingService — see src/lib/run-tracking.ts. */
@CapacitorPlugin(
    name = "RunTracking",
    permissions = @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
)
public class RunTrackingPlugin extends Plugin {

    @Override
    public void load() {
        RunRecorder.get().setListener(update -> notifyListeners("update", update));
    }

    @Override
    protected void handleOnDestroy() {
        RunRecorder.get().setListener(null);
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!hasLocationPermission()) {
            call.reject("Location permission denied");
            return;
        }
        RunRecorder recorder = RunRecorder.get();
        recorder.start();
        RunTrackingService.sync(getContext());
        call.resolve(recorder.snapshot(false));
    }

    @PluginMethod
    public void pause(PluginCall call) {
        RunRecorder recorder = RunRecorder.get();
        recorder.pause(false);
        RunTrackingService.sync(getContext());
        call.resolve(recorder.snapshot(true));
    }

    @PluginMethod
    public void resume(PluginCall call) {
        if (!hasLocationPermission()) {
            call.reject("Location permission denied");
            return;
        }
        RunRecorder recorder = RunRecorder.get();
        if (!recorder.resume(call.getData(), false)) {
            call.reject("No run to resume");
            return;
        }
        RunTrackingService.sync(getContext());
        call.resolve(recorder.snapshot(false));
    }

    @PluginMethod
    public void stop(PluginCall call) {
        JSObject snapshot = RunRecorder.get().stop();
        RunTrackingService.sync(getContext());
        call.resolve(snapshot);
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(RunRecorder.get().snapshot(true));
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                || getPermissionState("notifications") == PermissionState.GRANTED) {
            resolveNotificationPermission(call);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        resolveNotificationPermission(call);
    }

    private void resolveNotificationPermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        resolveBatteryExemption(call);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        if (isIgnoringBatteryOptimizations()) {
            resolveBatteryExemption(call);
            return;
        }
        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
            .setData(Uri.parse("package:" + getContext().getPackageName()));
        try {
            startActivityForResult(call, intent, "batteryExemptionResult");
        } catch (RuntimeException e) {
            // Some OEM builds ship without this screen.
            resolveBatteryExemption(call);
        }
    }

    @ActivityCallback
    private void batteryExemptionResult(PluginCall call, ActivityResult result) {
        if (call != null) resolveBatteryExemption(call);
    }

    private boolean isIgnoringBatteryOptimizations() {
        PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return power != null && power.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    private void resolveBatteryExemption(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", isIgnoringBatteryOptimizations());
        call.resolve(result);
    }
}
