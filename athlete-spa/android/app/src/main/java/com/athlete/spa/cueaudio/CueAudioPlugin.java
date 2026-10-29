package com.athlete.spa.cueaudio;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** JS bridge for CuePlayer — see src/lib/cue-audio.ts. */
@CapacitorPlugin(name = "CueAudio")
public class CueAudioPlugin extends Plugin {

    private CuePlayer player() {
        return CuePlayer.get(getContext());
    }

    @PluginMethod
    public void play(PluginCall call) {
        String src = call.getString("src");
        if (src == null) {
            call.reject("src is required");
            return;
        }
        String id = call.getString("id");
        getActivity().runOnUiThread(() -> {
            player().play(id, src);
            call.resolve();
        });
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        String id = call.getString("id");
        String src = call.getString("src");
        // Epoch ms arrives as a Long, which getDouble() rejects; optDouble takes any Number.
        double at = call.getData().optDouble("at", Double.NaN);
        if (id == null || src == null || Double.isNaN(at)) {
            call.reject("id, src and at are required");
            return;
        }
        boolean foreground = call.getBoolean("foreground", true);
        getActivity().runOnUiThread(() -> {
            player().schedule(id, src, (long) at, foreground);
            call.resolve();
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("id is required");
            return;
        }
        getActivity().runOnUiThread(() -> {
            player().cancel(id);
            call.resolve();
        });
    }

    @PluginMethod
    public void preload(PluginCall call) {
        String src = call.getString("src");
        if (src == null) {
            call.reject("src is required");
            return;
        }
        getActivity().runOnUiThread(() -> {
            player().preload(src);
            call.resolve();
        });
    }
}
